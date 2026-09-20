import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * ProtectedRoute Component.
 * Guards routes from unauthenticated access.
 *
 * NOTE: Frontend route gating is a UX enhancement only to prevent displaying
 * unusable UI to unauthorized users. All actual security and access permissions
 * are strictly enforced on the Express backend via middlewares.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.allowedRoles] - Optional list of permitted roles (e.g. ['Admin'])
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-default)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Verifying credentials...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permission if specific roles are required
  if (allowedRoles && Array.isArray(allowedRoles) && (!user || !allowedRoles.includes(user.role))) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <span className="badge badge-warning" style={{ marginBottom: '1rem' }}>
            Access Restricted
          </span>
          <h2 className="card-title">Insufficient Permissions</h2>
          <p className="card-text" style={{ marginBottom: '1.5rem' }}>
            Your account role (<strong>{user?.role}</strong>) does not have permission to view this section.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
