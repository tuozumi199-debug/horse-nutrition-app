import { useState } from "react";
import type { Horse } from "../types/horse";
import { getHorseClass, getHorseClassLabel } from "../logic/horseClass";
import { FeedingRecordPage } from "./FeedingRecordPage";
import { NutritionAnalysisPage } from "./NutritionAnalysisPage";
import { SimulationPage } from "./SimulationPage";
import { FeedingPlanHistoryPage } from "./FeedingPlanHistoryPage";

type WorkspaceTab = "overview" | "feeding" | "nutrition" | "medication" | "history";
type NutritionView = "analysis" | "simulation";

const workspaceTabs: { key: WorkspaceTab; label: string }[] = [
  { key: "overview", label: "概要" },
  { key: "feeding", label: "給餌" },
  { key: "nutrition", label: "栄養" },
  { key: "medication", label: "投薬" },
  { key: "history", label: "履歴" }
];

export function HorseWorkspacePage({
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
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [nutritionView, setNutritionView] = useState<NutritionView>("analysis");
  const horse = horses.find((item) => item.id === selectedHorseId);
  const commonProps = { horses, selectedHorseId, onSelectHorse, refreshHorses };

  if (!horse) {
    return (
      <section className="card wide">
        <h2>馬別ワークスペース</h2>
        <p className="empty">ホームで馬を選択してください。</p>
      </section>
    );
  }

  return (
    <div className="workspace-layout">
      <section className="card wide workspace-horse-banner">
        <div className="horse-name-row">
          {horse.photoDataUrl ? <img src={horse.photoDataUrl} alt="" /> : <span className="mini-photo">馬</span>}
          <div>
            <span className="selected-horse-label">選択中の馬</span>
            <div className="horse-title-line">
              <strong className="selected-horse-name">{horse.name}</strong>
              <span className={`horse-class-badge horse-class-${getHorseClass(horse)}`}>{getHorseClassLabel(horse)}</span>
            </div>
            <span className="selected-horse-context">馬別ワークスペース</span>
          </div>
        </div>
      </section>

      <section className="card wide workspace-nav-card">
        <div className="workspace-tabs" role="tablist" aria-label="馬別ワークスペース">
          {workspaceTabs.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {tab === "overview" && <HorseOverview horse={horse} onOpenTab={setTab} />}
      {tab === "feeding" && <FeedingRecordPage {...commonProps} />}
      {tab === "nutrition" && (
        <>
          <section className="card wide">
            <div className="section-heading">
              <div>
                <h2>栄養</h2>
                <p className="muted">分析とシミュレーションを同じ栄養カテゴリ内で切り替えます。</p>
              </div>
            </div>
            <div className="subtabs" role="tablist" aria-label="栄養メニュー">
              <button
                type="button"
                role="tab"
                aria-selected={nutritionView === "analysis"}
                className={nutritionView === "analysis" ? "active" : ""}
                onClick={() => setNutritionView("analysis")}
              >
                栄養分析
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={nutritionView === "simulation"}
                className={nutritionView === "simulation" ? "active" : ""}
                onClick={() => setNutritionView("simulation")}
              >
                シミュレーション
              </button>
            </div>
          </section>
          {nutritionView === "analysis" ? <NutritionAnalysisPage {...commonProps} /> : <SimulationPage {...commonProps} />}
        </>
      )}
      {tab === "medication" && (
        <section className="card wide placeholder-panel">
          <h2>投薬</h2>
          <p className="muted">ワクチン・薬剤登録と連携する投薬管理はP2-2c以降で実装予定です。</p>
        </section>
      )}
      {tab === "history" && <FeedingPlanHistoryPage horses={horses} selectedHorseId={selectedHorseId} />}
    </div>
  );
}

function HorseOverview({ horse, onOpenTab }: { horse: Horse; onOpenTab: (tab: WorkspaceTab) => void }) {
  return (
    <div className="grid two">
      <section className="card">
        <h2>{horse.name} の概要</h2>
        <div className="metrics">
          <div>
            <span>体重</span>
            <strong>{horse.weightKg} kg</strong>
          </div>
          <div>
            <span>目標体重</span>
            <strong>{horse.targetWeightKg ? `${horse.targetWeightKg} kg` : "-"}</strong>
          </div>
          <div>
            <span>BCS</span>
            <strong>{horse.bcs ?? "-"}</strong>
          </div>
          <div>
            <span>品種</span>
            <strong>{horse.breed || "-"}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>よく使う操作</h2>
        <div className="button-row">
          <button type="button" onClick={() => onOpenTab("feeding")}>給餌を開く</button>
          <button type="button" className="secondary" onClick={() => onOpenTab("nutrition")}>栄養を開く</button>
          <button type="button" className="secondary" onClick={() => onOpenTab("history")}>履歴を開く</button>
        </div>
      </section>

      <section className="card wide">
        <h2>馬メモ</h2>
        <div className="grid two">
          <div className="note">
            <strong>健康メモ</strong>
            <p>{horse.healthNotes || "登録されていません。"}</p>
          </div>
          <div className="note">
            <strong>給餌メモ</strong>
            <p>{horse.feedingNotes || "登録されていません。"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
