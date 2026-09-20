import React from 'react';

export const IssuesPage = () => {
  return (
    <div className="page-container" id="issues-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-title">Issues & Bug Tracking</h1>
          <span className="badge badge-info">Phase 1 Placeholder</span>
        </div>
        <p className="page-description">
          Issue tracking, server-side filtering, workflow transition validation, comments, and activity audit logs will be implemented in Phase 3 & 4.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Issues Tracker</h2>
        <p className="card-text">
          The <code>Issue</code> schema is configured with fields: title, description, project, severity (Low/Medium/High/Critical), priority (Low/Medium/High/Urgent), status (Open/In Progress/Testing/Resolved/Closed), reporter, assignee, and query indexes.
        </p>
      </div>
    </div>
  );
};

export default IssuesPage;
