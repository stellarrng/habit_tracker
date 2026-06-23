import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { getHabits } from "../api/habits";
import { getCheckIns } from "../api/checkins";
import type { Habit, CheckIn } from "../types";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import { calcCurrentStreak } from "../utils/streakCalculator";

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotifType = "reminder" | "warning" | "reward";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  timestamp: Date;
}

interface NotificationContextType {
  notifs: Notification[];
  unreadCount: number;
  loading: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  loadNotifs: () => void;
}

// ── localStorage ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "notif_read_ids_v2";

export function loadReadIds(): Set<string> {
  try {
    // clear legacy key from older versions
    localStorage.removeItem("notif_read_ids");
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

export function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

// ── Audio ──────────────────────────────────────────────────────────────────────

const AUDIO_STORAGE_KEY = "audio_settings";

interface AudioSettings {
  soundEnabled: boolean;
  soundReminder: boolean;
  soundWarning: boolean;
  soundReward: boolean;
}

function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    const defaults = { soundEnabled: true, soundReminder: true, soundWarning: true, soundReward: true };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return { soundEnabled: true, soundReminder: true, soundWarning: true, soundReward: true }; }
}

export function playTone(type: NotifType) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "reward") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } else if (type === "warning") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    }
  } catch { /* AudioContext not available */ }
}

// ── Generator ──────────────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

function isScheduledOn(habit: Habit, dateIso: string): boolean {
  if (habit.frequency === "Daily") return true;
  const dow = WEEKDAY_MAP[new Date(dateIso + "T00:00:00").getDay()];
  return habit.specificDays.includes(dow as Habit["specificDays"][number]);
}

function loadCompletedAt(today: string): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem("habit_completed_at") || "{}");
    // reset if stored data is from a previous day
    if (raw.__date !== today) {
      localStorage.removeItem("habit_completed_at");
      return {};
    }
    return raw;
  } catch { return {}; }
}

