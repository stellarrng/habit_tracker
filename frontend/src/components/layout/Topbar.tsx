import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings, type Settings, type NotifPrefs } from '../../context/SettingsContext';
import styles from './Topbar.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Types ─────────────────────────────────────────────────────────────────────
type NotifType = 'warning' | 'reminder' | 'achievement';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
}

const INITIAL_NOTIFS: Notification[] = [
  { id: 'w1', type: 'warning', title: 'Drink Water at risk', body: "You haven't logged water today. Streak may break!", read: false },
  { id: 'w2', type: 'warning', title: 'Morning Meds streak breaking', body: 'Only 1 day left before your 14-day streak is lost.', read: false },
  { id: 'r1', type: 'reminder', title: 'Morning Run not checked in', body: 'You scheduled this for 6:30 AM — still time to log.', read: false },
  { id: 'r2', type: 'reminder', title: 'Meditation reminder', body: '10 minutes before bed keeps the streak alive.', read: true },
  { id: 'a1', type: 'achievement', title: '32-day Meditation streak!', body: "You've hit a new personal best. Keep it up!", read: true },
  { id: 'a2', type: 'achievement', title: 'Morning Run: 92% this month', body: 'Top completion rate across all your habits.', read: true },
];

const GROUP_CONFIG: Record<NotifType, { label: string; color: string }> = {
  warning: { label: 'Warnings', color: '#B85C6E' },
  reminder: { label: 'Reminders', color: '#C4956A' },
  achievement: { label: 'Achievements', color: '#84A59D' },
};

