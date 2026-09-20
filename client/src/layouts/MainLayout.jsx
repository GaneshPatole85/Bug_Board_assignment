import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import apiClient from '../api/client.js';
import './MainLayout.css';

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: 'Connecting...' });
  const location = useLocation();

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
            <span className="brand-badge">Phase 1</span>
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
                    ? 'var(--status-success)'
                    : backendHealth.status === 'checking'
                    ? 'var(--status-warning)'
                    : 'var(--status-danger)',
                boxShadow:
                  backendHealth.status === 'online'
                    ? '0 0 8px var(--status-success)'
                    : backendHealth.status === 'checking'
                    ? '0 0 8px var(--status-warning)'
                    : '0 0 8px var(--status-danger)',
              }}
            />
            <span>{backendHealth.message}</span>
          </div>
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

          <div className="nav-section">
            <span className="nav-heading">Account & Access</span>
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
              <span>Sign In / Auth</span>
            </NavLink>
          </div>

          <div className="sidebar-footer">
            <div className="tech-info-card">
              <strong>BugBoard Architecture</strong>
              Phase 1 • Foundation & Schema
              <br />
              MERN Stack • Native Mongo
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
