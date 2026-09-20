import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { KeyBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SkeletonCard } from '../components/ui/SkeletonRow.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import './ProjectsPage.css';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/projects');
      setProjects(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load projects. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateNew = () => {
    setProjectToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (e, project) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setIsFormOpen(true);
  };

  const handleCardClick = (projectId) => {
    navigate(`/issues?project=${projectId}`);
  };

  return (
    <div className="page-container" id="projects-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Projects</h1>
          <p className="page-description">
            Managed project repositories, access boundaries, and associated issue trackers.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateNew}
            id="create-project-btn"
          >
            Create project
          </Button>
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchProjects}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="projects-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects available"
          description={
            isAdmin
              ? 'No projects exist in the organization yet. Create the initial project to start tracking issues.'
              : 'You have not been added to any project team yet. Contact your system administrator for access.'
          }
          actionLabel={isAdmin ? 'Create first project' : undefined}
          onAction={isAdmin ? handleCreateNew : undefined}
          id="no-projects-empty"
        />
      ) : (
        <div className="projects-grid" id="projects-grid">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="project-card console-card"
              onClick={() => handleCardClick(proj._id)}
              id={`project-card-${proj.key}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleCardClick(proj._id);
              }}
            >
              <div className="project-card-header">
                <div className="project-title-group">
                  <h2 className="project-name">{proj.name}</h2>
                  <KeyBadge>{proj.key}</KeyBadge>
                </div>
                {isAdmin && (
                  <button
                    className="project-edit-action"
                    onClick={(e) => handleEdit(e, proj)}
                    title="Edit project details & members"
                    aria-label={`Edit ${proj.name}`}
                  >
                    Edit
                  </button>
                )}
              </div>

              <p className="project-desc">
                {proj.description || 'No description provided.'}
              </p>

              <div className="project-card-meta">
                <div className="project-stat" title="Total issues tracked in this project">
                  <span className="stat-label">Issues</span>
                  <span className="stat-val font-mono">{proj.issueCount || 0}</span>
                </div>
                <div className="project-stat" title="Authorized team members">
                  <span className="stat-label">Members</span>
                  <span className="stat-val font-mono">{proj.memberCount || proj.members?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Creation / Edit Modal */}
      <ProjectForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchProjects}
        projectToEdit={projectToEdit}
      />
    </div>
  );
};

export default ProjectsPage;
