import { issueService } from '../services/issue.service.js';

export const createIssue = async (req, res, next) => {
  try {
    const issue = await issueService.createIssue(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

export const listIssues = async (req, res, next) => {
  try {
    const result = await issueService.listIssues(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getIssueById = async (req, res, next) => {
  try {
    const issue = await issueService.getIssueById(req.params.issueId, req.user);
    res.status(200).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (req, res, next) => {
  try {
    const issue = await issueService.updateIssue(req.params.issueId, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Issue updated successfully',
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

export const updateIssueStatus = async (req, res, next) => {
  try {
    const issue = await issueService.updateIssueStatus(
      req.params.issueId,
      req.body.status,
      req.user
    );
    res.status(200).json({
      success: true,
      message: `Status updated to ${issue.status}`,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

export const updateIssueAssignee = async (req, res, next) => {
  try {
    const issue = await issueService.updateIssueAssignee(
      req.params.issueId,
      req.body.assignee,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Assignee updated successfully',
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

export const getIssueActivities = async (req, res, next) => {
  try {
    const activities = await issueService.getIssueActivities(req.params.issueId, req.user);
    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};
