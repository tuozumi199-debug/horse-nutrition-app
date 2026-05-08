import type { AchievementRow } from "../types/nutrition";

const weights: Record<string, number> = {
  deMcal: 1.4,
  crudeProteinG: 1.3,
  calciumG: 1.2,
  phosphorusG: 1.2,
  sodiumG: 1.1,
  caPRatio: 1.5,
  seleniumMg: 2.0
};

export function calculateNutritionScore(rows: AchievementRow[]): number {
  let penalty = 0;
  for (const row of rows) {
    const w = weights[row.key] ?? 1;
    const diff = Math.abs(row.percent - 100);
    penalty += Math.min(diff * 0.25 * w, 22 * w);
    if (row.status === "excess") penalty += 10 * w;
    if (row.status === "deficient") penalty += 4 * w;
  }
  return Math.max(0, Math.round(100 - penalty));
}
