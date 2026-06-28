import type { FeedUnit } from "./feed";

export type TimeSlot = "morning" | "noon" | "evening" | "evening_feed";

export type FeedingRecord = {
  id: string;
  horseId: string;
  date: string;
  timeSlot: TimeSlot;
  feedId: string;
  amount: number;
  unit: FeedUnit;
  memo?: string;
  recordKind?: "manual" | "exception_override" | "exception_add" | "exception_skip" | "memo";
  source?: "manual" | "standard_exception";
  basePlanItemId?: string;
  isException?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeedingPlan = {
  id: string;
  horseId: string;
  planName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: "draft" | "active" | "stopped";
  memo?: string;
  createdAt: string;
  updatedAt: string;
};

export type FeedingPlanItem = {
  id: string;
  feedingPlanId: string;
  timeSlot: TimeSlot;
  feedId: string;
  amount: number;
  unit: FeedUnit;
  sortOrder: number;
};

export type FeedingPlanChangeDiffItem = {
  feedId: string;
  feedName: string;
  mealSlot?: TimeSlot;
  beforeAmount?: number;
  afterAmount?: number;
  unit?: FeedUnit;
  changeType: "added" | "removed" | "changed";
};

export type FeedingPlanChangeLog = {
  id: string;
  horseId: string;
  oldPlanId?: string;
  newPlanId: string;
  changeDate: string;
  effectiveFrom: string;
  reason?: string;
  source?: string;
  summary: string;
  diffItems?: FeedingPlanChangeDiffItem[];
  createdAt: string;
  updatedAt?: string;
};
