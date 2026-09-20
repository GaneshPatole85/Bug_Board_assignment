import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './RegisterPage.css';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Developer');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password, role });
      // Redirect to login with success message (no auto-login, per design decisions)
      navigate('/login', {
        state: { message: 'Registration successful! Please sign in with your credentials.' },
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
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

      <form onSubmit={handleSubmit} id="register-form" className="register-form">
        <div className="form-group">
          <label htmlFor="register-name" className="form-label">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            Email address
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-role" className="form-label">
            Workspace role
          </label>
          <select
            id="register-role"
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Developer">Developer (Issue assignment & implementation)</option>
            <option value="Tester">Tester (Bug reporting & QA verification)</option>
          </select>
          <span className="form-hint">
            Admin accounts are provisioned via system seeders for security.
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="register-password" className="form-label">
            Password (min. 8 characters)
          </label>
          <input
            id="register-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
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
