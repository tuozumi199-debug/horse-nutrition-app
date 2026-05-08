export type FeedCategory = "forage" | "concentrate" | "supplement" | "salt" | "oil" | "other";
export type FeedUnit = "g" | "kg" | "scoop";
export type SourceType = "manual" | "manufacturer" | "book" | "paper" | "lab_analysis" | "custom";

export type Feed = {
  id: string;
  name: string;
  category: FeedCategory;
  manufacturer?: string;
  productName?: string;
  defaultUnit: FeedUnit;
  gramsPerScoop?: number;

  dryMatterPercent?: number;
  deMcalPerKg?: number;
  crudeProteinGPerKg?: number;
  lysineGPerKg?: number;
  calciumGPerKg?: number;
  phosphorusGPerKg?: number;
  magnesiumGPerKg?: number;
  sodiumGPerKg?: number;
  potassiumGPerKg?: number;
  copperMgPerKg?: number;
  zincMgPerKg?: number;
  seleniumMgPerKg?: number;
  vitaminEIUPerKg?: number;
  sugarPercent?: number;
  starchPercent?: number;
  ndfPercent?: number;
  adfPercent?: number;

  pricePerKg?: number;
  source?: string;
  sourceType?: SourceType;
  version?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
