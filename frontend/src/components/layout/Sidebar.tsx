import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CalendarIcon, TargetIcon, BarChartIcon } from '../shared/Icons';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/today', label: 'Today', Icon: CalendarIcon },
  { to: '/habits', label: 'Habits', Icon: TargetIcon },
  { to: '/dashboard', label: 'Stats', Icon: BarChartIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      {/* Brand */}
      <div className={styles.brand}>
        <img src="/logo.png" alt="HabitFlow logo" className={styles.brandLogo} />
        <div className={styles.brandText}>
          <span className={styles.brandName}>HabitFlow</span>
          <span className={styles.brandSub}>Stay mindful</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
            onClick={onClose}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className={styles.footer}>
        <button className={styles.footerLink} onClick={() => { }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          Help
        </button>

        <button className={styles.footerLink} onClick={() => { logout(); navigate('/login'); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
