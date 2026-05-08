import type { AchievementRow } from "../types/nutrition";

export function AlertBadge({ status }: { status: AchievementRow["status"] }) {
  const labels = {
    deficient: "不足",
    low: "やや不足",
    ok: "適正",
    high: "やや過剰",
    excess: "過剰注意",
    not_evaluated: "未評価"
  } as const;
  return <span className={`badge ${status}`}>{labels[status]}</span>;
}
