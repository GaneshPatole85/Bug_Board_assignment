import React, { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import { Modal } from './ui/Modal.jsx';
import { Button } from './ui/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import './IssueForm.css';

const SEVERITY_LIST = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LIST = ['Low', 'Medium', 'High', 'Urgent'];

export const IssueForm = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedProjectId = '',
  projects = [],
}) => {
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(preselectedProjectId || '');
  const [severity, setSeverity] = useState('Medium');
  const [priority, setPriority] = useState('Medium');
  const [assignee, setAssignee] = useState('');
  const [projectMembers, setProjectMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  // Update selected project and fetch project members
  useEffect(() => {
    if (!isOpen) return;

    const activeProjId = preselectedProjectId || (projects.length > 0 ? projects[0]._id : '');
    setProjectId(activeProjId);
    setTitle('');
    setDescription('');
    setSeverity('Medium');
    setPriority('Medium');
    setAssignee('');
    setFieldErrors({});
    setErrorMsg('');
  }, [isOpen, preselectedProjectId, projects]);

  useEffect(() => {
    if (!projectId) {
      setProjectMembers([]);
      return;
    }

    const matchedProject = projects.find((p) => p._id === projectId);
    const hasPopulatedMembers =
      matchedProject &&
      Array.isArray(matchedProject.members) &&
      matchedProject.members.length > 0 &&
      typeof matchedProject.members[0] === 'object' &&
      Boolean(matchedProject.members[0].role);

    if (hasPopulatedMembers) {
      setProjectMembers(matchedProject.members);
    } else {
      // Fetch fresh project details to obtain populated members
      apiClient
        .get(`/projects/${projectId}`)
        .then((res) => {
          setProjectMembers(res.data?.members || []);
        })
        .catch(() => {
          setProjectMembers([]);
        });
    }
  }, [projectId, projects]);

  /** Client-side validation — returns fieldErrors map or empty object if valid */
  const validateFields = () => {
    const errors = {};

    if (!projectId) {
      errors.project = 'Please select a target project.';
    }

    if (!title.trim()) {
      errors.title = 'Issue title is required.';
    } else if (title.trim().length < 3) {
      errors.title = 'Issue title must be at least 3 characters.';
    } else if (title.trim().length > 200) {
      errors.title = 'Issue title cannot exceed 200 characters.';
    }

    if (!description.trim()) {
      errors.description = 'Issue description is required.';
    } else if (description.trim().length > 5000) {
      errors.description = 'Description cannot exceed 5000 characters.';
    }

    return errors;
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
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
      /**
       * Architectural Decision #1:
       * Reporter is strictly NEVER client-supplied. The server binds `reporter`
       * directly to `req.user.id` upon creation to prevent attribution spoofing.
       */
      const payload = {
        title: title.trim(),
        description: description.trim(),
        project: projectId,
        severity,
        priority,
        assignee: assignee || null,
      };

      await apiClient.post('/issues', payload);
      addToast('Issue created successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
        setErrorMsg('Please fix the errors highlighted below.');
      } else {
        setErrorMsg(err.message || 'Failed to create issue. Please check your inputs and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const developerMembers = projectMembers.filter((m) => m.role === 'Developer');
  const titleRemaining = 200 - title.length;
  const descRemaining = 5000 - description.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Issue"
      id="issue-form-modal"
    >
      <form onSubmit={handleSubmit} className="issue-form" noValidate>
        {/* General error banner */}
        {errorMsg && (
          <div className="form-alert-error" role="alert" id="issue-form-error">
            {errorMsg}
          </div>
        )}

        {/* Project selector */}
        <div className={`form-group ${fieldErrors.project ? 'field-error' : ''}`}>
          <label htmlFor="issue-project" className="form-label">
            Project <span className="req">*</span>
          </label>
          <select
            id="issue-project"
            className={`form-select ${fieldErrors.project ? 'input-invalid' : ''}`}
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); clearFieldError('project'); }}
            aria-invalid={Boolean(fieldErrors.project)}
          >
            <option value="" disabled>Select target project...</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>
          {fieldErrors.project && (
            <span className="field-error-msg" role="alert">⚠ {fieldErrors.project}</span>
          )}
          {projects.length === 0 && (
            <span className="form-hint info-hint">
              ℹ️ No projects available. An admin must create a project first.
            </span>
          )}
        </div>

        {/* Title */}
        <div className={`form-group ${fieldErrors.title ? 'field-error' : ''}`}>
          <label htmlFor="issue-title" className="form-label">
            Title <span className="req">*</span>
          </label>
          <input
            id="issue-title"
            type="text"
            className={`form-input ${fieldErrors.title ? 'input-invalid' : ''}`}
            value={title}
            onChange={(e) => { setTitle(e.target.value); clearFieldError('title'); }}
            placeholder="Concise summary of the problem (min. 3 characters)"
            maxLength={200}
            aria-describedby={fieldErrors.title ? 'issue-title-error' : 'issue-title-count'}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {fieldErrors.title ? (
            <span className="field-error-msg" id="issue-title-error" role="alert">
              ⚠ {fieldErrors.title}
            </span>
          ) : (
            <span
              id="issue-title-count"
              className={`form-hint char-count ${titleRemaining < 20 ? 'char-count-warn' : ''}`}
            >
              {title.length}/200 characters
            </span>
          )}
        </div>

        {/* Description */}
        <div className={`form-group ${fieldErrors.description ? 'field-error' : ''}`}>
          <label htmlFor="issue-description" className="form-label">
            Description <span className="req">*</span>
          </label>
          <textarea
            id="issue-description"
            className={`form-textarea ${fieldErrors.description ? 'input-invalid' : ''}`}
            rows={4}
            value={description}
            onChange={(e) => { setDescription(e.target.value); clearFieldError('description'); }}
            placeholder="Steps to reproduce, expected vs actual behavior, stack trace..."
            maxLength={5000}
            aria-describedby={fieldErrors.description ? 'issue-desc-error' : 'issue-desc-count'}
            aria-invalid={Boolean(fieldErrors.description)}
          />
          {fieldErrors.description ? (
            <span className="field-error-msg" id="issue-desc-error" role="alert">
              ⚠ {fieldErrors.description}
            </span>
          ) : (
            <span
              id="issue-desc-count"
              className={`form-hint char-count ${descRemaining < 200 ? 'char-count-warn' : ''}`}
            >
              {description.length}/5000 characters
            </span>
          )}
        </div>

        {/* Severity & Priority row */}
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="issue-severity" className="form-label">Severity</label>
            <select
              id="issue-severity"
              className="form-select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITY_LIST.map((sev) => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="issue-priority" className="form-label">Priority</label>
            <select
              id="issue-priority"
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_LIST.map((pri) => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee */}
        <div className="form-group">
          <label htmlFor="issue-assignee" className="form-label">Assignee</label>
          <select
            id="issue-assignee"
            className="form-select"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Unassigned</option>
            {developerMembers.map((member) => {
              const memId = member._id || member;
              const memName = member.name || member.email || memId;
              return (
                <option key={memId} value={memId}>
                  {memName}
                </option>
              );
            })}
          </select>
          {projectId && developerMembers.length === 0 ? (
            <span className="form-hint info-hint">
              ℹ️ No developers are assigned to this project yet. You can assign later.
            </span>
          ) : (
            <span className="form-hint">
              Bugs can only be assigned to Developers belonging to this project.
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
            id="submit-issue-btn"
          >
            Create issue
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default IssueForm;
