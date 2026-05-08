import Dexie, { type Table } from "dexie";
import type { Horse } from "../types/horse";
import type { Feed } from "../types/feed";
import type { FeedingPlan, FeedingPlanItem, FeedingRecord } from "../types/feeding";
import type { NutritionRequirement } from "../types/nutrition";
import type { SimulationItem, SimulationScenario } from "../types/simulation";

export class HorseFeedDb extends Dexie {
  horses!: Table<Horse, string>;
  feeds!: Table<Feed, string>;
  feedingRecords!: Table<FeedingRecord, string>;
  feedingPlans!: Table<FeedingPlan, string>;
  feedingPlanItems!: Table<FeedingPlanItem, string>;
  nutritionRequirements!: Table<NutritionRequirement, string>;
  simulationScenarios!: Table<SimulationScenario, string>;
  simulationItems!: Table<SimulationItem, string>;

  constructor() {
    super("horsefeed-manager");
    this.version(1).stores({
      horses: "id, name, stage, activityLevel, updatedAt",
      feeds: "id, name, category, updatedAt",
      feedingRecords: "id, horseId, date, [horseId+date], feedId",
      feedingPlans: "id, horseId, status, effectiveFrom",
      feedingPlanItems: "id, feedingPlanId, feedId",
      nutritionRequirements: "id, [stage+activityLevel], weightKg",
      simulationScenarios: "id, horseId, status, createdAt",
      simulationItems: "id, scenarioId, feedId"
    });
  }
}

export const db = new HorseFeedDb();

export const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const nowIso = () => new Date().toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);
