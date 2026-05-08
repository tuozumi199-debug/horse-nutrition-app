import { useEffect, useMemo, useState } from "react";
import { db, todayIso } from "../db/localDb";
import type { Horse } from "../types/horse";
import type { Feed } from "../types/feed";
import type { AchievementRow, NutritionIntake, NutritionRequirement } from "../types/nutrition";
import { AlertBadge } from "../components/AlertBadge";
import { NutritionBarChart } from "../components/NutritionBarChart";
import { NutritionRadarChart } from "../components/NutritionRadarChart";
import { calculateDailyNutrition, calculateNutritionAchievement } from "../logic/nutritionCalculator";
import { findRequirementForHorse } from "../logic/requirementCalculator";
import { calculateNutritionScore } from "../logic/scoreCalculator";
import { feedingRecordFromItem, getActivePlanItemsForHorse } from "../logic/dataSelectors";
import { formatNumber } from "../app/utils";

export function NutritionAnalysisPage({
  horses,
  selectedHorseId
}: {
  horses: Horse[];
  selectedHorseId: string;
  onSelectHorse: (id: string) => void;
  refreshHorses: () => Promise<void>;
}) {
  const [date, setDate] = useState(todayIso());
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [intake, setIntake] = useState<NutritionIntake | undefined>();
  const [requirement, setRequirement] = useState<NutritionRequirement | undefined>();
  const [rows, setRows] = useState<AchievementRow[]>([]);
  const [mode, setMode] = useState<"record" | "plan">("record");

  const horse = horses.find((h) => h.id === selectedHorseId);
  const score = useMemo(() => calculateNutritionScore(rows), [rows]);

  useEffect(() => {
    async function load() {
      if (!horse) return;
      const [feedList, reqList, records] = await Promise.all([
        db.feeds.toArray(),
        db.nutritionRequirements.toArray(),
        db.feedingRecords.where("[horseId+date]").equals([horse.id, date]).toArray()
      ]);
      let sourceItems = records;
      let sourceMode: "record" | "plan" = "record";
      if (records.length === 0) {
        sourceItems = await getActivePlanItemsForHorse(horse.id) as any;
        sourceMode = "plan";
      }
      const req = findRequirementForHorse(horse, reqList);
      const daily = calculateDailyNutrition(sourceItems.map(feedingRecordFromItem), feedList);
      setFeeds(feedList);
      setIntake(daily);
      setRequirement(req);
      setRows(calculateNutritionAchievement(daily, req));
      setMode(sourceMode);
    }
    load();
  }, [horse?.id, date]);

  if (!horse) return <section className="card">馬を選択してください。</section>;

  return (
    <div className="grid two">
      <section className="card wide">
        <div className="page-heading-row">
          <div>
            <h2>栄養バランス分析</h2>
            <p className="muted">{mode === "record" ? "この日の給餌履歴" : "給餌履歴がないため標準メニュー"}で計算しています。</p>
          </div>
          <label className="field compact"><span>分析日</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <div className="score-line"><span>スコア</span><strong>{score}</strong><small>100に近いほど理想値に近い</small></div>
        <NutritionBarChart rows={rows} />
      </section>

      <section className="card">
        <h2>レーダー表示</h2>
        <NutritionRadarChart rows={rows} />
      </section>

      <section className="card">
        <h2>摂取量と要求量</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>項目</th><th>現在</th><th>理想</th><th>達成</th><th>判定</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{formatNumber(row.current)} {row.unit}</td>
                  <td>{formatNumber(row.requirement)} {row.unit}</td>
                  <td>{formatNumber(row.percent, 0)}%</td>
                  <td><AlertBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>解釈メモ</h2>
        <ul className="tips">
          <li>100%は登録された要求量に対する達成率です。</li>
          <li>エネルギー、タンパク、Ca/P、Na、Seなどは過不足の影響が大きいため優先して確認します。</li>
          <li>乾物摂取量、糖・デンプン、持病、運動量、体重変化は獣医師・栄養士の判断も入れて調整してください。</li>
          <li>現在の登録飼料数: {feeds.length}件。飼料マスタはいつでも更新できます。</li>
        </ul>
        {requirement && <p className="note">要求量ソース: {requirement.source}</p>}
        {intake && <p className="note">概算日額: {formatNumber(intake.cost, 0)} 円</p>}
      </section>
    </div>
  );
}
