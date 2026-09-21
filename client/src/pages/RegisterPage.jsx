import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { applyApiErrorsToForm } from '../utils/apiErrors.js';
import './RegisterPage.css';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Developer');
  // Top-level error banner
  const [error, setError] = useState(null);
  // Per-field inline errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation — match backend rules exactly
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters.';
    } else if (name.trim().length > 100) {
      errs.name = 'Full name cannot exceed 100 characters.';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. name@company.com).';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }

    if (password && password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match. Please re-enter your password.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, role });
      // Redirect to login with success message (no auto-login, per design decisions)
      navigate('/login', {
        state: { message: 'Account created successfully! Please sign in with your credentials.' },
      });
    } catch (err) {
      // Map backend field errors (e.g. duplicate email → email field) to inline display
      applyApiErrorsToForm(err, setFieldErrors, setError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-card" id="register-card">
      <div className="register-header">
        <h1 className="register-title">Create an account</h1>
        <p className="register-subtitle">
          Join the BugBoard workspace as a Developer or Tester
        </p>
      </div>

      {error && (
        <div className="register-alert-error" id="register-error-alert" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} id="register-form" className="register-form" noValidate>
        <div className={`form-group ${fieldErrors.name ? 'field-error' : ''}`}>
          <label htmlFor="register-name" className="form-label">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            className={`form-input ${fieldErrors.name ? 'input-invalid' : ''}`}
            value={name}
            onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
            placeholder="e.g. Alex Morgan"
            maxLength={100}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
          />
          {fieldErrors.name && (
            <span className="field-error-msg" id="register-name-error" role="alert">
              ⚠ {fieldErrors.name}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.email ? 'field-error' : ''}`}>
          <label htmlFor="register-email" className="form-label">
            Email address
          </label>
          <input
            id="register-email"
            type="email"
            className={`form-input ${fieldErrors.email ? 'input-invalid' : ''}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
            placeholder="name@company.com"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
          />
          {fieldErrors.email && (
            <span className="field-error-msg" id="register-email-error" role="alert">
              ⚠ {fieldErrors.email}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.role ? 'field-error' : ''}`}>
          <label htmlFor="register-role" className="form-label">
            Workspace role
          </label>
          <select
            id="register-role"
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Developer">Developer (Issue assignment &amp; implementation)</option>
            <option value="Tester">Tester (Bug reporting &amp; QA verification)</option>
          </select>
          <span className="form-hint">
            Admin accounts are provisioned via system seeders for security.
          </span>
        </div>

        <div className={`form-group ${fieldErrors.password ? 'field-error' : ''}`}>
          <label htmlFor="register-password" className="form-label">
            Password (min. 8 characters)
          </label>
          <input
            id="register-password"
            type="password"
            className={`form-input ${fieldErrors.password ? 'input-invalid' : ''}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            placeholder="••••••••"
            minLength={8}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
          />
          {fieldErrors.password && (
            <span className="field-error-msg" id="register-password-error" role="alert">
              ⚠ {fieldErrors.password}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.confirmPassword ? 'field-error' : ''}`}>
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            className={`form-input ${fieldErrors.confirmPassword ? 'input-invalid' : ''}`}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
            placeholder="••••••••"
            minLength={8}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-error' : undefined}
          />
          {fieldErrors.confirmPassword && (
            <span className="field-error-msg" id="register-confirm-error" role="alert">
              ⚠ {fieldErrors.confirmPassword}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          id="register-submit-btn"
          className="register-submit-btn"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="register-footer-prompt">
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
};

export default RegisterPage;
