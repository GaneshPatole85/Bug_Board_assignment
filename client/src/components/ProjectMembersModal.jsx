import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal.jsx';
import { RoleBadge, KeyBadge } from './ui/Badge.jsx';
import { Button } from './ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './ProjectMembersModal.css';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ProjectMembersModal = ({
  isOpen,
  onClose,
  project,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'Admin';
  const members = useMemo(() => {
    return Array.isArray(project?.members) ? project.members : [];
  }, [project]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(term)) ||
        (m.email && m.email.toLowerCase().includes(term)) ||
        (m.role && m.role.toLowerCase().includes(term))
    );
  }, [members, searchTerm]);

  // Breakdown counts
  const adminCount = members.filter((m) => m.role === 'Admin').length;
  const devCount = members.filter((m) => m.role === 'Developer').length;
  const testerCount = members.filter((m) => m.role === 'Tester').length;

  if (!isOpen || !project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="project-members-modal-title">
          <span>Project Team</span>
          <KeyBadge>{project.key}</KeyBadge>
        </div>
      }
      maxWidth="620px"
      id="project-members-modal"
    >
      <div className="project-members-modal-content">
        {/* Project Header Info */}
        <div className="modal-project-meta">
          <h3 className="modal-project-name">{project.name}</h3>
          {project.description && (
            <p className="modal-project-desc">{project.description}</p>
          )}
        </div>

        {/* Team Statistics Bar */}
        <div className="members-stat-bar" id="members-stat-summary">
          <div className="members-stat-item">
            <span className="stat-number font-mono">{members.length}</span>
            <span className="stat-title">Total Members</span>
          </div>
          <div className="stat-separator" />
          <div className="members-stat-item">
            <span className="stat-number font-mono">{adminCount}</span>
            <span className="stat-title">Admins</span>
          </div>
          <div className="stat-separator" />
          <div className="members-stat-item">
            <span className="stat-number font-mono">{devCount}</span>
            <span className="stat-title">Developers</span>
          </div>
          <div className="stat-separator" />
          <div className="members-stat-item">
            <span className="stat-number font-mono">{testerCount}</span>
            <span className="stat-title">Testers</span>
          </div>
        </div>

        {/* Search input if more than 3 members */}
        {members.length > 3 && (
          <div className="members-search-wrapper">
            <input
              type="text"
              className="members-search-input"
              placeholder="Filter members by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="members-filter-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="members-search-clear"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Member Roster List */}
        <div className="members-list" role="list" id="project-members-list">
          {filteredMembers.length === 0 ? (
            <div className="no-members-found">
              <p>No team members match "{searchTerm}".</p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const memberId = member._id || member.id;
              const isCurrentUser = memberId === (user?._id || user?.id);
              const roleSlug = (member.role || 'developer').toLowerCase();

              return (
                <div
                  key={memberId || member.email}
                  className={`member-row ${isCurrentUser ? 'current-user-row' : ''}`}
                  role="listitem"
                >
                  <div className="member-row-left">
                    <div className={`member-avatar role-${roleSlug}`}>
                      {getInitials(member.name)}
                    </div>
                    <div className="member-details">
                      <div className="member-name-line">
                        <span className="member-name">{member.name || 'Unnamed Member'}</span>
                        {member.isActive === false && (
                          <span className="inactive-user-badge">Inactive</span>
                        )}
                        {isCurrentUser && (
                          <span className="current-user-badge">You</span>
                        )}
                      </div>
                      <span className="member-email font-mono">{member.email}</span>
                    </div>
                  </div>

                  <div className="member-row-right">
                    <RoleBadge role={member.role} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions Footer */}
        <div className="modal-actions-bar">
          <Button variant="primary" size="sm" onClick={onClose} id="close-members-modal-btn">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectMembersModal;
