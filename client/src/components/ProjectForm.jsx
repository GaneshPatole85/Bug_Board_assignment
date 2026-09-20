import React, { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import { Modal } from './ui/Modal.jsx';
import { Button } from './ui/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import './ProjectForm.css';

export const ProjectForm = ({
  isOpen,
  onClose,
  onSuccess,
  projectToEdit = null,
}) => {
  const isEdit = Boolean(projectToEdit);
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch all system users for member management
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await apiClient.get('/users');
        if (isMounted) {
          setAvailableUsers(res.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Failed to load system users list.');
        }
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    fetchUsers();

    if (projectToEdit) {
      setName(projectToEdit.name || '');
      setKey(projectToEdit.key || '');
      setDescription(projectToEdit.description || '');
      const memberIds = Array.isArray(projectToEdit.members)
        ? projectToEdit.members.map((m) => (m._id ? m._id : m))
        : [];
      setSelectedMembers(memberIds);
    } else {
      setName('');
      setKey('');
      setDescription('');
      setSelectedMembers([]);
    }
    setErrorMsg('');
  }, [isOpen, projectToEdit]);

  const handleMemberToggle = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Project name is required.');
      return;
    }

    if (!isEdit && !key.trim()) {
      setErrorMsg('Project key is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await apiClient.patch(`/projects/${projectToEdit._id}`, {
          name: name.trim(),
          description: description.trim(),
          members: selectedMembers,
        });
        addToast('Project updated successfully', 'success');
      } else {
        await apiClient.post('/projects', {
          name: name.trim(),
          key: key.toUpperCase().trim(),
          description: description.trim(),
          members: selectedMembers,
        });
        addToast('Project created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'Create New Project'}
      id="project-form-modal"
    >
      <form onSubmit={handleSubmit} className="project-form">
        {errorMsg && (
          <div className="form-alert-error" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="project-name" className="form-label">
            Project name <span className="req">*</span>
          </label>
          <input
            id="project-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Core Platform Engine"
            maxLength={100}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-key" className="form-label">
            Project key <span className="req">*</span>
          </label>
          <input
            id="project-key"
            type="text"
            className="form-input font-mono"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="e.g. CORE (2–10 uppercase letters/numbers)"
            maxLength={10}
            disabled={isEdit}
            required={!isEdit}
          />
          <span className="form-hint">
            {isEdit
              ? 'Project key is immutable and cannot be altered after creation.'
              : 'Used as prefix for all issue identifiers (e.g. CORE-101). Uppercase alphanumeric only.'}
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="project-desc" className="form-label">
            Description
          </label>
          <textarea
            id="project-desc"
            className="form-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief scope and objectives for this project"
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Team members
          </label>
          <span className="form-hint" style={{ marginBottom: '8px', display: 'block' }}>
            Select users authorized to report, view, and transition issues in this project.
          </span>

          {loadingUsers ? (
            <div className="members-loading">Loading users directory...</div>
          ) : (
            <div className="members-select-list">
              {availableUsers.map((user) => {
                const isSelected = selectedMembers.includes(user._id);
                return (
                  <label
                    key={user._id}
                    className={`member-select-item ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMemberToggle(user._id)}
                    />
                    <div className="member-info">
                      <span className="member-name">{user.name}</span>
                      <span className="member-role font-mono">{user.role}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-footer">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            id="submit-project-btn"
          >
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectForm;
