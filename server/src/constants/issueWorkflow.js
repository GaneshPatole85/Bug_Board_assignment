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

import { ROLES } from './roles.js';

/**
 * Phase 3 Centralized Status Transition Matrix.
 * Enforces valid edges and role restrictions:
 * - Open -> In Progress: Admin, Developer
 * - In Progress -> Testing: Admin, Developer
 * - Testing -> Resolved: Admin, Tester
 * - Testing -> Open: Admin, Tester
 * - Resolved -> Closed: Admin, Tester
 * - Resolved -> Open: Admin, Tester
 * - Closed -> Open: Admin only
 */
export const STATUS_TRANSITION_MATRIX = Object.freeze({
  [ISSUE_STATUS.OPEN]: [
    { to: ISSUE_STATUS.IN_PROGRESS, roles: [ROLES.ADMIN, ROLES.DEVELOPER] },
  ],
  [ISSUE_STATUS.IN_PROGRESS]: [
    { to: ISSUE_STATUS.TESTING, roles: [ROLES.ADMIN, ROLES.DEVELOPER] },
  ],
  [ISSUE_STATUS.TESTING]: [
    { to: ISSUE_STATUS.RESOLVED, roles: [ROLES.ADMIN, ROLES.TESTER] },
    { to: ISSUE_STATUS.OPEN, roles: [ROLES.ADMIN, ROLES.TESTER] },
  ],
  [ISSUE_STATUS.RESOLVED]: [
    { to: ISSUE_STATUS.CLOSED, roles: [ROLES.ADMIN, ROLES.TESTER] },
    { to: ISSUE_STATUS.OPEN, roles: [ROLES.ADMIN, ROLES.TESTER] },
  ],
  [ISSUE_STATUS.CLOSED]: [
    { to: ISSUE_STATUS.OPEN, roles: [ROLES.ADMIN] },
  ],
});

/**
 * Helper mapping of allowed destination states from each state (ignoring role).
 */
export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  [ISSUE_STATUS.OPEN]: [ISSUE_STATUS.IN_PROGRESS],
  [ISSUE_STATUS.IN_PROGRESS]: [ISSUE_STATUS.TESTING],
  [ISSUE_STATUS.TESTING]: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.OPEN],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.OPEN],
  [ISSUE_STATUS.CLOSED]: [ISSUE_STATUS.OPEN],
});

