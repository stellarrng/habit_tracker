import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './AppLayout.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';

const PAGE_TITLES: Record<string, string> = {
  '/today': 'Today',
  '/habits': 'Habits',
  '/dashboard': 'Statistics',
  '/goals': 'Goals',
};

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[base] ?? 'HabitMind';

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    setSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className={styles.appShell}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={styles.appRight}>
        <Topbar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className={styles.appMain}>
          {children}
        </main>
      </div>
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
