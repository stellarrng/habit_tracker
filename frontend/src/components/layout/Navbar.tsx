import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings, type Settings, DATE_RANGES } from "../../context/SettingsContext";
import { useNotifications, playTone, type NotifType } from "../../context/NotificationContext";
import styles from "./Navbar.module.css";

type DateRange = (typeof DATE_RANGES)[number];
type SettingsTab = "profile" | "preferences" | "audio";

// ── Audio settings (localStorage) ─────────────────────────────────────────────

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

function saveAudioSettings(s: AudioSettings) {
  localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(s));
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}>
      <span className={styles.toggleThumb} />
    </button>
  );
}

// ── SettingsPanel ──────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const { settings, setSettings, t } = useSettings();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [audio, setAudioState] = useState<AudioSettings>(loadAudioSettings);

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

  function setAudio(key: keyof AudioSettings, value: boolean) {
    const updated = { ...audio, [key]: value };
    setAudioState(updated);
    saveAudioSettings(updated);
  }

  const settingsTabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "profile", label: "Profile",
      icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="7" r="3" /><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" /></svg>,
    },
    {
      key: "preferences", label: "Preferences",
      icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="17" y2="6" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="14" x2="17" y2="14" /><circle cx="7" cy="6" r="1.5" fill="currentColor" /><circle cx="13" cy="10" r="1.5" fill="currentColor" /><circle cx="9" cy="14" r="1.5" fill="currentColor" /></svg>,
    },
    {
      key: "audio", label: "Audio & Alerts",
      icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 8H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2l4 3V5L5 8z" /><path d="M14 7a4 4 0 0 1 0 6" /><path d="M16.5 4.5a8 8 0 0 1 0 11" /></svg>,
    },
  ];

  return (
    <div ref={ref} className={styles.settingsPanel}>
      <div className={styles.settingsPanelHeader}>
        <div className={styles.settingsPanelHeaderLeft}>
          <div className={styles.settingsPanelIcon}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="10" cy="10" r="2.5" /><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" />
            </svg>
          </div>
          <div>
            <div className={styles.settingsPanelTitle}>Settings</div>
            <div className={styles.settingsPanelSub}>Manage your preferences</div>
          </div>
        </div>
        <button className={styles.notifCloseBtn} onClick={onClose}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" />
          </svg>
        </button>
      </div>

      <div className={styles.settingsBody}>
        <nav className={styles.settingsNav}>
          {settingsTabs.map(tab => (
            <button key={tab.key}
              className={`${styles.settingsNavItem} ${activeTab === tab.key ? styles.settingsNavItemActive : ""}`}
              onClick={() => setActiveTab(tab.key)}>
              <span className={styles.settingsNavIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <div className={styles.settingsNavDivider} />
          <button className={styles.signOutBtn} onClick={() => { logout(); navigate("/login"); }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3M13 14l4-4-4-4M17 10H7" />
            </svg>
            Sign out
          </button>
        </nav>

        <div className={styles.settingsContent}>
          {activeTab === "profile" && (
            <div>
              <p className={styles.settingsSectionLabel}>YOUR ACCOUNT</p>
              <div className={styles.profileCard}>
                <div className={styles.settingsAvatar}>{initials}</div>
                <div>
                  <div className={styles.settingsName}>{user?.name ?? "Guest"}</div>
                  <div className={styles.settingsEmail}>{user?.email ?? "—"}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div>
              <p className={styles.settingsSectionLabel}>APPEARANCE</p>
              <div className={styles.settingsRows}>
                <div className={styles.settingsRow}>
                  <div>
                    <div className={styles.settingsRowLabel}>{t("darkMode")}</div>
                    <div className={styles.settingsRowDesc}>Switch to dark theme</div>
                  </div>
                  <Toggle on={settings.darkMode} onToggle={() => set("darkMode", !settings.darkMode)} />
                </div>
                <div className={styles.settingsRow}>
                  <div>
                    <div className={styles.settingsRowLabel}>{t("language")}</div>
                    <div className={styles.settingsRowDesc}>Display language</div>
                  </div>
                  <select className={styles.settingsSelect} value={settings.language}
                    onChange={(e) => set("language", e.target.value as Settings["language"])}>
                    <option value="English">English</option>
                    <option value="Vietnamese">Tiếng Việt</option>
                  </select>
                </div>
                <div className={styles.settingsRow}>
                  <div>
                    <div className={styles.settingsRowLabel}>{t("defaultRange")}</div>
                    <div className={styles.settingsRowDesc}>Default date range on dashboard</div>
                  </div>
                  <select className={styles.settingsSelect} value={settings.defaultRange}
                    onChange={(e) => set("defaultRange", e.target.value as DateRange)}>
                    {DATE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audio" && (
            <div>
              <p className={styles.settingsSectionLabel}>AUDIO FEEDBACK & ALERTS</p>
              <p className={styles.settingsSectionDesc}>Choose which events play a sound chime.</p>
              <div className={styles.settingsRows}>
                <div className={styles.settingsRow}>
                  <div>
                    <div className={styles.settingsRowLabel}>Master Sound</div>
                    <div className={styles.settingsRowDesc}>Enable all notification sounds</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className={styles.testSoundBtn} onClick={() => playTone("reward")}>Test Sound</button>
                    <Toggle on={audio.soundEnabled} onToggle={() => setAudio("soundEnabled", !audio.soundEnabled)} />
                  </div>
                </div>
                {(["reminder", "warning", "reward"] as NotifType[]).map(type => (
                  <div key={type} className={`${styles.settingsRow} ${!audio.soundEnabled ? styles.settingsRowDisabled : ""}`}>
                    <div>
                      <div className={styles.settingsRowLabel}>
                        {type === "reminder" ? "🔔 Reminder Sound" : type === "warning" ? "⚠️ Warning Sound" : "🎉 Reward Sound"}
                      </div>
                      <div className={styles.settingsRowDesc}>
                        {type === "reminder" ? "Play chime for habit reminders" : type === "warning" ? "Play chime for streak warnings" : "Play chime when habit is completed"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button className={styles.testSoundBtn} disabled={!audio.soundEnabled} onClick={() => playTone(type)}>Test</button>
                      <Toggle
                        on={audio[`sound${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof AudioSettings] as boolean && audio.soundEnabled}
                        onToggle={() => setAudio(`sound${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof AudioSettings, !audio[`sound${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof AudioSettings])}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

interface NavbarProps {
  onRangeChange?: (range: DateRange) => void;
  hideRangeSelector?: boolean;
}

export default function Navbar({ onRangeChange, hideRangeSelector = false }: NavbarProps) {
  const { settings, t } = useSettings();
  const { unreadCount, togglePanel, panelOpen } = useNotifications();
  const [activeRange, setActiveRange] = useState<DateRange>(settings.defaultRange);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setActiveRange(settings.defaultRange);
    if (!hideRangeSelector) {
      onRangeChange?.(settings.defaultRange);
    }
  }, [settings.defaultRange, hideRangeSelector, onRangeChange]);

  function handleRange(range: DateRange) {
    setActiveRange(range);
    onRangeChange?.(range);
  }

  return (
    <header className={styles.navbar}>
      <div>
        <h1>{t("dashboard")}</h1>
        <p className={styles.navbarSubtitle}>Track your consistency, build long-lasting habits</p>
      </div>

      <div className={styles.actions}>
        {!hideRangeSelector && (
          <div className={styles.segmented} aria-label="Date range">
            {DATE_RANGES.map((range) => (
              <button key={range}
                className={activeRange === range ? styles.segmentActive : ""}
                onClick={() => handleRange(range)}>
                {range}
              </button>
            ))}
          </div>
        )}

        {/* Bell — toggles global panel */}
        <div className={styles.notifWrapper}>
          <button className={`${styles.iconButton} ${panelOpen ? styles.iconActive : ""}`}
            aria-label="Notifications"
            onClick={() => { togglePanel(); setSettingsOpen(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>
        </div>

        {/* Settings */}
        <div className={styles.notifWrapper}>
          <button className={`${styles.iconButton} ${settingsOpen ? styles.iconActive : ""}`}
            aria-label="Settings"
            onClick={() => { setSettingsOpen(v => !v); }}>
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
