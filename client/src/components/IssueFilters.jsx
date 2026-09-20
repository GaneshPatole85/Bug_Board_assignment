import React from 'react';
import { Button } from './ui/Button.jsx';
import './IssueFilters.css';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Testing', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export const IssueFilters = ({
  filters,
  onChange,
  onReset,
  projects = [],
  users = [],
  isMobileDrawer = false,
}) => {
  const hasActiveFilters = Boolean(
    filters.project ||
    filters.status ||
    filters.priority ||
    filters.severity ||
    filters.assignee
  );

  const handleSelect = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className={`issue-filters-container ${isMobileDrawer ? 'mobile-drawer-view' : 'desktop-inline-view'}`} id="issue-filters">
      <div className="filter-item">
        <label htmlFor="filter-project" className="filter-label">Project</label>
        <select
          id="filter-project"
          className="filter-select"
          value={filters.project || ''}
          onChange={(e) => handleSelect('project', e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.key} — {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label htmlFor="filter-status" className="filter-label">Status</label>
        <select
          id="filter-status"
          className="filter-select"
          value={filters.status || ''}
          onChange={(e) => handleSelect('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label htmlFor="filter-priority" className="filter-label">Priority</label>
        <select
          id="filter-priority"
          className="filter-select"
          value={filters.priority || ''}
          onChange={(e) => handleSelect('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((pr) => (
            <option key={pr} value={pr}>{pr}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label htmlFor="filter-severity" className="filter-label">Severity</label>
        <select
          id="filter-severity"
          className="filter-select"
          value={filters.severity || ''}
          onChange={(e) => handleSelect('severity', e.target.value)}
        >
          <option value="">All Severities</option>
          {SEVERITY_OPTIONS.map((sv) => (
            <option key={sv} value={sv}>{sv}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label htmlFor="filter-assignee" className="filter-label">Assignee</label>
        <select
          id="filter-assignee"
          className="filter-select"
          value={filters.assignee || ''}
          onChange={(e) => handleSelect('assignee', e.target.value)}
        >
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className="filter-reset-wrapper">
          <Button
            variant="subtle"
            size="sm"
            onClick={onReset}
            id="clear-all-filters-btn"
            className="filter-reset-btn"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default IssueFilters;
