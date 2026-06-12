import { CloseIcon, InfoIcon, AlertCircleIcon } from './Icons';

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
      ? 'btn btn-danger-solid'
      : type === 'warning'
      ? 'btn btn-warning'
      : 'btn btn-primary';

  return (
    <div className="confirm-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-body">
          <div className={`confirm-icon-wrapper confirm-icon-${type}`}>
            {renderIcon()}
          </div>
          <div className="confirm-content">
            <h3 className="confirm-title" id="confirm-title">{title}</h3>
            <p className="confirm-message">{message}</p>
          </div>
        </div>
        <div className="confirm-footer">
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
