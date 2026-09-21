import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginPage.css';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Top-level form error banner
  const [error, setError] = useState(null);
  // Per-field inline errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after successful login
  const from = location.state?.from?.pathname || '/dashboard';
  const registerSuccessMsg = location.state?.message;

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. name@company.com).';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      // Map backend field errors (e.g. { field: 'auth', message: ... }) to banner
      const apiErrors = Array.isArray(err?.errors) ? err.errors : [];
      const fieldMap = {};
      apiErrors.forEach((e) => {
        if (e.field && e.field !== 'auth') {
          fieldMap[e.field] = e.message;
        }
      });
      if (Object.keys(fieldMap).length > 0) {
        setFieldErrors(fieldMap);
      } else {
        setError(err.message || 'Invalid email or password. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setFieldErrors({});
  };

  return (
    <div className="auth-card" id="login-card">
      <div className="auth-header">
        <h1 className="auth-title">Sign in to BugBoard</h1>
        <p className="auth-subtitle">Enter your credentials to access your workspace</p>
      </div>

      {registerSuccessMsg && (
        <div className="auth-alert-success" role="status">
          {registerSuccessMsg}
        </div>
      )}

      {error && (
        <div className="auth-alert-error" id="login-error-alert" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} id="login-form" className="auth-form" noValidate>
        <div className={`form-group ${fieldErrors.email ? 'field-error' : ''}`}>
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            className={`form-input ${fieldErrors.email ? 'input-invalid' : ''}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
            placeholder="name@company.com"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          />
          {fieldErrors.email && (
            <span className="field-error-msg" id="login-email-error" role="alert">
              ⚠ {fieldErrors.email}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.password ? 'field-error' : ''}`}>
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className={`form-input ${fieldErrors.password ? 'input-invalid' : ''}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          />
          {fieldErrors.password && (
            <span className="field-error-msg" id="login-password-error" role="alert">
              ⚠ {fieldErrors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          id="login-submit-btn"
          className="auth-submit-btn"
        >
          {isSubmitting ? 'Authenticating...' : 'Sign in'}
        </button>
      </form>

      <div className="auth-footer-prompt">
        Don't have an account?{' '}
        <Link to="/register">Create one</Link>
      </div>

      {/* Demo Quick-Fill Section for Reviewers */}
      <div className="auth-demo-section">
        <span className="auth-demo-label">Demo accounts</span>

        <div className="auth-demo-grid">
          <button
            type="button"
            className="auth-demo-btn"
            onClick={() => fillQuickLogin('admin@bugboard.test', 'Password123!')}
            title="Admin account (Full system rights)"
          >
            <span>👑</span> Admin
          </button>

          <button
            type="button"
            className="auth-demo-btn"
            onClick={() => fillQuickLogin('dev@bugboard.test', 'Password123!')}
            title="Developer account (Assignments & updates)"
          >
            <span>💻</span> Developer
          </button>

          <button
            type="button"
            className="auth-demo-btn"
            onClick={() => fillQuickLogin('tester@bugboard.test', 'Password123!')}
            title="Tester account (Bug reporting & verification)"
          >
            <span>🔍</span> Tester
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
