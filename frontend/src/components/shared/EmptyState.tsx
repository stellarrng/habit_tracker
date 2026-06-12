import { ReactNode } from 'react';
import { TargetIcon } from './Icons';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?:     ReactNode;
  title:     string;
  subtitle?: string;
  action?:   { label: string; onClick: () => void };
}

export default function EmptyState({ icon = <TargetIcon style={{ width: 48, height: 48 }} />, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 12 }}>
        {icon}
      </div>
      <div className={styles.emptyStateTitle}>{title}</div>
      {subtitle && <p className={styles.emptyStateSub}>{subtitle}</p>}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick} style={{ marginTop: 14 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
