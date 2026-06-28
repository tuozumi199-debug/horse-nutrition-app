export type FeedCategory = "forage" | "concentrate" | "supplement" | "salt" | "oil" | "other";
export type FeedUnit = "g" | "kg" | "scoop";
export type SourceType = "manual" | "manufacturer" | "book" | "paper" | "lab_analysis" | "custom" | "shared_catalog";

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

export type FeedCatalogEntry = {
  id: string;
  name: string;
  aliases?: string[];
  category?: FeedCategory | string;
  manufacturer?: string;
  productName?: string;
  defaultUnit?: FeedUnit | string;
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

  source?: string;
  sourceType?: "shared_catalog" | "manual" | "analysis" | string;
  version?: string;
};
