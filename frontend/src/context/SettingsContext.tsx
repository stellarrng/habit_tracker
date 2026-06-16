import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export const DATE_RANGES = ["7 Days", "30 Days", "Year"] as const;
export type DateRange = (typeof DATE_RANGES)[number];
export type Language = "English" | "Vietnamese";

export interface NotifPrefs {
  warnings: boolean;
  reminders: boolean;
  achievements: boolean;
}

export interface Settings {
  darkMode: boolean;
  language: Language;
  defaultRange: DateRange;
  notifPrefs: NotifPrefs;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  language: "English",
  defaultRange: "7 Days",
  notifPrefs: { warnings: true, reminders: true, achievements: true },
};

// ── Labels (i18n) ─────────────────────────────────────────────────────────────

export const LABELS: Record<Language, Record<string, string>> = {
  English: {
    today: "Today", habits: "Habits", stats: "Stats",
    dashboard: "Statistics Dashboard",
    darkMode: "Dark mode", language: "Language", defaultRange: "Default range",
    notifications: "Notifications", warnings: "Warnings", reminders: "Reminders",
    achievements: "Achievements", preferences: "Preferences",
    signOut: "Sign out", markAllRead: "Mark all as read", allCaughtUp: "You're all caught up!",
    completedToday: "Completed Today", activeHabits: "Active Habits", habitsAtRisk: "Habits at Risk",
    potentialBreak: "Potential break", consistent: "Consistent", actionNeeded: "Action needed",
    allGood: "All good", allOnTrack: "All habits on track",
    habitBreakdown: "Habit Breakdown", consistencyTip: "Consistency is Key",
    lastActivity: "Activity", longest: "Longest", total: "Total", rate: "Rate",
    vsLastPeriod: "vs last period",
    inRange: "in",
    "Health & Fitness": "Health & Fitness",
    "Mindfulness": "Mindfulness",
    "7 Days": "7 Days", "30 Days": "30 Days", "Year": "Year",
    lastDaysActivity: "Last {n} Days Activity",
    lastWeeksActivity: "Last 52 Weeks Activity",
  },
  Vietnamese: {
    today: "Hôm nay", habits: "Thói quen", stats: "Thống kê",
    dashboard: "Bảng thống kê",
    darkMode: "Chế độ tối", language: "Ngôn ngữ", defaultRange: "Khoảng mặc định",
    notifications: "Thông báo", warnings: "Cảnh báo", reminders: "Nhắc nhở",
    achievements: "Thành tích", preferences: "Tùy chọn",
    signOut: "Đăng xuất", markAllRead: "Đánh dấu đã đọc", allCaughtUp: "Bạn đã đọc hết!",
    completedToday: "Hoàn thành hôm nay", activeHabits: "Thói quen đang theo", habitsAtRisk: "Thói quen có nguy cơ",
    potentialBreak: "Có thể bị gián đoạn", consistent: "Đều đặn", actionNeeded: "Cần hành động",
    allGood: "Tất cả ổn", allOnTrack: "Mọi thói quen đang tốt",
    habitBreakdown: "Chi tiết thói quen", consistencyTip: "Kiên trì là chìa khóa",
    lastActivity: "Hoạt động", longest: "Dài nhất", total: "Tổng", rate: "Tỉ lệ",
    vsLastPeriod: "so với kỳ trước",
    inRange: "trong",
    "Health & Fitness": "Sức khỏe & Thể lực",
    "Mindfulness": "Thiền định",
    "7 Days": "7 ngày", "30 Days": "30 ngày", "Year": "Cả năm",
    lastDaysActivity: "Hoạt động {n} ngày qua",
    lastWeeksActivity: "Hoạt động 52 tuần qua",
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface SettingsContextType {
  settings: Settings;
  setSettings: (s: Settings) => void;
  t: (key: string) => string;
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

  // apply dark mode to <body>
  useEffect(() => {
    document.body.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  function setSettings(s: Settings) {
    setSettingsState(s);
    localStorage.setItem("settings", JSON.stringify(s));
  }

  function t(key: string): string {
    return LABELS[settings.language][key] ?? key;
  }

  return (
    <SettingsContext.Provider value={{ settings, setSettings, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
