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
