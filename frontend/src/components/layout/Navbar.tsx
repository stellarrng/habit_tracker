import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings, type Settings, type NotifPrefs, DATE_RANGES } from "../../context/SettingsContext";
import styles from "./Navbar.module.css";

type DateRange = (typeof DATE_RANGES)[number];
type NotifType = "warning" | "reminder" | "achievement";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
}

// ── Mock notifications ────────────────────────────────────────────────────────

const INITIAL_NOTIFS: Notification[] = [
  { id: "w1", type: "warning",     title: "Drink Water at risk",          body: "You haven't logged water today. Streak may break!",          read: false },
  { id: "w2", type: "warning",     title: "Morning Meds streak breaking",  body: "Only 1 day left before your 14-day streak is lost.",        read: false },
  { id: "r1", type: "reminder",    title: "Morning Run not checked in",    body: "You scheduled this for 6:30 AM — still time to log it.",    read: false },
  { id: "r2", type: "reminder",    title: "Meditation reminder",           body: "10 minutes before bed keeps the streak alive.",             read: true  },
  { id: "a1", type: "achievement", title: "32-day Meditation streak!",     body: "You've hit a new personal best. Keep it up!",               read: true  },
  { id: "a2", type: "achievement", title: "Morning Run: 92% this month",   body: "Top completion rate across all your habits.",               read: true  },
];

const GROUP_CONFIG: Record<NotifType, { label: string; color: string }> = {
  warning:     { label: "Warnings",     color: "#ba1a1a" },
  reminder:    { label: "Reminders",    color: "#8a4c00" },
  achievement: { label: "Achievements", color: "#1f53c9" },
};

// ── NotificationPanel ─────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifs: Notification[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onReset: () => void;
  onClose: () => void;
}

