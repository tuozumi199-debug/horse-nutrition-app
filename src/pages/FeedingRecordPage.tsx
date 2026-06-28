import { useEffect, useMemo, useState } from "react";
import { db, makeId, nowIso, todayIso } from "../db/localDb";
import type { Horse } from "../types/horse";
import type { Feed, FeedUnit } from "../types/feed";
import type { FeedingPlanItem, FeedingRecord, TimeSlot } from "../types/feeding";
import { timeSlotLabels, timeSlotOptions, unitLabels, unitOptions } from "../app/labels";
import { formatNumber } from "../app/utils";
import { getActivePlanItemsForHorse } from "../logic/dataSelectors";
import { calculateFeedAmountAsFedKg } from "../logic/nutritionCalculator";
import { createActiveFeedingPlanRevision } from "../logic/feedingPlanUpdater";

type EditScope = "recordOnly" | "recordAndPlan";
type ExceptionEditKind = "exception_override" | "exception_skip" | "memo";

export function FeedingRecordPage({
  horses,
  selectedHorseId
}: {
  horses: Horse[];
  selectedHorseId: string;
  onSelectHorse: (id: string) => void;
  refreshHorses: () => Promise<void>;
}) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [date, setDate] = useState(todayIso());
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("morning");
  const [feedId, setFeedId] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState<FeedUnit>("kg");
  const [memo, setMemo] = useState("");
  const [editingRecordId, setEditingRecordId] = useState("");
  const [editAmount, setEditAmount] = useState<number>(1);
  const [editUnit, setEditUnit] = useState<FeedUnit>("kg");
  const [editMemo, setEditMemo] = useState("");
  const [editScope, setEditScope] = useState<EditScope>("recordOnly");
  const [editReason, setEditReason] = useState("");
  const [planItems, setPlanItems] = useState<FeedingPlanItem[]>([]);
  const [editingPlanItem, setEditingPlanItem] = useState<FeedingPlanItem | undefined>();
  const [editingExceptionKind, setEditingExceptionKind] = useState<ExceptionEditKind | undefined>();

  const horse = horses.find((h) => h.id === selectedHorseId);
  const feedById = useMemo(() => new Map(feeds.map((f) => [f.id, f])), [feeds]);
  const hasActivePlan = planItems.length > 0;
  const exceptionRecords = useMemo(
    () => records.filter((record) => record.isException || record.source === "standard_exception"),
    [records]
  );
  const exceptionByPlanItem = useMemo(() => {
    const map = new Map<string, FeedingRecord>();
    for (const record of exceptionRecords) {
      if (record.recordKind === "exception_add") continue;
      const key = record.basePlanItemId || `${record.timeSlot}__${record.feedId}`;
      map.set(key, record);
    }
    return map;
  }, [exceptionRecords]);
  const additions = useMemo(
    () => exceptionRecords.filter((record) => record.recordKind === "exception_add"),
    [exceptionRecords]
  );
  const effectiveItems = useMemo(() => {
    if (!hasActivePlan) return records;
    const items = planItems.flatMap((item) => {
      const exception = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(`${item.timeSlot}__${item.feedId}`);
      if (exception?.recordKind === "exception_skip") return [];
      if (exception?.recordKind === "exception_override") return [{ ...item, amount: exception.amount, unit: exception.unit }];
      return [item];
    });
    return [...items, ...additions];
  }, [additions, exceptionByPlanItem, hasActivePlan, planItems, records]);
  const dailyFeedTotals = useMemo(() => {
    const totals = new Map<string, { feedName: string; totalKg: number; count: number }>();
    for (const item of effectiveItems) {
      const feed = feedById.get(item.feedId);
      if (!feed) continue;
      const current = totals.get(item.feedId) ?? { feedName: feed.name, totalKg: 0, count: 0 };
      current.totalKg += calculateFeedAmountAsFedKg(item.amount, item.unit, feed);
      current.count += 1;
      totals.set(item.feedId, current);
    }
    return Array.from(totals.values()).sort((a, b) => a.feedName.localeCompare(b.feedName));
  }, [effectiveItems, feedById]);
  const groupedRecords = useMemo(() => {
    const displayRecords = hasActivePlan ? additions : records;
    return timeSlotOptions
      .map((slot) => ({
        slot,
        records: displayRecords.filter((record) => record.timeSlot === slot)
      }))
      .filter((group) => group.records.length > 0);
  }, [additions, hasActivePlan, records]);
  const groupedPlanItems = useMemo(() => {
    return timeSlotOptions
      .map((slot) => ({
        slot,
        items: planItems.filter((item) => item.timeSlot === slot)
      }))
      .filter((group) => group.items.length > 0);
  }, [planItems]);

  async function load() {
    const feedList = (await db.feeds.toArray()).filter((feed) => feed.isActive);
    setFeeds(feedList);
    setFeedId((prev) => prev || feedList[0]?.id || "");
    if (selectedHorseId) {
      const [list, activePlanItems] = await Promise.all([
        db.feedingRecords.where("[horseId+date]").equals([selectedHorseId, date]).toArray(),
        getActivePlanItemsForHorse(selectedHorseId)
      ]);
      const order = new Map(timeSlotOptions.map((slot, idx) => [slot, idx]));
      setRecords(list.sort((a, b) => (order.get(a.timeSlot) ?? 99) - (order.get(b.timeSlot) ?? 99)));
      setPlanItems(activePlanItems);
    } else {
      setRecords([]);
      setPlanItems([]);
    }
  }

  useEffect(() => { load(); }, [selectedHorseId, date]);

  function onFeedChange(id: string) {
    setFeedId(id);
    const feed = feedById.get(id);
    if (feed) setUnit(feed.defaultUnit);
  }

  async function addRecord() {
    if (!selectedHorseId || !feedId || !amount) return alert("馬・飼料・量を入力してください");
    const now = nowIso();
    const record: FeedingRecord = {
      id: makeId("REC"),
      horseId: selectedHorseId,
      date,
      timeSlot,
      feedId,
      amount: Number(amount),
      unit,
      memo,
      recordKind: hasActivePlan ? "exception_add" : "manual",
      source: hasActivePlan ? "standard_exception" : "manual",
      isException: hasActivePlan || undefined,
      createdAt: now,
      updatedAt: now
    };
    await db.feedingRecords.put(record);
    setMemo("");
    await load();
  }

  async function deleteRecord(id: string) {
    await db.feedingRecords.delete(id);
    await load();
  }

  function startEdit(record: FeedingRecord) {
    setEditingRecordId(record.id);
    setEditingPlanItem(undefined);
    setEditingExceptionKind(undefined);
    setEditAmount(record.amount);
    setEditUnit(record.unit);
    setEditMemo(record.memo ?? "");
    setEditScope("recordOnly");
    setEditReason("");
  }

  function startPlanExceptionEdit(item: FeedingPlanItem, kind: ExceptionEditKind) {
    const existing = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(`${item.timeSlot}__${item.feedId}`);
    setEditingRecordId(existing?.id ?? "");
    setEditingPlanItem(item);
    setEditingExceptionKind(kind);
    setEditAmount(kind === "exception_skip" ? 0 : existing?.amount ?? item.amount);
    setEditUnit(existing?.unit ?? item.unit);
    setEditMemo(existing?.memo ?? "");
    setEditScope("recordOnly");
    setEditReason("");
  }

  function cancelEdit() {
    setEditingRecordId("");
    setEditingPlanItem(undefined);
    setEditingExceptionKind(undefined);
    setEditScope("recordOnly");
    setEditReason("");
  }

  async function saveEdit() {
    const now = nowIso();
    if (editingPlanItem && editingExceptionKind) {
      if (editingExceptionKind === "exception_override" && !editAmount) return alert("量を入力してください");
      const existing = editingRecordId ? await db.feedingRecords.get(editingRecordId) : undefined;
      const exceptionRecord: FeedingRecord = {
        id: existing?.id ?? makeId("REC"),
        horseId: selectedHorseId,
        date,
        timeSlot: editingPlanItem.timeSlot,
        feedId: editingPlanItem.feedId,
        amount: editingExceptionKind === "exception_skip" || editingExceptionKind === "memo" ? 0 : Number(editAmount),
        unit: editUnit,
        memo: editMemo,
        recordKind: editingExceptionKind,
        source: "standard_exception",
        basePlanItemId: editingPlanItem.id,
        isException: true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      await db.feedingRecords.put(exceptionRecord);

      if (editScope === "recordAndPlan" && editingExceptionKind !== "memo") {
        const nextPlanItems = planItems.map((item, idx) => ({
          timeSlot: item.timeSlot,
          feedId: item.feedId,
          amount: item.id === editingPlanItem.id
            ? editingExceptionKind === "exception_skip" ? 0 : Number(editAmount)
            : item.amount,
          unit: item.id === editingPlanItem.id ? editUnit : item.unit,
          sortOrder: item.sortOrder || idx + 1
        }));
        await createActiveFeedingPlanRevision({
          horseId: selectedHorseId,
          effectiveFrom: date,
          planName: `給餌例外反映 ${date}`,
          memo: `${date} の給餌例外から作成`,
          reason: editReason,
          source: "給餌記録の編集",
          items: nextPlanItems
        });
      }

      cancelEdit();
      await load();
      return;
    }

    const record = records.find((item) => item.id === editingRecordId);
    if (!record) return;
    if (!editAmount) return alert("量を入力してください");

    const recordPatch = {
      amount: Number(editAmount),
      unit: editUnit,
      memo: editMemo,
      updatedAt: now
    };

    if (editScope === "recordOnly" || hasActivePlan) {
      await db.feedingRecords.update(record.id, recordPatch);
      cancelEdit();
      await load();
      return;
    }

    const currentPlanItems = await getActivePlanItemsForHorse(record.horseId);
    const targetIndex = currentPlanItems.findIndex((item) => item.timeSlot === record.timeSlot && item.feedId === record.feedId);
    if (targetIndex === -1) {
      return alert("現在の標準メニューに同じ時間帯・飼料の項目がありません。給餌記録だけ修正するか、先に標準メニューを作成してください。");
    }

    await db.feedingRecords.update(record.id, recordPatch);
    await createActiveFeedingPlanRevision({
      horseId: record.horseId,
      effectiveFrom: record.date,
      planName: `給餌記録編集 ${record.date}`,
      memo: `${record.date} の給餌記録編集から作成`,
      reason: editReason,
      source: "給餌記録の編集",
      items: currentPlanItems.map((item, idx) => ({
        timeSlot: item.timeSlot,
        feedId: item.feedId,
        amount: idx === targetIndex ? Number(editAmount) : item.amount,
        unit: idx === targetIndex ? editUnit : item.unit,
        sortOrder: item.sortOrder || idx + 1
      }))
    });
    cancelEdit();
    await load();
  }

  async function copyPlanToDate() {
    if (!selectedHorseId) return;
    const planItems = await getActivePlanItemsForHorse(selectedHorseId);
    if (planItems.length === 0) return alert("有効な標準メニューがありません。シミュレーション画面で標準メニューを作成できます。");
    const now = nowIso();
    const recordsToAdd: FeedingRecord[] = planItems.map((item: FeedingPlanItem) => ({
      id: makeId("REC"),
      horseId: selectedHorseId,
      date,
      timeSlot: item.timeSlot,
      feedId: item.feedId,
      amount: item.amount,
      unit: item.unit,
      memo: "標準メニューからコピー",
      createdAt: now,
      updatedAt: now
    }));
    await db.feedingRecords.bulkPut(recordsToAdd);
    await load();
  }

  if (!horse) return <section className="card">馬を選択してください。</section>;

  function renderEditPanel(title: string, options?: { hideAmount?: boolean; hidePlanScope?: boolean }) {
    const hideAmount = options?.hideAmount;
    const hidePlanScope = options?.hidePlanScope;
    return (
      <section className="edit-panel inline-edit-panel">
        <h3>{title}</h3>
        <div className="form-grid">
          {!hideAmount && (
            <>
              <label className="field"><span>量</span><input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(Number(e.target.value))} /></label>
              <label className="field"><span>単位</span><select value={editUnit} onChange={(e) => setEditUnit(e.target.value as FeedUnit)}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
            </>
          )}
          <label className="field full"><span>メモ</span><input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} placeholder="食べ残し、量変更、様子など" /></label>
          {!hidePlanScope && (
            <fieldset className="field full radio-field">
              <legend>反映範囲</legend>
              <label><input type="radio" name="editScope" checked={editScope === "recordOnly"} onChange={() => setEditScope("recordOnly")} /> この日の給餌記録だけ修正する</label>
              <label><input type="radio" name="editScope" checked={editScope === "recordAndPlan"} onChange={() => setEditScope("recordAndPlan")} /> この日以降の標準メニューにも反映する</label>
            </fieldset>
          )}
          {!hidePlanScope && editScope === "recordAndPlan" && (
            <label className="field full">
              <span>変更理由</span>
              <input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="運動量増加のため、食べ残しが多いため、体重調整、飼料切替、その他"
              />
            </label>
          )}
        </div>
        <div className="button-row">
          <button onClick={saveEdit}>保存</button>
          <button className="secondary" onClick={cancelEdit}>キャンセル</button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>{hasActivePlan ? "標準と違う内容を記録" : "給餌記録入力"}</h2>
        <p className="muted">対象馬: <strong>{horse.name}</strong></p>
        {hasActivePlan ? (
          <p className="note">標準メニューが自動適用されています。変更・食べ残し・追加・抜いた場合だけ記録してください。</p>
        ) : (
          <p className="note">この馬にはまだ標準メニューがありません。まずは手入力で給餌記録を追加するか、シミュレーション画面で標準メニューを作成してください。</p>
        )}
        <div className="form-grid">
          <label className="field"><span>日付</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field"><span>時間帯</span><select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}>{timeSlotOptions.map((t) => <option key={t} value={t}>{timeSlotLabels[t]}</option>)}</select></label>
          <label className="field"><span>飼料</span><select value={feedId} onChange={(e) => onFeedChange(e.target.value)}>{feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
          <label className="field"><span>量</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <label className="field"><span>単位</span><select value={unit} onChange={(e) => setUnit(e.target.value as FeedUnit)}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
          <label className="field full"><span>メモ</span><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={hasActivePlan ? "追加理由、様子など" : "食べ残し、変更理由など"} /></label>
        </div>
        <div className="button-row">
          <button onClick={addRecord}>{hasActivePlan ? "飼料を追加" : "追加"}</button>
          {!hasActivePlan && <button className="secondary" onClick={copyPlanToDate}>標準メニューをこの日にコピー</button>}
        </div>
      </section>

      <section className="card">
        <h2>{hasActivePlan ? "本日の標準メニュー" : `${date} の給餌履歴`}</h2>
        <p className="muted">{hasActivePlan ? "標準メニュー + 本日の例外記録で実質給餌内容を計算します。" : "栄養状態・使用量は、下記4回分を合算した1日合計で計算します。"}</p>
        {hasActivePlan ? (
          <>
            <div className="feeding-record-groups">
              {groupedPlanItems.map((group) => (
                <section className={`feeding-slot-group slot-${group.slot}`} key={group.slot}>
                  <div className="feeding-slot-heading">
                    <h3>{timeSlotLabels[group.slot]}</h3>
                    <span>{group.items.length}件</span>
                  </div>
                  <div className="feeding-record-list">
                    {group.items.map((item) => {
                      const exception = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(`${item.timeSlot}__${item.feedId}`);
                      const isEditing = editingPlanItem?.id === item.id;
                      const feedName = feedById.get(item.feedId)?.name ?? item.feedId;
                      const isSkipped = exception?.recordKind === "exception_skip";
                      const isOverridden = exception?.recordKind === "exception_override";
                      const hasMemo = exception?.recordKind === "memo" || !!exception?.memo;
                      return (
                        <article className={`feeding-record-card ${isEditing ? "editing" : ""} ${exception ? "has-exception" : ""}`} key={item.id}>
                          <div className="feeding-record-main">
                            <div>
                              <div className="record-title-row">
                                <strong>{feedName}</strong>
                                {exception && <span className="badge exception-badge">{isSkipped ? "今日は抜き" : isOverridden ? "変更あり" : "メモあり"}</span>}
                                {isEditing && <span className="badge editing-badge">編集中</span>}
                              </div>
                              {isSkipped ? (
                                <p className="record-meta">標準 {item.amount} {unitLabels[item.unit]} → 本日 0</p>
                              ) : isOverridden && exception ? (
                                <p className="record-meta">標準 {item.amount} {unitLabels[item.unit]} → 本日 {exception.amount} {unitLabels[exception.unit]}</p>
                              ) : (
                                <p className="record-meta">標準 {item.amount} {unitLabels[item.unit]}</p>
                              )}
                              {hasMemo && exception?.memo && <p className="record-memo">メモ：{exception.memo}</p>}
                            </div>
                            <div className="record-actions">
                              <button className="secondary small" onClick={() => startPlanExceptionEdit(item, "exception_override")}>量変更</button>
                              <button className="danger small" onClick={() => startPlanExceptionEdit(item, "exception_skip")}>抜いた</button>
                              <button className="secondary small" onClick={() => startPlanExceptionEdit(item, "memo")}>メモ</button>
                              {exception && <button className="secondary small" onClick={() => deleteRecord(exception.id)}>例外取消</button>}
                            </div>
                          </div>
                          {isEditing && renderEditPanel(
                            `編集中：${timeSlotLabels[item.timeSlot]} / ${feedName}`,
                            { hideAmount: editingExceptionKind === "exception_skip" || editingExceptionKind === "memo", hidePlanScope: editingExceptionKind === "memo" }
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {additions.length > 0 && (
              <>
                <h3>本日の追加飼料</h3>
                <div className="feeding-record-groups">
                  {groupedRecords.map((group) => (
                    <section className={`feeding-slot-group slot-${group.slot}`} key={group.slot}>
                      <div className="feeding-slot-heading">
                        <h3>{timeSlotLabels[group.slot]}</h3>
                        <span>{group.records.length}件</span>
                      </div>
                      <div className="feeding-record-list">
                        {group.records.map((r) => {
                          const isEditing = editingRecordId === r.id && !editingPlanItem;
                          const feedName = feedById.get(r.feedId)?.name ?? r.feedId;
                          return (
                            <article className={`feeding-record-card ${isEditing ? "editing" : ""} has-exception`} key={r.id}>
                              <div className="feeding-record-main">
                                <div>
                                  <div className="record-title-row">
                                    <strong>{feedName}</strong>
                                    <span className="badge exception-badge">追加</span>
                                    {isEditing && <span className="badge editing-badge">編集中</span>}
                                  </div>
                                  <p className="record-meta">{timeSlotLabels[r.timeSlot]} / {r.amount} {unitLabels[r.unit]}</p>
                                  {r.memo && <p className="record-memo">{r.memo}</p>}
                                </div>
                                <div className="record-actions">
                                  <button className="secondary small" onClick={() => startEdit(r)}>編集</button>
                                  <button className="danger small" onClick={() => deleteRecord(r.id)}>削除</button>
                                </div>
                              </div>
                              {isEditing && renderEditPanel(`編集中：${timeSlotLabels[r.timeSlot]} / ${feedName}`, { hidePlanScope: true })}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}

            {exceptionRecords.length > 0 && (
              <div className="exception-summary">
                <h3>本日の例外記録</h3>
                <ul>
                  {exceptionRecords.map((record) => {
                    const base = planItems.find((item) => item.id === record.basePlanItemId);
                    const feedName = feedById.get(record.feedId)?.name ?? record.feedId;
                    const beforeText = base ? `${base.amount}${unitLabels[base.unit]}` : "標準外";
                    const afterText = record.recordKind === "exception_skip" ? "抜き" : record.recordKind === "memo" ? "メモのみ" : `${record.amount}${unitLabels[record.unit]}`;
                    return <li key={record.id}>{timeSlotLabels[record.timeSlot]} {feedName} {beforeText} → {afterText}{record.memo ? ` / ${record.memo}` : ""}</li>;
                  })}
                </ul>
              </div>
            )}

            <h3>1日合計</h3>
            <div className="table-scroll">
              <table>
                <thead><tr><th>飼料</th><th>合計kg</th><th>入力回数</th></tr></thead>
                <tbody>
                  {dailyFeedTotals.map((row) => (
                    <tr key={row.feedName}>
                      <td>{row.feedName}</td>
                      <td>{formatNumber(row.totalKg, 2)} kg</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : records.length === 0 ? <p className="empty">まだ記録がありません。</p> : (
          <>
            <div className="feeding-record-groups">
              {groupedRecords.map((group) => (
                <section className={`feeding-slot-group slot-${group.slot}`} key={group.slot}>
                  <div className="feeding-slot-heading">
                    <h3>{timeSlotLabels[group.slot]}</h3>
                    <span>{group.records.length}件</span>
                  </div>
                  <div className="feeding-record-list">
                    {group.records.map((r) => {
                      const isEditing = editingRecordId === r.id && !editingPlanItem;
                      const feedName = feedById.get(r.feedId)?.name ?? r.feedId;
                      return (
                        <article className={`feeding-record-card ${isEditing ? "editing" : ""}`} key={r.id}>
                          <div className="feeding-record-main">
                            <div>
                              <div className="record-title-row">
                                <strong>{feedName}</strong>
                                {isEditing && <span className="badge editing-badge">編集中</span>}
                              </div>
                              <p className="record-meta">{timeSlotLabels[r.timeSlot]} / {r.amount} {unitLabels[r.unit]}</p>
                              {r.memo && <p className="record-memo">{r.memo}</p>}
                            </div>
                            <div className="record-actions">
                              <button className="secondary small" onClick={() => startEdit(r)}>編集</button>
                              <button className="danger small" onClick={() => deleteRecord(r.id)}>削除</button>
                            </div>
                          </div>

                          {isEditing && renderEditPanel(`編集中：${timeSlotLabels[r.timeSlot]} / ${feedName}`)}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <h3>1日合計</h3>
            <div className="table-scroll">
              <table>
                <thead><tr><th>飼料</th><th>合計kg</th><th>入力回数</th></tr></thead>
                <tbody>
                  {dailyFeedTotals.map((row) => (
                    <tr key={row.feedName}>
                      <td>{row.feedName}</td>
                      <td>{formatNumber(row.totalKg, 2)} kg</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
