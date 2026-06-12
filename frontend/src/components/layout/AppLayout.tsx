import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children:   ReactNode;
  onNewHabit: () => void;
}

export default function AppLayout({ children, onNewHabit }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar onNewHabit={onNewHabit} />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
