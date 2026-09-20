import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, PriorityBadge, SeverityBadge, KeyBadge } from './ui/Badge.jsx';
import './IssueRow.css';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const IssueRow = ({ issue, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUserId = user?._id || user?.id;
  const reporterId = issue.reporter?._id || (typeof issue.reporter === 'string' ? issue.reporter : null);
  const canDelete =
    user?.role === 'Admin' ||
    (reporterId && currentUserId && reporterId.toString() === currentUserId.toString());

  const handleRowClick = () => {
    navigate(`/issues/${issue._id}`);
  };

  const projectKey = issue.project?.key || 'BUG';
  // Use last 4 chars of MongoDB ObjectId for issue serial number display
  const serial = issue._id.toString().slice(-4).toUpperCase();
  const issueKey = `${projectKey}-${serial}`;

  return (
    <tr
      className="issue-tr"
      onClick={handleRowClick}
      id={`issue-row-${issue._id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleRowClick();
      }}
    >
      <td className="col-key">
        <KeyBadge projectKey={issue.project?.name}>{issueKey}</KeyBadge>
      </td>
      <td className="col-title">
        <span className="issue-table-title">{issue.title}</span>
      </td>
      <td className="col-status">
        <StatusBadge status={issue.status} />
      </td>
      <td className="col-priority">
        <PriorityBadge priority={issue.priority} />
      </td>
      <td className="col-severity">
        <SeverityBadge severity={issue.severity} />
      </td>
      <td className="col-assignee">
        {issue.assignee ? (
          <div
            className="assignee-avatar"
            title={`Assigned to: ${issue.assignee.name} (${issue.assignee.email})`}
          >
            {getInitials(issue.assignee.name)}
          </div>
        ) : (
          <span className="unassigned-text" title="Unassigned">
            —
          </span>
        )}
      </td>
      <td className="col-reporter col-tablet-hide">
        <span className="reporter-name" title={issue.reporter?.email}>
          {issue.reporter?.name || 'Unknown'}
        </span>
      </td>
      <td className="col-date col-tablet-hide timestamp-mono">
        {new Date(issue.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
      </td>
      {onDelete && (
        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
          {canDelete && (
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
        </td>
      )}
    </tr>
  );
};

export default IssueRow;
