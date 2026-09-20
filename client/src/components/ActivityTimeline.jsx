import React from 'react';
import './ActivityTimeline.css';

export const ActivityTimeline = ({ activities = [], loading = false }) => {
  if (loading) {
    return <div className="activity-loading">Loading activity history...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="activity-empty">
        <p>No activity recorded yet for this issue.</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline" id="activity-timeline">
      {activities.map((act) => {
        const actorName = act.actor?.name || 'System';
        const actorRole = act.actor?.role ? `(${act.actor.role})` : '';
        const timestamp = new Date(act.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        let detailText = '';
        if (act.field === 'status') {
          detailText = `changed status from "${act.oldValue}" to "${act.newValue}"`;
        } else if (act.field === 'assignee') {
          detailText = act.newValue ? 'reassigned this issue' : 'unassigned this issue';
        } else if (act.action === 'CREATED') {
          detailText = 'created this issue';
        } else {
          detailText = `updated ${act.field}`;
        }

        return (
          <div key={act._id} className="timeline-item">
            <div className="timeline-bullet" />
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-actor">
                  {actorName} <span className="timeline-role">{actorRole}</span>
                </span>
                <span className="timeline-time timestamp-mono">{timestamp}</span>
              </div>
              <p className="timeline-detail">{detailText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;
