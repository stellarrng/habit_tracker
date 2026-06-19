import { useEffect, useState } from 'react';
import { CheckIcon } from './Icons';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose, actionLabel, onAction }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      onClose?.();
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  function handleAction() {
    onAction?.();
    setIsVisible(false);
  }

  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`} role="status">
      <div className={styles.toastContent}>
        {type === 'success' && <CheckIcon style={{ width: 18, height: 18 }} />}
        <span className={styles.toastMessage}>{message}</span>
      </div>
      {actionLabel && onAction && (
        <button className={styles.toastAction} onClick={handleAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
