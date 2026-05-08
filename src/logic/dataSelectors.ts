import { db, todayIso } from "../db/localDb";
import type { FeedingPlanItem, FeedingRecord } from "../types/feeding";

export async function getTodayItemsForHorse(horseId: string) {
  const today = todayIso();
  const records = await db.feedingRecords.where("[horseId+date]").equals([horseId, today]).toArray();
  if (records.length > 0) return records;
  return getActivePlanItemsForHorse(horseId);
}

export async function getActivePlanItemsForHorse(horseId: string): Promise<FeedingPlanItem[]> {
  const plans = await db.feedingPlans.where("horseId").equals(horseId).toArray();
  const activePlans = plans.filter((p) => p.status === "active").sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const plan = activePlans[0];
  if (!plan) return [];
  return db.feedingPlanItems.where("feedingPlanId").equals(plan.id).sortBy("sortOrder");
}

export function feedingRecordFromItem(item: FeedingPlanItem | FeedingRecord) {
  return { feedId: item.feedId, amount: item.amount, unit: item.unit };
}
