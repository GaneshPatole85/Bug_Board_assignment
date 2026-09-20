import React from 'react';

export const ProjectsPage = () => {
  return (
    <div className="page-container" id="projects-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-title">Project Management</h1>
          <span className="badge badge-info">Phase 1 Placeholder</span>
        </div>
        <p className="page-description">
          Project creation, authorization rules, and member management will be implemented in Phase 3.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Projects Directory</h2>
        <p className="card-text">
          Admin creation/updates and project access filtering (users only see authorized projects) are scheduled for Phase 3. Database schema <code>Project</code> with unique key and member references is finalized and ready in the backend.
        </p>
      </div>
    </div>
  );
};

export default ProjectsPage;
