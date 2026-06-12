import { AlertCircleIcon, CloseIcon } from './Icons';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="error-banner" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <AlertCircleIcon style={{ flexShrink: 0, width: 18, height: 18 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'inline-flex', alignItems: 'center', padding: 0 }}
          aria-label="Dismiss error"
        >
          <CloseIcon style={{ width: 16, height: 16 }} />
        </button>
      )}
    </div>
  );
}
