import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export const DATE_RANGES = ["7 Days", "30 Days", "Year"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export interface NotifPrefs {
  warnings: boolean;
  reminders: boolean;
  achievements: boolean;
}

export interface Settings {
  darkMode: boolean;
  defaultRange: DateRange;
  notifPrefs: NotifPrefs;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  defaultRange: "7 Days",
  notifPrefs: { warnings: true, reminders: true, achievements: true },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface SettingsContextType {
  settings: Settings;
  setSettings: (s: Settings) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem("settings");
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    document.body.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  function setSettings(s: Settings) {
    setSettingsState(s);
    localStorage.setItem("settings", JSON.stringify(s));
  }

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}