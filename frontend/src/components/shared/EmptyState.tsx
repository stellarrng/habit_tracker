import { ReactNode } from 'react';
import { TargetIcon } from './Icons';

interface EmptyStateProps {
  icon?:     ReactNode;
  title:     string;
  subtitle?: string;
  action?:   { label: string; onClick: () => void };
}

export default function EmptyState({ icon = <TargetIcon style={{ width: 48, height: 48 }} />, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 12 }}>
        {icon}
      </div>
      <div className="empty-state-title">{title}</div>
      {subtitle && <p className="empty-state-sub">{subtitle}</p>}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick} style={{ marginTop: 14 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
