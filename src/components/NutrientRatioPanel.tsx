import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "../app/utils";
import type { AchievementRow } from "../types/nutrition";

type NutrientKey = AchievementRow["key"];
type DisplayMode = "percent" | "amount" | "ratio";

const defaultSelectedKeys: NutrientKey[] = [
  "deMcal",
  "crudeProteinG",
  "calciumG",
  "phosphorusG",
  "magnesiumG",
  "sodiumG"
];

const displayModeLabels: Record<DisplayMode, string> = {
  percent: "充足率",
  amount: "実量",
  ratio: "基準比"
};

export function NutrientRatioPanel({ rows }: { rows: AchievementRow[] }) {
  const comparableRows = useMemo(
    () => rows.filter((row) => row.key !== "caPRatio"),
    [rows]
  );
  const availableKeys = useMemo(
    () => new Set(comparableRows.map((row) => row.key)),
    [comparableRows]
  );
  const [selectedKeys, setSelectedKeys] = useState<NutrientKey[]>(defaultSelectedKeys);
  const [baseKey, setBaseKey] = useState<NutrientKey>("phosphorusG");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("percent");

  const selectedRows = useMemo(
    () => comparableRows.filter((row) => selectedKeys.includes(row.key)),
    [comparableRows, selectedKeys]
  );
  const baseRow = selectedRows.find((row) => row.key === baseKey) ?? selectedRows[0];
  const caRow = selectedRows.find((row) => row.key === "calciumG");
  const pRow = selectedRows.find((row) => row.key === "phosphorusG");

  useEffect(() => {
    setSelectedKeys((current) => {
      const valid = current.filter((key) => availableKeys.has(key));
      if (valid.length > 0) return valid;
      return comparableRows.slice(0, 6).map((row) => row.key);
    });
  }, [availableKeys, comparableRows]);

  useEffect(() => {
    if (selectedRows.length > 0 && !selectedRows.some((row) => row.key === baseKey)) {
      setBaseKey(selectedRows[0].key);
    }
  }, [baseKey, selectedRows]);

  function toggleKey(key: NutrientKey) {
    setSelectedKeys((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      return [...current, key];
    });
  }

  if (comparableRows.length === 0) {
    return (
      <section className="card wide">
        <h2>栄養素比較</h2>
        <p className="empty">比較できる栄養素データがありません。設定画面で要求量を登録してください。</p>
      </section>
    );
  }

  return (
    <section className="card wide">
      <div className="page-heading-row">
        <div>
          <h2>栄養素比較</h2>
          <p className="muted">比較したい栄養素を選び、充足率・実量・基準栄養素に対する比率を確認できます。</p>
        </div>
        <label className="field compact">
          <span>基準栄養素</span>
          <select value={baseRow?.key ?? ""} onChange={(event) => setBaseKey(event.target.value as NutrientKey)}>
            {selectedRows.map((row) => (
              <option key={row.key} value={row.key}>{row.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="button-row" aria-label="表示モード">
        {(Object.keys(displayModeLabels) as DisplayMode[]).map((mode) => (
          <button
            key={mode}
            className={displayMode === mode ? "" : "secondary"}
            onClick={() => setDisplayMode(mode)}
          >
            {displayModeLabels[mode]}
          </button>
        ))}
      </div>

      <div className="form-grid" style={{ marginTop: "0.9rem" }}>
        {comparableRows.map((row) => (
          <label
            className="field"
            key={row.key}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: "0.65rem",
              background: "var(--surface-strong)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "0.7rem"
            }}
          >
            <input
              type="checkbox"
              checked={selectedKeys.includes(row.key)}
              onChange={() => toggleKey(row.key)}
              style={{ width: 22, height: 22, flex: "0 0 auto" }}
            />
            <span>{row.label}</span>
          </label>
        ))}
      </div>

      <div className="metrics" style={{ marginTop: "0.9rem" }}>
        <div>
          <span>表示モード</span>
          <strong>{displayModeLabels[displayMode]}</strong>
        </div>
        <div>
          <span>基準</span>
          <strong>{baseRow?.label ?? "-"}</strong>
        </div>
        <div>
          <span>選択数</span>
          <strong>{selectedRows.length} 件</strong>
        </div>
        <div>
          <span>Ca:P比</span>
          <strong>{formatCaPRatio(caRow, pRow)}</strong>
        </div>
      </div>

      <div className="table-scroll" style={{ marginTop: "0.9rem" }}>
        <table>
          <thead>
            <tr>
              <th>栄養素</th>
              <th>{displayModeLabels[displayMode]}</th>
              <th>現在量</th>
              <th>要求量</th>
              <th>充足率</th>
              <th>基準比</th>
            </tr>
          </thead>
          <tbody>
            {selectedRows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td><strong>{formatPrimaryValue(row, displayMode, baseRow)}</strong></td>
                <td>{formatAmount(row.current, row.unit)}</td>
                <td>{formatAmount(row.requirement, row.unit)}</td>
                <td>{formatNumber(row.percent, 0)}%</td>
                <td>{formatRatio(row, baseRow)}</td>
              </tr>
            ))}
            {selectedRows.length === 0 && (
              <tr>
                <td colSpan={6}>比較する栄養素を選択してください。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatPrimaryValue(row: AchievementRow, mode: DisplayMode, baseRow?: AchievementRow) {
  if (mode === "percent") return `${formatNumber(row.percent, 0)}%`;
  if (mode === "amount") return formatAmount(row.current, row.unit);
  return formatRatio(row, baseRow);
}

function formatAmount(value: number, unit: string) {
  return `${formatNumber(value)} ${unit}`;
}

function formatRatio(row: AchievementRow, baseRow?: AchievementRow) {
  if (!baseRow || !Number.isFinite(baseRow.current) || baseRow.current === 0) return "計算不可";
  return formatRatioNumber(row.current / baseRow.current);
}

function formatCaPRatio(caRow?: AchievementRow, pRow?: AchievementRow) {
  if (!caRow || !pRow) return "CaとPを選択";
  if (!Number.isFinite(pRow.current) || pRow.current === 0) return "計算不可";
  return `${formatRatioNumber(caRow.current / pRow.current)} : 1`;
}

function formatRatioNumber(value: number) {
  return value.toLocaleString("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
