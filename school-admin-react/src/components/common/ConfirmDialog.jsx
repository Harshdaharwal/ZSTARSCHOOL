import { memo } from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { esc } from '../../utils/format.js';

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
    <Modal open title={esc(title)} onClose={onCancel}>
      <p style={{ marginBottom: 20, lineHeight: 1.5 }}>{esc(message)}</p>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {esc(confirmLabel)}
        </Button>
      </div>
    </Modal>
  );
});
