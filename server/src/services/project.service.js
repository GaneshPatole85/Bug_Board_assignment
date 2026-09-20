import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { Issue } from '../models/Issue.js';
import { Comment } from '../models/Comment.js';
import { Activity } from '../models/Activity.js';
import { ROLES } from '../constants/roles.js';

class ProjectService {
  /**
   * Create a new project (Admin only).
   * Automatically adds the creating Admin to members if not present.
   * Validates duplicate keys cleanly with 409 Conflict.
   */
  async createProject(projectData, user) {
    const key = projectData.key.toUpperCase().trim();

    // Enforce unique key check with clean 409 Conflict
    const existing = await Project.findOne({ key });
    if (existing) {
      const error = new Error(`Project key "${key}" is already in use.`);
      error.statusCode = 409;
      throw error;
    }

    // Auto-add creating admin to members array
    const memberSet = new Set((projectData.members || []).map((id) => id.toString()));
    memberSet.add(user.id.toString());
    const memberIds = Array.from(memberSet);

    // Validate that all specified member IDs correspond to active users in DB
    const existingUsers = await User.find({ _id: { $in: memberIds } }).select('_id');
    if (existingUsers.length !== memberIds.length) {
      const error = new Error('One or more specified member user IDs do not exist.');
      error.statusCode = 422;
      throw error;
    }

    const project = await Project.create({
      name: projectData.name.trim(),
      key,
      description: projectData.description ? projectData.description.trim() : '',
      members: memberIds,
    });

    const populated = await Project.findById(project._id).populate('members', 'name email role');
    const projectObj = populated.toObject();
    projectObj.issueCount = 0;
    projectObj.memberCount = populated.members.length;
    return projectObj;
  }

  /**
   * List projects accessible to the current user.
   * Admin sees all projects; Developers/Testers only see projects where they are members.
   * Enriched with calculated issueCount and memberCount.
   */
  async listProjects(user) {
    const query = user.role === ROLES.ADMIN ? {} : { members: user.id };

    const projects = await Project.find(query)
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    if (projects.length === 0) {
      return [];
    }

    const projectIds = projects.map((p) => p._id);
    const issueCounts = await Issue.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]);

    const countMap = issueCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    return projects.map((p) => {
      const pObj = p.toObject();
      pObj.issueCount = countMap[p._id.toString()] || 0;
      pObj.memberCount = Array.isArray(p.members) ? p.members.length : 0;
      return pObj;
    });
  }

  /**
   * Get a single project by ID. Requires Admin or member access.
   */
  async getProjectById(projectId, user) {
    const project = await Project.findById(projectId).populate('members', 'name email role');
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Access authorization check
    if (user.role !== ROLES.ADMIN) {
      const userIdStr = user.id.toString();
      const isMember = project.members.some((m) => m._id.toString() === userIdStr);
      if (!isMember) {
        const error = new Error('Forbidden: You do not have access to this project');
        error.statusCode = 403;
        throw error;
      }
    }

    const issueCount = await Issue.countDocuments({ project: project._id });
    const projectObj = project.toObject();
    projectObj.issueCount = issueCount;
    projectObj.memberCount = project.members.length;
    return projectObj;
  }

  /**
   * Update an existing project (Admin only).
   * Can update name, description, and members array.
   */
  async updateProject(projectId, updateData, user) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (updateData.name) {
      project.name = updateData.name.trim();
    }
    if (updateData.description !== undefined) {
      project.description = updateData.description.trim();
    }
    if (updateData.members) {
      if (updateData.members.length === 0) {
        const error = new Error('Project must have at least one member.');
        error.statusCode = 422;
        throw error;
      }

      // Ensure updating Admin remains in members list to prevent accidental lockout
      const memberSet = new Set(updateData.members.map((id) => id.toString()));
      if (user && user.id) {
        memberSet.add(user.id.toString());
      }
      const memberIds = Array.from(memberSet);

      // Validate all provided member IDs exist in DB
      const existingUsers = await User.find({ _id: { $in: memberIds } }).select('_id');
      if (existingUsers.length !== memberIds.length) {
        const error = new Error('One or more specified member user IDs do not exist.');
        error.statusCode = 422;
        throw error;
      }

      // Referential integrity: clean up dangling assignees for removed members
      const danglingIssues = await Issue.find({
        project: project._id,
        assignee: { $nin: memberIds, $ne: null },
      });

      if (danglingIssues.length > 0) {
        await Issue.updateMany(
          { project: project._id, assignee: { $nin: memberIds } },
          { $set: { assignee: null } }
        );

        // Record audit activity for each unassigned issue
        await Promise.all(
          danglingIssues.map((iss) =>
            Activity.create({
              issue: iss._id,
              actor: user.id,
              action: 'ASSIGNEE_UPDATED',
              field: 'assignee',
              oldValue: iss.assignee ? iss.assignee.toString() : null,
              newValue: null,
              createdAt: new Date(),
            })
          )
        );
      }

      project.members = memberIds;
    }

    await project.save();
    const updated = await Project.findById(project._id).populate('members', 'name email role');
    const issueCount = await Issue.countDocuments({ project: project._id });
    const projectObj = updated.toObject();
    projectObj.issueCount = issueCount;
    projectObj.memberCount = updated.members.length;
    return projectObj;
  }

  /**
   * Delete a project and cascade delete all its issues, comments, and activities (Admin only).
   */
  async deleteProject(projectId, user) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Find all issues under this project
    const issues = await Issue.find({ project: projectId }).select('_id');
    const issueIds = issues.map((i) => i._id);

    if (issueIds.length > 0) {
      await Comment.deleteMany({ issue: { $in: issueIds } });
      await Activity.deleteMany({ issue: { $in: issueIds } });
      await Issue.deleteMany({ project: projectId });
    }

    await Project.findByIdAndDelete(projectId);

    return {
      deletedProjectId: projectId,
      deletedIssuesCount: issueIds.length,
    };
  }
}

export const projectService = new ProjectService();
export default projectService;
