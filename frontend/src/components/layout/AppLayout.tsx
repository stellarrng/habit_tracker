import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './AppLayout.module.css';

const PAGE_TITLES: Record<string, string> = {
  '/today':     'Today',
  '/habits':    'Habits',
  '/dashboard': 'Statistics',
  '/goals':     'Goals',
};

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const base  = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[base] ?? 'HabitMind';

  return (
    <div className={styles.appShell}>
      <Sidebar />

      <div className={styles.appRight}>
        <Topbar title={title} />
        <main className={styles.appMain}>
          {children}
        </main>
      </div>
    </div>
  );
}
