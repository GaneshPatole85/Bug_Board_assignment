import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, PriorityBadge, SeverityBadge, KeyBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import './DashboardPage.css';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/dashboard');
      setMetrics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleChipClick = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="page-container" id="dashboard-loading">
        <div className="dashboard-skeleton-grid">
          <div className="skeleton-box anchor-skeleton" />
          <div className="skeleton-box tile-skeleton" />
          <div className="skeleton-box tile-skeleton" />
          <div className="skeleton-box tile-skeleton" />
          <div className="skeleton-box tile-skeleton" />
          <div className="skeleton-box tile-skeleton" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="page-container" id="dashboard-error">
        <EmptyState
          title="Couldn't load dashboard"
          description={error || 'Unable to fetch real-time project and issue analytics.'}
          actionLabel="Retry"
          onAction={fetchDashboard}
        />
      </div>
    );
  }

  const {
    totalIssues = 0,
    assignedCount = 0,
    byStatus = {},
    bySeverity = {},
    assignedToMe = [],
    recentActivities = [],
  } = metrics;

  // Percentage calculations for proportional status bar
  const openPct = totalIssues ? ((byStatus.Open || 0) / totalIssues) * 100 : 0;
  const inProgPct = totalIssues ? (((byStatus['In Progress'] || 0)) / totalIssues) * 100 : 0;
  const testPct = totalIssues ? ((byStatus.Testing || 0) / totalIssues) * 100 : 0;
  const resolvedPct = totalIssues ? ((byStatus.Resolved || 0) / totalIssues) * 100 : 0;
  const closedPct = totalIssues ? ((byStatus.Closed || 0) / totalIssues) * 100 : 0;

  return (
    <div className="page-container" id="dashboard-page">
      {/* Dashboard Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="dashboard-title-row">
            <h1 className="page-title">Engineering Dashboard</h1>
            <span className="key-badge">Live console</span>
          </div>
          <p className="page-description">
            Real-time project issue tracking, personal work queue, and workflow audit logs for {user?.name}.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Button variant="secondary" size="sm" onClick={fetchDashboard} id="refresh-dashboard-btn">
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/issues')} id="dashboard-issues-btn">
            View all issues
          </Button>
        </div>
      </div>

      {/* Quick Navigation Filter Chips */}
      <div className="filter-chips-bar" id="dashboard-quick-chips">
        <span className="chips-label">Quick filters:</span>
        <button
          className="filter-chip"
          onClick={() => handleChipClick('/issues')}
          title="View all tracked issues"
        >
          All issues ({totalIssues})
        </button>
        <button
          className="filter-chip chip-assigned"
          onClick={() => handleChipClick(`/issues?assignee=${user?._id || user?.id}`)}
          title="Issues assigned to you"
        >
          👤 Assigned to me ({assignedCount})
        </button>
        <button
          className="filter-chip"
          onClick={() => handleChipClick('/issues?status=Open')}
        >
          Open ({byStatus.Open || 0})
        </button>
        <button
          className="filter-chip"
          onClick={() => handleChipClick('/issues?status=In%20Progress')}
        >
          In progress ({byStatus['In Progress'] || 0})
        </button>
        <button
          className="filter-chip"
          onClick={() => handleChipClick('/issues?status=Testing')}
        >
          Testing ({byStatus.Testing || 0})
        </button>
        <button
          className="filter-chip chip-resolved"
          onClick={() => handleChipClick('/issues?status=Resolved')}
          title="View resolved issues"
          id="chip-filter-resolved"
        >
          Resolved ({byStatus.Resolved || 0})
        </button>
        <button
          className="filter-chip chip-critical"
          onClick={() => handleChipClick('/issues?severity=Critical')}
        >
          Critical bugs ({bySeverity.Critical || 0})
        </button>
      </div>

      {/* Responsive Stat Grid (Visual Priority Hierarchy) */}
      <div className="dashboard-stats-grid">
        {/* Anchor Stat: Total Issues */}
        <div
          className="stat-card anchor-stat-card console-card"
          onClick={() => navigate('/issues')}
          role="button"
          tabIndex={0}
          title="Click to view all issues"
        >
          <div className="stat-card-header">
            <span className="stat-category-label">Total issues</span>
            <span className="stat-main-number font-mono">{totalIssues}</span>
          </div>

          {/* Proportional Mini Bar */}
          <div className="stat-progress-bar">
            <div className="progress-segment seg-open" style={{ width: `${openPct}%` }} title={`Open: ${byStatus.Open || 0}`} />
            <div className="progress-segment seg-prog" style={{ width: `${inProgPct}%` }} title={`In Progress: ${byStatus['In Progress'] || 0}`} />
            <div className="progress-segment seg-test" style={{ width: `${testPct}%` }} title={`Testing: ${byStatus.Testing || 0}`} />
            <div className="progress-segment seg-resolved" style={{ width: `${resolvedPct}%` }} title={`Resolved: ${byStatus.Resolved || 0}`} />
            {closedPct > 0 && (
              <div className="progress-segment seg-closed" style={{ width: `${closedPct}%` }} title={`Closed: ${byStatus.Closed || 0}`} />
            )}
          </div>

          <div className="stat-progress-legend">
            <span className="legend-item"><span className="legend-dot dot-open" /> Open</span>
            <span className="legend-item"><span className="legend-dot dot-prog" /> Prog</span>
            <span className="legend-item"><span className="legend-dot dot-test" /> Test</span>
            <span className="legend-item"><span className="legend-dot dot-resolved" /> Done</span>
          </div>
        </div>

        {/* Supporting Stat Tiles */}
        <div
          className="stat-card console-card stat-tile"
          onClick={() => navigate('/issues?status=Open')}
          role="button"
          tabIndex={0}
          title="Filter by Open issues"
        >
          <div className="stat-tile-top">
            <span className="stat-category-label">Open</span>
            <StatusBadge status="Open" />
          </div>
          <div className="tile-number font-mono">{byStatus.Open || 0}</div>
          <span className="stat-subtext">Awaiting work</span>
        </div>

        <div
          className="stat-card console-card stat-tile"
          onClick={() => navigate('/issues?status=In%20Progress')}
          role="button"
          tabIndex={0}
          title="Filter by In Progress issues"
        >
          <div className="stat-tile-top">
            <span className="stat-category-label">In Progress</span>
            <StatusBadge status="In Progress" />
          </div>
          <div className="tile-number font-mono">{byStatus['In Progress'] || 0}</div>
          <span className="stat-subtext">In development</span>
        </div>

        <div
          className="stat-card console-card stat-tile"
          onClick={() => navigate('/issues?status=Testing')}
          role="button"
          tabIndex={0}
          title="Filter by Testing issues"
        >
          <div className="stat-tile-top">
            <span className="stat-category-label">Testing</span>
            <StatusBadge status="Testing" />
          </div>
          <div className="tile-number font-mono">{byStatus.Testing || 0}</div>
          <span className="stat-subtext">QA review</span>
        </div>

        <div
          className="stat-card console-card stat-tile"
          onClick={() => navigate('/issues?status=Resolved')}
          role="button"
          tabIndex={0}
          title="Click to view resolved issues"
          id="stat-tile-resolved"
        >
          <div className="stat-tile-top">
            <span className="stat-category-label">Resolved</span>
            <StatusBadge status="Resolved" />
          </div>
          <div className="tile-number font-mono" style={{ color: 'var(--status-resolved)' }}>
            {byStatus.Resolved || 0}
          </div>
          <span className="stat-subtext">Fix verified</span>
        </div>

        <div
          className="stat-card console-card stat-tile"
          onClick={() => navigate('/issues?severity=Critical')}
          role="button"
          tabIndex={0}
          title="Filter by Critical severity"
        >
          <div className="stat-tile-top">
            <span className="stat-category-label">Critical</span>
            <SeverityBadge severity="Critical" />
          </div>
          <div className="tile-number font-mono" style={{ color: 'var(--priority-urgent)' }}>
            {bySeverity.Critical || 0}
          </div>
          <span className="stat-subtext">High risk</span>
        </div>
      </div>

      {/* Two-Column Section: Assigned to Me & Live Activity Feed */}
      <div className="dashboard-content-split">
        {/* Left Column: Assigned to Me Queue */}
        <div className="dashboard-section console-card" id="assigned-to-me-section">
          <div className="section-title-bar">
            <div className="section-heading-group">
              <h2 className="section-title">Assigned to me</h2>
              <span className="count-badge font-mono">{assignedCount}</span>
            </div>
            {assignedCount > 0 && (
              <button
                className="view-all-link"
                onClick={() => navigate(`/issues?assignee=${user?._id || user?.id}`)}
              >
                View all →
              </button>
            )}
          </div>

          {assignedToMe.length === 0 ? (
            <div className="empty-queue-box">
              <span className="queue-check-icon">✓</span>
              <p className="queue-empty-text">No pending issues assigned to you.</p>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => navigate('/issues')}
              >
                Browse open issues
              </Button>
            </div>
          ) : (
            <div className="queue-items-list">
              {assignedToMe.map((item) => {
                const projectKey = item.project?.key || 'BUG';
                const serial = item._id.toString().slice(-4).toUpperCase();
                const issueKey = `${projectKey}-${serial}`;

                return (
                  <div
                    key={item._id}
                    className="queue-row"
                    onClick={() => navigate(`/issues/${item._id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="queue-row-top">
                      <KeyBadge>{issueKey}</KeyBadge>
                      <h4 className="queue-item-title">{item.title}</h4>
                    </div>
                    <div className="queue-row-bottom">
                      <div className="queue-badges">
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                        <SeverityBadge severity={item.severity} />
                      </div>
                      <span className="queue-date timestamp-mono">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Audit Activity Feed */}
        <div className="dashboard-section console-card" id="recent-activity-section">
          <div className="section-title-bar">
            <h2 className="section-title">Audit activity feed</h2>
            <span className="stat-subtext">Recent system mutations</span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="empty-queue-box">
              <p className="queue-empty-text">No activity logged yet.</p>
            </div>
          ) : (
            <div className="dashboard-activity-list">
              {recentActivities.map((act) => {
                const actorName = act.actor?.name || 'System';
                const issueTitle = act.issue?.title || 'Unknown issue';
                const issueKey = act.issue?.project?.key
                  ? `${act.issue.project.key}-${act.issue._id.toString().slice(-4).toUpperCase()}`
                  : null;

                let actionDescription = '';
                if (act.field === 'status') {
                  actionDescription = `transitioned to "${act.newValue}"`;
                } else if (act.field === 'assignee') {
                  actionDescription = act.newValue ? 'reassigned issue' : 'cleared assignee';
                } else {
                  actionDescription = `updated ${act.field}`;
                }

                return (
                  <div
                    key={act._id}
                    className="activity-feed-row"
                    onClick={() => act.issue?._id && navigate(`/issues/${act.issue._id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="feed-row-header">
                      <span className="feed-actor-name">{actorName}</span>
                      <span className="feed-timestamp timestamp-mono">
                        {new Date(act.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="feed-action-text">
                      {actionDescription}{' '}
                      {issueKey && <span className="font-mono text-muted">[{issueKey}]</span>}
                    </div>
                    <div className="feed-issue-title">{issueTitle}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
