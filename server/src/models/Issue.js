import mongoose from 'mongoose';
import {
  ISSUE_SEVERITY,
  ISSUE_SEVERITY_LIST,
  ISSUE_PRIORITY,
  ISSUE_PRIORITY_LIST,
  ISSUE_STATUS,
  ISSUE_STATUS_LIST,
} from '../constants/issueWorkflow.js';

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    severity: {
      type: String,
      required: [true, 'Severity is required'],
      enum: {
        values: ISSUE_SEVERITY_LIST,
        message: 'Severity "{VALUE}" is invalid. Must be Low, Medium, High, or Critical',
      },
      default: ISSUE_SEVERITY.MEDIUM,
      index: true,
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: ISSUE_PRIORITY_LIST,
        message: 'Priority "{VALUE}" is invalid. Must be Low, Medium, High, or Urgent',
      },
      default: ISSUE_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ISSUE_STATUS_LIST,
        message: 'Status "{VALUE}" is invalid. Must be Open, In Progress, Testing, Resolved, or Closed',
      },
      default: ISSUE_STATUS.OPEN,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Explicit index on createdAt for sorting and timeline queries (as justified by filter requirements)
issueSchema.index({ createdAt: -1 });

export const Issue = mongoose.model('Issue', issueSchema);
