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

  const horse = horses.find((h) => h.id === selectedHorseId);
  const feedById = useMemo(() => new Map(feeds.map((f) => [f.id, f])), [feeds]);
  const dailyFeedTotals = useMemo(() => {
    const totals = new Map<string, { feedName: string; totalKg: number; count: number }>();
    for (const record of records) {
      const feed = feedById.get(record.feedId);
      if (!feed) continue;
      const current = totals.get(record.feedId) ?? { feedName: feed.name, totalKg: 0, count: 0 };
      current.totalKg += calculateFeedAmountAsFedKg(record.amount, record.unit, feed);
      current.count += 1;
      totals.set(record.feedId, current);
    }
    return Array.from(totals.values()).sort((a, b) => a.feedName.localeCompare(b.feedName));
  }, [records, feedById]);

  async function load() {
    const feedList = (await db.feeds.toArray()).filter((feed) => feed.isActive);
    setFeeds(feedList);
    setFeedId((prev) => prev || feedList[0]?.id || "");
    if (selectedHorseId) {
      const list = await db.feedingRecords.where("[horseId+date]").equals([selectedHorseId, date]).toArray();
      const order = new Map(timeSlotOptions.map((slot, idx) => [slot, idx]));
      setRecords(list.sort((a, b) => (order.get(a.timeSlot) ?? 99) - (order.get(b.timeSlot) ?? 99)));
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
    setEditAmount(record.amount);
    setEditUnit(record.unit);
    setEditMemo(record.memo ?? "");
    setEditScope("recordOnly");
    setEditReason("");
  }

  function cancelEdit() {
    setEditingRecordId("");
    setEditScope("recordOnly");
    setEditReason("");
  }

  async function saveEdit() {
    const record = records.find((item) => item.id === editingRecordId);
    if (!record) return;
    if (!editAmount) return alert("量を入力してください");

    const now = nowIso();
    const recordPatch = {
      amount: Number(editAmount),
      unit: editUnit,
      memo: editMemo,
      updatedAt: now
    };

    if (editScope === "recordOnly") {
      await db.feedingRecords.update(record.id, recordPatch);
      cancelEdit();
      await load();
      return;
    }

    const planItems = await getActivePlanItemsForHorse(record.horseId);
    const targetIndex = planItems.findIndex((item) => item.timeSlot === record.timeSlot && item.feedId === record.feedId);
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
      items: planItems.map((item, idx) => ({
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

  return (
    <div className="grid two">
      <section className="card">
        <h2>給餌記録入力</h2>
        <p className="muted">対象馬: <strong>{horse.name}</strong> / 朝・昼・夕・夕飼いの4回を個別に入力できます。</p>
        <div className="form-grid">
          <label className="field"><span>日付</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field"><span>時間帯</span><select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}>{timeSlotOptions.map((t) => <option key={t} value={t}>{timeSlotLabels[t]}</option>)}</select></label>
          <label className="field"><span>飼料</span><select value={feedId} onChange={(e) => onFeedChange(e.target.value)}>{feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
          <label className="field"><span>量</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <label className="field"><span>単位</span><select value={unit} onChange={(e) => setUnit(e.target.value as FeedUnit)}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
          <label className="field full"><span>メモ</span><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="食べ残し、変更理由など" /></label>
        </div>
        <div className="button-row">
          <button onClick={addRecord}>追加</button>
          <button className="secondary" onClick={copyPlanToDate}>標準メニューをこの日にコピー</button>
        </div>
      </section>

      <section className="card">
        <h2>{date} の給餌履歴</h2>
        <p className="muted">栄養状態・使用量は、下記4回分を合算した1日合計で計算します。</p>
        {records.length === 0 ? <p className="empty">まだ記録がありません。</p> : (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>時間帯</th><th>飼料</th><th>量</th><th>メモ</th><th></th></tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{timeSlotLabels[r.timeSlot]}</td>
                      <td>{feedById.get(r.feedId)?.name ?? r.feedId}</td>
                      <td>{r.amount} {unitLabels[r.unit]}</td>
                      <td>{r.memo}</td>
                      <td>
                        <div className="button-row">
                          <button className="secondary small" onClick={() => startEdit(r)}>編集</button>
                          <button className="danger small" onClick={() => deleteRecord(r.id)}>削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editingRecordId && (
              <section className="edit-panel">
                <h3>給餌記録の編集</h3>
                <div className="form-grid">
                  <label className="field"><span>量</span><input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(Number(e.target.value))} /></label>
                  <label className="field"><span>単位</span><select value={editUnit} onChange={(e) => setEditUnit(e.target.value as FeedUnit)}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
                  <label className="field full"><span>メモ</span><input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} /></label>
                  <fieldset className="field full radio-field">
                    <legend>反映範囲</legend>
                    <label><input type="radio" name="editScope" checked={editScope === "recordOnly"} onChange={() => setEditScope("recordOnly")} /> この日の給餌記録だけ修正する</label>
                    <label><input type="radio" name="editScope" checked={editScope === "recordAndPlan"} onChange={() => setEditScope("recordAndPlan")} /> この日以降の標準メニューにも反映する</label>
                  </fieldset>
                  {editScope === "recordAndPlan" && (
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
        )}
      </section>
    </div>
  );
}
