import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

// Maximum concurrent toasts before oldest is dismissed (FIFO queue)
const MAX_TOASTS = 3;

// Default durations per type (ms). Errors stay longer so users can read them.
const DEFAULT_DURATIONS = {
  success: 4000,
  error: 8000,
  warning: 6000,
  info: 4000,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', durationOverride) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const duration = durationOverride !== undefined ? durationOverride : (DEFAULT_DURATIONS[type] ?? 4000);

    setToasts((prev) => {
      // Enforce max stack: drop oldest if already at limit
      const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
      return [...next, { id, message, type }];
    });

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  // Listen for session-expiry events dispatched by the API client before redirecting
  useEffect(() => {
    const handleSessionExpired = (e) => {
      addToast(e.detail?.message || 'Your session has expired — please sign in again.', 'error');
    };
    window.addEventListener('bugboard:session-expired', handleSessionExpired);
    return () => window.removeEventListener('bugboard:session-expired', handleSessionExpired);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite" id="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
            role="status"
          >
            <span className="toast-icon" aria-hidden="true">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
