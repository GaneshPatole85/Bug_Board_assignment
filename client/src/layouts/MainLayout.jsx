import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import './MainLayout.css';

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: 'Connecting...' });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Periodic health check against backend API
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const data = await apiClient.get('/health');
        if (isMounted) {
          setBackendHealth({
            status: data.status === 'healthy' ? 'online' : 'degraded',
            message: data.status === 'healthy' ? 'API Online' : 'Degraded',
            dbStatus: data.database?.status || 'unknown',
          });
        }
      } catch (err) {
        if (isMounted) {
          setBackendHealth({
            status: 'offline',
            message: 'API Offline',
            dbStatus: 'disconnected',
          });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'badge-warning';
      case 'Developer':
        return 'badge-info';
      case 'Tester':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  return (
    <div className="layout-container" id="bugboard-root">
      {/* Top Header */}
      <header className="layout-header">
        <div className="header-left">
          <button
            className="menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            id="mobile-menu-toggle"
          >
            ☰
          </button>
          <div className="brand-wrapper">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24">
                <path d="M19 8h-1.81a5.985 5.985 0 0 0-1.82-1.96l1.37-1.37a.996.996 0 1 0-1.41-1.41l-1.86 1.86A5.927 5.927 0 0 0 12 5c-.48 0-.95.06-1.4.17L8.73 3.3a.996.996 0 1 0-1.41 1.41l1.34 1.34C7.62 6.78 6.94 7.82 6.81 9H5c-.55 0-1 .45-1 1s.45 1 1 1h1.09c-.05.33-.09.66-.09 1v1H5c-.55 0-1 .45-1 1s.45 1 1 1h1v1c0 .34.04.67.09 1H5c-.55 0-1 .45-1 1s.45 1 1 1h1.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H19c.55 0 1-.45 1-1s-.45-1-1-1h-1.09c.05-.33.09-.66.09-1v-1h1c.55 0 1-.45 1-1s-.45-1-1-1h-1v-1c0-.34-.04-.67-.09-1H19c.55 0 1-.45 1-1s-.45-1-1-1zm-6 10c-2.21 0-4-1.79-4-4v-3c0-2.21 1.79-4 4-4s4 1.79 4 4v3c0 2.21-1.79 4-4 4z" />
              </svg>
            </div>
            <span className="brand-name">BugBoard</span>
          </div>
        </div>

        <div className="header-right">
          <div
            className="system-status-indicator"
            title={`Backend: ${backendHealth.message} | DB: ${backendHealth.dbStatus || 'unknown'}`}
            id="system-status-indicator"
          >
            <span
              className="status-dot"
              style={{
                backgroundColor:
                  backendHealth.status === 'online'
                    ? 'var(--status-resolved)'
                    : backendHealth.status === 'checking'
                    ? 'var(--priority-medium)'
                    : 'var(--priority-urgent)',
              }}
            />
            <span>{backendHealth.message}</span>
          </div>

          {/* User Session Bar */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} id="user-header-profile">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {user.name}
                </span>
                <RoleBadge role={user.role} />
              </div>
              <button
                onClick={handleLogout}
                id="logout-btn"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--color-slate)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                title="Sign out of current session"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <NavLink
                to="/login"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                }}
                id="header-login-btn"
              >
                Sign In
              </NavLink>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="layout-body">
        {/* Backdrop overlay for mobile drawer */}
        <div
          className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar Navigation */}
        <aside className={`layout-sidebar ${isMobileMenuOpen ? 'open' : ''}`} id="main-sidebar">
          <div className="nav-section">
            <span className="nav-heading">Platform</span>

            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              id="nav-dashboard"
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </span>
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/projects"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              id="nav-projects"
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
              </span>
              <span>Projects</span>
            </NavLink>

            <NavLink
              to="/issues"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              id="nav-issues"
            >
              <span className="nav-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
                </svg>
              </span>
              <span>Issues</span>
            </NavLink>
          </div>

          {/* Account Section */}
          <div className="nav-section">
            <span className="nav-heading">Authentication</span>
            {!isAuthenticated ? (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  id="nav-login"
                >
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                  </span>
                  <span>Sign In</span>
                </NavLink>

                <NavLink
                  to="/register"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  id="nav-register"
                >
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </span>
                  <span>Register</span>
                </NavLink>
              </>
            ) : (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {user.email}
                </div>
                {/* 
                  NOTE: Role indicator in UI is for UX awareness only.
                  The backend Express middleware chains (authenticate, authorizeRole)
                  strictly enforce all authorization boundaries.
                */}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Role: <strong style={{ color: 'var(--accent-primary)' }}>{user.role}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <div className="tech-info-card">
              <strong>BugBoard Workspace</strong>
              <span>High-Performance Tracker</span>
            </div>
          </div>
        </aside>

        {/* Dynamic Route Content */}
        <main className="layout-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
