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
}

export const dashboardService = new DashboardService();
export default dashboardService;
