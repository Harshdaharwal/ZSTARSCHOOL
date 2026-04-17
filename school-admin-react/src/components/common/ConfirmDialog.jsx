import { memo } from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export const ConfirmDialog = memo(function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <Modal open title={title} onClose={onCancel}>
      <p style={{ marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
});
