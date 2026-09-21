import { Issue } from '../models/Issue.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { Comment } from '../models/Comment.js';
import { Activity } from '../models/Activity.js';
import { ROLES } from '../constants/roles.js';
import { workflowService } from './workflow.service.js';
import { notificationService } from './notification.service.js';
import {
  BadRequestError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

const POPULATE_ISSUE = [
  {
    path: 'project',
    select: 'name key members',
    populate: {
      path: 'members',
      select: 'name email role',
    },
  },
  { path: 'reporter', select: 'name email role' },
  { path: 'assignee', select: 'name email role' },
];

class IssueService {
  /**
   * Create a new issue.
   * - Validates target project exists and user is an authorized member (or Admin).
   * - Forces reporter to req.user.id server-side (Decision #1).
   * - Validates assignee is an active project member and Developer (Decision #2).
   */
  async createIssue(issueData, user) {
    const project = await Project.findById(issueData.project);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Requester must be Admin or a member of the project
    if (user.role !== ROLES.ADMIN) {
      const isMember = project.members.some((m) => m.toString() === user.id.toString());
      if (!isMember) {
        throw new ForbiddenError('Forbidden: You are not an authorized member of this project');
      }
    }

    // If assignee specified, must be member of project AND role Developer
    let assigneeId = null;
    if (issueData.assignee) {
      const isAssigneeMember = project.members.some(
        (m) => m.toString() === issueData.assignee.toString()
      );
      if (!isAssigneeMember) {
        throw new ValidationError('Assignee must be an active member of this project', [
          { field: 'assignee', message: 'Assignee must be an active member of this project' },
        ]);
      }
      const assigneeUser = await User.findById(issueData.assignee);
      if (!assigneeUser) {
        throw new ValidationError('Assignee user does not exist', [
          { field: 'assignee', message: 'Assignee user does not exist' },
        ]);
      }
      if (assigneeUser.isActive === false) {
        throw new ValidationError('Selected assignee is inactive and cannot be assigned to issues', [
          { field: 'assignee', message: 'Selected assignee is inactive and cannot be assigned to issues' },
        ]);
      }
      if (assigneeUser.role !== ROLES.DEVELOPER) {
        throw new ValidationError('Issues can only be assigned to Developers', [
          { field: 'assignee', message: 'Issues can only be assigned to Developers' },
        ]);
      }
      assigneeId = issueData.assignee;
    }

    // Create issue; reporter is strictly set to user.id server-side
    const issue = await Issue.create({
      title: issueData.title.trim(),
      description: issueData.description.trim(),
      project: project._id,
      severity: issueData.severity,
      priority: issueData.priority,
      assignee: assigneeId,
      reporter: user.id, // Immutable server-side attribution
    });

    return Issue.findById(issue._id).populate(POPULATE_ISSUE);
  }

  /**
   * List issues with server-side filtering, sorting, full-text search, and pagination.
   * Enforces project-level isolation: non-admins only see issues in projects they belong to.
   */
  async listIssues(user, queryParams = {}) {
    const filter = {};

    // 1. Project Access Boundary
    if (user.role === ROLES.ADMIN) {
      if (queryParams.project) {
        filter.project = queryParams.project;
      }
    } else {
      const userProjects = await Project.find({ members: user.id }).select('_id');
      const userProjectIds = userProjects.map((p) => p._id);

      // Check specific project access FIRST to prevent IDOR leaks for 0-project users
      if (queryParams.project) {
        const hasAccess = userProjectIds.some(
          (id) => id.toString() === queryParams.project.toString()
        );
        if (!hasAccess) {
          throw new ForbiddenError('Forbidden: You do not have access to issues in this project');
        }
        filter.project = queryParams.project;
      } else {
        if (userProjectIds.length === 0) {
          return {
            data: [],
            page: 1,
            limit: Math.min(parseInt(queryParams.limit, 10) || 20, 100),
            total: 0,
            totalPages: 0,
          };
        }
        filter.project = { $in: userProjectIds };
      }
    }

    // 2. Exact Match Filters
    if (queryParams.status) {
      filter.status = queryParams.status;
    }
    if (queryParams.priority) {
      filter.priority = queryParams.priority;
    }
    if (queryParams.severity) {
      filter.severity = queryParams.severity;
    }
    if (queryParams.reporter) {
      filter.reporter = queryParams.reporter;
    }
    if (queryParams.assignee !== undefined) {
      if (queryParams.assignee === 'unassigned') {
        filter.assignee = null;
      } else if (queryParams.assignee) {
        filter.assignee = queryParams.assignee;
      }
    }

    // 3. Text Search (title & description)
    if (queryParams.search) {
      filter.$text = { $search: queryParams.search.trim() };
    }

    // 4. Sorting
    let sort = { createdAt: -1 };
    if (queryParams.sort) {
      const sortField = queryParams.sort;
      if (sortField.startsWith('-')) {
        sort = { [sortField.substring(1)]: -1 };
      } else {
        sort = { [sortField]: 1 };
      }
    }

    // 5. Pagination
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_ISSUE),
      Issue.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data: issues,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Get single issue details by ID. Verifies project authorization.
   */
  async getIssueById(issueId, user) {
    const issue = await Issue.findById(issueId).populate(POPULATE_ISSUE);

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    // Verify project authorization
    if (user.role !== ROLES.ADMIN) {
      if (!issue.project) {
        throw new NotFoundError('Project associated with this issue is unavailable or has been deleted');
      }
      const members = Array.isArray(issue.project.members) ? issue.project.members : [];
      const isMember = members.some(
        (m) => (m._id || m).toString() === user.id.toString()
      );
      if (!isMember) {
        throw new ForbiddenError('Forbidden: You do not have access to this issue');
      }
    }

    return issue;
  }

  /**
   * General issue patch (title, description, priority, severity).
   * Generates Activity audit log records for any mutated fields.
   */
  async updateIssue(issueId, updateData, user) {
    const issue = await this.getIssueById(issueId, user);
    const changes = [];
    let hasChanges = false;

    if (updateData.title !== undefined && updateData.title.trim() !== issue.title) {
      changes.push({ field: 'title', oldValue: issue.title, newValue: updateData.title.trim() });
      issue.title = updateData.title.trim();
      hasChanges = true;
    }
    if (updateData.description !== undefined && updateData.description.trim() !== issue.description) {
      // Deliberate design decision: description changes are NOT logged in Activity
      // timeline to avoid noisy, low-value diffing of long free-text bodies.
      issue.description = updateData.description.trim();
      hasChanges = true;
    }
    if (updateData.priority !== undefined && updateData.priority !== issue.priority) {
      changes.push({ field: 'priority', oldValue: issue.priority, newValue: updateData.priority });
      issue.priority = updateData.priority;
      hasChanges = true;
    }
    if (updateData.severity !== undefined && updateData.severity !== issue.severity) {
      changes.push({ field: 'severity', oldValue: issue.severity, newValue: updateData.severity });
      issue.severity = updateData.severity;
      hasChanges = true;
    }

    if (!hasChanges) {
      return issue;
    }

    await issue.save();

    // Batch create activity logs
    if (changes.length > 0) {
      await Promise.all(
        changes.map((change) =>
          Activity.create({
            issue: issue._id,
            actor: user.id,
            action: 'ISSUE_UPDATED',
            field: change.field,
            oldValue: change.oldValue ? change.oldValue.toString() : null,
            newValue: change.newValue ? change.newValue.toString() : null,
            createdAt: new Date(),
          })
        )
      );
    }

    return Issue.findById(issue._id).populate(POPULATE_ISSUE);
  }

  /**
   * Dedicated status transition endpoint.
   * Enforces State Machine workflow and role permissions.
   * Records Activity and dispatches in-app notifications.
   */
  async updateIssueStatus(issueId, newStatus, user) {
    const issue = await this.getIssueById(issueId, user);

    // Validate state transition through workflow engine
    const validation = workflowService.validateTransition(
      issue.status,
      newStatus,
      user.role
    );

    if (!validation.isValid) {
      const error = new BadRequestError(validation.message, [
        { field: 'status', message: validation.message },
      ]);
      error.legalStates = validation.legalStates;
      throw error;
    }

    const previousStatus = issue.status;
    issue.status = newStatus;
    await issue.save();

    // Create Activity audit log
    await Activity.create({
      issue: issue._id,
      actor: user.id,
      action: 'STATUS_UPDATED',
      field: 'status',
      oldValue: previousStatus,
      newValue: newStatus,
      createdAt: new Date(),
    });

    // Fire-and-forget notification dispatch
    notificationService.notifyStatusChange({
      issue,
      oldStatus: previousStatus,
      newStatus,
      actor: user,
    });

    return Issue.findById(issue._id).populate(POPULATE_ISSUE);
  }

  /**
   * Dedicated assignee update endpoint.
   * Validates project membership and creates an Activity record.
   */
  async updateIssueAssignee(issueId, newAssigneeId, user) {
    const issue = await this.getIssueById(issueId, user);

    let targetAssignee = null;
    if (newAssigneeId) {
      const project = await Project.findById(issue.project._id || issue.project);
      const isMember = project.members.some(
        (m) => m.toString() === newAssigneeId.toString()
      );
      if (!isMember) {
        throw new ValidationError('Assignee must be an active member of this project', [
          { field: 'assignee', message: 'Assignee must be an active member of this project' },
        ]);
      }
      const userDoc = await User.findById(newAssigneeId);
      if (!userDoc) {
        throw new ValidationError('Assignee user does not exist', [
          { field: 'assignee', message: 'Assignee user does not exist' },
        ]);
      }
      if (userDoc.isActive === false) {
        throw new ValidationError('Selected assignee is inactive and cannot be assigned to issues', [
          { field: 'assignee', message: 'Selected assignee is inactive and cannot be assigned to issues' },
        ]);
      }
      if (userDoc.role !== ROLES.DEVELOPER) {
        throw new ValidationError('Issues can only be assigned to Developers', [
          { field: 'assignee', message: 'Issues can only be assigned to Developers' },
        ]);
      }
      targetAssignee = userDoc._id;
    }

    const previousAssignee = issue.assignee ? issue.assignee._id || issue.assignee : null;
    issue.assignee = targetAssignee;
    await issue.save();

    // Create Activity audit log
    await Activity.create({
      issue: issue._id,
      actor: user.id,
      action: 'ASSIGNEE_UPDATED',
      field: 'assignee',
      oldValue: previousAssignee ? previousAssignee.toString() : null,
      newValue: targetAssignee ? targetAssignee.toString() : null,
      createdAt: new Date(),
    });

    // Fire-and-forget notification dispatch
    if (targetAssignee) {
      notificationService.notifyAssignment({
        issue,
        newAssigneeId: targetAssignee,
        actor: user,
      });
    }

    return Issue.findById(issue._id).populate(POPULATE_ISSUE);
  }

  /**
   * Retrieve audit activity history for an issue.
   */
  async getIssueActivities(issueId, user) {
    // Check access first
    await this.getIssueById(issueId, user);

    return Activity.find({ issue: issueId })
      .sort({ createdAt: -1 })
      .populate('actor', 'name email role');
  }

  /**
   * Delete an issue and cascade delete all its comments and activities.
   * Authorization: Admin or the issue Reporter can delete an issue.
   */
  async deleteIssue(issueId, user) {
    const issue = await this.getIssueById(issueId, user);

    const isAdmin = user.role === ROLES.ADMIN;
    const isReporter =
      issue.reporter &&
      (issue.reporter._id ? issue.reporter._id.toString() : issue.reporter.toString()) === user.id.toString();

    if (!isAdmin && !isReporter) {
      throw new ForbiddenError('Forbidden: Only an Admin or the issue Reporter can delete this issue');
    }

    // Cascade delete comments and activities
    await Comment.deleteMany({ issue: issueId });
    await Activity.deleteMany({ issue: issueId });

    await Issue.findByIdAndDelete(issueId);

    return {
      deletedIssueId: issueId,
    };
  }
}

export const issueService = new IssueService();
export default issueService;
