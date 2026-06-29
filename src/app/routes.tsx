export type PageKey = "home" | "workspace" | "register" | "stable" | "settings";

export const pages: { key: Exclude<PageKey, "workspace">; label: string }[] = [
  { key: "home", label: "ホーム" },
  { key: "register", label: "登録" },
  { key: "stable", label: "厩舎" },
  { key: "settings", label: "設定" }
];
