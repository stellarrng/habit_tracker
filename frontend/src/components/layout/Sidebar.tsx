import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { CalendarIcon, TargetIcon, BarChartIcon, PlusIcon } from '../shared/Icons';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/habits', label: 'Habits', icon: 'habits' },
  { to: '/dashboard', label: 'Stats', icon: 'stats' },
];

interface SidebarProps {
  onNewHabit: () => void;
}

export default function Sidebar({ onNewHabit }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount, togglePanel, panelOpen } = useNotifications();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  function getNavIcon(icon: string) {
    switch (icon) {
      case 'today': return <CalendarIcon />;
      case 'habits': return <TargetIcon />;
      case 'stats': return <BarChartIcon />;
      default: return null;
    }
  }

  return (
    <aside className={styles.appSidebar}>
      {/* Brand */}
      <div className={styles.sidebarBrand}>
        <div className={styles.sidebarBrandRow}>
          <div>
            <div className={styles.sidebarBrandName}>Habit Tracker Pro</div>
            <div className={styles.sidebarBrandSub}>Built for clarity</div>
          </div>
          <button
            className={`${styles.sidebarBellBtn} ${panelOpen ? styles.sidebarBellActive : ''}`}
            onClick={togglePanel}
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className={styles.sidebarBellBadge}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.sidebarNav}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `${styles.sidebarNavItem} ${isActive ? styles.active : ''}`}>
            <span className={styles.navIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {getNavIcon(item.icon)}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* CTA */}
      <button className={styles.sidebarNewHabit} onClick={onNewHabit} id="sidebar-new-habit-btn"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <PlusIcon /> New Habit
      </button>

      {/* User */}
      <div className={styles.sidebarUser}>
        <div className={styles.sidebarAvatar}>{initials}</div>
        <div>
          <div className={styles.sidebarUserName}>{user?.name ?? 'Guest'}</div>
          <div className={styles.sidebarUserPlan}>
            <button onClick={() => { logout(); navigate('/login'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: 0 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
