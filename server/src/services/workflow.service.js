import {
  STATUS_TRANSITION_MATRIX,
  ALLOWED_STATUS_TRANSITIONS,
  ISSUE_STATUS_LIST,
} from '../constants/issueWorkflow.js';

/**
 * Service to validate and query Issue status workflow transitions.
 * Enforces Phase 3 centralized state machine and role-based permissions.
 */
class WorkflowService {
  /**
   * Validate whether a status transition is permitted from currentStatus to targetStatus
   * by a user with the specified role.
   *
   * @param {string} currentStatus - Existing issue status
   * @param {string} targetStatus - Proposed new issue status
   * @param {string} userRole - Role of the requesting user (Admin, Developer, Tester)
   * @returns {{ isValid: boolean, message?: string, legalStates?: string[] }}
   */
  validateStatusTransition(currentStatus, targetStatus, userRole) {
    if (!ISSUE_STATUS_LIST.includes(currentStatus)) {
      return {
        isValid: false,
        message: `Current status "${currentStatus}" is invalid.`,
        legalStates: [],
      };
    }

    if (!ISSUE_STATUS_LIST.includes(targetStatus)) {
      return {
        isValid: false,
        message: `Target status "${targetStatus}" is invalid. Must be one of: ${ISSUE_STATUS_LIST.join(', ')}.`,
        legalStates: [],
      };
    }

    if (currentStatus === targetStatus) {
      return {
        isValid: false,
        message: `Issue is already in "${currentStatus}" status.`,
        legalStates: [],
      };
    }

    const availableTransitions = STATUS_TRANSITION_MATRIX[currentStatus] || [];
    const legalNextStates = availableTransitions.map((t) => t.to);

    // 1. Check if the edge exists in the workflow graph
    const matchedTransition = availableTransitions.find((t) => t.to === targetStatus);
    if (!matchedTransition) {
      const legalListMsg = legalNextStates.length > 0 ? legalNextStates.join(', ') : 'none';
      return {
        isValid: false,
        message: `Cannot transition issue status from "${currentStatus}" to "${targetStatus}". Legal next states from "${currentStatus}": ${legalListMsg}.`,
        legalStates: legalNextStates,
      };
    }

    // 2. Check if the user's role is authorized for this specific transition
    if (!matchedTransition.roles.includes(userRole)) {
      return {
        isValid: false,
        message: `Role "${userRole}" is not authorized to transition status from "${currentStatus}" to "${targetStatus}". Permitted roles: ${matchedTransition.roles.join(', ')}.`,
        legalStates: legalNextStates,
      };
    }

    return {
      isValid: true,
      legalStates: legalNextStates,
    };
  }

  /**
   * Alias for validateStatusTransition
   */
  validateTransition(currentStatus, targetStatus, userRole) {
    return this.validateStatusTransition(currentStatus, targetStatus, userRole);
  }

  /**
   * Retrieve all legal next transitions available from currentStatus for a given role.
   *
   * @param {string} currentStatus
   * @param {string} userRole
   * @returns {string[]} List of destination status strings
   */
  getLegalNextStates(currentStatus, userRole) {
    const availableTransitions = STATUS_TRANSITION_MATRIX[currentStatus] || [];
    return availableTransitions
      .filter((t) => !userRole || t.roles.includes(userRole))
      .map((t) => t.to);
  }

  /**
   * Export raw transition matrix for UI introspection.
   */
  getTransitionMatrix() {
    return STATUS_TRANSITION_MATRIX;
  }
}

export const workflowService = new WorkflowService();
export default workflowService;
