import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children:   ReactNode;
  onNewHabit: () => void;
}

export default function AppLayout({ children, onNewHabit }: AppLayoutProps) {
  return (
    <div className={styles.appShell}>
      <Sidebar onNewHabit={onNewHabit} />
      <main className={styles.appMain}>
        {children}
      </main>
    </div>
  );
}
