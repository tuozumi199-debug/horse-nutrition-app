import type { Horse } from "../types/horse";
import type { NutritionRequirement } from "../types/nutrition";

export function findRequirementForHorse(
  horse: Horse | undefined,
  requirements: NutritionRequirement[]
): NutritionRequirement | undefined {
  if (!horse) return undefined;
  const exact = requirements.find(
    (r) => r.stage === horse.stage && r.activityLevel === horse.activityLevel
  );
  const fallback = requirements.find((r) => r.activityLevel === horse.activityLevel) ?? requirements[0];
  const base = exact ?? fallback;
  if (!base) return undefined;

  const ratio = horse.weightKg / base.weightKg;
  const scale = (v?: number) => (v === undefined ? undefined : round(v * ratio, 3));
  return {
    ...base,
    id: `${base.id}_scaled_${horse.id}`,
    weightKg: horse.weightKg,
    deMcal: round(base.deMcal * ratio, 2),
    crudeProteinG: round(base.crudeProteinG * ratio, 1),
    lysineG: scale(base.lysineG),
    calciumG: round(base.calciumG * ratio, 2),
    phosphorusG: round(base.phosphorusG * ratio, 2),
    magnesiumG: scale(base.magnesiumG),
    sodiumG: scale(base.sodiumG),
    potassiumG: scale(base.potassiumG),
    copperMg: scale(base.copperMg),
    zincMg: scale(base.zincMg),
    seleniumMg: scale(base.seleniumMg),
    vitaminEIU: scale(base.vitaminEIU),
    dryMatterMinKg: scale(base.dryMatterMinKg),
    dryMatterMaxKg: scale(base.dryMatterMaxKg)
  };
}

function round(value: number, digits = 1) {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}