function NotificationPanel({ notifs, onRead, onReadAll, onReset, onClose }: NotificationPanelProps) {
  const { t } = useSettings();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const unreadCount = notifs.filter((n) => !n.read).length;
  const groups: NotifType[] = ["warning", "reminder", "achievement"];

  return (
    <div ref={ref} className={styles.notifPanel}>
      <div className={styles.notifHeader}>
        <span className={styles.notifTitle}>{t("notifications")}</span>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={onReadAll}>
            {t("markAllRead")}
          </button>
        )}
      </div>
      {notifs.length === 0 ? (
        <div className={styles.notifEmptyWrap}>
          <p className={styles.notifEmpty}>{t("allCaughtUp")}</p>
          <button className={styles.notifResetBtn} onClick={onReset}>
            Load demo notifications
          </button>
        </div>
      ) : (
        groups.map((type) => {
          const items = notifs.filter((n) => n.type === type);
          if (items.length === 0) return null;
          const { label, color } = GROUP_CONFIG[type];
          return (
            <div key={type} className={styles.notifGroup}>
              <p className={styles.notifGroupLabel} style={{ color }}>{label}</p>
              {items.map((n) => (
                <button
                  key={n.id}
                  className={`${styles.notifItem} ${n.read ? styles.notifRead : ""}`}
                  onClick={() => onRead(n.id)}
                >
                  <span className={styles.notifDot} style={{ background: n.read ? "#c3c6d6" : color }} />
                  <div className={styles.notifText}>
                    <span className={styles.notifItemTitle}>{n.title}</span>
                    <span className={styles.notifItemBody}>{n.body}</span>
                  </div>
                </button>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── SettingsPanel ─────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}>
      <span className={styles.toggleThumb} />
    </button>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const { settings, setSettings, t } = useSettings();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings({ ...settings, [key]: value });
  }

  function setNotif(key: keyof NotifPrefs, value: boolean) {
    setSettings({ ...settings, notifPrefs: { ...settings.notifPrefs, [key]: value } });
  }

  return (
    <div ref={ref} className={styles.settingsPanel}>
      <div className={styles.settingsProfile}>
        <div className={styles.settingsAvatar}>{initials}</div>
        <div className={styles.settingsProfileInfo}>
          <span className={styles.settingsName}>{user?.name ?? "Guest"}</span>
          <span className={styles.settingsEmail}>{user?.email ?? ""}</span>
        </div>
      </div>

      <div className={styles.settingsDivider} />

      <div className={styles.settingsSection}>
        <p className={styles.settingsSectionLabel}>{t("preferences")}</p>
        <div className={styles.settingsRow}>
          <span>{t("darkMode")}</span>
          <Toggle on={settings.darkMode} onToggle={() => set("darkMode", !settings.darkMode)} />
        </div>
        <div className={styles.settingsRow}>
          <span>{t("language")}</span>
          <select className={styles.settingsSelect} value={settings.language}
            onChange={(e) => set("language", e.target.value as Settings["language"])}>
            <option value="English">English</option>
            <option value="Vietnamese">Tiếng Việt</option>
          </select>
        </div>
        <div className={styles.settingsRow}>
          <span>{t("defaultRange")}</span>
          <select className={styles.settingsSelect} value={settings.defaultRange}
            onChange={(e) => set("defaultRange", e.target.value as DateRange)}>
            {DATE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.settingsDivider} />

      <div className={styles.settingsSection}>
        <p className={styles.settingsSectionLabel}>{t("notifications")}</p>
        {(["warnings", "reminders", "achievements"] as (keyof NotifPrefs)[]).map((key) => (
          <div key={key} className={styles.settingsRow}>
            <span>{t(key)}</span>
            <Toggle on={settings.notifPrefs[key]} onToggle={() => setNotif(key, !settings.notifPrefs[key])} />
          </div>
        ))}
      </div>

      <div className={styles.settingsDivider} />

      <div className={styles.settingsSection}>
        <button className={styles.signOutBtn} onClick={() => { logout(); navigate("/login"); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

interface NavbarProps {
  onRangeChange?: (range: DateRange) => void;
}

export default function Navbar({ onRangeChange }: NavbarProps) {
  const { settings, t } = useSettings();
  const [activeRange, setActiveRange] = useState<DateRange>(settings.defaultRange);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);

  useEffect(() => {
    setActiveRange(settings.defaultRange);
    onRangeChange?.(settings.defaultRange);
  }, [settings.defaultRange]);

  const visibleNotifs = notifs.filter((n) => settings.notifPrefs[n.type as keyof typeof settings.notifPrefs]);
  const unreadCount = visibleNotifs.filter((n) => !n.read).length;

  function handleRange(range: DateRange) {
    setActiveRange(range);
    onRangeChange?.(range);
  }

  return (
    <header className={styles.navbar}>
      <h1>{t("dashboard")}</h1>

      <div className={styles.actions}>
        <div className={styles.segmented} aria-label="Date range">
          {DATE_RANGES.map((range) => (
            <button key={range}
              className={activeRange === range ? styles.segmentActive : ""}
              onClick={() => handleRange(range)}>
              {range}
            </button>
          ))}
        </div>

        <div className={styles.notifWrapper}>
          <button className={`${styles.iconButton} ${notifOpen ? styles.iconActive : ""}`}
            aria-label="Notifications"
            onClick={() => { setNotifOpen((v) => !v); setSettingsOpen(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge} aria-label={`${unreadCount} unread`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationPanel notifs={visibleNotifs}
              onRead={(id) => setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n))}
              onReadAll={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
              onReset={() => setNotifs(INITIAL_NOTIFS)}
              onClose={() => setNotifOpen(false)} />
          )}
        </div>

        <div className={styles.notifWrapper}>
          <button className={`${styles.iconButton} ${settingsOpen ? styles.iconActive : ""}`}
            aria-label="Settings"
            onClick={() => { setSettingsOpen((v) => !v); setNotifOpen(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 20.1 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>
          {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
