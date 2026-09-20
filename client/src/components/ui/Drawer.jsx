import React, { useEffect } from 'react';
import './Drawer.css';

export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom', // 'bottom' (mobile sheet) or 'right'
  id = 'drawer',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose} id={`${id}-overlay`}>
      <div
        className={`drawer-panel drawer-${position}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        id={id}
      >
        <div className="drawer-header">
          {position === 'bottom' && <div className="drawer-drag-handle" />}
          <div className="drawer-header-content">
            <h3 className="drawer-title">{title}</h3>
            <button
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close panel"
              id={`${id}-close`}
            >
              ×
            </button>
          </div>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;
