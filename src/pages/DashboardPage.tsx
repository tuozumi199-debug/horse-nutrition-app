import type { PageKey } from "../app/routes";
import type { Horse } from "../types/horse";
import { getHorseClass, getHorseClassLabel } from "../logic/horseClass";

export function DashboardPage({
  horses,
  selectedHorseId,
  onSelectHorse,
  goTo
}: {
  horses: Horse[];
  selectedHorseId: string;
  onSelectHorse: (id: string) => void;
  goTo: (page: PageKey) => void;
}) {
  const activeHorses = horses.filter((horse) => horse.isActive);

  return (
    <div className="home-layout">
      <section className="card wide">
        <div className="section-heading">
          <div>
            <h2>馬を選ぶ</h2>
            <p className="muted">馬を選択すると、その馬専用のワークスペースを開きます。</p>
          </div>
        </div>

        {activeHorses.length === 0 ? (
          <div className="empty">
            まだ有効な馬が登録されていません。登録メニューから馬を追加してください。
          </div>
        ) : (
          <div className="home-horse-grid">
            {activeHorses.map((horse) => (
              <button
                type="button"
                className={`home-horse-button ${horse.id === selectedHorseId ? "selected" : ""}`}
                key={horse.id}
                onClick={() => onSelectHorse(horse.id)}
              >
                {horse.photoDataUrl ? <img src={horse.photoDataUrl} alt="" /> : <span className="mini-photo">馬</span>}
                <span>
                  <strong>{horse.name}</strong>
                  <span className={`horse-class-badge horse-class-${getHorseClass(horse)}`}>{getHorseClassLabel(horse)}</span>
                  <small>{horse.weightKg}kg{horse.breed ? ` / ${horse.breed}` : ""}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card wide">
        <h2>全体管理</h2>
        <div className="management-grid">
          <button type="button" onClick={() => goTo("register")}>
            登録
            <small>馬・飼料・薬剤</small>
          </button>
          <button type="button" onClick={() => goTo("stable")}>
            厩舎
            <small>月次・スタッフ・書類</small>
          </button>
          <button type="button" onClick={() => goTo("settings")}>
            設定
            <small>テーマ・データ管理</small>
          </button>
        </div>
      </section>
    </div>
  );
}
