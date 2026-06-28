export type ThemeId =
  | "stable-classic"
  | "pasture-green"
  | "clinical-clean"
  | "night-arena"
  | "premium-gold"
  | "minimal-light";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  swatches: string[];
};

export const THEME_STORAGE_KEY = "horsefeed-theme";
export const DEFAULT_THEME: ThemeId = "stable-classic";

export const themeOptions: ThemeOption[] = [
  {
    id: "stable-classic",
    name: "厩舎クラシック",
    description: "現在のベージュ・ブラウン基調",
    swatches: ["#f5f1e8", "#fffaf1", "#7a4f2b"]
  },
  {
    id: "pasture-green",
    name: "放牧グリーン",
    description: "牧草と放牧場をイメージした自然系",
    swatches: ["#edf7ec", "#fbfff8", "#2f6f46"]
  },
  {
    id: "clinical-clean",
    name: "獣医クリニック",
    description: "白青ベースの清潔な業務向け",
    swatches: ["#f7fbff", "#ffffff", "#1f6fb2"]
  },
  {
    id: "night-arena",
    name: "ナイトアリーナ",
    description: "夜の馬場をイメージしたダークモード",
    swatches: ["#111827", "#1f2937", "#38bdf8"]
  },
  {
    id: "premium-gold",
    name: "プレミアムゴールド",
    description: "深いグリーンとゴールドの高級感",
    swatches: ["#0f1f1a", "#18342b", "#d6a84f"]
  },
  {
    id: "minimal-light",
    name: "ミニマルライト",
    description: "帳票・管理画面向けの薄灰シンプル",
    swatches: ["#f6f7f9", "#ffffff", "#4b5563"]
  }
];

export function isThemeId(value: string | null): value is ThemeId {
  return themeOptions.some((theme) => theme.id === value);
}

export function applyTheme(themeId: ThemeId) {
  document.body.dataset.theme = themeId;
}

export function getStoredTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}

export function setStoredTheme(themeId: ThemeId) {
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
  applyTheme(themeId);
}

export function initializeStoredTheme(): ThemeId {
  const themeId = getStoredTheme();
  applyTheme(themeId);
  return themeId;
}
