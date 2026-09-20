import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="page-container" id="not-found-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '1rem' }}>
          404
        </h1>
        <h2 className="card-title">Page Not Found</h2>
        <p className="card-text" style={{ marginBottom: '1.75rem' }}>
          The requested route does not exist in BugBoard.
        </p>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-block',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            padding: '0.65rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
          id="back-to-dashboard-btn"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
