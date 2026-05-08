import { useState } from "react";
import { db, makeId, nowIso } from "../db/localDb";
import type { ActivityLevel, Horse, HorseSex, HorseStage } from "../types/horse";
import { activityLabels, activityOptions, stageLabels, stageOptions } from "../app/labels";
import { imageFileToDataUrl } from "../app/utils";

type HorseDraft = {
  id?: string;
  name: string;
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
  photoDataUrl?: string;
  isActive: boolean;
};

const emptyDraft: HorseDraft = {
  name: "",
  weightKg: 500,
  stage: "light_work",
  activityLevel: "light",
  isActive: true
};

export function HorseListPage({
  horses,
  selectedHorseId,
  onSelectHorse,
  refreshHorses
}: {
  horses: Horse[];
  selectedHorseId: string;
  onSelectHorse: (id: string) => void;
  refreshHorses: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<HorseDraft>(emptyDraft);
  const [filter, setFilter] = useState("");

  function editHorse(horse: Horse) {
    setDraft({ ...horse });
    onSelectHorse(horse.id);
  }

  async function saveHorse() {
    if (!draft.name.trim()) return alert("馬名を入力してください");
    const now = nowIso();
    const record: Horse = {
      ...draft,
      id: draft.id ?? makeId("H"),
      name: draft.name.trim(),
      weightKg: Number(draft.weightKg),
      targetWeightKg: draft.targetWeightKg ? Number(draft.targetWeightKg) : undefined,
      bcs: draft.bcs ? Number(draft.bcs) : undefined,
      createdAt: draft.id ? (await db.horses.get(draft.id))?.createdAt ?? now : now,
      updatedAt: now
    };
    await db.horses.put(record);
    await refreshHorses();
    onSelectHorse(record.id);
    setDraft(emptyDraft);
  }

  async function removeHorse(id: string) {
    if (!confirm("この馬を無効化しますか？給餌履歴は削除しません。")) return;
    await db.horses.update(id, { isActive: false, updatedAt: nowIso() });
    await refreshHorses();
  }

  const visible = horses.filter((h) => h.name.includes(filter) || h.breed?.includes(filter));

  return (
    <div className="grid two">
      <section className="card">
        <h2>{draft.id ? "馬プロフィール編集" : "馬プロフィール登録"}</h2>
        <div className="form-grid">
          <label className="field"><span>馬名 *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="field"><span>性別</span><select value={draft.sex ?? ""} onChange={(e) => setDraft({ ...draft, sex: e.target.value as HorseSex || undefined })}><option value="">未設定</option><option value="mare">牝馬</option><option value="stallion">牡馬</option><option value="gelding">騸馬</option></select></label>
          <label className="field"><span>生年月日</span><input type="date" value={draft.birthDate ?? ""} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} /></label>
          <label className="field"><span>体重 kg *</span><input type="number" value={draft.weightKg} onChange={(e) => setDraft({ ...draft, weightKg: Number(e.target.value) })} /></label>
          <label className="field"><span>目標体重 kg</span><input type="number" value={draft.targetWeightKg ?? ""} onChange={(e) => setDraft({ ...draft, targetWeightKg: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label className="field"><span>BCS</span><input type="number" step="0.5" min="1" max="9" value={draft.bcs ?? ""} onChange={(e) => setDraft({ ...draft, bcs: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label className="field"><span>品種</span><input value={draft.breed ?? ""} onChange={(e) => setDraft({ ...draft, breed: e.target.value })} /></label>
          <label className="field"><span>ステージ</span><select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as HorseStage })}>{stageOptions.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}</select></label>
          <label className="field"><span>活動量</span><select value={draft.activityLevel} onChange={(e) => setDraft({ ...draft, activityLevel: e.target.value as ActivityLevel })}>{activityOptions.map((a) => <option key={a} value={a}>{activityLabels[a]}</option>)}</select></label>
          <label className="field"><span>写真</span><input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setDraft({ ...draft, photoDataUrl: await imageFileToDataUrl(file) }); }} /></label>
          <label className="field full"><span>健康メモ</span><textarea value={draft.healthNotes ?? ""} onChange={(e) => setDraft({ ...draft, healthNotes: e.target.value })} /></label>
          <label className="field full"><span>給餌注意事項</span><textarea value={draft.feedingNotes ?? ""} onChange={(e) => setDraft({ ...draft, feedingNotes: e.target.value })} /></label>
        </div>
        <div className="button-row">
          <button onClick={saveHorse}>{draft.id ? "更新" : "登録"}</button>
          <button className="secondary" onClick={() => setDraft(emptyDraft)}>新規入力に戻す</button>
        </div>
      </section>

      <section className="card">
        <h2>馬一覧</h2>
        <label className="field compact"><span>検索</span><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="馬名・品種" /></label>
        <div className="list">
          {visible.map((horse) => (
            <article className={`list-card ${horse.id === selectedHorseId ? "selected" : ""}`} key={horse.id}>
              <button className="card-click" onClick={() => editHorse(horse)}>
                {horse.photoDataUrl ? <img src={horse.photoDataUrl} alt="" /> : <span className="mini-photo">🐴</span>}
                <span><strong>{horse.name}</strong><small>{horse.weightKg}kg / {stageLabels[horse.stage]} / {activityLabels[horse.activityLevel]}</small></span>
              </button>
              <button className="danger small" onClick={() => removeHorse(horse.id)}>無効化</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
