import { useState } from "react";
import { MonthlySummaryPage } from "./MonthlySummaryPage";

type StableSection = "monthly" | "info" | "staff" | "partners" | "documents";

const stableSections: { key: StableSection; label: string; description: string }[] = [
  { key: "monthly", label: "月次", description: "月ごとの給餌・栄養状況" },
  { key: "info", label: "厩舎情報", description: "施設・馬房・管理単位" },
  { key: "staff", label: "スタッフ・担当者", description: "日常管理の担当" },
  { key: "partners", label: "獣医・装蹄師", description: "外部専門家の連絡先" },
  { key: "documents", label: "書類・メモ", description: "厩舎全体の記録" }
];

export function StablePage() {
  const [section, setSection] = useState<StableSection>("monthly");
  const activeSection = stableSections.find((item) => item.key === section);

  return (
    <div className="workspace-layout">
      <section className="card wide">
        <div className="section-heading">
          <div>
            <h2>厩舎</h2>
            <p className="muted">馬ごとではなく、厩舎全体に紐づく情報を管理します。</p>
          </div>
        </div>
        <div className="section-menu" role="tablist" aria-label="厩舎メニュー">
          {stableSections.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={section === item.key}
              className={section === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setSection(item.key)}
            >
              {item.label}
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      {section === "monthly" ? (
        <MonthlySummaryPage />
      ) : (
        <section className="card wide placeholder-panel">
          <h2>{activeSection?.label}</h2>
          <p className="muted">この項目は今後のP2系タスクで実装予定です。現時点ではメニュー階層だけを用意しています。</p>
        </section>
      )}
    </div>
  );
}
