import { db, makeId, nowIso } from "../db/localDb";
import type { SimulationItem, SimulationScenario } from "../types/simulation";
import { createActiveFeedingPlanRevision } from "./feedingPlanUpdater";

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
  const items = await db.simulationItems.where("scenarioId").equals(scenarioId).toArray();
  const now = nowIso();
  const { plan } = await createActiveFeedingPlanRevision({
    horseId: scenario.horseId,
    effectiveFrom,
    planName,
    memo: `Scenario ${scenario.name} から作成`,
    reason,
    source: "シミュレーション",
    items: items.map((i, idx) => ({
      timeSlot: i.timeSlot,
      feedId: i.feedId,
      amount: i.simulatedAmount,
      unit: i.unit,
      sortOrder: idx + 1
    }))
  });
  await db.simulationScenarios.update(scenarioId, { status: "adopted", updatedAt: now });
  return plan;
}
