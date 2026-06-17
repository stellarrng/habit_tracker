import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getHabits } from "../api/habits";
import { getCheckIns } from "../api/checkins";
import type { Habit, CheckIn } from "../types";
import { useAuth } from "./AuthContext";

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

const STORAGE_KEY = "notif_read_ids";

export function loadReadIds(): Set<string> {
  try {
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

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function generateNotifications(habits: Habit[], checkIns: CheckIn[], readIds: Set<string>): Notification[] {
  const notifs: Notification[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const checkInMap = new Map<string, CheckIn[]>();
  for (const ci of checkIns) {
    if (!checkInMap.has(ci.habitId)) checkInMap.set(ci.habitId, []);
    checkInMap.get(ci.habitId)!.push(ci);
  }
  for (const habit of habits) {
    if (habit.status !== "Active") continue;
    const habitCIs = checkInMap.get(habit._id) ?? [];
    const todayCI = habitCIs.find(ci => ci.date === today);
    if (todayCI?.status === "Completed") {
      const id = `reward-${habit._id}-${today}`;
      notifs.push({ id, type: "reward", title: "Habit completed! 🎉",
        body: `Superb! You completed "${habit.name}" on ${formatDate(today)}.`,
        read: readIds.has(id), timestamp: new Date(habit.updatedAt) });
    }
    if (!todayCI) {
      const id = `reminder-${habit._id}-${today}`;
      notifs.push({ id, type: "reminder", title: `Don't forget: ${habit.name} 📋`,
        body: `You haven't logged "${habit.name}" today yet.`,
        read: readIds.has(id), timestamp: new Date() });
    }
    for (const ci of habitCIs.filter(ci => ci.date !== today && ci.completedCount === 0).slice(0, 3)) {
      const id = `warning-${habit._id}-${ci.date}`;
      notifs.push({ id, type: "warning", title: "Habit unchecked ⚠️",
        body: `You unchecked "${habit.name}" completion for ${formatDate(ci.date)}.`,
        read: readIds.has(id), timestamp: new Date(ci.date + "T00:00:00") });
    }
    const createdAgo = (Date.now() - new Date(habit.createdAt).getTime()) / 86400000;
    if (createdAgo <= 2) {
      const id = `reward-new-${habit._id}`;
      notifs.push({ id, type: "reward", title: "New Habit Created! 🎯",
        body: `"${habit.name}" is now active. Wish you stay disciplined every single day!`,
        read: readIds.has(id), timestamp: new Date(habit.createdAt) });
    }
  }
  return notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ── Context ────────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadNotifs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [habits, checkIns] = await Promise.all([getHabits(), getCheckIns()]);
      const readIds = loadReadIds();
      const generated = generateNotifications(habits, checkIns, readIds);
      setNotifs(prev => {
        const audio = loadAudioSettings();
        if (audio.soundEnabled && prev.length > 0) {
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
  }, [token]);

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 60_000);
    window.addEventListener("habit:created", loadNotifs);
    window.addEventListener("checkin:completed", loadNotifs);
    return () => {
      clearInterval(interval);
      window.removeEventListener("habit:created", loadNotifs);
      window.removeEventListener("checkin:completed", loadNotifs);
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
      saveReadIds(new Set(updated.map(n => n.id)));
      window.dispatchEvent(new CustomEvent("notif:read"));
      return updated;
    });
  }

  function clearAll() {
    setNotifs([]);
    saveReadIds(new Set());
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
