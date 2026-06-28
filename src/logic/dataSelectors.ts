import { db, todayIso } from "../db/localDb";
import type { FeedingPlan, FeedingPlanItem, FeedingRecord } from "../types/feeding";

export type EffectiveFeedingItem = Pick<FeedingRecord, "feedId" | "amount" | "unit" | "timeSlot" | "memo"> & {
  id: string;
  basePlanItemId?: string;
  source: "plan" | "record" | "exception";
};

export async function getTodayItemsForHorse(horseId: string) {
  const today = todayIso();
  return getEffectiveFeedingItemsForHorseDate(horseId, today);
}

export async function getEffectiveFeedingItemsForHorseDate(horseId: string, date: string): Promise<EffectiveFeedingItem[]> {
  const [records, planItems] = await Promise.all([
    db.feedingRecords.where("[horseId+date]").equals([horseId, date]).toArray(),
    getActivePlanItemsForHorse(horseId)
  ]);
  const hasExceptionRecords = records.some((record) => record.isException || record.source === "standard_exception");
  const legacyRecords = records.filter((record) => !record.isException && record.source !== "standard_exception");

  if (planItems.length === 0 || (legacyRecords.length > 0 && !hasExceptionRecords)) {
    return legacyRecords.map((record) => ({ ...record, source: "record" }));
  }

  const exceptionRecords = records
    .filter((record) => record.isException || record.source === "standard_exception")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const exceptionByPlanItem = new Map<string, FeedingRecord>();
  const additions: FeedingRecord[] = [];

  for (const record of exceptionRecords) {
    if (record.recordKind === "exception_add") {
      additions.push(record);
      continue;
    }
    const key = record.basePlanItemId || `${record.timeSlot}__${record.feedId}`;
    exceptionByPlanItem.set(key, record);
  }

  const effective: EffectiveFeedingItem[] = [];
  for (const item of planItems) {
    const exception = exceptionByPlanItem.get(item.id) ?? exceptionByPlanItem.get(`${item.timeSlot}__${item.feedId}`);
    if (exception?.recordKind === "exception_skip") continue;
    if (exception?.recordKind === "exception_override") {
      effective.push({
        id: exception.id,
        basePlanItemId: item.id,
        timeSlot: item.timeSlot,
        feedId: item.feedId,
        amount: exception.amount,
        unit: exception.unit,
        memo: exception.memo,
        source: "exception"
      });
      continue;
    }
    effective.push({
      id: item.id,
      basePlanItemId: item.id,
      timeSlot: item.timeSlot,
      feedId: item.feedId,
      amount: item.amount,
      unit: item.unit,
      source: "plan"
    });
  }

  effective.push(...additions.map((record) => ({ ...record, source: "exception" as const })));
  return effective;
}

export async function getActivePlanItemsForHorse(horseId: string): Promise<FeedingPlanItem[]> {
  const plan = await getActivePlanForHorse(horseId);
  if (!plan) return [];
  return db.feedingPlanItems.where("feedingPlanId").equals(plan.id).sortBy("sortOrder");
}

export async function getActivePlanForHorse(horseId: string): Promise<FeedingPlan | undefined> {
  const plans = await db.feedingPlans.where("horseId").equals(horseId).toArray();
  return plans.filter((p) => p.status === "active").sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

export function feedingRecordFromItem(item: FeedingPlanItem | FeedingRecord | EffectiveFeedingItem) {
  return { feedId: item.feedId, amount: item.amount, unit: item.unit };
}
