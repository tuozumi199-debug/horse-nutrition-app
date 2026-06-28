import { db, makeId, nowIso } from "../db/localDb";
import type { FeedingPlan, FeedingPlanChangeLog, FeedingPlanItem } from "../types/feeding";
import type { SimulationItem, SimulationScenario } from "../types/simulation";
import { buildPlanChangeDiff, summarizePlanDiff } from "./feedingPlanHistory";

export async function saveSimulationScenario(
  horseId: string,
  name: string,
  items: Omit<SimulationItem, "id" | "scenarioId">[],
  scoreBefore?: number,
  scoreAfter?: number,
  memo?: string
) {
  const now = nowIso();
  const scenario: SimulationScenario = {
    id: makeId("SIM"),
    horseId,
    name,
    status: "draft",
    scoreBefore,
    scoreAfter,
    memo,
    createdAt: now,
    updatedAt: now
  };
  const scenarioItems: SimulationItem[] = items.map((item) => ({
    ...item,
    id: makeId("SIMITEM"),
    scenarioId: scenario.id
  }));
  await db.transaction("rw", db.simulationScenarios, db.simulationItems, async () => {
    await db.simulationScenarios.put(scenario);
    await db.simulationItems.bulkPut(scenarioItems);
  });
  return scenario;
}

export async function applySimulationToPlan(
  scenarioId: string,
  effectiveFrom: string,
  planName = "シミュレーション反映画面から作成",
  reason?: string
) {
  const scenario = await db.simulationScenarios.get(scenarioId);
  if (!scenario) throw new Error("Simulation scenario not found");
  const [items, feeds, plans] = await Promise.all([
    db.simulationItems.where("scenarioId").equals(scenarioId).toArray(),
    db.feeds.toArray(),
    db.feedingPlans.where("horseId").equals(scenario.horseId).toArray()
  ]);
  const now = nowIso();
  const activePlans = plans.filter((p) => p.status === "active").sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const oldPlan = activePlans[0];
  const oldItems = oldPlan
    ? await db.feedingPlanItems.where("feedingPlanId").equals(oldPlan.id).toArray()
    : [];
  const plan: FeedingPlan = {
    id: makeId("PLAN"),
    horseId: scenario.horseId,
    planName,
    effectiveFrom,
    status: "active",
    memo: `Scenario ${scenario.name} から作成`,
    createdAt: now,
    updatedAt: now
  };
  const planItems: FeedingPlanItem[] = items
    .filter((i) => i.simulatedAmount > 0)
    .map((i, idx) => ({
      id: makeId("PITEM"),
      feedingPlanId: plan.id,
      timeSlot: i.timeSlot,
      feedId: i.feedId,
      amount: i.simulatedAmount,
      unit: i.unit,
      sortOrder: idx + 1
    }));
  const diffItems = buildPlanChangeDiff(oldItems, planItems, feeds);
  const changeLog: FeedingPlanChangeLog = {
    id: makeId("PLOG"),
    horseId: scenario.horseId,
    oldPlanId: oldPlan?.id,
    newPlanId: plan.id,
    changeDate: now.slice(0, 10),
    effectiveFrom,
    reason: reason?.trim() || undefined,
    summary: oldPlan ? summarizePlanDiff(diffItems) : "新しい標準メニューを作成",
    diffItems,
    createdAt: now,
    updatedAt: now
  };

  await db.transaction("rw", db.feedingPlans, db.feedingPlanItems, db.simulationScenarios, db.feedingPlanChangeLogs, async () => {
    await Promise.all(
      activePlans.map((activePlan) =>
        db.feedingPlans.update(activePlan.id, {
          status: "stopped",
          effectiveTo: effectiveFrom,
          updatedAt: now
        })
      )
    );
    await db.feedingPlans.put(plan);
    await db.feedingPlanItems.bulkPut(planItems);
    await db.feedingPlanChangeLogs.put(changeLog);
    await db.simulationScenarios.update(scenarioId, { status: "adopted", updatedAt: now });
  });
  return plan;
}
