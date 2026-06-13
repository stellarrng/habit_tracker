import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

const navItems = [
  {
    label: "Today",
    to: "/today",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 2v4M16 2v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
  {
    label: "Habits",
    to: "/habits",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    label: "Stats",
    to: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-7M18 7h-4M18 7v4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <div>
        <div className={styles.brand}>
          <span className={styles.brandName}>Habit Tracker Pro</span>
          <span className={styles.brandTagline}>Habit Hackers</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <NavLink to="/habits" className={styles.newButton}>
          New Habit
        </NavLink>

        <div className={styles.profile}>
          <div className={styles.avatar}>A</div>
          <div>
            <strong>Alex Rivera</strong>
            <span>Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
