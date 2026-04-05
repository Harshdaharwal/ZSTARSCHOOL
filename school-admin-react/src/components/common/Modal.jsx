import { memo } from 'react';

export const Modal = memo(function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-bg open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
});
