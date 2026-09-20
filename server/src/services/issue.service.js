import { Issue } from '../models/Issue.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { ROLES } from '../constants/roles.js';
import { workflowService } from './workflow.service.js';

class IssueService {
  /**
   * Create a new issue.
   * - Validates target project exists and user is an authorized member (or Admin).
   * - Forces reporter to req.user.id server-side (Decision #1).
   * - Validates assignee is an active project member (Decision #2).
   */
  async createIssue(issueData, user) {
    const project = await Project.findById(issueData.project);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Requester must be Admin or a member of the project
    if (user.role !== ROLES.ADMIN) {
      const isMember = project.members.some((m) => m.toString() === user.id.toString());
      if (!isMember) {
        const error = new Error('Forbidden: You are not an authorized member of this project');
        error.statusCode = 403;
        throw error;
      }
    }

    // Assignee validation
    let assigneeId = null;
    if (issueData.assignee) {
      const isAssigneeMember = project.members.some(
        (m) => m.toString() === issueData.assignee.toString()
      );
      if (!isAssigneeMember) {
        const error = new Error('Assignee must be an active member of this project');
        error.statusCode = 422;
        throw error;
      }
      const assigneeExists = await User.exists({ _id: issueData.assignee });
      if (!assigneeExists) {
        const error = new Error('Assignee user does not exist');
        error.statusCode = 422;
        throw error;
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

    return Issue.findById(issue._id)
      .populate('project', 'name key')
      .populate('reporter', 'name email role')
      .populate('assignee', 'name email role');
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

      if (userProjectIds.length === 0) {
        return {
          data: [],
          page: 1,
          limit: Math.min(parseInt(queryParams.limit, 10) || 20, 100),
          total: 0,
          totalPages: 0,
        };
      }

      if (queryParams.project) {
        const hasAccess = userProjectIds.some(
          (id) => id.toString() === queryParams.project.toString()
        );
        if (!hasAccess) {
          const error = new Error('Forbidden: You do not have access to issues in this project');
          error.statusCode = 403;
          throw error;
        }
        filter.project = queryParams.project;
      } else {
        filter.project = { $in: userProjectIds };
      }
    }

    // 2. Query Filters
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
    if (queryParams.assignee) {
      if (queryParams.assignee === 'unassigned') {
        filter.assignee = null;
      } else {
        filter.assignee = queryParams.assignee;
      }
    }

    // 3. Full-text search on title and description
    if (queryParams.search && queryParams.search.trim()) {
      filter.$text = { $search: queryParams.search.trim() };
    }

    // 4. Pagination & Sorting
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = queryParams.sort || '-createdAt';

    const [total, issues] = await Promise.all([
      Issue.countDocuments(filter),
      Issue.find(filter)
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .populate('project', 'name key')
        .populate('reporter', 'name email role')
        .populate('assignee', 'name email role'),
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
    const issue = await Issue.findById(issueId)
      .populate('project', 'name key members')
      .populate('reporter', 'name email role')
      .populate('assignee', 'name email role');

    if (!issue) {
      const error = new Error('Issue not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify project authorization
    if (user.role !== ROLES.ADMIN) {
      const isMember = issue.project.members.some(
        (m) => m.toString() === user.id.toString()
      );
      if (!isMember) {
        const error = new Error('Forbidden: You do not have access to this issue');
        error.statusCode = 403;
        throw error;
      }
    }

    return issue;
  }

  /**
   * General issue patch (title, description, priority, severity).
   */
  async updateIssue(issueId, updateData, user) {
    const issue = await this.getIssueById(issueId, user);

    if (updateData.title !== undefined) {
      issue.title = updateData.title.trim();
    }
    if (updateData.description !== undefined) {
      issue.description = updateData.description.trim();
    }
    if (updateData.priority !== undefined) {
      issue.priority = updateData.priority;
    }
    if (updateData.severity !== undefined) {
      issue.severity = updateData.severity;
    }

    await issue.save();

    return Issue.findById(issue._id)
      .populate('project', 'name key')
      .populate('reporter', 'name email role')
      .populate('assignee', 'name email role');
  }

  /**
   * Dedicated status transition endpoint.
   * Runs the centralized state machine, validates role permissions, and creates an Activity record.
   */
  async updateIssueStatus(issueId, newStatus, user) {
    const issue = await this.getIssueById(issueId, user);

    const validation = workflowService.validateStatusTransition(
      issue.status,
      newStatus,
      user.role
    );

    if (!validation.isValid) {
      const error = new Error(validation.message);
      error.statusCode = 400;
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

    return Issue.findById(issue._id)
      .populate('project', 'name key')
      .populate('reporter', 'name email role')
      .populate('assignee', 'name email role');
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
        const error = new Error('Assignee must be an active member of this project');
        error.statusCode = 422;
        throw error;
      }
      const userDoc = await User.findById(newAssigneeId);
      if (!userDoc) {
        const error = new Error('Assignee user does not exist');
        error.statusCode = 422;
        throw error;
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

    return Issue.findById(issue._id)
      .populate('project', 'name key')
      .populate('reporter', 'name email role')
      .populate('assignee', 'name email role');
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
}

export const issueService = new IssueService();
export default issueService;
