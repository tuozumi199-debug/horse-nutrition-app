import { useEffect, useState } from "react";
import { db, makeId, nowIso } from "../db/localDb";
import type { ActivityLevel, HorseStage } from "../types/horse";
import type { NutritionRequirement } from "../types/nutrition";
import { activityLabels, activityOptions, stageLabels, stageOptions } from "../app/labels";
import { downloadCsv } from "../logic/csvExporter";
import { formatNumber } from "../app/utils";

type RequirementDraft = Omit<NutritionRequirement, "id" | "createdAt" | "updatedAt"> & { id?: string };

const emptyRequirement: RequirementDraft = {
  stage: "light_work",
  activityLevel: "light",
  weightKg: 500,
  deMcal: 20,
  crudeProteinG: 760,
  calciumG: 30,
  phosphorusG: 20,
  source: "手入力",
  version: "manual"
};

export function SettingsPage({ refreshHorses }: { refreshHorses: () => Promise<void> }) {
  const [requirements, setRequirements] = useState<NutritionRequirement[]>([]);
  const [draft, setDraft] = useState<RequirementDraft>(emptyRequirement);

  async function load() {
    setRequirements(await db.nutritionRequirements.toArray());
  }

  useEffect(() => { load(); }, []);

  function setNum(key: keyof RequirementDraft, value: string) {
    setDraft({ ...draft, [key]: value === "" ? undefined : Number(value) });
  }

  async function saveRequirement() {
    const now = nowIso();
    const existing = draft.id ? await db.nutritionRequirements.get(draft.id) : undefined;
    const record: NutritionRequirement = {
      ...draft,
      id: draft.id ?? makeId("REQ"),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    } as NutritionRequirement;
    await db.nutritionRequirements.put(record);
    setDraft(emptyRequirement);
    await load();
  }

  async function exportBackup() {
    const payload = {
      exportedAt: nowIso(),
      horses: await db.horses.toArray(),
      feeds: await db.feeds.toArray(),
      feedingRecords: await db.feedingRecords.toArray(),
      feedingPlans: await db.feedingPlans.toArray(),
      feedingPlanItems: await db.feedingPlanItems.toArray(),
      nutritionRequirements: await db.nutritionRequirements.toArray(),
      simulationScenarios: await db.simulationScenarios.toArray(),
      simulationItems: await db.simulationItems.toArray()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horsefeed-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    if (!confirm("現在のローカルデータにバックアップ内容を上書き投入します。続行しますか？")) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    await db.transaction("rw", db.horses, db.feeds, db.feedingRecords, db.feedingPlans, db.feedingPlanItems, db.nutritionRequirements, db.simulationScenarios, db.simulationItems, async () => {
      if (payload.horses) await db.horses.bulkPut(payload.horses);
      if (payload.feeds) await db.feeds.bulkPut(payload.feeds);
      if (payload.feedingRecords) await db.feedingRecords.bulkPut(payload.feedingRecords);
      if (payload.feedingPlans) await db.feedingPlans.bulkPut(payload.feedingPlans);
      if (payload.feedingPlanItems) await db.feedingPlanItems.bulkPut(payload.feedingPlanItems);
      if (payload.nutritionRequirements) await db.nutritionRequirements.bulkPut(payload.nutritionRequirements);
      if (payload.simulationScenarios) await db.simulationScenarios.bulkPut(payload.simulationScenarios);
      if (payload.simulationItems) await db.simulationItems.bulkPut(payload.simulationItems);
    });
    await Promise.all([load(), refreshHorses()]);
    alert("バックアップを読み込みました");
  }

  function exportRequirementsCsv() {
    downloadCsv("nutrition-requirements.csv", requirements.map((r) => ({
      id: r.id,
      stage: r.stage,
      activityLevel: r.activityLevel,
      weightKg: r.weightKg,
      deMcal: r.deMcal,
      crudeProteinG: r.crudeProteinG,
      calciumG: r.calciumG,
      phosphorusG: r.phosphorusG,
      sodiumG: r.sodiumG,
      seleniumMg: r.seleniumMg,
      source: r.source,
      version: r.version
    })));
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>栄養要求量マスタ</h2>
        <p className="note">馬のステージ・活動量・体重ごとの理想値を登録します。NRC、教科書、論文、分析機関の値は出典名と版を残してください。</p>
        <div className="form-grid">
          <label className="field"><span>ステージ</span><select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as HorseStage })}>{stageOptions.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label>
          <label className="field"><span>活動量</span><select value={draft.activityLevel} onChange={(e) => setDraft({ ...draft, activityLevel: e.target.value as ActivityLevel })}>{activityOptions.map((a) => <option key={a} value={a}>{activityLabels[a]}</option>)}</select></label>
          {[
            ["weightKg", "基準体重 kg"], ["deMcal", "DE Mcal"], ["crudeProteinG", "粗タンパク g"], ["lysineG", "リジン g"], ["calciumG", "Ca g"], ["phosphorusG", "P g"], ["magnesiumG", "Mg g"], ["sodiumG", "Na g"], ["potassiumG", "K g"], ["copperMg", "Cu mg"], ["zincMg", "Zn mg"], ["seleniumMg", "Se mg"], ["vitaminEIU", "ビタミンE IU"], ["dryMatterMinKg", "乾物Min kg"], ["dryMatterMaxKg", "乾物Max kg"]
          ].map(([key, label]) => (
            <label className="field" key={key}><span>{label}</span><input type="number" step="0.001" value={(draft[key as keyof RequirementDraft] as number | undefined) ?? ""} onChange={(e) => setNum(key as keyof RequirementDraft, e.target.value)} /></label>
          ))}
          <label className="field"><span>版</span><input value={draft.version ?? ""} onChange={(e) => setDraft({ ...draft, version: e.target.value })} /></label>
          <label className="field full"><span>出典</span><textarea value={draft.source ?? ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></label>
        </div>
        <div className="button-row">
          <button onClick={saveRequirement}>{draft.id ? "更新" : "登録"}</button>
          <button className="secondary" onClick={exportRequirementsCsv}>要求量CSV</button>
        </div>
      </section>

      <section className="card">
        <h2>登録済み要求量</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>区分</th><th>体重</th><th>DE</th><th>CP</th><th>出典</th></tr></thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id} className="clickable-row" onClick={() => setDraft({ ...r })}>
                  <td>{stageLabels[r.stage]} / {activityLabels[r.activityLevel]}</td>
                  <td>{r.weightKg}kg</td>
                  <td>{formatNumber(r.deMcal)} </td>
                  <td>{formatNumber(r.crudeProteinG, 0)}</td>
                  <td><small>{r.version}<br />{r.source}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card wide">
        <h2>データ管理</h2>
        <p>このMVPはブラウザ内のIndexedDBに保存します。GitHub Pagesで公開しても、入力データは各端末内に保存され、サーバーには送信されません。</p>
        <div className="button-row">
          <button onClick={exportBackup}>JSONバックアップ出力</button>
          <label className="file-button secondary">
            JSONバックアップ読み込み
            <input type="file" accept="application/json" onChange={(e) => { const file = e.target.files?.[0]; if (file) importBackup(file); }} />
          </label>
        </div>
        <p className="note">複数端末・複数スタッフで共有する場合は、次段階でSupabase/Firebase/SharePoint等のバックエンドを追加します。</p>
      </section>
    </div>
  );
}
