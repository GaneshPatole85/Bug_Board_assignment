import React from 'react';
import { Outlet } from 'react-router-dom';
import './PublicLayout.css';

export const PublicLayout = () => {
  return (
    <div className="public-layout-container" id="public-layout">
      <div className="public-brand-anchor">
        <div className="public-brand-mark">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="#FFFFFF"
              d="M19 8h-1.81a5.985 5.985 0 0 0-1.82-1.96l1.37-1.37a.996.996 0 1 0-1.41-1.41l-1.86 1.86A5.927 5.927 0 0 0 12 5c-.48 0-.95.06-1.4.17L8.73 3.3a.996.996 0 1 0-1.41 1.41l1.34 1.34C7.62 6.78 6.94 7.82 6.81 9H5c-.55 0-1 .45-1 1s.45 1 1 1h1.09c-.05.33-.09.66-.09 1v1H5c-.55 0-1 .45-1 1s.45 1 1 1h1v1c0 .34.04.67.09 1H5c-.55 0-1 .45-1 1s.45 1 1 1h1.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H19c.55 0 1-.45 1-1s-.45-1-1-1h-1.09c.05-.33.09-.66.09-1v-1h1c.55 0 1-.45 1-1s-.45-1-1-1h-1v-1c0-.34-.04-.67-.09-1H19c.55 0 1-.45 1-1s-.45-1-1-1zm-6 10c-2.21 0-4-1.79-4-4v-3c0-2.21 1.79-4 4-4s4 1.79 4 4v3c0 2.21-1.79 4-4 4z"
            />
          </svg>
        </div>
        <div className="public-brand-text">
          <span className="public-brand-name">BugBoard</span>
          <span className="public-brand-tagline">
            Issue and bug tracking system for engineering teams
          </span>
        </div>
      </div>

      <main className="public-content-card-wrapper">
        <Outlet />
      </main>

      <footer className="public-footer">
        <span>BugBoard • High-Performance Issue Tracking</span>
      </footer>
    </div>
  );
};

export default PublicLayout;
