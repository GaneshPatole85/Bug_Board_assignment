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
      // Check if this was an invalid/expired token error (400)
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
        <h1 className="auth-title">Create new password</h1>
        <p className="auth-subtitle">Choose a secure password for your account</p>
      </div>

      {tokenError ? (
        <div className="auth-alert-error" id="reset-token-error-alert" role="alert">
          <p style={{ margin: '0 0 0.75rem 0' }}>{tokenError}</p>
          <Link
            to="/forgot-password"
            id="request-new-reset-link"
            style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}
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
            <input
              id="reset-new-password"
              type="password"
              className={`form-input ${fieldErrors.newPassword ? 'input-invalid' : ''}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearFieldError('newPassword');
              }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.newPassword)}
              aria-describedby={fieldErrors.newPassword ? 'reset-new-password-error' : undefined}
            />
            {fieldErrors.newPassword && (
              <span className="field-error-msg" id="reset-new-password-error" role="alert">
                ⚠ {fieldErrors.newPassword}
              </span>
            )}
          </div>

          <div className={`form-group ${fieldErrors.confirmNewPassword ? 'field-error' : ''}`}>
            <label htmlFor="reset-confirm-password" className="form-label">
              Confirm New Password <span className="field-required">*</span>
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              className={`form-input ${fieldErrors.confirmNewPassword ? 'input-invalid' : ''}`}
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                clearFieldError('confirmNewPassword');
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.confirmNewPassword)}
              aria-describedby={fieldErrors.confirmNewPassword ? 'reset-confirm-password-error' : undefined}
            />
            {fieldErrors.confirmNewPassword && (
              <span className="field-error-msg" id="reset-confirm-password-error" role="alert">
                ⚠ {fieldErrors.confirmNewPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="reset-password-submit-btn"
            className="auth-submit-btn"
          >
            {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="auth-footer-prompt" style={{ marginTop: '1.5rem' }}>
        Back to{' '}
        <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
