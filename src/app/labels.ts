import type { ActivityLevel, HorseStage } from "../types/horse";
import type { FeedCategory, FeedUnit } from "../types/feed";
import type { TimeSlot } from "../types/feeding";

export const stageLabels: Record<HorseStage, string> = {
  maintenance: "維持",
  light_work: "軽運動",
  moderate_work: "中運動",
  heavy_work: "強運動",
  senior: "高齢",
  growth: "成長期",
  pregnancy: "妊娠",
  lactation: "泌乳",
  rehab: "リハビリ"
};

export const activityLabels: Record<ActivityLevel, string> = {
  none: "なし",
  light: "軽",
  moderate: "中",
  heavy: "強",
  very_heavy: "非常に強"
};

export const categoryLabels: Record<FeedCategory, string> = {
  forage: "牧草",
  concentrate: "濃厚飼料",
  supplement: "サプリ",
  salt: "塩",
  oil: "油脂",
  other: "その他"
};

export const unitLabels: Record<FeedUnit, string> = {
  g: "g",
  kg: "kg",
  scoop: "杯"
};

export const timeSlotLabels: Record<TimeSlot, string> = {
  morning: "朝",
  noon: "昼",
  evening: "夕",
  evening_feed: "夕飼い"
};

export const stageOptions = Object.keys(stageLabels) as HorseStage[];
export const activityOptions = Object.keys(activityLabels) as ActivityLevel[];
export const categoryOptions = Object.keys(categoryLabels) as FeedCategory[];
export const unitOptions = Object.keys(unitLabels) as FeedUnit[];
export const timeSlotOptions: TimeSlot[] = ["morning", "noon", "evening", "evening_feed"];
