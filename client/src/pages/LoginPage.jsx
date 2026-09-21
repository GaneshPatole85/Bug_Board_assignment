import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginPage.css';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
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

  const handleSelectRole = (role, demoEmail, demoPassword) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setFieldErrors({});
  };

  return (
    <div className="auth-card" id="login-card">
      <div className="auth-header">
        <h1 className="auth-title" id="login-card-title">
          {selectedRole ? `Sign in as ${selectedRole}` : 'Sign in to BugBoard'}
        </h1>
        <p className="auth-subtitle">
          {selectedRole
            ? `Credentials loaded for ${selectedRole}. Click below to access workspace.`
            : 'Enter your credentials to access your workspace'}
        </p>
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="login-password" className="form-label" style={{ marginBottom: 0 }}>
              Password
            </label>
            <Link to="/forgot-password" id="login-forgot-password-link" className="forgot-password-link">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            className={`form-input ${fieldErrors.password ? 'input-invalid' : ''}`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError('password');
            }}
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
          {isSubmitting
            ? 'Authenticating...'
            : selectedRole
              ? `Sign in as ${selectedRole}`
              : 'Sign in'}
        </button>
      </form>

      <div className="auth-footer-prompt">
        Don't have an account?{' '}
        <Link to="/register">Create one</Link>
      </div>

      {/* Demo Quick-Selection Section */}
      <div className="auth-demo-section">
        <span className="auth-demo-label">Demo accounts</span>

        <div className="auth-demo-grid">
          <button
            type="button"
            className={`auth-demo-btn ${selectedRole === 'Admin' ? 'active' : ''}`}
            id="demo-admin-btn"
            onClick={() => handleSelectRole('Admin', 'gpatole473@gmail.com', 'Password123!')}
            title="Load Admin account credentials"
          >
            <span>👑</span> Admin
          </button>

          <button
            type="button"
            className={`auth-demo-btn ${selectedRole === 'Developer' ? 'active' : ''}`}
            id="demo-dev-btn"
            onClick={() => handleSelectRole('Developer', 'shastrisujata006@gmail.com', 'Password123!')}
            title="Load Lead Developer account credentials"
          >
            <span>💻</span> Developer
          </button>

          <button
            type="button"
            className={`auth-demo-btn ${selectedRole === 'Tester' ? 'active' : ''}`}
            id="demo-tester-btn"
            onClick={() => handleSelectRole('Tester', 'tester@bugboard.test', 'Password123!')}
            title="Load QA Tester account credentials"
          >
            <span>🔍</span> Tester
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
