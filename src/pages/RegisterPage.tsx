import { useState } from "react";
import type { Horse } from "../types/horse";
import { FeedMasterPage } from "./FeedMasterPage";
import { HorseListPage } from "./HorseListPage";

type RegisterSection = "horses" | "feeds" | "medicines";

const registerSections: { key: RegisterSection; label: string }[] = [
  { key: "horses", label: "馬登録" },
  { key: "feeds", label: "飼料登録" },
  { key: "medicines", label: "ワクチン・薬剤登録" }
];

export function RegisterPage({
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
  const [section, setSection] = useState<RegisterSection>("horses");

  return (
    <div className="workspace-layout">
      <section className="card wide">
        <div className="section-heading">
          <div>
            <h2>登録</h2>
            <p className="muted">馬・飼料・ワクチンや薬剤の基本情報を管理します。</p>
          </div>
        </div>
        <div className="section-menu" role="tablist" aria-label="登録メニュー">
          {registerSections.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={section === item.key}
              className={section === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {section === "horses" && (
        <HorseListPage
          horses={horses}
          selectedHorseId={selectedHorseId}
          onSelectHorse={onSelectHorse}
          refreshHorses={refreshHorses}
        />
      )}
      {section === "feeds" && <FeedMasterPage />}
      {section === "medicines" && (
        <section className="card wide placeholder-panel">
          <h2>ワクチン・薬剤登録</h2>
          <p className="muted">P2-2cで登録機能を追加予定です。現時点では画面枠だけを用意しています。</p>
        </section>
      )}
    </div>
  );
}
