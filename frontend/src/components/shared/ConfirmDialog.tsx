import { InfoIcon, AlertCircleIcon } from './Icons';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  function renderIcon() {
    const iconStyle = { width: 22, height: 22 };
    switch (type) {
      case 'danger':
        return <AlertCircleIcon style={iconStyle} />;
      case 'warning':
        return <AlertCircleIcon style={iconStyle} />;
      default:
        return <InfoIcon style={iconStyle} />;
    }
  }

  const confirmBtnClass =
    type === 'danger'
      ? `btn ${styles.btnDangerSolid}`
      : type === 'warning'
      ? `btn ${styles.btnWarning}`
      : 'btn btn-primary';

  return (
    <div className={styles.confirmBackdrop} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={styles.confirmBody}>
          <div className={`${styles.confirmIconWrapper} ${styles['confirmIcon_' + type]}`}>
            {renderIcon()}
          </div>
          <div className={styles.confirmContent}>
            <h3 className={styles.confirmTitle} id="confirm-title">{title}</h3>
            <p className={styles.confirmMessage}>{message}</p>
          </div>
        </div>
        <div className={styles.confirmFooter}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmBtnClass} onClick={onConfirm} id="confirm-dialog-submit">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
