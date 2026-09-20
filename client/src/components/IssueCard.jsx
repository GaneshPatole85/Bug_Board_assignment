import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, PriorityBadge, SeverityBadge, KeyBadge } from './ui/Badge.jsx';
import './IssueCard.css';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const IssueCard = ({ issue, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUserId = user?._id || user?.id;
  const reporterId = issue.reporter?._id || (typeof issue.reporter === 'string' ? issue.reporter : null);
  const canDelete =
    user?.role === 'Admin' ||
    (reporterId && currentUserId && reporterId.toString() === currentUserId.toString());

  const handleCardClick = () => {
    navigate(`/issues/${issue._id}`);
  };

  const projectKey = issue.project?.key || 'BUG';
  const serial = issue._id.toString().slice(-4).toUpperCase();
  const issueKey = `${projectKey}-${serial}`;

  return (
    <div
      className="issue-mobile-card console-card"
      onClick={handleCardClick}
      id={`issue-card-${issue._id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleCardClick();
      }}
    >
      <div className="card-top-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyBadge>{issueKey}</KeyBadge>
          <StatusBadge status={issue.status} />
        </div>
        {onDelete && canDelete && (
          <button
            type="button"
            className="issue-row-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(issue);
            }}
            title="Delete issue"
            aria-label={`Delete issue ${issueKey}`}
          >
            🗑️
          </button>
        )}
      </div>

      <h3 className="card-issue-title">{issue.title}</h3>

      <div className="card-bottom-row">
        <div className="card-badges-group">
          <PriorityBadge priority={issue.priority} />
          <SeverityBadge severity={issue.severity} />
        </div>

        {issue.assignee ? (
          <div
            className="assignee-avatar-sm"
            title={`Assigned to: ${issue.assignee.name}`}
          >
            {getInitials(issue.assignee.name)}
          </div>
        ) : (
          <span className="unassigned-text" title="Unassigned">
            Unassigned
          </span>
        )}
      </div>
    </div>
  );
};

export default IssueCard;
