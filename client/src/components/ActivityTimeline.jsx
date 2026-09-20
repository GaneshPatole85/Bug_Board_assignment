import React from 'react';
import './ActivityTimeline.css';

/**
 * Render sentence-style human-readable activity descriptions:
 * e.g., "Priya changed priority: Medium → High"
 */
function renderActivitySentence(act) {
  const actorName = act.actor?.name || 'A user';

  if (act.action === 'CREATED') {
    return (
      <span>
        <strong>{actorName}</strong> created this issue
      </span>
    );
  }

  if (act.field === 'status') {
    return (
      <span>
        <strong>{actorName}</strong> changed status:{' '}
        <span className="activity-val-old">{act.oldValue || 'None'}</span>
        <span className="activity-arrow"> → </span>
        <span className="activity-val-new">{act.newValue}</span>
      </span>
    );
  }

  if (act.field === 'priority') {
    return (
      <span>
        <strong>{actorName}</strong> changed priority:{' '}
        <span className="activity-val-old">{act.oldValue || 'None'}</span>
        <span className="activity-arrow"> → </span>
        <span className="activity-val-new">{act.newValue}</span>
      </span>
    );
  }

  if (act.field === 'severity') {
    return (
      <span>
        <strong>{actorName}</strong> changed severity:{' '}
        <span className="activity-val-old">{act.oldValue || 'None'}</span>
        <span className="activity-arrow"> → </span>
        <span className="activity-val-new">{act.newValue}</span>
      </span>
    );
  }

  if (act.field === 'title') {
    return (
      <span>
        <strong>{actorName}</strong> changed title from{' '}
        <span className="activity-val-old">"{act.oldValue}"</span>
        <span className="activity-arrow"> → </span>
        <span className="activity-val-new">"{act.newValue}"</span>
      </span>
    );
  }

  if (act.field === 'assignee') {
    if (!act.newValue) {
      return (
        <span>
          <strong>{actorName}</strong> unassigned this issue
        </span>
      );
    }
    return (
      <span>
        <strong>{actorName}</strong> reassigned this issue:{' '}
        <span className="activity-val-old">{act.oldValue || 'Unassigned'}</span>
        <span className="activity-arrow"> → </span>
        <span className="activity-val-new">{act.newValue}</span>
      </span>
    );
  }

  return (
    <span>
      <strong>{actorName}</strong> updated {act.field}
    </span>
  );
}

export const ActivityTimeline = ({ activities = [], loading = false }) => {
  if (loading) {
    return (
      <div className="activity-loading" id="activity-loading">
        Loading audit history...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-empty" id="activity-empty">
        <p>No activity recorded yet for this issue.</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline" id="activity-timeline">
      {activities.map((act) => {
        const actorRole = act.actor?.role ? `(${act.actor.role})` : '';
        const timestamp = new Date(act.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={act._id} className="timeline-item" id={`activity-${act._id}`}>
            <div className="timeline-bullet" />
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-role-badge">{actorRole}</span>
                <span className="timeline-time timestamp-mono">{timestamp}</span>
              </div>
              <p className="timeline-detail">{renderActivitySentence(act)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;
