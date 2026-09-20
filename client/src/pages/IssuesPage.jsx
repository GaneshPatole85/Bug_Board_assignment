import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { SkeletonRow, SkeletonCard } from '../components/ui/SkeletonRow.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { useToast } from '../context/ToastContext.jsx';
import IssueFilters from '../components/IssueFilters.jsx';
import IssueRow from '../components/IssueRow.jsx';
import IssueCard from '../components/IssueCard.jsx';
import IssueForm from '../components/IssueForm.jsx';
import ProjectMembersModal from '../components/ProjectMembersModal.jsx';
import KanbanBoard from '../components/KanbanBoard.jsx';
import './IssuesPage.css';

export const IssuesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'board'

  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState(null);

  // Pagination state from API
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('-createdAt');

  // Filters state (defaults synced from URL params)
  const initialProjectId = searchParams.get('project') || '';
  const [filters, setFilters] = useState({
    project: initialProjectId,
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    severity: searchParams.get('severity') || '',
    assignee: searchParams.get('assignee') || '',
  });

  // Modals & Drawers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Keep search params synchronized with filter changes
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.project) nextParams.set('project', filters.project);
    if (filters.status) nextParams.set('status', filters.status);
    if (filters.priority) nextParams.set('priority', filters.priority);
    if (filters.severity) nextParams.set('severity', filters.severity);
    if (filters.assignee) nextParams.set('assignee', filters.assignee);
    setSearchParams(nextParams, { replace: true });
  }, [filters, setSearchParams]);

  // Load projects & users for filter dropdowns
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get('/projects').catch(() => ({ data: [] })),
      apiClient.get('/users').catch(() => ({ data: [] })),
    ]).then(([projRes, usersRes]) => {
      if (isMounted) {
        setProjects(projRes.data || []);
        setUsers(usersRes.data || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch issues with server-side query parameters
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sort', sortOrder);

      if (filters.project) params.append('project', filters.project);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.assignee) params.append('assignee', filters.assignee);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient.get(`/issues?${params.toString()}`);
      setIssues(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load issues. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortOrder, filters, searchQuery]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIssues();
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      project: '',
      status: '',
      priority: '',
      severity: '',
      assignee: '',
    });
    setSearchQuery('');
    setPage(1);
  };

  const [issueToDelete, setIssueToDelete] = useState(null);
  const [isDeletingIssue, setIsDeletingIssue] = useState(false);
  const { addToast } = useToast();

  const handleDeleteIssueClick = (issue) => {
    setIssueToDelete(issue);
  };

  const handleConfirmDeleteIssue = async () => {
    if (!issueToDelete) return;
    setIsDeletingIssue(true);
    try {
      await apiClient.delete(`/issues/${issueToDelete._id}`);
      addToast('Issue deleted successfully', 'success');
      setIssueToDelete(null);
      fetchIssues();
    } catch (err) {
      addToast(err.message || 'Failed to delete issue', 'error');
    } finally {
      setIsDeletingIssue(false);
    }
  };

  const handleStatusTransition = async (issueId, newStatus, oldStatus) => {
    // Optimistically update local state
    setIssues((prev) =>
      prev.map((i) => (i._id === issueId ? { ...i, status: newStatus } : i))
    );

    try {
      await apiClient.patch(`/issues/${issueId}/status`, { status: newStatus });
      addToast(`Status moved to ${newStatus}`, 'success');
    } catch (err) {
      // Revert optimistic update on failure
      setIssues((prev) =>
        prev.map((i) => (i._id === issueId ? { ...i, status: oldStatus } : i))
      );
      addToast(err.message || 'Illegal status transition', 'error');
      throw err;
    }
  };

  const hasActiveFilters = Boolean(
    filters.project ||
    filters.status ||
    filters.priority ||
    filters.severity ||
    filters.assignee ||
    searchQuery.trim()
  );

  const selectedProjectObj = useMemo(() => {
    return projects.find((p) => p._id === filters.project);
  }, [projects, filters.project]);

  return (
    <div className="page-container" id="issues-page">
      <div className="page-header">
        <div className="page-header-info">
          <div className="issues-title-row">
            <h1 className="page-title">
              Issues {selectedProjectObj ? `— ${selectedProjectObj.name}` : ''}
            </h1>
            <span className="results-badge font-mono">
              {total} {total === 1 ? 'issue' : 'issues'}
            </span>
            {selectedProjectObj && (
              <button
                type="button"
                className="project-team-badge font-mono"
                onClick={() => setSelectedProjectForMembers(selectedProjectObj)}
                title="Click to view all team members in this project"
              >
                👥 {selectedProjectObj.memberCount || selectedProjectObj.members?.length || 0} members
              </button>
            )}
          </div>
          <p className="page-description">
            Live technical issue tracker with server-side query filters, status workflow transitions, and audit logs.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsFormOpen(true)}
          id="create-issue-trigger-btn"
        >
          New issue
        </Button>
      </div>

      {/* Toolbar: Search, Filters Trigger, Sort Dropdown */}
      <div className="issues-toolbar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search issues by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="issue-search-input"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                title="Clear search query"
              >
                ✕
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" size="sm" id="search-submit-btn">
            Search
          </Button>
        </form>

        <div className="toolbar-right-controls">
          {/* View Switcher: Table / Board */}
          <div className="view-switcher-control" id="issues-view-switcher" role="group" aria-label="View layout switcher">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              id="view-mode-table-btn"
              title="Table view"
              aria-pressed={viewMode === 'table'}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
              id="view-mode-board-btn"
              title="Kanban Board view"
              aria-pressed={viewMode === 'board'}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="18" rx="1" />
                <rect x="10" y="3" width="5" height="12" rx="1" />
                <rect x="17" y="3" width="5" height="15" rx="1" />
              </svg>
              <span>Board</span>
            </button>
          </div>

          {/* Mobile Filter Sheet Trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="mobile-filter-trigger-btn"
            id="mobile-filters-btn"
          >
            Filters {hasActiveFilters && '•'}
          </Button>

          <div className="sort-control-wrapper">
            <label htmlFor="issues-sort" className="sort-label">Sort:</label>
            <select
              id="issues-sort"
              className="sort-select"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="priority">Priority (ascending)</option>
              <option value="-priority">Priority (descending)</option>
              <option value="severity">Severity (ascending)</option>
              <option value="-severity">Severity (descending)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Inline Filters Bar */}
      <div className="desktop-filters-wrapper">
        <IssueFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          projects={projects}
          users={users}
          isMobileDrawer={false}
        />
      </div>

      {/* Active Filter Chips Bar (Quick Dismissal) */}
      {hasActiveFilters && (
        <div className="active-filters-bar" id="active-filters-bar">
          <span className="active-filters-label">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Active filters:
          </span>

          {filters.project && (
            <span className="active-filter-pill">
              Project: <strong>{selectedProjectObj?.name || 'Selected'}</strong>
              <button
                type="button"
                className="pill-remove-btn"
                onClick={() => handleFilterChange({ ...filters, project: '' })}
                title="Remove project filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.status && (
            <span className="active-filter-pill">
              Status: <strong>{filters.status}</strong>
              <button
                type="button"
                className="pill-remove-btn"
                onClick={() => handleFilterChange({ ...filters, status: '' })}
                title="Remove status filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.priority && (
            <span className="active-filter-pill">
              Priority: <strong>{filters.priority}</strong>
              <button
                type="button"
                className="pill-remove-btn"
                onClick={() => handleFilterChange({ ...filters, priority: '' })}
                title="Remove priority filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.severity && (
            <span className="active-filter-pill">
              Severity: <strong>{filters.severity}</strong>
              <button
                type="button"
                className="pill-remove-btn"
                onClick={() => handleFilterChange({ ...filters, severity: '' })}
                title="Remove severity filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.assignee && (
            <span className="active-filter-pill">
              Assignee:{' '}
              <strong>
                {filters.assignee === 'unassigned'
                  ? 'Unassigned'
                  : users.find((u) => u._id === filters.assignee)?.name || 'Selected'}
              </strong>
              <button
                type="button"
                className="pill-remove-btn"
                onClick={() => handleFilterChange({ ...filters, assignee: '' })}
                title="Remove assignee filter"
              >
                ✕
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="active-filter-pill">
              Query: <strong>"{searchQuery}"</strong>
              <button
                type="button"
                className="pill-remove-btn"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                title="Clear search query"
              >
                ✕
              </button>
            </span>
          )}

          <button
            type="button"
            className="clear-all-pills-btn"
            onClick={handleResetFilters}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Mobile Filters Drawer */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Issues"
        position="bottom"
        id="mobile-filters-drawer"
      >
        <IssueFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={() => {
            handleResetFilters();
            setIsFilterDrawerOpen(false);
          }}
          projects={projects}
          users={users}
          isMobileDrawer={true}
        />
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="md" onClick={() => setIsFilterDrawerOpen(false)}>
            Apply filters
          </Button>
        </div>
      </Drawer>

      {/* Error state */}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchIssues}>
            Retry
          </Button>
        </div>
      )}

      {viewMode === 'board' ? (
        <KanbanBoard
          issues={issues}
          onStatusChange={handleStatusTransition}
          user={user}
          onIssueClick={(issueId) => navigate(`/issues/${issueId}`)}
        />
      ) : (
        <>
          {/* Desktop / Tablet Table View */}
          <div className="issues-desktop-table-container">
            <table className="issues-table" id="issues-table">
              <thead>
                <tr>
                  <th className="th-key">Key</th>
                  <th className="th-title">Title</th>
                  <th className="th-status">Status</th>
                  <th className="th-priority">Priority</th>
                  <th className="th-severity">Severity</th>
                  <th className="th-assignee">Assignee</th>
                  <th className="th-reporter col-tablet-hide">Reporter</th>
                  <th className="th-date col-tablet-hide">Created</th>
                  <th className="th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} columns={9} />
                  ))
                ) : issues.length === 0 ? (
                  <tr className="table-empty-row">
                    <td colSpan={9} className="table-empty-cell">
                      <EmptyState
                        title={hasActiveFilters ? 'No matching issues found' : 'No issues in this project'}
                        description={
                          hasActiveFilters
                            ? 'No issues match the applied filters or search keywords. Try clearing or adjusting your filters.'
                            : 'No issues exist in the selected project yet. Report the first issue to begin tracking.'
                        }
                        actionLabel={hasActiveFilters ? 'Clear all filters' : 'Create first issue'}
                        onAction={hasActiveFilters ? handleResetFilters : () => setIsFormOpen(true)}
                      />
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <IssueRow key={issue._id} issue={issue} onDelete={handleDeleteIssueClick} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards List View */}
          <div className="issues-mobile-cards-container">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : issues.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? 'No matching issues found' : 'No issues in this project'}
                description={
                  hasActiveFilters
                    ? 'No issues match the applied filters or search keywords. Try clearing or adjusting your filters.'
                    : 'No issues exist in the selected project yet. Report the first issue to begin tracking.'
                }
                actionLabel={hasActiveFilters ? 'Clear all filters' : 'Create first issue'}
                onAction={hasActiveFilters ? handleResetFilters : () => setIsFormOpen(true)}
              />
            ) : (
              issues.map((issue) => (
                <IssueCard key={issue._id} issue={issue} onDelete={handleDeleteIssueClick} />
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              id="issues-pagination"
            />
          )}
        </>
      )}

      {/* Issue Creation Modal */}
      <IssueForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchIssues}
        preselectedProjectId={filters.project}
        projects={projects}
      />

      {/* Project Team Members Roster Modal */}
      <ProjectMembersModal
        isOpen={Boolean(selectedProjectForMembers)}
        onClose={() => setSelectedProjectForMembers(null)}
        project={selectedProjectForMembers}
      />

      {/* Delete Issue Confirmation Modal */}
      <Modal
        isOpen={Boolean(issueToDelete)}
        onClose={() => !isDeletingIssue && setIssueToDelete(null)}
        title="Delete Issue"
        id="delete-issue-page-modal"
      >
        <div className="delete-confirm-box">
          <p className="delete-confirm-text">
            Are you sure you want to permanently delete issue "
            <strong>{issueToDelete?.title}</strong>"?
          </p>
          <div className="delete-confirm-warning">
            ⚠️ <strong>Warning:</strong> Deleting this issue will permanently remove all associated comments and activity history. This action cannot be undone.
          </div>
          <div className="delete-confirm-actions">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIssueToDelete(null)}
              disabled={isDeletingIssue}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmDeleteIssue}
              isLoading={isDeletingIssue}
              id="confirm-delete-issue-btn"
            >
              Delete Issue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default IssuesPage;
