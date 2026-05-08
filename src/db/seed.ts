import { db, makeId, nowIso } from "./localDb";
import type { Feed } from "../types/feed";
import type { Horse } from "../types/horse";
import type { FeedingPlan, FeedingPlanItem } from "../types/feeding";
import type { NutritionRequirement } from "../types/nutrition";

export async function seedIfEmpty() {
  const horseCount = await db.horses.count();
  const feedCount = await db.feeds.count();
  const reqCount = await db.nutritionRequirements.count();

  const now = nowIso();

  if (feedCount === 0) {
    const feeds: Feed[] = [
      {
        id: "F_TIMOTHY",
        name: "チモシー乾草",
        category: "forage",
        defaultUnit: "kg",
        gramsPerScoop: 300,
        dryMatterPercent: 90,
        deMcalPerKg: 1.9,
        crudeProteinGPerKg: 80,
        calciumGPerKg: 4,
        phosphorusGPerKg: 2.5,
        magnesiumGPerKg: 1.5,
        sodiumGPerKg: 0.6,
        potassiumGPerKg: 15,
        ndfPercent: 62,
        adfPercent: 34,
        pricePerKg: 120,
        source: "架空サンプル値。実運用では分析値または出典確認済み値に差し替え",
        sourceType: "custom",
        version: "sample-001",
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "F_ALFALFA",
        name: "アルファルファ乾草",
        category: "forage",
        defaultUnit: "kg",
        gramsPerScoop: 250,
        dryMatterPercent: 90,
        deMcalPerKg: 2.1,
        crudeProteinGPerKg: 170,
        lysineGPerKg: 7,
        calciumGPerKg: 13,
        phosphorusGPerKg: 2.4,
        magnesiumGPerKg: 2.5,
        sodiumGPerKg: 0.8,
        potassiumGPerKg: 20,
        ndfPercent: 45,
        adfPercent: 32,
        pricePerKg: 180,
        source: "架空サンプル値",
        sourceType: "custom",
        version: "sample-001",
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "F_CONCENTRATE_A",
        name: "配合飼料A",
        category: "concentrate",
        defaultUnit: "scoop",
        gramsPerScoop: 500,
        dryMatterPercent: 88,
        deMcalPerKg: 3.0,
        crudeProteinGPerKg: 130,
        lysineGPerKg: 5,
        calciumGPerKg: 8,
        phosphorusGPerKg: 6,
        magnesiumGPerKg: 2,
        sodiumGPerKg: 3,
        potassiumGPerKg: 8,
        copperMgPerKg: 30,
        zincMgPerKg: 90,
        seleniumMgPerKg: 0.25,
        vitaminEIUPerKg: 80,
        starchPercent: 28,
        sugarPercent: 6,
        pricePerKg: 300,
        source: "架空サンプル値",
        sourceType: "custom",
        version: "sample-001",
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "F_BEET_PULP",
        name: "ビートパルプ",
        category: "concentrate",
        defaultUnit: "kg",
        gramsPerScoop: 350,
        dryMatterPercent: 90,
        deMcalPerKg: 2.6,
        crudeProteinGPerKg: 90,
        calciumGPerKg: 7,
        phosphorusGPerKg: 1,
        magnesiumGPerKg: 1.5,
        sodiumGPerKg: 1.2,
        potassiumGPerKg: 6,
        pricePerKg: 220,
        source: "架空サンプル値",
        sourceType: "custom",
        version: "sample-001",
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "F_SALT",
        name: "食塩",
        category: "salt",
        defaultUnit: "g",
        dryMatterPercent: 100,
        deMcalPerKg: 0,
        crudeProteinGPerKg: 0,
        calciumGPerKg: 0,
        phosphorusGPerKg: 0,
        sodiumGPerKg: 393,
        pricePerKg: 80,
        source: "架空サンプル値",
        sourceType: "custom",
        version: "sample-001",
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.feeds.bulkPut(feeds);
  }

  if (horseCount === 0) {
    const horses: Horse[] = [
      {
        id: "H_SAKURA",
        name: "サクラ",
        sex: "mare",
        birthDate: "2014-04-10",
        weightKg: 480,
        targetWeightKg: 480,
        bcs: 5,
        breed: "Thoroughbred",
        stage: "light_work",
        activityLevel: "light",
        healthNotes: "サンプル馬。実データではありません。",
        feedingNotes: "Na不足に注意。",
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "H_HAYATE",
        name: "ハヤテ",
        sex: "gelding",
        birthDate: "2010-06-01",
        weightKg: 520,
        targetWeightKg: 510,
        bcs: 6,
        breed: "Warmblood",
        stage: "moderate_work",
        activityLevel: "moderate",
        healthNotes: "サンプル馬。実データではありません。",
        feedingNotes: "体重管理中。",
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.horses.bulkPut(horses);
  }

  if (reqCount === 0) {
    const requirements: NutritionRequirement[] = [
      {
        id: "REQ_500_LIGHT",
        stage: "light_work",
        activityLevel: "light",
        weightKg: 500,
        deMcal: 20,
        crudeProteinG: 760,
        lysineG: 32,
        calciumG: 30,
        phosphorusG: 20,
        magnesiumG: 7.5,
        sodiumG: 15,
        potassiumG: 25,
        copperMg: 100,
        zincMg: 400,
        seleniumMg: 1,
        vitaminEIU: 500,
        dryMatterMinKg: 7.5,
        dryMatterMaxKg: 12.5,
        source: "架空サンプル要求量。実運用ではNRC等の確認済み要求量を登録",
        version: "sample-001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "REQ_500_MODERATE",
        stage: "moderate_work",
        activityLevel: "moderate",
        weightKg: 500,
        deMcal: 23,
        crudeProteinG: 820,
        lysineG: 36,
        calciumG: 32,
        phosphorusG: 22,
        magnesiumG: 8,
        sodiumG: 18,
        potassiumG: 30,
        copperMg: 110,
        zincMg: 440,
        seleniumMg: 1,
        vitaminEIU: 600,
        dryMatterMinKg: 7.5,
        dryMatterMaxKg: 13,
        source: "架空サンプル要求量",
        version: "sample-001",
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.nutritionRequirements.bulkPut(requirements);
  }

  const planCount = await db.feedingPlans.count();
  if (planCount === 0) {
    const plan: FeedingPlan = {
      id: "PLAN_SAKURA_STANDARD",
      horseId: "H_SAKURA",
      planName: "通常メニュー",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      status: "active",
      memo: "サンプル標準メニュー",
      createdAt: now,
      updatedAt: now
    };
    const items: FeedingPlanItem[] = [
      { id: makeId("PITEM"), feedingPlanId: plan.id, timeSlot: "morning", feedId: "F_TIMOTHY", amount: 2.5, unit: "kg", sortOrder: 1 },
      { id: makeId("PITEM"), feedingPlanId: plan.id, timeSlot: "morning", feedId: "F_CONCENTRATE_A", amount: 0.8, unit: "scoop", sortOrder: 2 },
      { id: makeId("PITEM"), feedingPlanId: plan.id, timeSlot: "noon", feedId: "F_TIMOTHY", amount: 1.5, unit: "kg", sortOrder: 3 },
      { id: makeId("PITEM"), feedingPlanId: plan.id, timeSlot: "evening", feedId: "F_TIMOTHY", amount: 2.0, unit: "kg", sortOrder: 4 },
      { id: makeId("PITEM"), feedingPlanId: plan.id, timeSlot: "evening", feedId: "F_BEET_PULP", amount: 0.4, unit: "kg", sortOrder: 5 },
      { id: makeId("PITEM"), feedingPlanId: plan.id, timeSlot: "evening_feed", feedId: "F_TIMOTHY", amount: 1.0, unit: "kg", sortOrder: 6 }
    ];
    await db.feedingPlans.put(plan);
    await db.feedingPlanItems.bulkPut(items);
  }
}
