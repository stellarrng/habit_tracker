import { useState, useRef, useEffect } from "react";
import { useNotifications, type NotifType, type Notification } from "../../context/NotificationContext";
import styles from "./NotificationPanel.module.css";

type TabType = "all" | NotifType;

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifIcon({ type }: { type: NotifType }) {
  if (type === "reward") return (
    <span className={`${styles.notifTypeIcon} ${styles.notifIconReward}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2.4 4.8 5.3.8-3.8 3.7.9 5.2L10 14l-4.8 2.5.9-5.2L2.3 7.6z" />
      </svg>
    </span>
  );
  if (type === "warning") return (
    <span className={`${styles.notifTypeIcon} ${styles.notifIconWarning}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3L18 17H2L10 3z" /><line x1="10" y1="9" x2="10" y2="12" /><circle cx="10" cy="15" r="0.5" fill="currentColor" />
      </svg>
    </span>
  );
  return (
    <span className={`${styles.notifTypeIcon} ${styles.notifIconReminder}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" /><line x1="10" y1="6" x2="10" y2="10" /><line x1="10" y1="13" x2="10" y2="14" />
      </svg>
    </span>
  );
}

export default function NotificationPanel() {
  const { notifs, loading, panelOpen, setPanelOpen, markRead, markAllRead, clearAll } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelOpen, setPanelOpen]);

  if (!panelOpen) return null;

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "reminder", label: "Reminder" },
    { key: "warning", label: "Warning" },
    { key: "reward", label: "Reward" },
  ];

  const countByType = (type: NotifType) => notifs.filter(n => n.type === type && !n.read).length;
  const totalUnread = notifs.filter(n => !n.read).length;
  const filtered: Notification[] = activeTab === "all" ? notifs : notifs.filter(n => n.type === activeTab);

  return (
    <div ref={ref} className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>NOTIFICATIONS</span>
          <span className={styles.subtitle}>
            {totalUnread > 0 ? `You have ${totalUnread} unread notice${totalUnread > 1 ? "s" : ""}` : "All caught up!"}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={() => setPanelOpen(false)} aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map(tab => {
          const count = tab.key === "all" ? totalUnread : countByType(tab.key as NotifType);
          return (
            <button key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.key)}>
              {tab.label}
              {count > 0 && (
                <span className={`${styles.tabBadge} ${activeTab === tab.key ? styles.tabBadgeActive : ""}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      {notifs.length > 0 && (
        <div className={styles.actions}>
          <button className={styles.markAllBtn} onClick={markAllRead}>Mark all read</button>
          <button className={styles.clearBtn} onClick={clearAll}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 4 14 12 14 13 6" /><line x1="1" y1="4" x2="15" y2="4" /><path d="M6 4V2h4v2" />
            </svg>
            Clear all
          </button>
        </div>
      )}

      {/* List */}
      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No notifications here.</div>
        ) : (
          filtered.map(n => (
            <div key={n.id}
              className={`${styles.item} ${n.read ? styles.itemRead : ""}`}
              onClick={() => !n.read && markRead(n.id)}
              style={{ cursor: n.read ? "default" : "pointer" }}
            >
              {!n.read && <span className={styles.unreadDot} />}
              <NotifIcon type={n.type} />
              <div className={styles.itemContent}>
                <div className={styles.itemTop}>
                  <span className={styles.itemTitle}>{n.title}</span>
                  <span className={styles.itemTime}>{timeAgo(n.timestamp)}</span>
                </div>
                <p className={styles.itemBody}>{n.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>SYSTEM NOTIFICATIONS</div>
    </div>
  );
}
