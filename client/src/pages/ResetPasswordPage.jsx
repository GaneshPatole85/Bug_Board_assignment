import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import './LoginPage.css';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [tokenError, setTokenError] = useState(
    !token ? 'This reset link is invalid or has expired.' : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', percent: 0, color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', percent: 33, color: 'var(--priority-urgent)' };
    if (score <= 3) return { score: 2, label: 'Fair', percent: 66, color: 'var(--priority-medium)' };
    return { score: 3, label: 'Strong', percent: 100, color: 'var(--status-resolved)' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setTokenError(null);

    const errs = {};
    if (!newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters long.';
    }

    if (!confirmNewPassword) {
      errs.confirmNewPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmNewPassword) {
      errs.confirmNewPassword = 'New passwords do not match.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    if (!token) {
      setTokenError('This reset link is invalid or has expired.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
        confirmNewPassword,
      });

      addToast('Password reset successfully. Please sign in with your new password.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      if (err.status === 400 || (err.message && /invalid or has expired/i.test(err.message))) {
        setTokenError(err.message || 'This reset link is invalid or has expired.');
      } else {
        const fieldMap = {};
        const apiErrs = Array.isArray(err?.errors) ? err.errors : [];
        apiErrs.forEach((e) => {
          if (e.field && e.field !== 'token') {
            fieldMap[e.field] = e.message;
          }
        });
        if (Object.keys(fieldMap).length > 0) {
          setFieldErrors(fieldMap);
        } else {
          setTokenError(err.message || 'Unable to reset password. Please request a new link.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card" id="reset-password-card">
      <div className="auth-header">
        <div className="auth-header-icon-badge">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="auth-title">Create new password</h1>
        <p className="auth-subtitle">Choose a secure password for your account</p>
      </div>

      {tokenError ? (
        <div className="auth-alert-error" id="reset-token-error-alert" role="alert">
          <p style={{ margin: '0 0 0.75rem 0', fontWeight: 500 }}>{tokenError}</p>
          <Link
            to="/forgot-password"
            id="request-new-reset-link"
            style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            Request a new reset link &rarr;
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} id="reset-password-form" className="auth-form" noValidate>
          <div className={`form-group ${fieldErrors.newPassword ? 'field-error' : ''}`}>
            <label htmlFor="reset-new-password" className="form-label">
              New Password <span className="field-required">*</span>
            </label>
            <div className="input-with-action">
              <input
                id="reset-new-password"
                type={showNewPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.newPassword ? 'input-invalid' : ''}`}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearFieldError('newPassword');
                }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
                aria-invalid={Boolean(fieldErrors.newPassword)}
                aria-describedby={fieldErrors.newPassword ? 'reset-new-password-error' : undefined}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <span className="field-error-msg" id="reset-new-password-error" role="alert">
                ⚠ {fieldErrors.newPassword}
              </span>
            )}

            {newPassword && (
              <div className="password-strength-container" style={{ marginTop: '6px' }}>
                <div className="password-strength-track">
                  <div
                    className="password-strength-bar"
                    style={{
                      width: `${passwordStrength.percent}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
                <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className={`form-group ${fieldErrors.confirmNewPassword ? 'field-error' : ''}`}>
            <label htmlFor="reset-confirm-password" className="form-label">
              Confirm New Password <span className="field-required">*</span>
            </label>
            <div className="input-with-action">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.confirmNewPassword ? 'input-invalid' : ''}`}
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  clearFieldError('confirmNewPassword');
                }}
                placeholder="Repeat new password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmNewPassword)}
                aria-describedby={fieldErrors.confirmNewPassword ? 'reset-confirm-password-error' : undefined}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {fieldErrors.confirmNewPassword && (
              <span className="field-error-msg" id="reset-confirm-password-error" role="alert">
                ⚠ {fieldErrors.confirmNewPassword}
              </span>
            )}
            {newPassword && confirmNewPassword && newPassword === confirmNewPassword && (
              <span className="form-success-hint" style={{ fontSize: '0.75rem', color: 'var(--status-resolved)', marginTop: '2px', fontWeight: 500 }}>
                ✓ Passwords match
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="reset-password-submit-btn"
            className="auth-submit-btn"
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" /> Resetting Password...
              </>
            ) : (
              'Reset Password & Sign in'
            )}
          </button>
        </form>
      )}

      <div className="auth-footer-prompt">
        <Link to="/login" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Return to Sign in
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
