import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Issue reference is required'],
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor reference is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [50, 'Action cannot exceed 50 characters'],
    },
    field: {
      type: String,
      required: [true, 'Modified field name is required'],
      trim: true,
      maxlength: [50, 'Field name cannot exceed 50 characters'],
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false, // Explicitly using immutable createdAt
  }
);

export const Activity = mongoose.model('Activity', activitySchema);
