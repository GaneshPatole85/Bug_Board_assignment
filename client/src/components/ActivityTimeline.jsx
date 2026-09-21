import React from 'react';
import './ActivityTimeline.css';

/**
 * Render sentence-style human-readable activity descriptions:
 * e.g., "Priya changed priority: Medium → High"
 */
function renderActivitySentence(act, usersMap = {}) {
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
    const resolveAssigneeName = (val) => {
      if (!val || val === 'null' || val === 'undefined') return 'Unassigned';
      if (typeof val === 'object') {
        return val.name || val.email || val._id?.toString() || 'User';
      }
      const strVal = String(val);
      if (usersMap && typeof usersMap === 'object' && usersMap[strVal]) {
        return usersMap[strVal];
      }
      return strVal;
    };

    const oldDisplay = resolveAssigneeName(act.oldValue);
    const newDisplay = resolveAssigneeName(act.newValue);

    if (!act.newValue || newDisplay === 'Unassigned') {
      return (
        <span>
          <strong>{actorName}</strong> unassigned this issue
          {oldDisplay && oldDisplay !== 'Unassigned' && (
            <> (was <span className="activity-val-old">{oldDisplay}</span>)</>
          )}
        </span>
      );
    }
    return (
      <span>
        <strong>{actorName}</strong> reassigned this issue:{' '}
        <span className="activity-val-old">{oldDisplay}</span>
        <span className="activity-arrow"> → </span>
        <span className="activity-val-new">{newDisplay}</span>
      </span>
    );
  }

  return (
    <span>
      <strong>{actorName}</strong> updated {act.field}
    </span>
  );
}

export const ActivityTimeline = ({ activities = [], loading = false, usersMap = {} }) => {
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
              <p className="timeline-detail">{renderActivitySentence(act, usersMap)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;
