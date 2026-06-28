import { db, makeId, nowIso } from "../db/localDb";
import type { FeedingPlan, FeedingPlanChangeLog, FeedingPlanItem } from "../types/feeding";
import { buildPlanChangeDiff, summarizePlanDiff } from "./feedingPlanHistory";

export type FeedingPlanRevisionItem = Pick<FeedingPlanItem, "timeSlot" | "feedId" | "amount" | "unit" | "sortOrder">;

export type FeedingPlanRevisionResult = {
  plan: FeedingPlan;
  changeLog: FeedingPlanChangeLog;
};

export async function createActiveFeedingPlanRevision({
  horseId,
  effectiveFrom,
  planName,
  memo,
  reason,
  source,
  items
}: {
  horseId: string;
  effectiveFrom: string;
  planName: string;
  memo?: string;
  reason?: string;
  source?: string;
  items: FeedingPlanRevisionItem[];
}): Promise<FeedingPlanRevisionResult> {
  const [feeds, plans] = await Promise.all([
    db.feeds.toArray(),
    db.feedingPlans.where("horseId").equals(horseId).toArray()
  ]);
  const now = nowIso();
  const activePlans = plans.filter((p) => p.status === "active").sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const oldPlan = activePlans[0];
  const oldItems = oldPlan
    ? await db.feedingPlanItems.where("feedingPlanId").equals(oldPlan.id).toArray()
    : [];
  const plan: FeedingPlan = {
    id: makeId("PLAN"),
    horseId,
    planName,
    effectiveFrom,
    status: "active",
    memo,
    createdAt: now,
    updatedAt: now
  };
  const planItems: FeedingPlanItem[] = items
    .filter((item) => item.amount > 0)
    .map((item, idx) => ({
      id: makeId("PITEM"),
      feedingPlanId: plan.id,
      timeSlot: item.timeSlot,
      feedId: item.feedId,
      amount: item.amount,
      unit: item.unit,
      sortOrder: item.sortOrder || idx + 1
    }));
  const diffItems = buildPlanChangeDiff(oldItems, planItems, feeds);
  const changeLog: FeedingPlanChangeLog = {
    id: makeId("PLOG"),
    horseId,
    oldPlanId: oldPlan?.id,
    newPlanId: plan.id,
    changeDate: now.slice(0, 10),
    effectiveFrom,
    reason: reason?.trim() || undefined,
    source,
    summary: oldPlan ? summarizePlanDiff(diffItems) : "新しい標準メニューを作成",
    diffItems,
    createdAt: now,
    updatedAt: now
  };

  await db.transaction("rw", db.feedingPlans, db.feedingPlanItems, db.feedingPlanChangeLogs, async () => {
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
  });

  return { plan, changeLog };
}
