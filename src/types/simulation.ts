import type { FeedUnit } from "./feed";
import type { TimeSlot } from "./feeding";

export type SimulationScenario = {
  id: string;
  horseId: string;
  basePlanId?: string;
  name: string;
  status: "draft" | "adopted" | "rejected";
  scoreBefore?: number;
  scoreAfter?: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
};

export type SimulationItem = {
  id: string;
  scenarioId: string;
  timeSlot: TimeSlot;
  feedId: string;
  currentAmount: number;
  simulatedAmount: number;
  unit: FeedUnit;
};
