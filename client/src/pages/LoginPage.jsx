import React from 'react';

export const LoginPage = () => {
  return (
    <div className="page-container" id="login-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-title">User Authentication</h1>
          <span className="badge badge-warning">Deferred to Phase 2</span>
        </div>
        <p className="page-description">
          User registration, login, bcrypt password hashing, and JWT token issuance will be implemented in Phase 2.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '540px' }}>
        <h2 className="card-title">Authentication Scaffolding</h2>
        <p className="card-text">
          Per Phase 1 technical assessment constraints, no authentication forms, endpoints, or JWT tokens are wired up in this phase. The <code>User</code> schema with Admin, Developer, and Tester roles is defined and ready in the backend.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
