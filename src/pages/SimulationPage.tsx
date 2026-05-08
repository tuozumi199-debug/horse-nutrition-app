import { useEffect, useMemo, useState } from "react";
import { db, makeId, todayIso } from "../db/localDb";
import type { Horse } from "../types/horse";
import type { Feed, FeedUnit } from "../types/feed";
import type { TimeSlot } from "../types/feeding";
import type { AchievementRow } from "../types/nutrition";
import type { SimulationItem } from "../types/simulation";
import { timeSlotLabels, timeSlotOptions, unitLabels, unitOptions } from "../app/labels";
import { NutritionBarChart } from "../components/NutritionBarChart";
import { calculateDailyNutrition, calculateNutritionAchievement } from "../logic/nutritionCalculator";
import { findRequirementForHorse } from "../logic/requirementCalculator";
import { calculateNutritionScore } from "../logic/scoreCalculator";
import { getActivePlanItemsForHorse } from "../logic/dataSelectors";
import { applySimulationToPlan, saveSimulationScenario } from "../logic/simulationEngine";
import { formatNumber } from "../app/utils";

type WorkItem = Omit<SimulationItem, "id" | "scenarioId">;

export function SimulationPage({
  horses,
  selectedHorseId
}: {
  horses: Horse[];
  selectedHorseId: string;
  onSelectHorse: (id: string) => void;
  refreshHorses: () => Promise<void>;
}) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [currentRows, setCurrentRows] = useState<AchievementRow[]>([]);
  const [simRows, setSimRows] = useState<AchievementRow[]>([]);
  const [savedScenarioId, setSavedScenarioId] = useState<string>("");
  const [scenarioName, setScenarioName] = useState("栄養調整案");

  const horse = horses.find((h) => h.id === selectedHorseId);
  const feedById = useMemo(() => new Map(feeds.map((f) => [f.id, f])), [feeds]);
  const currentScore = useMemo(() => calculateNutritionScore(currentRows), [currentRows]);
  const simScore = useMemo(() => calculateNutritionScore(simRows), [simRows]);

  async function load() {
    if (!horse) return;
    const [feedList, reqList, planItems] = await Promise.all([
      db.feeds.toArray(),
      db.nutritionRequirements.toArray(),
      getActivePlanItemsForHorse(horse.id)
    ]);
    const req = findRequirementForHorse(horse, reqList);
    const workItems: WorkItem[] = planItems.map((item) => ({
      timeSlot: item.timeSlot,
      feedId: item.feedId,
      currentAmount: item.amount,
      simulatedAmount: item.amount,
      unit: item.unit
    }));
    setFeeds(feedList.filter((f) => f.isActive));
    setItems(workItems);
    const current = calculateDailyNutrition(workItems.map((i) => ({ feedId: i.feedId, amount: i.currentAmount, unit: i.unit })), feedList);
    const simulated = calculateDailyNutrition(workItems.map((i) => ({ feedId: i.feedId, amount: i.simulatedAmount, unit: i.unit })), feedList);
    setCurrentRows(calculateNutritionAchievement(current, req));
    setSimRows(calculateNutritionAchievement(simulated, req));
    setSavedScenarioId("");
  }

  useEffect(() => { load(); }, [horse?.id]);

  useEffect(() => {
    async function recalc() {
      if (!horse) return;
      const req = findRequirementForHorse(horse, await db.nutritionRequirements.toArray());
      const simulated = calculateDailyNutrition(items.map((i) => ({ feedId: i.feedId, amount: i.simulatedAmount, unit: i.unit })), feeds);
      setSimRows(calculateNutritionAchievement(simulated, req));
    }
    recalc();
  }, [JSON.stringify(items), feeds.length, horse?.id]);

  function updateItem(index: number, patch: Partial<WorkItem>) {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
    setSavedScenarioId("");
  }

  function addItem() {
    const feed = feeds[0];
    if (!feed) return;
    setItems((prev) => [
      ...prev,
      { timeSlot: "morning", feedId: feed.id, currentAmount: 0, simulatedAmount: 0.1, unit: feed.defaultUnit }
    ]);
  }

  function deleteItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function makeSuggestion() {
    const rowsByKey = new Map(simRows.map((r) => [r.key, r]));
    const next = [...items];
    const findFeed = (predicate: (feed: Feed) => boolean) => feeds.find(predicate);
    const hasFeed = (feedId: string) => next.findIndex((item) => item.feedId === feedId);
    const addOrIncrease = (feed: Feed | undefined, amountKg: number) => {
      if (!feed) return;
      const idx = hasFeed(feed.id);
      const unit: FeedUnit = feed.defaultUnit;
      const amount = unit === "scoop" && feed.gramsPerScoop ? amountKg / (feed.gramsPerScoop / 1000) : unit === "g" ? amountKg * 1000 : amountKg;
      if (idx >= 0) {
        next[idx] = { ...next[idx], simulatedAmount: round(next[idx].simulatedAmount + amount, 2) };
      } else {
        next.push({ timeSlot: "morning", feedId: feed.id, currentAmount: 0, simulatedAmount: round(amount, 2), unit });
      }
    };

    const energy = rowsByKey.get("deMcal");
    const protein = rowsByKey.get("crudeProteinG");
    const ca = rowsByKey.get("calciumG");
    const na = rowsByKey.get("sodiumG");

    if (energy && energy.percent < 92) addOrIncrease(findFeed((f) => f.category === "concentrate"), 0.3);
    if (protein && protein.percent < 92) addOrIncrease(findFeed((f) => f.name.includes("アルファ") || (f.crudeProteinGPerKg ?? 0) > 140), 0.5);
    if (ca && ca.percent < 90) addOrIncrease(findFeed((f) => f.name.includes("アルファ") || (f.calciumGPerKg ?? 0) > 10), 0.3);
    if (na && na.percent < 90) addOrIncrease(findFeed((f) => f.category === "salt" || f.name.includes("塩")), 0.02);

    if (energy && energy.percent > 115) {
      const concentrateIdx = next.findIndex((i) => feedById.get(i.feedId)?.category === "concentrate" && i.simulatedAmount > 0);
      if (concentrateIdx >= 0) next[concentrateIdx] = { ...next[concentrateIdx], simulatedAmount: Math.max(0, round(next[concentrateIdx].simulatedAmount - 0.2, 2)) };
    }

    setItems(next);
  }

  async function saveScenario() {
    if (!horse) return;
    const scenario = await saveSimulationScenario(horse.id, scenarioName, items, currentScore, simScore, "アプリ上で作成");
    setSavedScenarioId(scenario.id);
    alert("シミュレーション案を保存しました");
  }

  async function applyScenario() {
    if (!savedScenarioId) return alert("先にシミュレーション案を保存してください");
    await applySimulationToPlan(savedScenarioId, todayIso(), `${scenarioName} 反映版`);
    alert("新しい標準メニューとして反映しました");
    await load();
  }

  if (!horse) return <section className="card">馬を選択してください。</section>;

  return (
    <div className="grid two">
      <section className="card wide">
        <div className="page-heading-row">
          <div>
            <h2>給餌シミュレーション</h2>
            <p className="muted">理想値100%に近づくように量を調整し、標準メニューへ反映できます。</p>
          </div>
          <div className="score-compare"><span>現在 {currentScore}</span><strong>調整後 {simScore}</strong></div>
        </div>
        <div className="button-row">
          <button onClick={makeSuggestion}>不足・過剰から補正案を作る</button>
          <button className="secondary" onClick={addItem}>飼料を追加</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>時間帯</th><th>飼料</th><th>現在</th><th>調整後</th><th>単位</th><th></th></tr></thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${item.feedId}-${idx}`}>
                  <td><select value={item.timeSlot} onChange={(e) => updateItem(idx, { timeSlot: e.target.value as TimeSlot })}>{timeSlotOptions.map((t) => <option key={t} value={t}>{timeSlotLabels[t]}</option>)}</select></td>
                  <td><select value={item.feedId} onChange={(e) => { const feed = feedById.get(e.target.value); updateItem(idx, { feedId: e.target.value, unit: feed?.defaultUnit ?? item.unit }); }}>{feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></td>
                  <td>{formatNumber(item.currentAmount)} {unitLabels[item.unit]}</td>
                  <td><input type="number" step="0.01" value={item.simulatedAmount} onChange={(e) => updateItem(idx, { simulatedAmount: Number(e.target.value) })} /></td>
                  <td><select value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value as FeedUnit })}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></td>
                  <td><button className="danger small" onClick={() => deleteItem(idx)}>削除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="scenario-save">
          <label className="field compact"><span>案名</span><input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} /></label>
          <button onClick={saveScenario}>案を保存</button>
          <button className="secondary" onClick={applyScenario}>標準メニューへ反映</button>
        </div>
      </section>

      <section className="card">
        <h2>調整後の100%比較</h2>
        <NutritionBarChart rows={simRows} />
      </section>

      <section className="card">
        <h2>差分</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>項目</th><th>現在</th><th>調整後</th><th>差</th></tr></thead>
            <tbody>
              {simRows.map((row) => {
                const before = currentRows.find((r) => r.key === row.key);
                return <tr key={row.key}><td>{row.label}</td><td>{formatNumber(before?.percent, 0)}%</td><td>{formatNumber(row.percent, 0)}%</td><td>{formatNumber(row.percent - (before?.percent ?? 0), 0)}pt</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>シミュレーションの考え方</h2>
        <ul className="tips">
          <li>「補正案」は簡易ルールです。最終判断は体重変化、BCS、運動量、疾病、食べ残しを見て調整してください。</li>
          <li>杯入力は飼料マスタの「1杯あたりg」を使ってkg換算します。</li>
          <li>反映すると新しい標準メニューが作成されます。過去履歴は変更しません。</li>
        </ul>
      </section>
    </div>
  );
}

function round(value: number, digits = 1) {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}
