import React from 'react';
import './Badge.css';

/**
 * Status icons paired with text per accessibility requirement (B1/B5).
 */
const STATUS_ICONS = {
  Open: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  'In Progress': (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M8 2a6 6 0 1 0 6 6A6 6 0 0 0 8 2zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
      <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Testing: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M5 2h6v2H5V2zm1 3h4l3 8H3l3-8zm2 2v3m-1-1.5h2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  Resolved: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Closed: (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M8 2a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm2.5 7.5l-5-5m0 5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ),
};

export const StatusBadge = ({ status }) => {
  const normalized = status || 'Open';
  const slug = normalized.toLowerCase().replace(/\s+/g, '-');

  return (
    <span className={`badge-status badge-status-${slug}`} title={`Status: ${normalized}`}>
      <span className="badge-icon" aria-hidden="true">
        {STATUS_ICONS[normalized] || STATUS_ICONS.Open}
      </span>
      <span>{normalized}</span>
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const normalized = priority || 'Medium';
  const slug = normalized.toLowerCase();

  return (
    <span className={`badge-priority badge-priority-${slug}`} title={`Priority: ${normalized}`}>
      <span className="priority-dot" aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const normalized = severity || 'Medium';
  const slug = normalized.toLowerCase();

  return (
    <span className={`badge-severity badge-severity-${slug}`} title={`Severity: ${normalized}`}>
      <span className="severity-square" aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
};

export const KeyBadge = ({ children, projectKey }) => {
  return (
    <span className="key-badge" title={projectKey ? `Project: ${projectKey}` : undefined}>
      {children}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const slug = (role || 'Developer').toLowerCase();
  return (
    <span className={`role-badge role-badge-${slug}`}>
      {role}
    </span>
  );
};
