"use client";

import { useEffect } from "react";
import { isVisualThemeKey, VISUAL_THEME_STORAGE_KEY } from "@/lib/theme/visualThemes";

function applyTheme(theme: string | null) {
  const nextTheme = isVisualThemeKey(theme) ? theme : "original";
  document.documentElement.dataset.visualTheme = nextTheme;
}

export default function VisualThemeProvider() {
  useEffect(() => {
    applyTheme(window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY));

    const handleStorage = (event: StorageEvent) => {
      if (event.key === VISUAL_THEME_STORAGE_KEY) {
        applyTheme(event.newValue);
      }
    };

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: string }>;
      applyTheme(customEvent.detail?.theme || window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("autocity-theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("autocity-theme-change", handleThemeChange);
    };
  }, []);

  return null;
}
