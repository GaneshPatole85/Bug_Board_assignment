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
    setErrorMsg('');
  }, [isOpen, preselectedProjectId, projects]);

  useEffect(() => {
    if (!projectId) {
      setProjectMembers([]);
      return;
    }

    const matchedProject = projects.find((p) => p._id === projectId);
    if (matchedProject && Array.isArray(matchedProject.members)) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Issue title is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Issue description is required.');
      return;
    }
    if (!projectId) {
      setErrorMsg('Please select a target project.');
      return;
    }

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
      setErrorMsg(err.message || 'Failed to create issue. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Issue"
      id="issue-form-modal"
    >
      <form onSubmit={handleSubmit} className="issue-form">
        {errorMsg && (
          <div className="form-alert-error" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="issue-project" className="form-label">
            Project <span className="req">*</span>
          </label>
          <select
            id="issue-project"
            className="form-select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
          >
            <option value="" disabled>Select target project...</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="issue-title" className="form-label">
            Title <span className="req">*</span>
          </label>
          <input
            id="issue-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Concise summary of the problem"
            maxLength={200}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="issue-description" className="form-label">
            Description <span className="req">*</span>
          </label>
          <textarea
            id="issue-description"
            className="form-textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Steps to reproduce, expected vs actual behavior, stack trace..."
            maxLength={5000}
            required
          />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="issue-severity" className="form-label">
              Severity
            </label>
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
            <label htmlFor="issue-priority" className="form-label">
              Priority
            </label>
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

        <div className="form-group">
          <label htmlFor="issue-assignee" className="form-label">
            Assignee
          </label>
          <select
            id="issue-assignee"
            className="form-select"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Unassigned</option>
            {projectMembers.map((member) => {
              const memId = member._id || member;
              const memName = member.name || member.email || memId;
              return (
                <option key={memId} value={memId}>
                  {memName} {member.role ? `(${member.role})` : ''}
                </option>
              );
            })}
          </select>
          <span className="form-hint">
            Assignee must be an authorized member of the selected project (server-enforced).
          </span>
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
