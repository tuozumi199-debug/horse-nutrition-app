import type { ActivityLevel, HorseStage } from "./horse";

export type NutritionRequirement = {
  id: string;
  stage: HorseStage;
  activityLevel: ActivityLevel;
  weightKg: number;
  deMcal: number;
  crudeProteinG: number;
  lysineG?: number;
  calciumG: number;
  phosphorusG: number;
  magnesiumG?: number;
  sodiumG?: number;
  potassiumG?: number;
  copperMg?: number;
  zincMg?: number;
  seleniumMg?: number;
  vitaminEIU?: number;
  dryMatterMinKg?: number;
  dryMatterMaxKg?: number;
  source?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
};

export type NutritionIntake = {
  dryMatterKg: number;
  deMcal: number;
  crudeProteinG: number;
  lysineG: number;
  calciumG: number;
  phosphorusG: number;
  magnesiumG: number;
  sodiumG: number;
  potassiumG: number;
  copperMg: number;
  zincMg: number;
  seleniumMg: number;
  vitaminEIU: number;
  cost: number;
};

export type AchievementRow = {
  key: keyof NutritionIntake | "caPRatio";
  label: string;
  unit: string;
  current: number;
  requirement: number;
  percent: number;
  status: "deficient" | "low" | "ok" | "high" | "excess" | "not_evaluated";
};
