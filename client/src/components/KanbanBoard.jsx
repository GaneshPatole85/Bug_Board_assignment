import React, { useState } from 'react';
import { PriorityBadge, SeverityBadge, KeyBadge } from './ui/Badge.jsx';
import './KanbanBoard.css';

const KANBAN_COLUMNS = [
  { id: 'Open', title: 'Open', colorClass: 'col-open', countColor: 'var(--status-open, #5B6472)' },
  { id: 'In Progress', title: 'In Progress', colorClass: 'col-in-progress', countColor: 'var(--status-in-progress, #2B6CB0)' },
  { id: 'Testing', title: 'Testing', colorClass: 'col-testing', countColor: 'var(--status-testing, #7C5CBF)' },
  { id: 'Resolved', title: 'Resolved', colorClass: 'col-resolved', countColor: 'var(--status-resolved, #1F9D6B)' },
  { id: 'Closed', title: 'Closed', colorClass: 'col-closed', countColor: 'var(--status-closed, #8A8F98)' },
];

/**
 * Transition rules mapped to roles
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

export const KanbanBoard = ({ issues = [], onStatusChange, user, onIssueClick }) => {
  const [draggedIssueId, setDraggedIssueId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const getLegalTransitions = (currentStatus) => {
    const rules = STATUS_TRANSITIONS[currentStatus] || [];
    const userRole = user?.role;
    return rules.filter((r) => r.roles.includes(userRole)).map((r) => r.to);
  };

  const handleDragStart = (e, issue) => {
    e.dataTransfer.setData('text/plain', issue._id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIssueId(issue._id);
  };

  const handleDragEnd = () => {
    setDraggedIssueId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    // Only reset if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const issueId = e.dataTransfer.getData('text/plain') || draggedIssueId;
    if (!issueId) return;

    const issue = issues.find((i) => i._id === issueId);
    if (!issue || issue.status === targetStatus) return;

    setUpdatingId(issueId);
    try {
      await onStatusChange(issueId, targetStatus, issue.status);
    } finally {
      setUpdatingId(null);
      setDraggedIssueId(null);
    }
  };

  const handleKeyboardMove = async (issue, targetStatus) => {
    if (!targetStatus || issue.status === targetStatus) return;
    setUpdatingId(issue._id);
    try {
      await onStatusChange(issue._id, targetStatus, issue.status);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="kanban-board-container" id="kanban-board" role="region" aria-label="Kanban Issue Board">
      <div className="kanban-columns-grid">
        {KANBAN_COLUMNS.map((col) => {
          const colIssues = issues.filter((i) => i.status === col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              className={`kanban-column ${col.colorClass} ${isOver ? 'drag-over' : ''}`}
              id={`kanban-col-${col.id.toLowerCase().replace(/\s+/g, '-')}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="kanban-col-header">
                <div className="kanban-col-title-wrap">
                  <span className="kanban-col-indicator" />
                  <h3 className="kanban-col-title">{col.title}</h3>
                </div>
                <span className="kanban-col-count font-mono" id={`count-${col.id}`}>
                  {colIssues.length}
                </span>
              </div>

              {/* Column Drop Zone / Card List */}
              <div className="kanban-card-list">
                {colIssues.length === 0 ? (
                  <div className="kanban-empty-col">
                    <span>No {col.title.toLowerCase()} bugs</span>
                  </div>
                ) : (
                  colIssues.map((issue) => {
                    const isDragging = draggedIssueId === issue._id;
                    const isUpdating = updatingId === issue._id;
                    const legalTransitions = getLegalTransitions(issue.status);

                    return (
                      <div
                        key={issue._id}
                        className={`kanban-card console-card ${isDragging ? 'is-dragging' : ''} ${isUpdating ? 'is-updating' : ''}`}
                        draggable={!isUpdating}
                        onDragStart={(e) => handleDragStart(e, issue)}
                        onDragEnd={handleDragEnd}
                        id={`kanban-card-${issue._id}`}
                      >
                        <div className="kanban-card-top">
                          <KeyBadge
                            projectKey={issue.project?.key}
                            identifier={issue._id}
                          />
                          <div className="kanban-badges-row">
                            <PriorityBadge priority={issue.priority} />
                            <SeverityBadge severity={issue.severity} />
                          </div>
                        </div>

                        <h4
                          className="kanban-card-title"
                          onClick={() => onIssueClick(issue._id)}
                          title="Click to view details"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onIssueClick(issue._id);
                          }}
                        >
                          {issue.title}
                        </h4>

                        <div className="kanban-card-footer">
                          <div className="kanban-assignee" title={`Assignee: ${issue.assignee?.name || 'Unassigned'}`}>
                            <span className="assignee-avatar-sm">
                              {issue.assignee?.name
                                ? issue.assignee.name.slice(0, 2).toUpperCase()
                                : '—'}
                            </span>
                            <span className="assignee-name-sm">
                              {issue.assignee?.name || 'Unassigned'}
                            </span>
                          </div>

                          {/* Keyboard-Accessible Move To Menu */}
                          <div className="kanban-move-control" onClick={(e) => e.stopPropagation()}>
                            <label
                              htmlFor={`move-select-${issue._id}`}
                              className="sr-only"
                            >
                              Move status for {issue.title}
                            </label>
                            <select
                              id={`move-select-${issue._id}`}
                              className="kanban-move-select"
                              value=""
                              disabled={isUpdating || legalTransitions.length === 0}
                              onChange={(e) => handleKeyboardMove(issue, e.target.value)}
                              title={
                                legalTransitions.length > 0
                                  ? 'Move status...'
                                  : 'No moves permitted for your role'
                              }
                            >
                              <option value="" disabled>
                                Move to...
                              </option>
                              {legalTransitions.map((target) => (
                                <option key={target} value={target}>
                                  → {target}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
