import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { SkeletonRow, SkeletonCard } from '../components/ui/SkeletonRow.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import { applyApiErrorsToForm } from '../utils/apiErrors.js';
import './TeamPage.css';

const ROLE_FILTERS = [
  { label: 'All roles', value: '' },
  { label: 'Developers', value: 'Developer' },
  { label: 'Testers', value: 'Tester' },
  { label: 'Admins', value: 'Admin' },
];

export const TeamPage = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [editTargetUser, setEditTargetUser] = useState(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ employeeId: '', designation: '' });
  const [editErrors, setEditErrors] = useState({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      const res = await apiClient.get(`/users?${params.toString()}`);
      setUsers(res.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Status toggle (Activate / Deactivate)
  const handleConfirmStatusToggle = async () => {
    if (!statusTargetUser) return;
    const targetId = statusTargetUser._id;
    const newStatus = !statusTargetUser.isActive;

    setIsUpdatingStatus(true);
    try {
      await apiClient.patch(`/users/${targetId}`, {
        isActive: newStatus,
      });

      setUsers((prev) =>
        prev.map((u) => (u._id === targetId ? { ...u, isActive: newStatus } : u))
      );

      addToast(
        `User ${statusTargetUser.name} has been ${newStatus ? 'activated' : 'deactivated'}`,
        'success'
      );
      setStatusTargetUser(null);
    } catch (err) {
      addToast(err.message || 'Failed to update account status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

const DEFAULT_DEPARTMENTS_BY_ROLE = {
  Developer: 'Engineering',
  Tester: 'Quality Assurance',
  Admin: 'Platform Operations',
};

  // Edit role & department as Admin (employeeId is system-generated and immutable)
  const handleOpenEditModal = (user) => {
    const currentUserId = currentUser?._id || currentUser?.id;
    const targetId = user?._id || user?.id;
    if (String(targetId) === String(currentUserId)) return;

    setEditTargetUser(user);
    setEditForm({
      role: user.role || 'Developer',
      department: user.department || user.designation || DEFAULT_DEPARTMENTS_BY_ROLE[user.role] || '',
    });
    setEditErrors({});
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!editTargetUser) return;

    const newErrors = {};
    if (editForm.department && editForm.department.length > 100) {
      newErrors.department = 'Department cannot exceed 100 characters';
    }
    if (!editForm.role) {
      newErrors.role = 'Role is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors);
      return;
    }

    setIsSavingDetails(true);
    try {
      const res = await apiClient.patch(`/users/${editTargetUser._id}`, {
        role: editForm.role,
        department: editForm.department.trim() || null,
      });

      const updatedUser = res.data?.user || res.data;
      setUsers((prev) =>
        prev.map((u) => (u._id === editTargetUser._id ? { ...u, ...updatedUser } : u))
      );

      addToast(`Updated details for ${editTargetUser.name}`, 'success');
      setEditTargetUser(null);
    } catch (err) {
      // Map backend field errors (e.g. invalid role, department too long) to inline modal errors
      const fieldMap = {};
      const apiErrs = Array.isArray(err?.errors) ? err.errors : [];
      apiErrs.forEach((e) => { if (e.field) fieldMap[e.field] = e.message; });
      if (Object.keys(fieldMap).length > 0) {
        setEditErrors((prev) => ({ ...prev, ...fieldMap }));
      } else {
        addToast(err.message || 'Failed to update user details', 'error');
      }
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Filter users by search keywords (client-side search across loaded team)
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.designation?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container" id="team-page">
      <div className="page-header">
        <div className="page-header-info">
          <div className="team-title-row">
            <h1 className="page-title">Team Directory</h1>
            <span className="results-badge font-mono">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <p className="page-description">
            Administrative user directory. Manage team roles, employee credentials, and account activation states.
          </p>
        </div>
      </div>

      {/* Toolbar: Role Segmented Filters & Search */}
      <div className="team-toolbar">
        <div className="team-role-filters" role="group" aria-label="Role filters">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf.value}
              type="button"
              className={`role-filter-btn ${roleFilter === rf.value ? 'active' : ''}`}
              onClick={() => setRoleFilter(rf.value)}
              id={`role-filter-${rf.value || 'all'}`}
            >
              {rf.label}
            </button>
          ))}
        </div>

        <div className="team-search-wrapper">
          <input
            type="text"
            className="team-search-input"
            placeholder="Search by name, email, or EMP ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="team-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="team-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="team-desktop-table-container">
        <table className="team-table" id="team-table">
          <thead>
            <tr>
              <th className="th-member">Team Member</th>
              <th className="th-role">Role</th>
              <th className="th-empid">Employee ID</th>
              <th className="th-designation">Department</th>
              <th className="th-status">Status</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={6} />
              ))
            ) : filteredUsers.length === 0 ? (
              <tr className="table-empty-row">
                <td colSpan={6} className="table-empty-cell">
                  <EmptyState
                    title="No team members found"
                    description="No users matched the active role filter or search criteria."
                    actionLabel="Reset filters"
                    onAction={() => {
                      setRoleFilter('');
                      setSearchQuery('');
                    }}
                  />
                </td>
              </tr>
            ) : (
              filteredUsers.map((member) => {
                const currentUserId = currentUser?._id || currentUser?.id;
                const memberId = member._id || member.id;
                const isSelf = Boolean(currentUserId && memberId && String(memberId) === String(currentUserId));
                const initials = member.name
                    ? member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'U';

                return (
                  <tr
                    key={member._id}
                    className={`team-row ${!member.isActive ? 'is-inactive-row' : ''}`}
                    id={`team-row-${member._id}`}
                  >
                    <td className="td-member">
                      <div className="member-info-box">
                        <div className="member-avatar">{initials}</div>
                        <div className="member-name-block">
                          <span className="member-name font-semibold">
                            {member.name} {isSelf && <span className="self-tag">(You)</span>}
                          </span>
                          <span className="member-email font-mono">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="td-role">
                      <RoleBadge role={member.role} />
                    </td>

                    <td className="td-empid font-mono">
                      {member.employeeId || <span className="cell-muted">—</span>}
                    </td>

                    <td className="td-designation">
                      {member.department || member.designation || <span className="cell-muted">—</span>}
                    </td>

                    <td className="td-status">
                      <span
                        className={`team-status-badge ${
                          member.isActive !== false ? 'badge-active' : 'badge-inactive'
                        }`}
                        id={`status-badge-${member._id}`}
                      >
                        {member.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="td-actions">
                      {isSelf ? (
                        <span className="cell-muted">—</span>
                      ) : (
                        <div className="table-actions-group">
                          <button
                            type="button"
                            className="table-action-btn action-edit"
                            onClick={() => handleOpenEditModal(member)}
                            title="Edit role and department"
                            id={`edit-member-${member._id}`}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={`table-action-btn ${
                              member.isActive !== false ? 'action-deactivate' : 'action-activate'
                            }`}
                            onClick={() => setStatusTargetUser(member)}
                            title={member.isActive !== false ? 'Deactivate account' : 'Reactivate account'}
                            id={`status-btn-${member._id}`}
                          >
                            {member.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="team-mobile-cards-container">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No team members found"
            description="No users matched the active role filter or search criteria."
            actionLabel="Reset filters"
            onAction={() => {
              setRoleFilter('');
              setSearchQuery('');
            }}
          />
        ) : (
          filteredUsers.map((member) => {
            const currentUserId = currentUser?._id || currentUser?.id;
            const memberId = member._id || member.id;
            const isSelf = Boolean(currentUserId && memberId && String(memberId) === String(currentUserId));
            const initials = member.name
              ? member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'U';

            return (
              <div
                key={member._id}
                className={`team-card ${!member.isActive ? 'is-inactive-card' : ''}`}
                id={`team-card-${member._id}`}
              >
                <div className="card-top-row">
                  <div className="member-info-box">
                    <div className="member-avatar">{initials}</div>
                    <div>
                      <h4 className="member-name">
                        {member.name} {isSelf && <span className="self-tag">(You)</span>}
                      </h4>
                      <span className="member-email font-mono">{member.email}</span>
                    </div>
                  </div>
                  <RoleBadge role={member.role} />
                </div>

                <div className="card-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">EMP ID</span>
                    <span className="meta-val font-mono">{member.employeeId || '—'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Department</span>
                    <span className="meta-val">{member.department || member.designation || '—'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Status</span>
                    <span
                      className={`team-status-badge ${
                        member.isActive !== false ? 'badge-active' : 'badge-inactive'
                      }`}
                    >
                      {member.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {!isSelf && (
                  <div className="card-actions-row">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEditModal(member)}
                      id={`card-edit-${member._id}`}
                    >
                      Edit Details
                    </Button>
                    <Button
                      variant={member.isActive !== false ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => setStatusTargetUser(member)}
                      id={`card-status-${member._id}`}
                    >
                      {member.isActive !== false ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Activation / Deactivation */}
      <Modal
        isOpen={Boolean(statusTargetUser)}
        onClose={() => !isUpdatingStatus && setStatusTargetUser(null)}
        title={statusTargetUser?.isActive !== false ? 'Deactivate User Account' : 'Reactivate User Account'}
        id="status-toggle-modal"
      >
        <div className="status-modal-content">
          <p className="status-modal-text">
            {statusTargetUser?.isActive !== false ? (
              <>
                Are you sure you want to deactivate <strong>{statusTargetUser?.name}</strong>?
                Their active session will be terminated immediately, and their JWT token will be revoked on their next request.
              </>
            ) : (
              <>
                Are you sure you want to reactivate <strong>{statusTargetUser?.name}</strong>?
                They will immediately be able to log in and access assigned projects again.
              </>
            )}
          </p>

          <div className="status-modal-actions">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setStatusTargetUser(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant={statusTargetUser?.isActive !== false ? 'danger' : 'primary'}
              size="md"
              onClick={handleConfirmStatusToggle}
              isLoading={isUpdatingStatus}
              id="confirm-status-toggle-btn"
            >
              {statusTargetUser?.isActive !== false ? 'Deactivate Account' : 'Reactivate Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin Edit Modal for Assigned Role & Department */}
      <Modal
        isOpen={Boolean(editTargetUser)}
        onClose={() => !isSavingDetails && setEditTargetUser(null)}
        title={`Edit Team Member — ${editTargetUser?.name}`}
        id="edit-details-modal"
      >
        <form onSubmit={handleSaveDetails} className="edit-modal-form">
          <div className="form-group">
            <label htmlFor="edit-role" className="form-label">
              Assigned Role <span className="field-required">*</span>
            </label>
            <select
              id="edit-role"
              className="form-select"
              value={editForm.role}
              onChange={(e) => {
                const newRole = e.target.value;
                setEditForm((prev) => ({
                  ...prev,
                  role: newRole,
                  department:
                    !prev.department || prev.department === DEFAULT_DEPARTMENTS_BY_ROLE[prev.role]
                      ? DEFAULT_DEPARTMENTS_BY_ROLE[newRole] || prev.department
                      : prev.department,
                }));
              }}
            >
              <option value="Developer">Developer</option>
              <option value="Tester">Tester</option>
            </select>
            {editErrors.role && (
              <span className="form-error-msg">{editErrors.role}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="edit-department" className="form-label">
              Department
            </label>
            <input
              type="text"
              id="edit-department"
              className={`form-input ${editErrors.department ? 'form-input-error' : ''}`}
              value={editForm.department}
              onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="e.g. Engineering, Quality Assurance, Platform"
            />
            {editErrors.department && (
              <span className="form-error-msg">{editErrors.department}</span>
            )}
          </div>

          <div className="status-modal-actions">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setEditTargetUser(null)}
              disabled={isSavingDetails}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSavingDetails}
              id="save-member-details-btn"
            >
              Save Details
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamPage;
