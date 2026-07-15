import { useEffect, useState } from "react";

export type AppearanceMode = "auto" | "light" | "dark";

export const APPEARANCE_MODE_STORAGE_KEY = "autocity-appearance-mode";
export const APPEARANCE_MODE_CHANGE_EVENT = "autocity-appearance-mode-change";
const DEFAULT_APPEARANCE_MODE: AppearanceMode = "auto";
const HYDRATION_SAFE_IS_DARK = true;

export const APPEARANCE_MODES: Array<{
  key: AppearanceMode;
  name: string;
  description: string;
}> = [
  {
    key: "auto",
    name: "Auto",
    description: "Switches between light and dark based on the time.",
  },
  {
    key: "light",
    name: "Light",
    description: "Keeps the app in daytime mode.",
  },
  {
    key: "dark",
    name: "Dark",
    description: "Keeps the app in night mode.",
  },
];

export function isAppearanceMode(value: string | null): value is AppearanceMode {
  return value === "auto" || value === "light" || value === "dark";
}

export function getStoredAppearanceMode(): AppearanceMode {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE_MODE;

  try {
    const value = window.localStorage.getItem(APPEARANCE_MODE_STORAGE_KEY);
    return isAppearanceMode(value) ? value : DEFAULT_APPEARANCE_MODE;
  } catch {
    return DEFAULT_APPEARANCE_MODE;
  }
}

function getTimeBasedIsDark() {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 18;
}

export function resolveAppearanceIsDark(mode: AppearanceMode) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return getTimeBasedIsDark();
}

export function useAppearanceMode() {
  const [mode, setMode] = useState<AppearanceMode>(DEFAULT_APPEARANCE_MODE);
  const [isDark, setIsDark] = useState(HYDRATION_SAFE_IS_DARK);

  useEffect(() => {
    const syncMode = () => {
      const nextMode = getStoredAppearanceMode();
      setMode(nextMode);
      setIsDark(resolveAppearanceIsDark(nextMode));
    };

    syncMode();

    const interval = window.setInterval(() => {
      if (getStoredAppearanceMode() === "auto") {
        setIsDark(resolveAppearanceIsDark("auto"));
      }
    }, 60_000);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_MODE_STORAGE_KEY) syncMode();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(APPEARANCE_MODE_CHANGE_EVENT, syncMode);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(APPEARANCE_MODE_CHANGE_EVENT, syncMode);
    };
  }, []);

  return { mode, isDark };
}

export function useTimeBasedTheme() {
  return useAppearanceMode().isDark;
}
