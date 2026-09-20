import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginPage.css';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after successful login
  const from = location.state?.from?.pathname || '/dashboard';
  const registerSuccessMsg = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g. name@company.com).');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
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

      <form onSubmit={handleSubmit} id="login-form" className="auth-form">
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
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
