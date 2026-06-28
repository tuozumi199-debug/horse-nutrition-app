import type { Horse } from "../types/horse";
import type { Feed } from "../types/feed";
import type { FeedingPlan, FeedingPlanChangeLog, FeedingPlanItem, FeedingRecord } from "../types/feeding";
import type { NutritionRequirement } from "../types/nutrition";
import type { SimulationItem, SimulationScenario } from "../types/simulation";

export type DbSchema = {
  horses: Horse;
  feeds: Feed;
  feedingRecords: FeedingRecord;
  feedingPlans: FeedingPlan;
  feedingPlanItems: FeedingPlanItem;
  feedingPlanChangeLogs: FeedingPlanChangeLog;
  nutritionRequirements: NutritionRequirement;
  simulationScenarios: SimulationScenario;
  simulationItems: SimulationItem;
};
