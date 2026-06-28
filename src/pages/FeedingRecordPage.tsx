import { useEffect, useMemo, useState } from "react";
import { db, makeId, nowIso, todayIso } from "../db/localDb";
import type { Horse } from "../types/horse";
import type { Feed, FeedUnit } from "../types/feed";
import type { FeedingPlanItem, FeedingRecord, TimeSlot } from "../types/feeding";
import { timeSlotLabels, timeSlotOptions, unitLabels, unitOptions } from "../app/labels";
import { formatNumber } from "../app/utils";
import { getActivePlanItemsForHorse } from "../logic/dataSelectors";
import { calculateFeedAmountAsFedKg } from "../logic/nutritionCalculator";

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

  const horse = horses.find((h) => h.id === selectedHorseId);
  const feedById = useMemo(() => new Map(feeds.map((f) => [f.id, f])), [feeds]);
  const planItemsBySlot = useMemo(() => groupByTimeSlot(planItems), [planItems]);
  const recordsBySlot = useMemo(() => groupByTimeSlot(records), [records]);
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
      createdAt: now,
      updatedAt: now
    };
    await db.feedingRecords.put(record);
    setMemo("");
    setIsManualFormOpen(false);
    await load();
  }

  async function deleteRecord(id: string) {
    await db.feedingRecords.delete(id);
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
            <strong className="selected-horse-name">{horse.name}</strong>
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
                    {(planItemsBySlot.get(slot) ?? []).map((item) => (
                      <li key={item.id}>
                        <span>{feedById.get(item.feedId)?.name ?? item.feedId}</span>
                        <strong>{formatNumber(item.amount, 2)} {unitLabels[item.unit]}</strong>
                      </li>
                    ))}
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
          <p className="note">{records.length}件の手入力記録があります。栄養分析ではこの日の記録を優先して計算されます。</p>
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
        {records.length === 0 ? <p className="empty">まだ手入力記録はありません。</p> : (
          <>
            <div className="time-slot-grid">
              {timeSlotOptions.map((slot) => {
                const slotRecords = recordsBySlot.get(slot) ?? [];
                if (slotRecords.length === 0) return null;
                return (
                  <section className={`time-slot-card slot-${slot}`} key={slot}>
                    <h3>{timeSlotLabels[slot]}</h3>
                    <ul className="slot-feed-list">
                      {slotRecords.map((record) => (
                        <li className="with-action" key={record.id}>
                          <span>{feedById.get(record.feedId)?.name ?? record.feedId}<small>{record.memo}</small></span>
                          <strong>{formatNumber(record.amount, 2)} {unitLabels[record.unit]}</strong>
                          <button className="danger small" onClick={() => deleteRecord(record.id)}>削除</button>
                        </li>
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

function groupByTimeSlot<T extends { timeSlot: TimeSlot }>(items: T[]) {
  const grouped = new Map<TimeSlot, T[]>();
  for (const slot of timeSlotOptions) grouped.set(slot, []);
  for (const item of items) grouped.get(item.timeSlot)?.push(item);
  return grouped;
}
