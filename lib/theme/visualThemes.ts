export type VisualThemeKey = "original" | "yellow";

export const VISUAL_THEME_STORAGE_KEY = "autocity-visual-theme";

export const VISUAL_THEMES: Array<{
  key: VisualThemeKey;
  name: string;
  description: string;
  accent: string;
  accentStrong: string;
}> = [
  {
    key: "original",
    name: "Original Red",
    description: "The default AutoCity red interface.",
    accent: "#E84545",
    accentStrong: "#cc3c3c",
  },
  {
    key: "yellow",
    name: "Yellow Classic",
    description: "A warm yellow version of the original theme.",
    accent: "#f5b700",
    accentStrong: "#d99a00",
  },
];

export function isVisualThemeKey(value: string | null): value is VisualThemeKey {
  return value === "original" || value === "yellow";
}
