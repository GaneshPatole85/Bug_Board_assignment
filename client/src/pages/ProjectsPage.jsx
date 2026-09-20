import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { KeyBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { SkeletonCard } from '../components/ui/SkeletonRow.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import ProjectMembersModal from '../components/ProjectMembersModal.jsx';
import './ProjectsPage.css';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToast();

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

  const handleDeleteClick = (e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/projects/${projectToDelete._id}`);
      addToast(`Project "${projectToDelete.name}" deleted successfully`, 'success');
      setProjectToDelete(null);
      fetchProjects();
    } catch (err) {
      addToast(err.message || 'Failed to delete project', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenMembers = (e, project) => {
    e.stopPropagation();
    setSelectedProjectForMembers(project);
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
          {projects.map((proj) => {
            const memberCount = proj.memberCount || proj.members?.length || 0;
            const membersList = Array.isArray(proj.members) ? proj.members : [];

            return (
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
                  <div className="project-header-actions">
                    <button
                      type="button"
                      className="project-team-action-btn"
                      onClick={(e) => handleOpenMembers(e, proj)}
                      title="View all team members"
                      aria-label={`View team members for ${proj.name}`}
                    >
                      👥 Team ({memberCount})
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className="project-edit-action"
                          onClick={(e) => handleEdit(e, proj)}
                          title="Edit project details & members"
                          aria-label={`Edit ${proj.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="project-delete-action"
                          onClick={(e) => handleDeleteClick(e, proj)}
                          title="Delete project"
                          aria-label={`Delete ${proj.name}`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="project-desc">
                  {proj.description || 'No description provided.'}
                </p>

                <div className="project-card-meta">
                  <div className="project-stat" title="Total issues tracked in this project">
                    <span className="stat-label">Issues</span>
                    <span className="stat-val font-mono">{proj.issueCount || 0}</span>
                  </div>

                  <div
                    className="project-members-stat"
                    onClick={(e) => handleOpenMembers(e, proj)}
                    title="Click to inspect all project members"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleOpenMembers(e, proj);
                    }}
                  >
                    <div className="project-avatar-stack" aria-hidden="true">
                      {membersList.slice(0, 3).map((m) => (
                        <div
                          key={m._id || m.id || m.email}
                          className={`mini-member-avatar role-${(m.role || 'developer').toLowerCase()}`}
                          title={`${m.name || 'Member'} (${m.role || 'Member'})`}
                        >
                          {getInitials(m.name)}
                        </div>
                      ))}
                      {memberCount > 3 && (
                        <div className="mini-member-avatar mini-more-avatar" title={`${memberCount - 3} more members`}>
                          +{memberCount - 3}
                        </div>
                      )}
                    </div>
                    <span className="members-count-label font-mono">
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Creation / Edit Modal */}
      <ProjectForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchProjects}
        projectToEdit={projectToEdit}
      />

      {/* Project Team Members Roster Modal */}
      <ProjectMembersModal
        isOpen={Boolean(selectedProjectForMembers)}
        onClose={() => setSelectedProjectForMembers(null)}
        project={selectedProjectForMembers}
      />

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={Boolean(projectToDelete)}
        onClose={() => !isDeleting && setProjectToDelete(null)}
        title="Delete Project"
        id="delete-project-modal"
      >
        <div className="delete-confirm-box">
          <p className="delete-confirm-text">
            Are you sure you want to permanently delete{' '}
            <strong>{projectToDelete?.name}</strong> (
            <code>{projectToDelete?.key}</code>)?
          </p>
          <div className="delete-confirm-warning">
            ⚠️ <strong>Warning:</strong> Deleting this project will permanently remove all of its associated issues, comments, and activity audit logs. This action cannot be undone.
          </div>
          <div className="delete-confirm-actions">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setProjectToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              id="confirm-delete-project-btn"
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
