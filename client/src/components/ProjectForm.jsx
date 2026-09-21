import React, { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import { Modal } from './ui/Modal.jsx';
import { Button } from './ui/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { applyApiErrorsToForm } from '../utils/apiErrors.js';
import './ProjectForm.css';

const PROJECT_KEY_REGEX = /^[A-Z0-9][A-Z0-9-]{0,8}[A-Z0-9]$|^[A-Z0-9]{1}$/;
// Key: 2–10 chars, uppercase letters/numbers/hyphens, must start and end with letter or number
const KEY_VALID_REGEX = /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$|^[A-Z0-9]{1}$/;

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

  // Per-field validation error map
  const [fieldErrors, setFieldErrors] = useState({});
  // Top-level error for general/server errors
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
          setErrorMsg('Failed to load system users list. You can still create the project without members.');
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
    setFieldErrors({});
    setErrorMsg('');
  }, [isOpen, projectToEdit]);

  const handleMemberToggle = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  /** Client-side validation — returns fieldErrors map or empty object if valid */
  const validateFields = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Project name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters.';
    } else if (name.trim().length > 100) {
      errors.name = 'Project name cannot exceed 100 characters.';
    }

    if (!isEdit) {
      const upperKey = key.trim().toUpperCase();
      if (!upperKey) {
        errors.key = 'Project key is required.';
      } else if (upperKey.length < 2) {
        errors.key = 'Project key must be at least 2 characters.';
      } else if (upperKey.length > 10) {
        errors.key = 'Project key cannot exceed 10 characters.';
      } else if (!/^[A-Z0-9][A-Z0-9-]*$/.test(upperKey)) {
        errors.key = 'Key must start with a letter or number. Only uppercase letters, numbers, and hyphens allowed.';
      } else if (upperKey.endsWith('-')) {
        errors.key = 'Project key cannot end with a hyphen.';
      }
    }

    if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    return errors;
  };

  const handleKeyChange = (e) => {
    const val = e.target.value.toUpperCase();
    setKey(val);
    // Live clear key error once user starts fixing
    if (fieldErrors.key) {
      setFieldErrors((prev) => ({ ...prev, key: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const clientErrors = validateFields();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    setFieldErrors({});

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
      // Map server-returned field errors (e.g. duplicate key) to inline display
      applyApiErrorsToForm(err, setFieldErrors, setErrorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const keyValue = key.trim().toUpperCase();
  const keyIsValid = keyValue.length >= 2 && !keyValue.endsWith('-') && /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$/.test(keyValue);
  const keyHasValue = keyValue.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'Create New Project'}
      id="project-form-modal"
    >
      <form onSubmit={handleSubmit} className="project-form" noValidate>
        {/* General error banner */}
        {errorMsg && (
          <div className="form-alert-error" role="alert" id="project-form-error">
            {errorMsg}
          </div>
        )}

        {/* Project Name */}
        <div className={`form-group ${fieldErrors.name ? 'field-error' : ''}`}>
          <label htmlFor="project-name" className="form-label">
            Project name <span className="req">*</span>
          </label>
          <input
            id="project-name"
            type="text"
            className={`form-input ${fieldErrors.name ? 'input-invalid' : ''}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Core Platform Engine"
            maxLength={100}
            aria-describedby={fieldErrors.name ? 'project-name-error' : undefined}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && (
            <span className="field-error-msg" id="project-name-error" role="alert">
              ⚠ {fieldErrors.name}
            </span>
          )}
        </div>

        {/* Project Key */}
        <div className={`form-group ${fieldErrors.key ? 'field-error' : ''}`}>
          <label htmlFor="project-key" className="form-label">
            Project key <span className="req">*</span>
          </label>
          <div className="key-input-wrapper">
            <input
              id="project-key"
              type="text"
              className={`form-input font-mono ${fieldErrors.key ? 'input-invalid' : keyIsValid ? 'input-valid' : ''}`}
              value={key}
              onChange={handleKeyChange}
              placeholder="e.g. CORE or BRTINF-20"
              maxLength={10}
              disabled={isEdit}
              required={!isEdit}
              aria-describedby={fieldErrors.key ? 'project-key-error' : 'project-key-hint'}
              aria-invalid={Boolean(fieldErrors.key)}
            />
            {!isEdit && keyHasValue && (
              <span className={`key-validity-indicator ${keyIsValid ? 'valid' : 'invalid'}`}>
                {keyIsValid ? '✓' : '✗'}
              </span>
            )}
          </div>
          {fieldErrors.key ? (
            <span className="field-error-msg" id="project-key-error" role="alert">
              ⚠ {fieldErrors.key}
            </span>
          ) : (
            <span className="form-hint" id="project-key-hint">
              {isEdit
                ? 'Project key is immutable and cannot be altered after creation.'
                : 'Used as prefix for all issue identifiers (e.g. CORE-101, BRTINF-20). 2–10 uppercase letters, numbers, or hyphens. Cannot start or end with a hyphen.'}
            </span>
          )}
        </div>

        {/* Description */}
        <div className={`form-group ${fieldErrors.description ? 'field-error' : ''}`}>
          <label htmlFor="project-desc" className="form-label">
            Description
          </label>
          <textarea
            id="project-desc"
            className={`form-textarea ${fieldErrors.description ? 'input-invalid' : ''}`}
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: '' }));
            }}
            placeholder="Brief scope and objectives for this project"
            maxLength={500}
            aria-describedby="project-desc-count"
          />
          <span
            id="project-desc-count"
            className={`form-hint char-count ${description.length > 480 ? 'char-count-warn' : ''}`}
          >
            {description.length}/500 characters
          </span>
          {fieldErrors.description && (
            <span className="field-error-msg" role="alert">
              ⚠ {fieldErrors.description}
            </span>
          )}
        </div>

        {/* Team Members */}
        <div className="form-group">
          <label className="form-label">Team members</label>
          <span className="form-hint" style={{ marginBottom: '8px', display: 'block' }}>
            Select users authorized to report, view, and transition issues in this project.
          </span>

          {loadingUsers ? (
            <div className="members-loading">
              <span className="loading-spinner-sm" aria-hidden="true" />
              Loading users directory...
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="members-empty-notice">
              ℹ️ No users found in the system. You can add members after creating the project.
            </div>
          ) : (
            <div className="members-select-list">
              {availableUsers
                .filter((u) => u.isActive !== false || selectedMembers.includes(u._id))
                .map((user) => {
                  const isSelected = selectedMembers.includes(user._id);
                  const isInactive = user.isActive === false;
                  return (
                    <label
                      key={user._id}
                      className={`member-select-item ${isSelected ? 'selected' : ''} ${isInactive ? 'inactive-member' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMemberToggle(user._id)}
                      />
                      <div className="member-info">
                        <span className="member-name">
                          {user.name} {isInactive && <span className="inactive-badge-tag">(Inactive)</span>}
                        </span>
                        <span className="member-role font-mono">{user.role}</span>
                      </div>
                    </label>
                  );
                })}
            </div>
          )}
          {selectedMembers.length > 0 && (
            <span className="form-hint members-count-hint">
              ✓ {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
            </span>
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
