import { db } from "../db/localDb";
import { timeSlotLabels } from "../app/labels";
import type { Feed } from "../types/feed";
import type { FeedingPlanChangeDiffItem, FeedingPlanChangeLog, FeedingPlanItem } from "../types/feeding";

type PlanItemComparable = Pick<FeedingPlanItem, "timeSlot" | "feedId" | "amount" | "unit">;

export function buildPlanChangeDiff(
  beforeItems: PlanItemComparable[],
  afterItems: PlanItemComparable[],
  feeds: Feed[]
): FeedingPlanChangeDiffItem[] {
  const feedById = new Map(feeds.map((feed) => [feed.id, feed]));
  const beforeMap = groupItems(beforeItems);
  const afterMap = groupItems(afterItems);
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const diffItems: FeedingPlanChangeDiffItem[] = [];

  for (const key of Array.from(keys).sort()) {
    const before = beforeMap.get(key);
    const after = afterMap.get(key);
    const base = after ?? before;
    if (!base) continue;

    const beforeAmount = before?.amount;
    const afterAmount = after?.amount;
    const amountChanged = beforeAmount !== afterAmount || before?.unit !== after?.unit;
    if (before && after && !amountChanged) continue;

    diffItems.push({
      feedId: base.feedId,
      feedName: feedById.get(base.feedId)?.name ?? base.feedId,
      mealSlot: base.timeSlot,
      beforeAmount,
      afterAmount,
      unit: after?.unit ?? before?.unit,
      changeType: before && after ? "changed" : after ? "added" : "removed"
    });
  }

  return diffItems;
}

export function summarizePlanDiff(diffItems: FeedingPlanChangeDiffItem[]) {
  if (diffItems.length === 0) return "給餌量の変更はありません";
  const added = diffItems.filter((item) => item.changeType === "added").length;
  const removed = diffItems.filter((item) => item.changeType === "removed").length;
  const changed = diffItems.filter((item) => item.changeType === "changed").length;
  return `追加${added}件、削除${removed}件、変更${changed}件`;
}

export function formatDiffItem(item: FeedingPlanChangeDiffItem) {
  const slot = item.mealSlot ? timeSlotLabels[item.mealSlot] : "";
  const prefix = slot ? `${slot} ` : "";
  if (item.changeType === "added") {
    return `${prefix}${item.feedName} 追加 ${formatAmount(item.afterAmount, item.unit)}`;
  }
  if (item.changeType === "removed") {
    return `${prefix}${item.feedName} 削除 ${formatAmount(item.beforeAmount, item.unit)}`;
  }
  return `${prefix}${item.feedName} ${formatAmount(item.beforeAmount, item.unit)} → ${formatAmount(item.afterAmount, item.unit)}`;
}

export async function getPlanChangeLogsForMonth(month: string): Promise<FeedingPlanChangeLog[]> {
  const start = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(year, monthNumber, 1).toISOString().slice(0, 10);
  const logs = await db.feedingPlanChangeLogs.where("changeDate").between(start, next, true, false).toArray();
  return logs.sort((a, b) => b.changeDate.localeCompare(a.changeDate) || b.createdAt.localeCompare(a.createdAt));
}

function groupItems(items: PlanItemComparable[]) {
  const map = new Map<string, PlanItemComparable>();
  for (const item of items) {
    const key = `${item.timeSlot}__${item.feedId}__${item.unit}`;
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, amount: round(existing.amount + item.amount, 4) } : { ...item });
  }
  return map;
}

function formatAmount(amount: number | undefined, unit: string | undefined) {
  if (amount === undefined) return "-";
  return `${amount.toLocaleString("ja-JP", { maximumFractionDigits: 3 })}${unit ?? ""}`;
}

function round(value: number, digits: number) {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}
