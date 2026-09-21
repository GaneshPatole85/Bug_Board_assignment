import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import './LoginPage.css';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const GENERIC_CONFIRMATION =
    'If an account with that email exists, a reset link has been sent. Please check your inbox and spam folder.';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');

    if (!email.trim()) {
      setFieldError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
    } catch {
      // Intentionally suppress backend differences per Decision #2 (anti-enumeration)
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="auth-card" id="forgot-password-card">
      {!submitted ? (
        <>
          <div className="auth-header">
            <div className="auth-header-icon-badge">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </div>
            <h1 className="auth-title">Forgot your password?</h1>
            <p className="auth-subtitle">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} id="forgot-password-form" className="auth-form" noValidate>
            <div className={`form-group ${fieldError ? 'field-error' : ''}`}>
              <label htmlFor="forgot-email" className="form-label">
                Email address
              </label>
              <div className="input-with-icon-wrapper">
                <span className="input-icon-prefix">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  className={`form-input input-with-icon ${fieldError ? 'input-invalid' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError('');
                  }}
                  placeholder="name@company.com"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={Boolean(fieldError)}
                />
              </div>
              {fieldError && (
                <span className="field-error-msg" id="forgot-email-error" role="alert">
                  ⚠ {fieldError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="forgot-password-submit-btn"
              className="auth-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" /> Sending Instructions...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-prompt">
            <Link to="/login" id="back-to-login-link" className="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Return to Sign in
            </Link>
          </div>
        </>
      ) : (
        /* Confirmation State: Premium Email Sent Screen */
        <div className="auth-success-screen">
          <div className="auth-header-icon-badge success-badge">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We've sent a password reset link to <strong className="highlight-email">{email}</strong>
          </p>

          <div className="auth-alert-success" id="forgot-password-confirmation" role="status">
            <p style={{ margin: 0 }}>{GENERIC_CONFIRMATION}</p>
          </div>

          <div className="email-tips-box">
            <div className="email-tip-row">
              <span className="tip-icon">⏱️</span>
              <span>The link is valid for <strong>30 minutes</strong>.</span>
            </div>
            <div className="email-tip-row">
              <span className="tip-icon">📩</span>
              <span>Check your spam or junk folder if you don't see it in 2 minutes.</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
            <Link to="/login" className="auth-submit-btn" id="back-to-login-link" style={{ textDecoration: 'none' }}>
              Return to Sign in
            </Link>

            <button
              type="button"
              className="text-action-btn"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
            >
              Didn't receive the email? Click to try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
