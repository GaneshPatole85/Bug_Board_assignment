export const ISSUE_SEVERITY = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
});

export const ISSUE_SEVERITY_LIST = Object.freeze(Object.values(ISSUE_SEVERITY));

export const ISSUE_PRIORITY = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
});

export const ISSUE_PRIORITY_LIST = Object.freeze(Object.values(ISSUE_PRIORITY));

export const ISSUE_STATUS = Object.freeze({
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  TESTING: 'Testing',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
});

export const ISSUE_STATUS_LIST = Object.freeze(Object.values(ISSUE_STATUS));

/**
 * Valid state transitions for Issue workflow:
 * Open -> In Progress -> Testing -> Resolved -> Closed
 * Note: Re-opening transitions (e.g. Testing -> In Progress, Closed -> Open)
 * can be accommodated per project rules in Phase 3.
 */
export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  [ISSUE_STATUS.OPEN]: [ISSUE_STATUS.IN_PROGRESS],
  [ISSUE_STATUS.IN_PROGRESS]: [ISSUE_STATUS.TESTING, ISSUE_STATUS.OPEN],
  [ISSUE_STATUS.TESTING]: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.IN_PROGRESS],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.IN_PROGRESS],
  [ISSUE_STATUS.CLOSED]: [ISSUE_STATUS.OPEN],
});
