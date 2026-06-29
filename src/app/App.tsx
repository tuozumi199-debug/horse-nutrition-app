import { useEffect, useState } from "react";
import { db } from "../db/localDb";
import { seedIfEmpty } from "../db/seed";
import type { Horse } from "../types/horse";
import { pages, type PageKey } from "./routes";
import { DashboardPage } from "../pages/DashboardPage";
import { HorseWorkspacePage } from "../pages/HorseWorkspacePage";
import { RegisterPage } from "../pages/RegisterPage";
import { StablePage } from "../pages/StablePage";
import { SettingsPage } from "../pages/SettingsPage";
import { HorseSelector } from "../components/HorseSelector";
import { initializeStoredTheme } from "../logic/theme";

export default function App() {
  const [page, setPage] = useState<PageKey>("home");
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [ready, setReady] = useState(false);

  async function refreshHorses() {
    const list = await db.horses.orderBy("name").toArray();
    setHorses(list);
    setSelectedHorseId((prev) => prev || list.find((h) => h.isActive)?.id || "");
  }

  function openHorseWorkspace(horseId: string) {
    setSelectedHorseId(horseId);
    setPage("workspace");
  }

  useEffect(() => {
    initializeStoredTheme();
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
          <p>馬ごとの給餌・栄養・厩舎管理PWA</p>
        </div>
        <HorseSelector horses={horses} selectedHorseId={selectedHorseId} onChange={setSelectedHorseId} />
      </header>

      <nav className="tabs" aria-label="main navigation">
        {pages.map((p) => (
          <button key={p.key} className={page === p.key ? "active" : ""} onClick={() => setPage(p.key)}>
            {p.label}
          </button>
        ))}
        {page === "workspace" && (
          <button className="active" onClick={() => selectedHorseId && setPage("workspace")}>
            馬別ワークスペース
          </button>
        )}
      </nav>

      <main className="main-content">
        {page === "home" && (
          <DashboardPage
            horses={horses}
            selectedHorseId={selectedHorseId}
            onSelectHorse={openHorseWorkspace}
            goTo={setPage}
          />
        )}
        {page === "workspace" && <HorseWorkspacePage {...commonProps} />}
        {page === "register" && <RegisterPage {...commonProps} />}
        {page === "stable" && <StablePage />}
        {page === "settings" && <SettingsPage refreshHorses={refreshHorses} />}
      </main>
    </div>
  );
}
