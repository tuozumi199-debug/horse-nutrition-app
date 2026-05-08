import { useEffect, useState } from "react";
import { db, todayIso } from "../db/localDb";
import type { Horse } from "../types/horse";
import type { Feed } from "../types/feed";
import type { AchievementRow, NutritionIntake, NutritionRequirement } from "../types/nutrition";
import type { PageKey } from "../app/routes";
import { NutritionBarChart } from "../components/NutritionBarChart";
import { AlertBadge } from "../components/AlertBadge";
import { calculateDailyNutrition, calculateNutritionAchievement } from "../logic/nutritionCalculator";
import { findRequirementForHorse } from "../logic/requirementCalculator";
import { calculateNutritionScore } from "../logic/scoreCalculator";
import { feedingRecordFromItem, getTodayItemsForHorse } from "../logic/dataSelectors";
import { formatNumber } from "../app/utils";

export function DashboardPage({
  selectedHorseId,
  horses,
  goTo
}: {
  selectedHorseId: string;
  horses: Horse[];
  onSelectHorse: (id: string) => void;
  refreshHorses: () => Promise<void>;
  goTo: (page: PageKey) => void;
}) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [requirement, setRequirement] = useState<NutritionRequirement | undefined>();
  const [rows, setRows] = useState<AchievementRow[]>([]);
  const [intake, setIntake] = useState<NutritionIntake | undefined>();
  const horse = horses.find((h) => h.id === selectedHorseId);

  useEffect(() => {
    async function load() {
      if (!horse) return;
      const [feedList, reqList, items] = await Promise.all([
        db.feeds.toArray(),
        db.nutritionRequirements.toArray(),
        getTodayItemsForHorse(horse.id)
      ]);
      const req = findRequirementForHorse(horse, reqList);
      const daily = calculateDailyNutrition(items.map(feedingRecordFromItem), feedList);
      setFeeds(feedList);
      setRequirement(req);
      setIntake(daily);
      setRows(calculateNutritionAchievement(daily, req));
    }
    load();
  }, [horse?.id]);

  const score = calculateNutritionScore(rows);
  const alerts = rows.filter((r) => r.status === "deficient" || r.status === "excess" || r.status === "high");

  if (!horse) {
    return <div className="card">馬を登録または選択してください。</div>;
  }

  return (
    <div className="grid two">
      <section className="card hero-card">
        <div className="horse-hero">
          {horse.photoDataUrl ? <img src={horse.photoDataUrl} alt={horse.name} /> : <div className="photo-placeholder">🐴</div>}
          <div>
            <h2>{horse.name}</h2>
            <p>{horse.weightKg}kg / BCS {horse.bcs ?? "-"}</p>
            <p className="muted">今日: {todayIso()}</p>
          </div>
        </div>
        <div className="score-box">
          <span>栄養バランススコア</span>
          <strong>{score}</strong>
        </div>
        <div className="button-row">
          <button onClick={() => goTo("records")}>今日の給餌を入力</button>
          <button className="secondary" onClick={() => goTo("simulation")}>餌を調整する</button>
        </div>
      </section>

      <section className="card">
        <h2>注意アラート</h2>
        {alerts.length === 0 ? (
          <p className="ok-message">大きな不足・過剰はありません。</p>
        ) : (
          <div className="alert-list">
            {alerts.slice(0, 6).map((row) => (
              <div className="alert-line" key={row.key}>
                <span>{row.label}</span>
                <strong>{formatNumber(row.percent, 0)}%</strong>
                <AlertBadge status={row.status} />
              </div>
            ))}
          </div>
        )}
        <p className="note">栄養値・要求量はサンプルです。実運用では分析値・出典確認済みの値に差し替えてください。</p>
      </section>

      <section className="card wide">
        <h2>理想値100%に対する現在の給餌バランス</h2>
        <NutritionBarChart rows={rows} />
      </section>

      <section className="card wide">
        <h2>今日の摂取量</h2>
        <div className="metrics">
          <div><span>DE</span><strong>{formatNumber(intake?.deMcal)} Mcal</strong></div>
          <div><span>粗タンパク</span><strong>{formatNumber(intake?.crudeProteinG, 0)} g</strong></div>
          <div><span>Ca</span><strong>{formatNumber(intake?.calciumG)} g</strong></div>
          <div><span>P</span><strong>{formatNumber(intake?.phosphorusG)} g</strong></div>
          <div><span>Na</span><strong>{formatNumber(intake?.sodiumG)} g</strong></div>
          <div><span>乾物</span><strong>{formatNumber(intake?.dryMatterKg)} kg</strong></div>
          <div><span>概算コスト</span><strong>{formatNumber(intake?.cost, 0)} 円</strong></div>
          <div><span>登録飼料</span><strong>{feeds.length} 件</strong></div>
        </div>
        {requirement && <p className="muted">要求量: {requirement.source}</p>}
      </section>
    </div>
  );
}
