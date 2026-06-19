import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.linksRow}>
        <span className={styles.brand}>Habit Tracker Pro</span>
        <span className={styles.divider}>|</span>
        <nav aria-label="Footer navigation">
          <a href="#privacy">Privacy</a>
          <a href="#support">Support</a>
          <a href="#terms">Terms</a>
        </nav>
      </div>
      <p>&copy; 2026 Habit Hackers. Build better habits, every day.</p>
    </footer>
  );
}
