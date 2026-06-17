import { memo } from 'react';
import { IconClose } from './Icons.jsx';

export const Modal = memo(function Modal({ open, title, onClose, children, className }) {
  if (!open) return null;
  return (
    <div className="modal-bg open" onClick={onClose}>
      <div className={`modal${className ? ` ${className}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <IconClose size={14} strokeWidth={2.5} />
        </button>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
});
