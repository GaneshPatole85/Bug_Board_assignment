import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['ASSIGNMENT', 'STATUS_CHANGE', 'USER_REGISTERED'],
      required: [true, 'Notification type is required'],
    },
    issue: {
      type: Schema.Types.ObjectId,
      ref: 'Issue',
      required: false,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor who triggered the notification is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for fast queries: user unread notifications sorted newest first
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
