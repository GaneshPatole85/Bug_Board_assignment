import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge, PriorityBadge, SeverityBadge, KeyBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import CommentList from '../components/CommentList.jsx';
import './IssueDetailPage.css';

/**
 * Frontend mirror of the centralized transition matrix.
 * NOTE: This is purely for UX convenience to show relevant action buttons.
 * The backend workflow engine strictly enforces valid edges and role permissions
 * on every write regardless of client state.
 */
const STATUS_TRANSITIONS = {
  Open: [{ to: 'In Progress', roles: ['Admin', 'Developer'] }],
  'In Progress': [{ to: 'Testing', roles: ['Admin', 'Developer'] }],
  Testing: [
    { to: 'Resolved', roles: ['Admin', 'Tester'] },
    { to: 'Open', roles: ['Admin', 'Tester'] },
  ],
  Resolved: [
    { to: 'Closed', roles: ['Admin', 'Tester'] },
    { to: 'Open', roles: ['Admin', 'Tester'] },
  ],
  Closed: [{ to: 'Open', roles: ['Admin'] }],
};

export const IssueDetailPage = () => {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [issue, setIssue] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const fetchIssue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/issues/${issueId}`);
      setIssue(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load issue details.');
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await apiClient.get(`/issues/${issueId}/activities`);
      setActivities(res.data || []);
    } catch (err) {
      // Non-blocking for activity logs
    } finally {
      setLoadingActivities(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
    fetchActivities();
  }, [fetchIssue, fetchActivities]);

  // Compute legal next status options for the current user's role
  const legalTransitions = useMemo(() => {
    if (!issue || !user) return [];
    const transitionsFromCurrent = STATUS_TRANSITIONS[issue.status] || [];
    return transitionsFromCurrent.filter((t) => t.roles.includes(user.role));
  }, [issue, user]);

  const handleStatusTransition = async (nextStatus) => {
    setIsTransitioning(true);
    try {
      const res = await apiClient.patch(`/issues/${issueId}/status`, {
        status: nextStatus,
      });
      setIssue(res.data);
      addToast(`Status updated to ${nextStatus}`, 'success');
      fetchActivities(); // Refresh activity log
    } catch (err) {
      addToast(err.message || 'Status transition failed.', 'error');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    setIsReassigning(true);
    try {
      const res = await apiClient.patch(`/issues/${issueId}/assignee`, {
        assignee: newAssigneeId || null,
      });
      setIssue(res.data);
      addToast(
        newAssigneeId ? 'Assignee updated successfully' : 'Issue unassigned',
        'success'
      );
      fetchActivities(); // Refresh activity log
    } catch (err) {
      addToast(err.message || 'Failed to update assignee.', 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" id="issue-detail-loading">
        <div className="detail-loading-skeleton">Loading issue details...</div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="page-container" id="issue-detail-error">
        <EmptyState
          title="Couldn't load issue"
          description={error || 'The requested issue could not be found or you do not have permission to view it.'}
          actionLabel="Back to issues"
          onAction={() => navigate('/issues')}
        />
      </div>
    );
  }

  const projectKey = issue.project?.key || 'BUG';
  const serial = issue._id.toString().slice(-4).toUpperCase();
  const issueKey = `${projectKey}-${serial}`;

  const projectMembers = issue.project?.members || [];

  return (
    <div className="page-container" id="issue-detail-page">
      {/* Back Navigation Bar */}
      <div className="detail-top-nav">
        <button
          className="back-link-btn"
          onClick={() => navigate(`/issues?project=${issue.project?._id || ''}`)}
          id="back-to-issues-btn"
        >
          ← Back to {issue.project?.name || 'Issues'}
        </button>
      </div>

      {/* Two-Column Responsive Layout */}
      <div className="issue-detail-layout">
        {/* Mobile Metadata Console (Stacked above description on mobile <640px) */}
        <div className="issue-metadata-panel mobile-only-meta console-card">
          <div className="meta-compact-grid">
            <div className="meta-compact-item">
              <span className="meta-label">Status</span>
              <StatusBadge status={issue.status} />
            </div>
            <div className="meta-compact-item">
              <span className="meta-label">Priority</span>
              <PriorityBadge priority={issue.priority} />
            </div>
            <div className="meta-compact-item">
              <span className="meta-label">Severity</span>
              <SeverityBadge severity={issue.severity} />
            </div>
          </div>
        </div>

        {/* Left Primary Content: Title, Description, Activities, Comments */}
        <div className="issue-main-content">
          <div className="issue-header-block console-card">
            <div className="issue-key-row">
              <KeyBadge>{issueKey}</KeyBadge>
              <span className="project-breadcrumb">{issue.project?.name}</span>
            </div>
            <h1 className="issue-detail-title" id="issue-detail-title">
              {issue.title}
            </h1>
          </div>

          {/* Description Section */}
          <div className="issue-section-card console-card">
            <h3 className="section-heading">Description</h3>
            <div className="issue-description-body" id="issue-description-body">
              {issue.description}
            </div>
          </div>

          {/* Discussion / Comments Section */}
          <div className="issue-section-card console-card">
            <h3 className="section-heading">Discussion</h3>
            <CommentList />
          </div>

          {/* Activity Timeline */}
          <div className="issue-section-card console-card">
            <h3 className="section-heading">Activity Audit Trail</h3>
            <ActivityTimeline activities={activities} loading={loadingActivities} />
          </div>
        </div>

        {/* Right Sticky Metadata Console (Desktop/Tablet) */}
        <aside className="issue-metadata-panel desktop-meta console-card" id="issue-metadata-panel">
          <h3 className="meta-panel-title">Details</h3>

          {/* Status & Transition Action Triggers */}
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <div className="meta-value-row">
              <StatusBadge status={issue.status} />
            </div>

            {/* Transition Controls Gated by Current State & User Role */}
            <div className="transition-triggers-box" id="transition-triggers-box">
              <span className="triggers-label">Workflow actions:</span>
              {legalTransitions.length === 0 ? (
                <span className="no-transitions-hint">
                  No next status transitions permitted for your role ({user.role}) from {issue.status}.
                </span>
              ) : (
                <div className="transition-buttons-group">
                  {legalTransitions.map((t) => (
                    <Button
                      key={t.to}
                      variant="primary"
                      size="sm"
                      isLoading={isTransitioning}
                      disabled={isTransitioning}
                      onClick={() => handleStatusTransition(t.to)}
                      id={`transition-to-${t.to.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      Move to {t.to}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignee Control */}
          <div className="meta-item">
            <label htmlFor="detail-assignee-select" className="meta-label">
              Assignee
            </label>
            <select
              id="detail-assignee-select"
              className="meta-select"
              value={issue.assignee?._id || issue.assignee || ''}
              disabled={isReassigning}
              onChange={(e) => handleAssigneeChange(e.target.value)}
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
          </div>

          {/* Priority */}
          <div className="meta-item">
            <span className="meta-label">Priority</span>
            <div className="meta-value-row">
              <PriorityBadge priority={issue.priority} />
            </div>
          </div>

          {/* Severity */}
          <div className="meta-item">
            <span className="meta-label">Severity</span>
            <div className="meta-value-row">
              <SeverityBadge severity={issue.severity} />
            </div>
          </div>

          {/* Reporter (Server-bound attribution) */}
          <div className="meta-item">
            <span className="meta-label">Reporter</span>
            <div className="reporter-meta-val">
              <span className="reporter-name-text">{issue.reporter?.name || 'Unknown'}</span>
              <span className="reporter-email-text">{issue.reporter?.email}</span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="meta-item meta-timestamps">
            <div className="timestamp-row">
              <span className="meta-label">Created:</span>
              <span className="timestamp-mono">
                {new Date(issue.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="timestamp-row">
              <span className="meta-label">Updated:</span>
              <span className="timestamp-mono">
                {new Date(issue.updatedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default IssueDetailPage;