function generateNotifications(habits: Habit[], checkIns: CheckIn[], readIds: Set<string>): Notification[] {
  const notifs: Notification[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // minutes remaining until end of day (midnight)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const minsLeft = Math.floor((midnight.getTime() - now.getTime()) / 60_000);
  const WARNING_THRESHOLD = 60;

  const checkInMap = new Map<string, CheckIn[]>();
  const completedAt = loadCompletedAt(today);
  for (const ci of checkIns) {
    if (!checkInMap.has(ci.habitId)) checkInMap.set(ci.habitId, []);
    checkInMap.get(ci.habitId)!.push(ci);
  }

  for (const habit of habits) {
    if (habit.status !== "Active") continue;
    if (!isScheduledOn(habit, today)) continue;

    const habitCIs = checkInMap.get(habit._id) ?? [];
    const todayCI = habitCIs.find(ci => ci.date === today);
    const todayCompleted = todayCI?.status === "Completed";

    // ── Reward: completed today ───────────────────────────────────────────────
    if (todayCompleted) {
      const id = `reward-${habit._id}-${today}`;
      const ts = completedAt[habit._id] ? new Date(completedAt[habit._id]) : new Date();
      notifs.push({ id, type: "reward", title: "Habit completed! 🎉",
        body: `Superb! You completed "${habit.name}" today.`,
        read: readIds.has(id), timestamp: ts });
      continue;
    }

    // ── Warning: streak at risk (only within last 60 mins of the day) ────────
    const streak = calcCurrentStreak(habitCIs);
    if (streak >= 1 && minsLeft <= WARNING_THRESHOLD) {
      const id = `warning-${habit._id}-${today}`;
      const minsText = minsLeft <= 1 ? "less than a minute" : `${minsLeft} minutes`;
      notifs.push({ id, type: "warning", title: `Streak at risk! ⚠️`,
        body: `"${habit.name}" streak of ${streak} day${streak > 1 ? "s" : ""} will reset in ${minsText}.`,
        read: readIds.has(id), timestamp: new Date(`${today}T23:00:00`) });
      continue;
    }

    // ── Reminder: not checked in today ───────────────────────────────────────
    const id = `reminder-${habit._id}-${today}`;
    notifs.push({ id, type: "reminder", title: `Don't forget: ${habit.name} 📋`,
      body: `You haven't logged "${habit.name}" today yet.`,
      read: readIds.has(id), timestamp: new Date(`${today}T00:00:00`) });
  }

  // ── Reward: new habit created today only ─────────────────────────────────
  for (const habit of habits) {
    if (habit.status !== "Active") continue;
    const createdAgo = (Date.now() - new Date(habit.createdAt).getTime()) / 86_400_000;
    if (createdAgo <= 1) {
      const id = `reward-new-${habit._id}-${today}`;
      notifs.push({ id, type: "reward", title: "New Habit Created! 🎯",
        body: `"${habit.name}" is now active. Stay disciplined every single day!`,
        read: readIds.has(id), timestamp: new Date(habit.createdAt) });
    }
  }

  return notifs.sort((a, b) => {
    // unread always above read
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

// ── Context ────────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { settings } = useSettings();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const initialLoad = useRef(true);

  const loadNotifs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [habits, checkIns] = await Promise.all([getHabits(), getCheckIns()]);

      // Remove reward IDs for habits that are no longer Completed today
      // so that re-completing after undo shows the reward as unread again
      const today = new Date().toISOString().slice(0, 10);
      const readIds = loadReadIds();
      for (const h of habits) {
        const rewardId = `reward-${h._id}-${today}`;
        if (readIds.has(rewardId)) {
          const ci = checkIns.find(c => c.habitId === h._id && c.date === today);
          if (!ci || ci.status !== "Completed") {
            readIds.delete(rewardId);
            saveReadIds(readIds);
          }
        }
      }

      const all = generateNotifications(habits, checkIns, readIds);
      const { warnings, reminders, achievements } = settings.notifPrefs;
      const generated = all.filter(n => {
        if (n.type === "warning") return warnings;
        if (n.type === "reminder") return reminders;
        if (n.type === "reward") return achievements;
        return true;
      });
      setNotifs(prev => {
        // skip sounds on initial page load
        if (initialLoad.current) {
          initialLoad.current = false;
          return generated;
        }
        const audio = loadAudioSettings();
        if (audio.soundEnabled) {
          const prevIds = new Set(prev.map(n => n.id));
          const newUnread = generated.filter(n => !n.read && !prevIds.has(n.id));
          for (const n of newUnread.slice(0, 1)) {
            if (n.type === "reminder" && audio.soundReminder) playTone("reminder");
            if (n.type === "warning" && audio.soundWarning) playTone("warning");
            if (n.type === "reward" && audio.soundReward) playTone("reward");
          }
        }
        return generated;
      });
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [token, settings.notifPrefs]);

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 60_000);
    window.addEventListener("habit:created", loadNotifs);
    window.addEventListener("checkin:completed", loadNotifs);
    window.addEventListener("habit:completed", loadNotifs);
    return () => {
      clearInterval(interval);
      window.removeEventListener("habit:created", loadNotifs);
      window.removeEventListener("checkin:completed", loadNotifs);
      window.removeEventListener("habit:completed", loadNotifs);
    };
  }, [loadNotifs]);

  function markRead(id: string) {
    setNotifs(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveReadIds(new Set(updated.filter(n => n.read).map(n => n.id)));
      window.dispatchEvent(new CustomEvent("notif:read"));
      return updated;
    });
  }

  function markAllRead() {
    setNotifs(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      // only persist reward IDs — reminders/warnings regenerate daily
      saveReadIds(new Set(updated.filter(n => n.type === "reward").map(n => n.id)));
      window.dispatchEvent(new CustomEvent("notif:read"));
      return updated;
    });
  }

  function clearAll() {
    // Only persist reward IDs — reminders and warnings regenerate daily
    // so saving their IDs would cause them to appear pre-read next reload
    const rewardIds = new Set(notifs.filter(n => n.type === "reward").map(n => n.id));
    saveReadIds(rewardIds);
    setNotifs([]);
    window.dispatchEvent(new CustomEvent("notif:read"));
  }

  function togglePanel() {
    setPanelOpen(v => !v);
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifs, unreadCount, loading, panelOpen, setPanelOpen,
      togglePanel, markRead, markAllRead, clearAll, loadNotifs,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}
