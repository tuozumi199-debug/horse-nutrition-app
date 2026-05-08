import { useEffect, useMemo, useState } from "react";
import { db } from "../db/localDb";
import type { Feed } from "../types/feed";
import type { FeedingRecord } from "../types/feeding";
import type { Horse } from "../types/horse";
import { currentMonth, formatNumber, monthRange } from "../app/utils";
import { calculateFeedAmountAsFedKg } from "../logic/nutritionCalculator";
import { downloadCsv } from "../logic/csvExporter";
import { CsvExportButton } from "../components/CsvExportButton";

type SummaryRow = {
  horseId: string;
  horseName: string;
  feedId: string;
  feedName: string;
  totalAsFedKg: number;
  count: number;
  estimatedCost: number;
};

export function MonthlySummaryPage() {
  const [month, setMonth] = useState(currentMonth());
  const [horses, setHorses] = useState<Horse[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [records, setRecords] = useState<FeedingRecord[]>([]);

  useEffect(() => {
    async function load() {
      const { start, next } = monthRange(month);
      const [horseList, feedList, recordList] = await Promise.all([
        db.horses.toArray(),
        db.feeds.toArray(),
        db.feedingRecords.where("date").between(start, next, true, false).toArray()
      ]);
      setHorses(horseList);
      setFeeds(feedList);
      setRecords(recordList);
    }
    load();
  }, [month]);

  const rows = useMemo<SummaryRow[]>(() => {
    const feedById = new Map(feeds.map((f) => [f.id, f]));
    const horseById = new Map(horses.map((h) => [h.id, h]));
    const map = new Map<string, SummaryRow>();
    for (const record of records) {
      const feed = feedById.get(record.feedId);
      if (!feed) continue;
      const horse = horseById.get(record.horseId);
      const key = `${record.horseId}__${record.feedId}`;
      const kg = calculateFeedAmountAsFedKg(record.amount, record.unit, feed);
      const existing = map.get(key) ?? {
        horseId: record.horseId,
        horseName: horse?.name ?? record.horseId,
        feedId: record.feedId,
        feedName: feed.name,
        totalAsFedKg: 0,
        count: 0,
        estimatedCost: 0
      };
      existing.totalAsFedKg += kg;
      existing.estimatedCost += kg * (feed.pricePerKg ?? 0);
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => `${a.horseName}${a.feedName}`.localeCompare(`${b.horseName}${b.feedName}`));
  }, [records, horses, feeds]);

  function exportRows() {
    downloadCsv(`horse-feed-summary-${month}.csv`, rows.map((row) => ({
      月: month,
      馬ID: row.horseId,
      馬名: row.horseName,
      飼料ID: row.feedId,
      飼料名: row.feedName,
      合計kg: round(row.totalAsFedKg, 3),
      記録件数: row.count,
      概算金額円: Math.round(row.estimatedCost)
    })));
  }

  return (
    <section className="card wide-card">
      <div className="page-heading-row">
        <div>
          <h2>月次集計・CSV出力</h2>
          <p className="muted">給餌履歴から、馬別・飼料別の月間使用量を集計します。</p>
        </div>
        <div className="button-row">
          <label className="field compact"><span>対象月</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <CsvExportButton onClick={exportRows}>CSV出力</CsvExportButton>
        </div>
      </div>
      <div className="metrics">
        <div><span>記録件数</span><strong>{records.length}</strong></div>
        <div><span>馬数</span><strong>{new Set(records.map((r) => r.horseId)).size}</strong></div>
        <div><span>飼料種類</span><strong>{new Set(records.map((r) => r.feedId)).size}</strong></div>
        <div><span>概算合計</span><strong>{formatNumber(rows.reduce((sum, r) => sum + r.estimatedCost, 0), 0)} 円</strong></div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>馬</th><th>飼料</th><th>合計kg</th><th>記録件数</th><th>概算金額</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.horseId}-${row.feedId}`}>
                <td>{row.horseName}</td>
                <td>{row.feedName}</td>
                <td>{formatNumber(row.totalAsFedKg, 2)}</td>
                <td>{row.count}</td>
                <td>{formatNumber(row.estimatedCost, 0)} 円</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function round(value: number, digits = 1) {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}
