import React, { useEffect } from 'react';
import FocusTrap from 'focus-trap-react';

export default function Modal({ open, onClose, title, children, labelledBy }) {
  useEffect(() => {
    function onDocClose(e) {
      if (e.key === 'Escape' || e.key === 'Esc') onClose?.();
    }
    if (open) window.addEventListener('keydown', onDocClose);
    return () => window.removeEventListener('keydown', onDocClose);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => { e.stopPropagation(); onClose?.(); }}
      aria-hidden={open ? 'false' : 'true'}
    >
      <FocusTrap
        focusTrapOptions={{
          onDeactivate: onClose,
          clickOutsideDeactivates: true,
          escapeDeactivates: false // handled above
        }}
      >
        <div
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="modal-header">
            <h2 id={labelledBy || 'modal-title'}>{title}</h2>
            <button aria-label="Close" onClick={onClose}>×</button>
          </header>
          <div className="modal-body">{children}</div>
        </div>
      </FocusTrap>
    </div>
  );
}