// ── NotificationPanel ─────────────────────────────────────────────────────────
function NotificationPanel({
  notifs, onRead, onReadAll, onReset, onClose, drawerMode
}: {
  notifs: Notification[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onReset: () => void;
  onClose: () => void;
  enableOutsideClick?: boolean,
  drawerMode?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div
      ref={ref}
      className={drawerMode ? styles.drawerPanel : styles.panel}
    >
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Notifications</span>
        {unread > 0 && (
          <button className={styles.markAllBtn} onClick={onReadAll}>Mark all read</button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className={styles.panelEmpty}>
          <p>You're all caught up!</p>
          <button className={styles.resetBtn} onClick={onReset}>Load demo notifications</button>
        </div>
      ) : (
        (['warning', 'reminder', 'achievement'] as NotifType[]).map(type => {
          const items = notifs.filter(n => n.type === type);
          if (!items.length) return null;
          const { label, color } = GROUP_CONFIG[type];
          return (
            <div key={type} className={styles.notifGroup}>
              <p className={styles.notifGroupLabel} style={{ color }}>{label}</p>
              {items.map(n => (
                <button key={n.id}
                  className={`${styles.notifItem} ${n.read ? styles.notifRead : ''}`}
                  onClick={() => onRead(n.id)}
                >
                  <span className={styles.notifDot} style={{ background: n.read ? '#ccc' : color }} />
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
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}>
      <span className={styles.toggleThumb} />
    </button>
  );
}
function SettingsPanel({
  onClose, drawerMode
}: {
  onClose: () => void;
  drawerMode?: boolean;
}) {
  const { user, logout } = useAuth();
  const { settings, setSettings } = useSettings();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings({ ...settings, [key]: value });
  }
  function setNotif(key: keyof NotifPrefs, value: boolean) {
    setSettings({ ...settings, notifPrefs: { ...settings.notifPrefs, [key]: value } });
  }

  return (
    <div
      ref={ref}
      className={drawerMode ? styles.drawerPanel : styles.panel}
      style={!drawerMode ? { width: 280 } : undefined}
    >      <div className={styles.settingsProfile}>
        <div className={styles.settingsAvatar}>{initials}</div>
        <div>
          <p className={styles.settingsName}>{user?.name ?? 'Guest'}</p>
          <p className={styles.settingsEmail}>{user?.email ?? ''}</p>
        </div>
      </div>

      <div className={styles.panelDivider} />

      <div className={styles.settingsSection}>
        <p className={styles.settingsSectionLabel}>Preferences</p>
        <div className={styles.settingsRow}>
          <span>Dark mode</span>
          <Toggle on={settings.darkMode} onToggle={() => set('darkMode', !settings.darkMode)} />
        </div>
        {/* <div className={styles.settingsRow}>
          <span>Language</span>
          <select className={styles.settingsSelect} value={settings.language}
            onChange={e => set('language', e.target.value as Settings['language'])}>
            <option value="English">English</option>
            <option value="Vietnamese">Tiếng Việt</option>
          </select>
        </div> */}
      </div>

      <div className={styles.panelDivider} />

      <div className={styles.settingsSection}>
        <p className={styles.settingsSectionLabel}>Notifications</p>
        {(['warnings', 'reminders', 'achievements'] as (keyof NotifPrefs)[]).map(key => (
          <div key={key} className={styles.settingsRow}>
            <span style={{ textTransform: 'capitalize' }}>{key}</span>
            <Toggle on={settings.notifPrefs[key]} onToggle={() => setNotif(key, !settings.notifPrefs[key])} />
          </div>
        ))}
      </div>

      <div className={styles.panelDivider} />

      <div className={styles.settingsSection}>
        <button className={styles.signOutBtn} onClick={() => { logout(); navigate('/login'); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
const APP_NAME = 'Habit Tracker Pro';

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);

  const [activePanel, setActivePanel] = useState<
    "none" | "notifications" | "settings"
  >("none");
  const [mobileDrawer, setMobileDrawer] = useState<
    "none" | "notifications" | "settings"
  >("none");

  const isMobile = useIsMobile();

  useEffect(() => {
    setActivePanel("none");
    setMobileDrawer("none");
  }, [isMobile]);

  const visibleNotifs = notifs.filter(n => settings.notifPrefs[n.type as keyof typeof settings.notifPrefs]);
  const unreadCount = visibleNotifs.filter(n => !n.read).length;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className={styles.topbar}>
      {/* Mobile: Hamburger Menu */}
      <button
        className={styles.menuBtn}
        onClick={onMenuClick}
      >
        ☰
      </button>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        {isMobile && (
          <>
            <span className={styles.breadcrumbApp}>{APP_NAME}</span>
            <span className={styles.breadcrumbSep}>/</span>
          </>
        )}
        <span className={styles.breadcrumbPage}>{title}</span>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {/* Notifications */}
        <div className={styles.popoverAnchor}>
          <button
            className={`${styles.iconBtn} ${activePanel === "notifications" ? styles.iconBtnActive : ""
              }`}
            aria-label="Notifications"
            onClick={() => {
              if (isMobile) {
                setMobileDrawer("notifications");
                return;
              }

              setActivePanel(prev =>
                prev === "notifications" ? "none" : "notifications"
              );
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {!isMobile && activePanel === "notifications" && (
            <NotificationPanel
              notifs={visibleNotifs}
              onRead={id => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))}
              onReadAll={() => setNotifs(p => p.map(n => ({ ...n, read: true })))}
              onReset={() => setNotifs(INITIAL_NOTIFS)}
              onClose={() => setActivePanel("none")}
              enableOutsideClick
            />
          )}
        </div>

        {/* Avatar */}
        <div className={styles.popoverAnchor}>
          <button
            className={`${styles.avatar} ${activePanel === "settings" ? styles.avatarActive : ""
              }`} onClick={() => {
                if (isMobile) {
                  setMobileDrawer("settings");
                  return;
                }

                setActivePanel(prev =>
                  prev === "settings" ? "none" : "settings"
                );
              }}
          >
            {initials}
          </button>

          {!isMobile && activePanel === "settings" && (
            <SettingsPanel
              onClose={() => setActivePanel("none")}
            />
          )}
        </div>
      </div>
      <div
        className={`${styles.drawerOverlay} ${mobileDrawer !== "none" ? styles.drawerOverlayOpen : ""}`}
        onClick={() => setMobileDrawer("none")}
      >
        <div
          className={`${styles.drawer} ${mobileDrawer !== "none" ? styles.drawerOpen : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* <button
            className={styles.drawerClose}
            onClick={() => setMobileDrawer("none")}
          >
            ✕
          </button> */}

          {mobileDrawer === "notifications" && (
            <NotificationPanel
              notifs={visibleNotifs}
              onRead={id =>
                setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
              }
              onReadAll={() => setNotifs(p => p.map(n => ({ ...n, read: true })))}
              onReset={() => setNotifs(INITIAL_NOTIFS)}
              onClose={() => setMobileDrawer("none")}
              drawerMode
            />
          )}

          {mobileDrawer === "settings" && (
            <SettingsPanel
              onClose={() => setMobileDrawer("none")}
              drawerMode
            />
          )}
        </div>
      </div>
    </header>
  );
}
