import mongoose from 'mongoose';
import { Issue } from '../models/Issue.js';
import { Project } from '../models/Project.js';
import { Activity } from '../models/Activity.js';
import { ROLES } from '../constants/roles.js';

class DashboardService {
  /**
   * Aggregate high-performance dashboard metrics scoped to projects the user has access to.
   * Single-roundtrip aggregation for counters and personal queue.
   */
  async getDashboardMetrics(user) {
    const userObjectId = new mongoose.Types.ObjectId(user.id);

    // 1. Identify accessible projects
    let projectFilter = {};
    if (user.role !== ROLES.ADMIN) {
      const userProjects = await Project.find({ members: userObjectId }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      projectFilter = { project: { $in: projectIds } };
    }

    // 2. High-performance aggregation pipeline via $facet
    const [stats] = await Issue.aggregate([
      { $match: projectFilter },
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } },
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
          ],
          assignedToMe: [
            { $match: { assignee: userObjectId } },
            { $sort: { createdAt: -1 } },
            { $limit: 6 },
            {
              $lookup: {
                from: 'projects',
                localField: 'project',
                foreignField: '_id',
                as: 'projectData',
              },
            },
            { $unwind: { path: '$projectData', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                priority: 1,
                severity: 1,
                createdAt: 1,
                'project._id': '$projectData._id',
                'project.key': '$projectData.key',
                'project.name': '$projectData.name',
              },
            },
          ],
          assignedToMeCount: [
            { $match: { assignee: userObjectId } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const totalIssues = stats?.totalCount?.[0]?.total || 0;
    const assignedCount = stats?.assignedToMeCount?.[0]?.count || 0;

    const byStatus = (stats?.byStatus || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {
      Open: 0,
      'In Progress': 0,
      Testing: 0,
      Resolved: 0,
      Closed: 0,
    });

    const bySeverity = (stats?.bySeverity || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    });

    const byPriority = (stats?.byPriority || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0,
    });

    // 3. Fetch recent activities for accessible issues
    let recentActivities = [];
    try {
      let activityMatch = {};
      if (user.role !== ROLES.ADMIN) {
        const accessibleIssues = await Issue.find(projectFilter).select('_id');
        const issueIds = accessibleIssues.map((i) => i._id);
        activityMatch = { issue: { $in: issueIds } };
      }

      recentActivities = await Activity.find(activityMatch)
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('actor', 'name email role')
        .populate({
          path: 'issue',
          select: 'title project',
          populate: { path: 'project', select: 'key name' },
        });
    } catch {
      recentActivities = [];
    }

    return {
      totalIssues,
      assignedCount,
      byStatus,
      bySeverity,
      byPriority,
      assignedToMe: stats?.assignedToMe || [],
      recentActivities,
    };
  }

  /**
   * Phase 4 Dashboard Summary:
   * Single-roundtrip database-side aggregation via $match on accessible projects,
   * then $facet computing totals and top 5 assigned issues (sorted by priority desc, createdAt desc).
   */
  async getDashboardSummary(user) {
    const userObjectId = new mongoose.Types.ObjectId(user.id);

    // 1. Identify accessible projects (Decision #5: scope respects project visibility)
    let projectFilter = {};
    if (user.role !== ROLES.ADMIN) {
      const userProjects = await Project.find({ members: userObjectId }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      projectFilter = { project: { $in: projectIds } };
    }

    // 2. High-performance single aggregation pipeline using $facet
    const [result] = await Issue.aggregate([
      { $match: projectFilter },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                open: {
                  $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] },
                },
                inProgress: {
                  $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                },
                critical: {
                  $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] },
                },
                resolved: {
                  $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
                },
              },
            },
          ],
          assignedToMe: [
            { $match: { assignee: userObjectId } },
            {
              $addFields: {
                priorityOrder: {
                  $switch: {
                    branches: [
                      { case: { $eq: ['$priority', 'Urgent'] }, then: 4 },
                      { case: { $eq: ['$priority', 'High'] }, then: 3 },
                      { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
                      { case: { $eq: ['$priority', 'Low'] }, then: 1 },
                    ],
                    default: 0,
                  },
                },
              },
            },
            { $sort: { priorityOrder: -1, createdAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'projects',
                localField: 'project',
                foreignField: '_id',
                as: 'projectData',
              },
            },
            { $unwind: { path: '$projectData', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'users',
                localField: 'assignee',
                foreignField: '_id',
                as: 'assigneeData',
              },
            },
            { $unwind: { path: '$assigneeData', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'users',
                localField: 'reporter',
                foreignField: '_id',
                as: 'reporterData',
              },
            },
            { $unwind: { path: '$reporterData', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                title: 1,
                status: 1,
                priority: 1,
                severity: 1,
                createdAt: 1,
                updatedAt: 1,
                'project._id': '$projectData._id',
                'project.key': '$projectData.key',
                'project.name': '$projectData.name',
                'assignee._id': '$assigneeData._id',
                'assignee.name': '$assigneeData.name',
                'assignee.email': '$assigneeData.email',
                'assignee.role': '$assigneeData.role',
                'reporter._id': '$reporterData._id',
                'reporter.name': '$reporterData.name',
                'reporter.email': '$reporterData.email',
                'reporter.role': '$reporterData.role',
              },
            },
          ],
        },
      },
    ]);

    const totalsData = result?.totals?.[0] || {
      total: 0,
      open: 0,
      inProgress: 0,
      critical: 0,
      resolved: 0,
    };

    return {
      totals: {
        total: totalsData.total || 0,
        open: totalsData.open || 0,
        inProgress: totalsData.inProgress || 0,
        critical: totalsData.critical || 0,
        resolved: totalsData.resolved || 0,
      },
      assignedToMe: result?.assignedToMe || [],
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
