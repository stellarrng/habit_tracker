import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings, type Settings, type NotifPrefs } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import styles from './Topbar.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';
import { resetAllUserData } from '../../api/userData';
import { createPortal } from 'react-dom';

// ── SettingsPanel ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}>
      <span className={styles.toggleThumb} />
    </button>
  );
}

function ResetModal({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={onCancel}
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className={styles.modalLoading}>
            <div className={styles.modalSpinner} />
            <p className={styles.modalLoadingText}>Resetting your data…</p>
            <p className={styles.modalLoadingSub}>This will only take a moment.</p>
          </div>
        ) : (
          <>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Reset all data?</h3>
            <p className={styles.modalBody}>
              This will permanently delete all your habits, check-ins, and goals.
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={onConfirm}
                disabled={isLoading}
              >
                Yes, reset everything
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body  // ← renders directly on body, escapes drawer's transform context
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

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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

  async function handleReset() {
    try {
      setResetLoading(true);
      await resetAllUserData();
      setShowResetModal(false);
      onClose();
      // Navigate to today page — it will refetch and show empty state
      navigate('/today');
      window.location.reload();
    } catch (err) {
      console.error(err);
      // Could show an error toast here
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <>
      <div
        ref={ref}
        className={drawerMode ? styles.drawerPanel : styles.panel}
        style={!drawerMode ? { width: 280 } : undefined}
      >
        <div className={styles.settingsProfile}>
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

        {/* Danger zone */}
        <div className={styles.settingsSection}>
          <p className={styles.settingsSectionLabel}>Data</p>
          <button
            className={styles.resetDataBtn}
            onClick={() => setShowResetModal(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            Reset all data
          </button>
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

      {/* Modal renders outside the panel so it isn't clipped by overflow */}
      {showResetModal && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => {
            setShowResetModal(false)
            onClose();    // close the SettingsPanel as well
          }}
          isLoading={resetLoading}
        />
      )}
    </>
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
            onMouseDown={e => e.stopPropagation()}
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
