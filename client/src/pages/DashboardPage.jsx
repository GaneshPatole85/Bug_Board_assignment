import React from 'react';

export const DashboardPage = () => {
  return (
    <div className="page-container" id="dashboard-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-title">System Dashboard</h1>
          <span className="badge badge-info">Phase 1 Placeholder</span>
        </div>
        <p className="page-description">
          Welcome to BugBoard. Real dashboard analytics, issue counters, and developer assignments will be connected in Phase 4.
        </p>
      </div>

      <div className="grid-cols-3">
        <div className="card">
          <h2 className="card-title">Total Issues</h2>
          <p className="card-text">Metric card placeholder (Phase 4).</p>
          <span className="badge badge-info" style={{ marginTop: '1rem' }}>Deferred</span>
        </div>

        <div className="card">
          <h2 className="card-title">Open & In Progress</h2>
          <p className="card-text">Workflow transition metrics placeholder (Phase 4).</p>
          <span className="badge badge-info" style={{ marginTop: '1rem' }}>Deferred</span>
        </div>

        <div className="card">
          <h2 className="card-title">Assigned to Me</h2>
          <p className="card-text">Developer personal queue placeholder (Phase 4).</p>
          <span className="badge badge-info" style={{ marginTop: '1rem' }}>Deferred</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="card-title">Phase 1 Foundation Scope</h2>
        <p className="card-text">
          Phase 1 is strictly restricted to foundation and schema design: Mongoose schemas (User, Project, Issue, Comment, Activity), Express API scaffolding with structured Pino logging and health check, centralized error handling, and React responsive layout skeleton.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
