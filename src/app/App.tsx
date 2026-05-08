import { useEffect, useState } from "react";
import { db } from "../db/localDb";
import { seedIfEmpty } from "../db/seed";
import type { Horse } from "../types/horse";
import { pages, type PageKey } from "./routes";
import { DashboardPage } from "../pages/DashboardPage";
import { HorseListPage } from "../pages/HorseListPage";
import { FeedMasterPage } from "../pages/FeedMasterPage";
import { FeedingRecordPage } from "../pages/FeedingRecordPage";
import { NutritionAnalysisPage } from "../pages/NutritionAnalysisPage";
import { SimulationPage } from "../pages/SimulationPage";
import { MonthlySummaryPage } from "../pages/MonthlySummaryPage";
import { SettingsPage } from "../pages/SettingsPage";
import { HorseSelector } from "../components/HorseSelector";

export default function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [ready, setReady] = useState(false);

  async function refreshHorses() {
    const list = await db.horses.orderBy("name").toArray();
    setHorses(list);
    setSelectedHorseId((prev) => prev || list.find((h) => h.isActive)?.id || "");
  }

  useEffect(() => {
    seedIfEmpty().then(async () => {
      await refreshHorses();
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <div className="loading">HorseFeed Manager を読み込み中...</div>;
  }

  const commonProps = { selectedHorseId, onSelectHorse: setSelectedHorseId, horses, refreshHorses };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>HorseFeed Manager</h1>
          <p>馬の給餌・栄養バランス管理PWA</p>
        </div>
        <HorseSelector horses={horses} selectedHorseId={selectedHorseId} onChange={setSelectedHorseId} />
      </header>

      <nav className="tabs" aria-label="main navigation">
        {pages.map((p) => (
          <button key={p.key} className={page === p.key ? "active" : ""} onClick={() => setPage(p.key)}>
            {p.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {page === "dashboard" && <DashboardPage {...commonProps} goTo={setPage} />}
        {page === "horses" && <HorseListPage {...commonProps} />}
        {page === "feeds" && <FeedMasterPage />}
        {page === "records" && <FeedingRecordPage {...commonProps} />}
        {page === "analysis" && <NutritionAnalysisPage {...commonProps} />}
        {page === "simulation" && <SimulationPage {...commonProps} />}
        {page === "summary" && <MonthlySummaryPage />}
        {page === "settings" && <SettingsPage refreshHorses={refreshHorses} />}
      </main>
    </div>
  );
}
