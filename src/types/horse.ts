export type HorseStage =
  | "maintenance"
  | "light_work"
  | "moderate_work"
  | "heavy_work"
  | "senior"
  | "growth"
  | "pregnancy"
  | "lactation"
  | "rehab";

export type ActivityLevel = "none" | "light" | "moderate" | "heavy" | "very_heavy";

export type HorseSex = "mare" | "stallion" | "gelding";

export type Horse = {
  id: string;
  name: string;
  photoDataUrl?: string;
  sex?: HorseSex;
  birthDate?: string;
  weightKg: number;
  targetWeightKg?: number;
  bcs?: number;
  breed?: string;
  stage: HorseStage;
  activityLevel: ActivityLevel;
  healthNotes?: string;
  feedingNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
