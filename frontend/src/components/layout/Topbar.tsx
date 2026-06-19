import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings, type Settings, type NotifPrefs } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import styles from './Topbar.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const { unreadCount, togglePanel, panelOpen } = useNotifications();

  const [activePanel, setActivePanel] = useState<
    "none" | "settings"
  >("none");
  const [mobileDrawer, setMobileDrawer] = useState<
    "none" | "notifications" | "settings"
  >("none");

  const isMobile = useIsMobile();

  useEffect(() => {
    setActivePanel("none");
    setMobileDrawer("none");
  }, [isMobile]);

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
            className={`${styles.iconBtn} ${panelOpen ? styles.iconBtnActive : ""}`}
            aria-label="Notifications"
            onClick={() => {
              setActivePanel("none");
              togglePanel();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
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
      <NotificationPanel />

      <div
        className={`${styles.drawerOverlay} ${mobileDrawer !== "none" ? styles.drawerOverlayOpen : ""}`}
        onClick={() => setMobileDrawer("none")}
      >
        <div
          className={`${styles.drawer} ${mobileDrawer !== "none" ? styles.drawerOpen : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
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
