import { Fragment, useEffect, useMemo, useState } from "react";
import { db, makeId, nowIso, todayIso } from "../db/localDb";
import type { Horse } from "../types/horse";
import type { Feed, FeedUnit } from "../types/feed";
import type { FeedingPlanItem, FeedingRecord, TimeSlot } from "../types/feeding";
import { timeSlotLabels, timeSlotOptions, unitLabels, unitOptions } from "../app/labels";
import { formatNumber } from "../app/utils";
import { getActivePlanItemsForHorse } from "../logic/dataSelectors";
import { calculateFeedAmountAsFedKg } from "../logic/nutritionCalculator";
import { createActiveFeedingPlanRevision } from "../logic/feedingPlanUpdater";
import { getHorseClass, getHorseClassLabel } from "../logic/horseClass";

type EditScope = "record-only" | "standard-menu";
type ExceptionEditKind = "exception_override" | "exception_skip" | "memo";

type EditDraft = {
  feedId: string;
  timeSlot: TimeSlot;
  amount: number;
  unit: FeedUnit;
  memo: string;
};

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
  const [planItems, setPlanItems] = useState<FeedingPlanItem[]>([]);
  const [date, setDate] = useState(todayIso());
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("morning");
  const [feedId, setFeedId] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState<FeedUnit>("kg");
  const [memo, setMemo] = useState("");
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | undefined>();
  const [editingPlanItem, setEditingPlanItem] = useState<FeedingPlanItem | undefined>();
  const [editingExceptionKind, setEditingExceptionKind] = useState<ExceptionEditKind | undefined>();
  const [editDraft, setEditDraft] = useState<EditDraft | undefined>();
  const [editScope, setEditScope] = useState<EditScope>("record-only");
  const [editReason, setEditReason] = useState("");

  const horse = horses.find((h) => h.id === selectedHorseId);
  const hasActivePlan = planItems.length > 0;
  const feedById = useMemo(() => new Map(feeds.map((f) => [f.id, f])), [feeds]);
  const planItemsBySlot = useMemo(() => groupByTimeSlot(planItems), [planItems]);
  const recordsBySlot = useMemo(() => groupByTimeSlot(records), [records]);
  const exceptionRecords = useMemo(() => records.filter(isExceptionRecord), [records]);
  const additions = useMemo(
    () => exceptionRecords.filter((record) => record.recordKind === "exception_add"),
    [exceptionRecords]
  );
  const exceptionByPlanItem = useMemo(() => {
    const map = new Map<string, FeedingRecord>();
    for (const record of exceptionRecords) {
      if (record.recordKind === "exception_add") continue;
      const key = record.basePlanItemId || buildPlanItemFallbackKey(record.timeSlot, record.feedId);
      map.set(key, record);
    }
    return map;
  }, [exceptionRecords]);
  const effectiveItems = useMemo(() => {
    if (!hasActivePlan) return records;
    const baseItems = planItems.flatMap((item) => {
      const exception = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(buildPlanItemFallbackKey(item.timeSlot, item.feedId));
      if (exception?.recordKind === "exception_skip") return [];
      if (exception?.recordKind === "exception_override") return [{ ...item, amount: exception.amount, unit: exception.unit }];
      return [item];
    });
    return [...baseItems, ...additions];
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

  function onEditFeedChange(id: string) {
    const feed = feedById.get(id);
    setEditDraft((draft) => draft ? { ...draft, feedId: id, unit: feed?.defaultUnit ?? draft.unit } : draft);
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
    setIsManualFormOpen(false);
    await load();
  }

  function startRecordEdit(record: FeedingRecord) {
    setEditingRecordId(record.id);
    setEditingPlanItem(undefined);
    setEditingExceptionKind(undefined);
    setEditDraft({
      feedId: record.feedId,
      timeSlot: record.timeSlot,
      amount: record.amount,
      unit: record.unit,
      memo: record.memo ?? ""
    });
    setEditScope("record-only");
    setEditReason("");
  }

  function startPlanExceptionEdit(item: FeedingPlanItem, kind: ExceptionEditKind) {
    const existing = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(buildPlanItemFallbackKey(item.timeSlot, item.feedId));
    setEditingRecordId(existing?.id);
    setEditingPlanItem(item);
    setEditingExceptionKind(kind);
    setEditDraft({
      feedId: item.feedId,
      timeSlot: item.timeSlot,
      amount: kind === "exception_skip" || kind === "memo" ? existing?.amount ?? 0 : existing?.amount ?? item.amount,
      unit: existing?.unit ?? item.unit,
      memo: existing?.memo ?? ""
    });
    setEditScope("record-only");
    setEditReason("");
  }

  function cancelEdit() {
    setEditingRecordId(undefined);
    setEditingPlanItem(undefined);
    setEditingExceptionKind(undefined);
    setEditDraft(undefined);
    setEditScope("record-only");
    setEditReason("");
  }

  async function saveRecordEdit(record: FeedingRecord) {
    if (!editDraft) return;
    if (!editDraft.feedId) return alert("飼料を選択してください");
    if (requiresAmount(record.recordKind) && !editDraft.amount) return alert("量を入力してください");
    if (editScope === "standard-menu" && !editReason.trim()) return alert("標準メニューにも反映する場合は変更理由を入力してください");

    const now = nowIso();
    const updatedRecord: FeedingRecord = {
      ...record,
      feedId: editDraft.feedId,
      timeSlot: editDraft.timeSlot,
      amount: Number(editDraft.amount),
      unit: editDraft.unit,
      memo: editDraft.memo,
      updatedAt: now
    };
    await db.feedingRecords.put(updatedRecord);

    if (editScope === "standard-menu") {
      await createRevisionFromRecord(record, updatedRecord, editReason.trim());
    }

    cancelEdit();
    await load();
  }

  async function savePlanExceptionEdit() {
    if (!editingPlanItem || !editingExceptionKind || !editDraft || !selectedHorseId) return;
    if (editingExceptionKind === "exception_override" && !editDraft.amount) return alert("量を入力してください");
    if (editScope === "standard-menu" && editingExceptionKind !== "memo" && !editReason.trim()) {
      return alert("標準メニューにも反映する場合は変更理由を入力してください");
    }

    const now = nowIso();
    const existing = editingRecordId ? await db.feedingRecords.get(editingRecordId) : undefined;
    const exceptionRecord: FeedingRecord = {
      id: existing?.id ?? makeId("REC"),
      horseId: selectedHorseId,
      date,
      timeSlot: editingPlanItem.timeSlot,
      feedId: editingPlanItem.feedId,
      amount: editingExceptionKind === "exception_override" ? Number(editDraft.amount) : 0,
      unit: editDraft.unit,
      memo: editDraft.memo,
      recordKind: editingExceptionKind,
      source: "standard_exception",
      basePlanItemId: editingPlanItem.id,
      isException: true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    await db.feedingRecords.put(exceptionRecord);

    if (editScope === "standard-menu" && editingExceptionKind !== "memo") {
      await createRevisionFromPlanException(editingPlanItem, editingExceptionKind, editDraft, editReason.trim());
    }

    cancelEdit();
    await load();
  }

  async function createRevisionFromRecord(originalRecord: FeedingRecord, updatedRecord: FeedingRecord, reason: string) {
    if (updatedRecord.recordKind === "memo") return;
    const activePlanItems = await getActivePlanItemsForHorse(originalRecord.horseId);
    if (activePlanItems.length === 0) return alert("反映先の有効な標準メニューがありません。");

    let matched = false;
    const nextPlanItems = activePlanItems.map((item, idx) => {
      const isTarget = originalRecord.basePlanItemId
        ? item.id === originalRecord.basePlanItemId
        : item.timeSlot === originalRecord.timeSlot && item.feedId === originalRecord.feedId;
      if (!isTarget) return toRevisionItem(item, idx);
      matched = true;
      return {
        timeSlot: updatedRecord.timeSlot,
        feedId: updatedRecord.feedId,
        amount: updatedRecord.recordKind === "exception_skip" ? 0 : Number(updatedRecord.amount),
        unit: updatedRecord.unit,
        sortOrder: item.sortOrder || idx + 1
      };
    });

    if (!matched && updatedRecord.recordKind !== "exception_skip") {
      nextPlanItems.push({
        timeSlot: updatedRecord.timeSlot,
        feedId: updatedRecord.feedId,
        amount: Number(updatedRecord.amount),
        unit: updatedRecord.unit,
        sortOrder: Math.max(0, ...activePlanItems.map((item) => item.sortOrder ?? 0)) + 1
      });
    }

    await createActiveFeedingPlanRevision({
      horseId: originalRecord.horseId,
      effectiveFrom: updatedRecord.date,
      planName: `給餌記録編集 ${updatedRecord.date}`,
      memo: `${updatedRecord.date} の給餌記録編集から作成`,
      reason,
      source: "給餌記録の編集",
      items: nextPlanItems
    });
  }

  async function createRevisionFromPlanException(item: FeedingPlanItem, kind: ExceptionEditKind, draft: EditDraft, reason: string) {
    const nextPlanItems = planItems.map((planItem, idx) => {
      if (planItem.id !== item.id) return toRevisionItem(planItem, idx);
      return {
        timeSlot: planItem.timeSlot,
        feedId: planItem.feedId,
        amount: kind === "exception_skip" ? 0 : Number(draft.amount),
        unit: draft.unit,
        sortOrder: planItem.sortOrder || idx + 1
      };
    });

    await createActiveFeedingPlanRevision({
      horseId: selectedHorseId,
      effectiveFrom: date,
      planName: `給餌例外反映 ${date}`,
      memo: `${date} の給餌例外から作成`,
      reason,
      source: "給餌記録の編集",
      items: nextPlanItems
    });
  }

  async function deleteRecord(id: string) {
    await db.feedingRecords.delete(id);
    if (editingRecordId === id) cancelEdit();
    await load();
  }

  async function copyPlanToDate() {
    if (!selectedHorseId) return;
    const activePlanItems = await getActivePlanItemsForHorse(selectedHorseId);
    if (activePlanItems.length === 0) return alert("有効な標準メニューがありません。シミュレーション画面で標準メニューを作成できます。");
    const now = nowIso();
    const recordsToAdd: FeedingRecord[] = activePlanItems.map((item: FeedingPlanItem) => ({
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

  return (
    <div className="grid two">
      <section className="card wide">
        <div className="page-heading-row">
          <div className="selected-horse-banner">
            <span className="selected-horse-label">選択中の馬</span>
            <div className="horse-title-line">
              <strong className="selected-horse-name">{horse.name}</strong>
              <span className={`horse-class-badge horse-class-${getHorseClass(horse)}`}>{getHorseClassLabel(horse)}</span>
            </div>
            <span className="selected-horse-context">本日の給餌管理</span>
          </div>
          <label className="field compact"><span>日付</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
      </section>

      <section className="card wide">
        <div className="page-heading-row">
          <div>
            <h2>本日の標準メニュー</h2>
            <p className="muted">有効な標準メニューを時間帯ごとに表示しています。</p>
          </div>
          <button className="secondary" onClick={copyPlanToDate}>標準メニューをこの日にコピー</button>
        </div>
        {planItems.length === 0 ? <p className="empty">有効な標準メニューがありません。</p> : (
          <div className="time-slot-grid">
            {timeSlotOptions.map((slot) => (
              <section className={`time-slot-card slot-${slot}`} key={slot}>
                <h3>{timeSlotLabels[slot]}</h3>
                {(planItemsBySlot.get(slot) ?? []).length === 0 ? <p className="muted">設定なし</p> : (
                  <ul className="slot-feed-list">
                    {(planItemsBySlot.get(slot) ?? []).map((item) => {
                      const exception = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(buildPlanItemFallbackKey(item.timeSlot, item.feedId));
                      return (
                        <Fragment key={item.id}>
                          <li className="with-action">
                            <span>
                              {feedById.get(item.feedId)?.name ?? item.feedId}
                              {exception && <small>{formatExceptionSummary(exception, item, unitLabels)}</small>}
                            </span>
                            <strong>{formatNumber(item.amount, 2)} {unitLabels[item.unit]}</strong>
                            <span className="record-actions">
                              <button className="secondary small" onClick={() => startPlanExceptionEdit(item, "exception_override")}>量変更</button>
                              <button className="secondary small" onClick={() => startPlanExceptionEdit(item, "exception_skip")}>抜き</button>
                              <button className="secondary small" onClick={() => startPlanExceptionEdit(item, "memo")}>メモ</button>
                            </span>
                          </li>
                          {editingPlanItem?.id === item.id && editDraft && (
                            <li className="record-edit-panel">
                              {renderPlanExceptionEditPanel(editingExceptionKind, editDraft, editScope, editReason, setEditDraft, setEditScope, setEditReason, savePlanExceptionEdit, cancelEdit)}
                            </li>
                          )}
                        </Fragment>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="card wide">
        <h2>例外・手入力の状態</h2>
        {records.length === 0 ? (
          <p className="note">この日は手入力記録がありません。栄養分析では標準メニューを使って計算されます。</p>
        ) : (
          <p className="note">{records.length}件の例外記録・手入力記録があります。栄養分析ではこの日の記録を優先して計算されます。</p>
        )}
      </section>

      <section className="card wide subtle-card">
        <div className="page-heading-row">
          <div>
            <h2>標準とは違う内容を記録</h2>
            <p className="muted">量変更、食べ残し、抜き、追加、メモがある時だけ開いて入力します。</p>
          </div>
          <button className="secondary" onClick={() => setIsManualFormOpen((open) => !open)}>
            {isManualFormOpen ? "入力欄を閉じる" : "標準と違う内容を記録する"}
          </button>
        </div>
        {isManualFormOpen && (
          <>
            <div className="form-grid">
              <label className="field"><span>時間帯</span><select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}>{timeSlotOptions.map((t) => <option key={t} value={t}>{timeSlotLabels[t]}</option>)}</select></label>
              <label className="field"><span>飼料</span><select value={feedId} onChange={(e) => onFeedChange(e.target.value)}>{feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
              <label className="field"><span>量</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
              <label className="field"><span>単位</span><select value={unit} onChange={(e) => setUnit(e.target.value as FeedUnit)}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
              <label className="field full"><span>メモ</span><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="食べ残し、量変更、抜き、追加など" /></label>
            </div>
            <div className="button-row">
              <button onClick={addRecord}>記録を追加</button>
            </div>
          </>
        )}
      </section>

      <section className="card wide">
        <h2>本日の例外記録・手入力記録</h2>
        {records.length === 0 ? <p className="empty">まだ例外記録・手入力記録はありません。</p> : (
          <>
            <div className="time-slot-grid">
              {timeSlotOptions.map((slot) => {
                const slotRecords = recordsBySlot.get(slot) ?? [];
                if (slotRecords.length === 0) return null;
                return (
                  <section className={`time-slot-card slot-${slot}`} key={slot}>
                    <h3>{timeSlotLabels[slot]}</h3>
                    <ul className="slot-feed-list record-list">
                      {slotRecords.map((record) => (
                        <Fragment key={record.id}>
                          <li className="with-action">
                            <span>
                              <small className="record-kind-label">{getRecordKindLabel(record)}</small>
                              {feedById.get(record.feedId)?.name ?? record.feedId}
                              <small>{record.memo}</small>
                            </span>
                            <strong>{formatRecordAmount(record, unitLabels)}</strong>
                            <span className="record-actions">
                              <button className="secondary small" onClick={() => startRecordEdit(record)}>編集</button>
                              <button className="danger small" onClick={() => deleteRecord(record.id)}>削除</button>
                            </span>
                          </li>
                          {editingRecordId === record.id && !editingPlanItem && editDraft && (
                            <li className="record-edit-panel">
                              {renderRecordEditPanel(record, editDraft, feeds, editScope, editReason, setEditDraft, onEditFeedChange, setEditScope, setEditReason, () => saveRecordEdit(record), cancelEdit)}
                            </li>
                          )}
                        </Fragment>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            <h3>1日合計</h3>
            <div className="table-scroll">
              <table>
                <thead><tr><th>飼料</th><th>合計 kg</th><th>入力回数</th></tr></thead>
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

function renderRecordEditPanel(
  record: FeedingRecord,
  draft: EditDraft,
  feeds: Feed[],
  scope: EditScope,
  reason: string,
  setDraft: (draft: EditDraft) => void,
  onFeedChange: (id: string) => void,
  setScope: (scope: EditScope) => void,
  setReason: (reason: string) => void,
  onSave: () => void,
  onCancel: () => void
) {
  return (
    <>
      <div className="form-grid">
        <label className="field"><span>時間帯</span><select value={draft.timeSlot} onChange={(e) => setDraft({ ...draft, timeSlot: e.target.value as TimeSlot })}>{timeSlotOptions.map((t) => <option key={t} value={t}>{timeSlotLabels[t]}</option>)}</select></label>
        <label className="field"><span>飼料</span><select value={draft.feedId} onChange={(e) => onFeedChange(e.target.value)}>{feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label className="field"><span>量</span><input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></label>
        <label className="field"><span>単位</span><select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as FeedUnit })}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
        <label className="field full"><span>メモ</span><input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} /></label>
      </div>
      {record.recordKind !== "memo" && (
        <EditScopeOptions scope={scope} reason={reason} setScope={setScope} setReason={setReason} id={record.id} />
      )}
      <div className="button-row">
        <button onClick={onSave}>保存</button>
        <button className="secondary" onClick={onCancel}>キャンセル</button>
      </div>
    </>
  );
}

function renderPlanExceptionEditPanel(
  kind: ExceptionEditKind | undefined,
  draft: EditDraft,
  scope: EditScope,
  reason: string,
  setDraft: (draft: EditDraft) => void,
  setScope: (scope: EditScope) => void,
  setReason: (reason: string) => void,
  onSave: () => void,
  onCancel: () => void
) {
  return (
    <>
      <div className="form-grid">
        {kind === "exception_override" && (
          <>
            <label className="field"><span>本日の量</span><input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></label>
            <label className="field"><span>単位</span><select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as FeedUnit })}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
          </>
        )}
        <label className="field full"><span>メモ</span><input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} placeholder="理由、食べ残し、様子など" /></label>
      </div>
      {kind !== "memo" && <EditScopeOptions scope={scope} reason={reason} setScope={setScope} setReason={setReason} id="plan-exception" />}
      <div className="button-row">
        <button onClick={onSave}>保存</button>
        <button className="secondary" onClick={onCancel}>キャンセル</button>
      </div>
    </>
  );
}

function EditScopeOptions({
  scope,
  reason,
  setScope,
  setReason,
  id
}: {
  scope: EditScope;
  reason: string;
  setScope: (scope: EditScope) => void;
  setReason: (reason: string) => void;
  id: string;
}) {
  return (
    <>
      <div className="edit-scope-options">
        <label><input type="radio" name={`edit-scope-${id}`} checked={scope === "record-only"} onChange={() => setScope("record-only")} />この日の給餌記録だけ修正する</label>
        <label><input type="radio" name={`edit-scope-${id}`} checked={scope === "standard-menu"} onChange={() => setScope("standard-menu")} />この日以降の標準メニューにも反映する</label>
      </div>
      {scope === "standard-menu" && (
        <label className="field full"><span>変更理由</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：運動量増加のため、食べ残し傾向が続くため" /></label>
      )}
    </>
  );
}

function groupByTimeSlot<T extends { timeSlot: TimeSlot }>(items: T[]) {
  const grouped = new Map<TimeSlot, T[]>();
  for (const slot of timeSlotOptions) grouped.set(slot, []);
  for (const item of items) grouped.get(item.timeSlot)?.push(item);
  return grouped;
}

function isExceptionRecord(record: FeedingRecord) {
  return Boolean(
    record.isException ||
    record.source === "standard_exception" ||
    record.recordKind === "exception_override" ||
    record.recordKind === "exception_add" ||
    record.recordKind === "exception_skip" ||
    record.recordKind === "memo"
  );
}

function requiresAmount(kind: FeedingRecord["recordKind"]) {
  return kind !== "exception_skip" && kind !== "memo";
}

function toRevisionItem(item: FeedingPlanItem, idx: number) {
  return {
    timeSlot: item.timeSlot,
    feedId: item.feedId,
    amount: item.amount,
    unit: item.unit,
    sortOrder: item.sortOrder || idx + 1
  };
}

function buildPlanItemFallbackKey(slot: TimeSlot, feedId: string) {
  return `${slot}__${feedId}`;
}

function formatRecordAmount(record: FeedingRecord, labels: Record<FeedUnit, string>) {
  if (record.recordKind === "exception_skip") return "抜き";
  if (record.recordKind === "memo") return "メモのみ";
  return `${formatNumber(record.amount, 2)} ${labels[record.unit]}`;
}

function formatExceptionSummary(record: FeedingRecord, item: FeedingPlanItem, labels: Record<FeedUnit, string>) {
  if (record.recordKind === "exception_skip") return "本日は抜き";
  if (record.recordKind === "memo") return record.memo ? `メモ: ${record.memo}` : "メモあり";
  if (record.recordKind === "exception_override") {
    return `標準 ${formatNumber(item.amount, 2)} ${labels[item.unit]} → 本日 ${formatNumber(record.amount, 2)} ${labels[record.unit]}`;
  }
  return record.memo ?? "";
}

function getRecordKindLabel(record: FeedingRecord) {
  switch (record.recordKind) {
    case "exception_override":
      return "量変更";
    case "exception_add":
      return "追加";
    case "exception_skip":
      return "抜き";
    case "memo":
      return "メモ";
    case "manual":
      return "手入力";
    default:
      return "記録";
  }
}
