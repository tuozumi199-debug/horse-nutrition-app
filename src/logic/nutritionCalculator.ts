import type { Feed, FeedUnit } from "../types/feed";
import type { AchievementRow, NutritionIntake, NutritionRequirement } from "../types/nutrition";

export type FeedAmountLike = {
  feedId: string;
  amount: number;
  unit: FeedUnit;
};

export const emptyIntake = (): NutritionIntake => ({
  dryMatterKg: 0,
  deMcal: 0,
  crudeProteinG: 0,
  lysineG: 0,
  calciumG: 0,
  phosphorusG: 0,
  magnesiumG: 0,
  sodiumG: 0,
  potassiumG: 0,
  copperMg: 0,
  zincMg: 0,
  seleniumMg: 0,
  vitaminEIU: 0,
  cost: 0
});

export function calculateFeedAmountAsFedKg(amount: number, unit: FeedUnit, feed: Feed): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (unit === "kg") return amount;
  if (unit === "g") return amount / 1000;
  const gramsPerScoop = feed.gramsPerScoop ?? 0;
  return (amount * gramsPerScoop) / 1000;
}

export function calculateDryMatterKg(asFedKg: number, feed: Feed): number {
  return asFedKg * ((feed.dryMatterPercent ?? 100) / 100);
}

export function calculateDailyNutrition(items: FeedAmountLike[], feeds: Feed[]): NutritionIntake {
  const intake = emptyIntake();
  const feedById = new Map(feeds.map((f) => [f.id, f]));

  for (const item of items) {
    const feed = feedById.get(item.feedId);
    if (!feed) continue;

    const asFedKg = calculateFeedAmountAsFedKg(item.amount, item.unit, feed);
    const dryMatterKg = calculateDryMatterKg(asFedKg, feed);

    intake.dryMatterKg += dryMatterKg;
    intake.deMcal += asFedKg * (feed.deMcalPerKg ?? 0);
    intake.crudeProteinG += asFedKg * (feed.crudeProteinGPerKg ?? 0);
    intake.lysineG += asFedKg * (feed.lysineGPerKg ?? 0);
    intake.calciumG += asFedKg * (feed.calciumGPerKg ?? 0);
    intake.phosphorusG += asFedKg * (feed.phosphorusGPerKg ?? 0);
    intake.magnesiumG += asFedKg * (feed.magnesiumGPerKg ?? 0);
    intake.sodiumG += asFedKg * (feed.sodiumGPerKg ?? 0);
    intake.potassiumG += asFedKg * (feed.potassiumGPerKg ?? 0);
    intake.copperMg += asFedKg * (feed.copperMgPerKg ?? 0);
    intake.zincMg += asFedKg * (feed.zincMgPerKg ?? 0);
    intake.seleniumMg += asFedKg * (feed.seleniumMgPerKg ?? 0);
    intake.vitaminEIU += asFedKg * (feed.vitaminEIUPerKg ?? 0);
    intake.cost += asFedKg * (feed.pricePerKg ?? 0);
  }

  return intake;
}

export function calculateCaPRatio(intake: Pick<NutritionIntake, "calciumG" | "phosphorusG">): number {
  if (!intake.phosphorusG) return 0;
  return intake.calciumG / intake.phosphorusG;
}

function statusFromPercent(percent: number): AchievementRow["status"] {
  if (!Number.isFinite(percent)) return "not_evaluated";
  if (percent < 80) return "deficient";
  if (percent < 90) return "low";
  if (percent <= 110) return "ok";
  if (percent <= 130) return "high";
  return "excess";
}

function achievement(
  key: AchievementRow["key"],
  label: string,
  unit: string,
  current: number,
  requirement?: number
): AchievementRow | undefined {
  if (!requirement || requirement <= 0) return undefined;
  const percent = (current / requirement) * 100;
  return { key, label, unit, current, requirement, percent, status: statusFromPercent(percent) };
}

export function calculateNutritionAchievement(
  intake: NutritionIntake,
  requirement?: NutritionRequirement
): AchievementRow[] {
  if (!requirement) return [];

  const rows: AchievementRow[] = [];
  const candidates = [
    achievement("deMcal", "DE", "Mcal", intake.deMcal, requirement.deMcal),
    achievement("crudeProteinG", "粗タンパク", "g", intake.crudeProteinG, requirement.crudeProteinG),
    achievement("lysineG", "リジン", "g", intake.lysineG, requirement.lysineG),
    achievement("calciumG", "Ca", "g", intake.calciumG, requirement.calciumG),
    achievement("phosphorusG", "P", "g", intake.phosphorusG, requirement.phosphorusG),
    achievement("magnesiumG", "Mg", "g", intake.magnesiumG, requirement.magnesiumG),
    achievement("sodiumG", "Na", "g", intake.sodiumG, requirement.sodiumG),
    achievement("potassiumG", "K", "g", intake.potassiumG, requirement.potassiumG),
    achievement("copperMg", "Cu", "mg", intake.copperMg, requirement.copperMg),
    achievement("zincMg", "Zn", "mg", intake.zincMg, requirement.zincMg),
    achievement("seleniumMg", "Se", "mg", intake.seleniumMg, requirement.seleniumMg),
    achievement("vitaminEIU", "ビタミンE", "IU", intake.vitaminEIU, requirement.vitaminEIU)
  ];
  for (const c of candidates) if (c) rows.push(c);

  const caPRatio = calculateCaPRatio(intake);
  rows.push({
    key: "caPRatio",
    label: "Ca:P比",
    unit: ":1",
    current: caPRatio,
    requirement: 1.5,
    percent: (caPRatio / 1.5) * 100,
    status: caPRatio >= 1.2 && caPRatio <= 2.0 ? "ok" : caPRatio < 1.2 ? "deficient" : "high"
  });

  if (requirement.dryMatterMinKg) {
    rows.push({
      key: "dryMatterKg",
      label: "乾物摂取量",
      unit: "kg",
      current: intake.dryMatterKg,
      requirement: requirement.dryMatterMinKg,
      percent: (intake.dryMatterKg / requirement.dryMatterMinKg) * 100,
      status:
        intake.dryMatterKg < requirement.dryMatterMinKg
          ? "deficient"
          : requirement.dryMatterMaxKg && intake.dryMatterKg > requirement.dryMatterMaxKg
            ? "high"
            : "ok"
    });
  }

  return rows;
}
