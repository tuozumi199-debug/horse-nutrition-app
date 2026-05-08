import { useEffect, useState } from "react";
import { db, makeId, nowIso } from "../db/localDb";
import type { Feed, FeedCategory, FeedUnit, SourceType } from "../types/feed";
import { categoryLabels, categoryOptions, unitLabels, unitOptions } from "../app/labels";
import { formatNumber } from "../app/utils";

type FeedDraft = Omit<Feed, "id" | "createdAt" | "updatedAt"> & { id?: string };

const emptyDraft: FeedDraft = {
  name: "",
  category: "forage",
  defaultUnit: "kg",
  dryMatterPercent: 90,
  isActive: true,
  sourceType: "manual"
};

const nutrientFields: { key: keyof Feed; label: string; unit: string }[] = [
  { key: "dryMatterPercent", label: "乾物率", unit: "%" },
  { key: "deMcalPerKg", label: "DE", unit: "Mcal/kg" },
  { key: "crudeProteinGPerKg", label: "粗タンパク", unit: "g/kg" },
  { key: "lysineGPerKg", label: "リジン", unit: "g/kg" },
  { key: "calciumGPerKg", label: "Ca", unit: "g/kg" },
  { key: "phosphorusGPerKg", label: "P", unit: "g/kg" },
  { key: "magnesiumGPerKg", label: "Mg", unit: "g/kg" },
  { key: "sodiumGPerKg", label: "Na", unit: "g/kg" },
  { key: "potassiumGPerKg", label: "K", unit: "g/kg" },
  { key: "copperMgPerKg", label: "Cu", unit: "mg/kg" },
  { key: "zincMgPerKg", label: "Zn", unit: "mg/kg" },
  { key: "seleniumMgPerKg", label: "Se", unit: "mg/kg" },
  { key: "vitaminEIUPerKg", label: "ビタミンE", unit: "IU/kg" },
  { key: "sugarPercent", label: "糖", unit: "%" },
  { key: "starchPercent", label: "デンプン", unit: "%" },
  { key: "ndfPercent", label: "NDF", unit: "%" },
  { key: "adfPercent", label: "ADF", unit: "%" },
  { key: "pricePerKg", label: "単価", unit: "円/kg" }
];

export function FeedMasterPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [draft, setDraft] = useState<FeedDraft>(emptyDraft);
  const [filter, setFilter] = useState("");

  async function load() {
    setFeeds(await db.feeds.orderBy("name").toArray());
  }

  useEffect(() => { load(); }, []);

  function editFeed(feed: Feed) {
    setDraft({ ...feed });
  }

  function setNumberField(key: keyof Feed, value: string) {
    setDraft({ ...draft, [key]: value === "" ? undefined : Number(value) });
  }

  async function saveFeed() {
    if (!draft.name.trim()) return alert("飼料名を入力してください");
    const now = nowIso();
    const existing = draft.id ? await db.feeds.get(draft.id) : undefined;
    const record: Feed = {
      ...draft,
      id: draft.id ?? makeId("F"),
      name: draft.name.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    await db.feeds.put(record);
    setDraft(emptyDraft);
    await load();
  }

  const visible = feeds.filter((f) => f.name.includes(filter) || f.category.includes(filter));

  return (
    <div className="grid two">
      <section className="card wide-on-mobile">
        <h2>{draft.id ? "飼料編集" : "飼料登録"}</h2>
        <p className="note">有料書籍・有料DBの成分表を丸写しして公開リポジトリに含めないでください。実運用では出典と版を必ず記録してください。</p>
        <div className="form-grid">
          <label className="field"><span>飼料名 *</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="field"><span>カテゴリ</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as FeedCategory })}>{categoryOptions.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label>
          <label className="field"><span>標準単位</span><select value={draft.defaultUnit} onChange={(e) => setDraft({ ...draft, defaultUnit: e.target.value as FeedUnit })}>{unitOptions.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}</select></label>
          <label className="field"><span>1杯あたり g</span><input type="number" value={draft.gramsPerScoop ?? ""} onChange={(e) => setDraft({ ...draft, gramsPerScoop: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label className="field"><span>メーカー</span><input value={draft.manufacturer ?? ""} onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })} /></label>
          <label className="field"><span>商品名</span><input value={draft.productName ?? ""} onChange={(e) => setDraft({ ...draft, productName: e.target.value })} /></label>
          {nutrientFields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label} <small>{field.unit}</small></span>
              <input type="number" step="0.001" value={(draft[field.key] as number | undefined) ?? ""} onChange={(e) => setNumberField(field.key, e.target.value)} />
            </label>
          ))}
          <label className="field"><span>出典区分</span><select value={draft.sourceType ?? "manual"} onChange={(e) => setDraft({ ...draft, sourceType: e.target.value as SourceType })}><option value="manual">手入力</option><option value="manufacturer">メーカー</option><option value="book">書籍</option><option value="paper">論文</option><option value="lab_analysis">分析値</option><option value="custom">カスタム</option></select></label>
          <label className="field"><span>バージョン</span><input value={draft.version ?? ""} onChange={(e) => setDraft({ ...draft, version: e.target.value })} /></label>
          <label className="field full"><span>出典メモ</span><textarea value={draft.source ?? ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></label>
        </div>
        <div className="button-row">
          <button onClick={saveFeed}>{draft.id ? "更新" : "登録"}</button>
          <button className="secondary" onClick={() => setDraft(emptyDraft)}>新規入力に戻す</button>
        </div>
      </section>

      <section className="card">
        <h2>飼料一覧</h2>
        <label className="field compact"><span>検索</span><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="飼料名・カテゴリ" /></label>
        <div className="table-scroll">
          <table>
            <thead><tr><th>飼料</th><th>カテゴリ</th><th>DE</th><th>CP</th><th>単位</th></tr></thead>
            <tbody>
              {visible.map((feed) => (
                <tr key={feed.id} onClick={() => editFeed(feed)} className="clickable-row">
                  <td><strong>{feed.name}</strong><br /><small>{feed.sourceType}/{feed.version}</small></td>
                  <td>{categoryLabels[feed.category]}</td>
                  <td>{formatNumber(feed.deMcalPerKg)} </td>
                  <td>{formatNumber(feed.crudeProteinGPerKg, 0)}</td>
                  <td>{unitLabels[feed.defaultUnit]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
