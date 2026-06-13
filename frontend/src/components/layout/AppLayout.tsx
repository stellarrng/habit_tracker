import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={styles.appShell}>
      <Sidebar />
      <main className={styles.appMain}>{children}</main>
    </div>
  );
}
