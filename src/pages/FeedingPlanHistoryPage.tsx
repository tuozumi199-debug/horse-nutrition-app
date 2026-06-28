import { useEffect, useMemo, useState } from "react";
import type { Horse } from "../types/horse";
import type { FeedingPlanChangeLog } from "../types/feeding";
import { currentMonth } from "../app/utils";
import { formatDiffItem, getPlanChangeLogsForMonth } from "../logic/feedingPlanHistory";

export function FeedingPlanHistoryPage({ horses }: { horses: Horse[] }) {
  const [month, setMonth] = useState(currentMonth());
  const [logs, setLogs] = useState<FeedingPlanChangeLog[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  const horseById = useMemo(() => new Map(horses.map((horse) => [horse.id, horse])), [horses]);
  const logsByDate = useMemo(() => {
    const map = new Map<string, FeedingPlanChangeLog[]>();
    for (const log of logs) {
      const list = map.get(log.changeDate) ?? [];
      list.push(log);
      map.set(log.changeDate, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);
  const selectedLogs = selectedDate ? logs.filter((log) => log.changeDate === selectedDate) : logsByDate[0]?.[1] ?? [];

  useEffect(() => {
    async function load() {
      const list = await getPlanChangeLogsForMonth(month);
      setLogs(list);
      setSelectedDate((current) => {
        if (current && list.some((log) => log.changeDate === current)) return current;
        return list[0]?.changeDate ?? "";
      });
    }
    load();
  }, [month]);

  return (
    <div className="grid two">
      <section className="card wide">
        <div className="page-heading-row">
          <div>
            <h2>標準メニュー変更履歴</h2>
            <p className="muted">標準給餌プランを反映した日付、理由、変更前後の差分を月ごとに確認できます。</p>
          </div>
          <label className="field compact">
            <span>対象月</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>
        {logs.length === 0 ? (
          <p className="empty">まだ変更履歴はありません。</p>
        ) : (
          <div className="metrics">
            <div><span>変更日数</span><strong>{logsByDate.length}</strong></div>
            <div><span>履歴件数</span><strong>{logs.length}</strong></div>
            <div><span>選択日</span><strong>{selectedDate || "-"}</strong></div>
            <div><span>対象馬</span><strong>{new Set(logs.map((log) => log.horseId)).size} 頭</strong></div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>日付</h2>
        {logsByDate.length === 0 ? (
          <p className="empty">この月の変更はありません。</p>
        ) : (
          <div className="list">
            {logsByDate.map(([date, dateLogs]) => (
              <article className={`list-card ${date === selectedDate ? "selected" : ""}`} key={date}>
                <button className="card-click" onClick={() => setSelectedDate(date)}>
                  <span>
                    <strong>{formatDate(date)}</strong>
                    <small>{dateLogs.length}件の変更</small>
                  </span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{selectedDate ? `${formatDate(selectedDate)} の変更内容` : "変更内容"}</h2>
        {selectedLogs.length === 0 ? (
          <p className="empty">日付を選択してください。</p>
        ) : (
          <div className="list">
            {selectedLogs.map((log) => (
              <article className="list-card" style={{ display: "block" }} key={log.id}>
                <h3 style={{ margin: "0 0 0.45rem" }}>{horseById.get(log.horseId)?.name ?? log.horseId}</h3>
                <p className="muted" style={{ margin: "0.2rem 0" }}>変更理由: {log.reason || "未入力"}</p>
                <p className="muted" style={{ margin: "0.2rem 0" }}>有効開始日: {log.effectiveFrom}</p>
                <p className="note" style={{ margin: "0.6rem 0" }}>{log.summary}</p>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>変更内容</th></tr></thead>
                    <tbody>
                      {(log.diffItems ?? []).length === 0 ? (
                        <tr><td>差分はありません。</td></tr>
                      ) : (
                        log.diffItems?.map((item, index) => (
                          <tr key={`${log.id}-${index}`}><td>{formatDiffItem(item)}</td></tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="muted" style={{ margin: "0.6rem 0 0" }}>
                  Plan: {log.oldPlanId ?? "なし"} → {log.newPlanId}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(date: string) {
  return date.split("-").join("/");
}
