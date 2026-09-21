import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import './MainLayout.css';

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
          {/* User Session Bar */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} id="user-header-profile">
              <NotificationBell />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {user.name}
                </span>
                <RoleBadge role={user.role} />
              </div>
              <NavLink
                to="/profile"
                className="header-profile-btn"
                id="header-profile-btn"
                title="View and manage your profile"
              >
                Profile
              </NavLink>
              <button
                onClick={handleLogout}
                id="logout-btn"
                className="header-logout-btn"
                title="Sign out of current session"
              >
                Sign out
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

            {user?.role === 'Admin' && (
              <NavLink
                to="/team"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                id="nav-team"
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </span>
                <span>Team</span>
              </NavLink>
            )}
          </div>

          <div className="sidebar-bottom">
            {isAuthenticated && user && (
              <div className="sidebar-user-card" id="sidebar-user-card">
                <div className="sidebar-user-avatar">
                  {user.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'U'}
                </div>
                <div className="sidebar-user-meta">
                  <span className="sidebar-user-name" title={user.name}>{user.name}</span>
                  <span className="sidebar-user-email" title={user.email}>{user.email}</span>
                </div>
                <RoleBadge role={user.role} />
              </div>
            )}

            <div className="sidebar-footer">
              <div className="tech-info-card">
                <strong>BugBoard Workspace</strong>
                <span>High-Performance Tracker</span>
              </div>
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
