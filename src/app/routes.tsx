export type PageKey = "dashboard" | "horses" | "feeds" | "records" | "analysis" | "simulation" | "summary" | "settings";

export const pages: { key: PageKey; label: string }[] = [
  { key: "dashboard", label: "ホーム" },
  { key: "horses", label: "馬" },
  { key: "feeds", label: "飼料" },
  { key: "records", label: "給餌" },
  { key: "analysis", label: "栄養" },
  { key: "simulation", label: "シミュレーション" },
  { key: "summary", label: "月次" },
  { key: "settings", label: "設定" }
];
