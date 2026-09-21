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
      <div className="auth-header">
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">Enter your email address and we'll send you a password reset link</p>
      </div>

      {submitted ? (
        <div className="auth-alert-success" id="forgot-password-confirmation" role="status">
          <p style={{ margin: 0 }}>{GENERIC_CONFIRMATION}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} id="forgot-password-form" className="auth-form" noValidate>
          <div className={`form-group ${fieldError ? 'field-error' : ''}`}>
            <label htmlFor="forgot-email" className="form-label">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              className={`form-input ${fieldError ? 'input-invalid' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError('');
              }}
              placeholder="name@company.com"
              autoComplete="email"
              aria-invalid={Boolean(fieldError)}
            />
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
            {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <div className="auth-footer-prompt" style={{ marginTop: '1.5rem' }}>
        Remembered your password?{' '}
        <Link to="/login" id="back-to-login-link">Sign in</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
