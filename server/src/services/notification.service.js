import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { NotFoundError } from '../utils/errors.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

class NotificationService {
  constructor() {
    this._transporter = null;
  }

  /**
   * Lazily initialize nodemailer SMTP transporter
   * @private
   */
  _getTransporter() {
    if (!this._transporter) {
      const host = process.env.SMTP_HOST || 'localhost';
      const port = parseInt(process.env.SMTP_PORT || '1025', 10);
      const user = process.env.SMTP_USER || '';
      const pass = process.env.SMTP_PASS || '';

      const options = {
        host,
        port,
        secure: port === 465,
        ignoreTLS: true,
      };

      if (user && pass) {
        options.auth = { user, pass };
      }

      this._transporter = nodemailer.createTransport(options);
    }
    return this._transporter;
  }

  /**
   * Fire-and-forget asynchronous email dispatch.
   * NEVER throws an error into the parent HTTP request path.
   * @private
   */
  async _sendEmailSafe({ to, subject, text, html }) {
    try {
      if (!to) return;
      const transporter = this._getTransporter();
      const from = process.env.SMTP_FROM || 'no-reply@bugboard.test';

      await transporter.sendMail({
        from: `"BugBoard" <${from}>`,
        to,
        subject,
        text,
        html: html || `<p>${text}</p>`,
      });
      logger.info({ to, subject }, 'Notification email dispatched successfully');
    } catch (err) {
      // Fire-and-forget: Log failure, never throw
      logger.warn({ err: err.message, to, subject }, 'Failed to dispatch notification email (continuing)');
    }
  }

  /**
   * Notify user when an issue is assigned to them
   */
  async notifyAssignment({ issue, newAssigneeId, actor }) {
    try {
      if (!newAssigneeId) return;

      const newAssigneeStr = newAssigneeId.toString();
      const actorIdStr = actor?.id ? actor.id.toString() : actor?._id ? actor._id.toString() : '';

      // Do not notify if self-assigned
      if (newAssigneeStr === actorIdStr) return;

      const recipient = await User.findById(newAssigneeId).select('name email');
      if (!recipient) return;

      const actorName = actor?.name || 'A team member';
      const title = `Assigned to you: ${issue.title}`;
      const message = `${actorName} assigned you to issue "${issue.title}".`;

      // 1. Create In-App Notification
      await Notification.create({
        recipient: recipient._id,
        type: 'ASSIGNMENT',
        issue: issue._id,
        actor: actor?.id || actor?._id,
        title,
        message,
      });

      // 2. Fire-and-forget Email
      this._sendEmailSafe({
        to: recipient.email,
        subject: `[BugBoard] ${title}`,
        text: `${message}\n\nPriority: ${issue.priority || 'N/A'}\nSeverity: ${issue.severity || 'N/A'}\nStatus: ${issue.status || 'Open'}`,
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to record assignment notification');
    }
  }

  /**
   * Notify relevant stakeholders when an issue status changes
   */
  async notifyStatusChange({ issue, oldStatus, newStatus, actor }) {
    try {
      const actorIdStr = actor?.id ? actor.id.toString() : actor?._id ? actor._id.toString() : '';
      const actorName = actor?.name || 'A team member';

      // Stakeholders: Assignee and Reporter (excluding the person who made the change)
      const recipientIds = new Set();
      if (issue.assignee) {
        const aId = issue.assignee._id ? issue.assignee._id.toString() : issue.assignee.toString();
        if (aId !== actorIdStr) recipientIds.add(aId);
      }
      if (issue.reporter) {
        const rId = issue.reporter._id ? issue.reporter._id.toString() : issue.reporter.toString();
        if (rId !== actorIdStr) recipientIds.add(rId);
      }

      if (recipientIds.size === 0) return;

      const recipients = await User.find({ _id: { $in: Array.from(recipientIds) } }).select('name email');
      const title = `Status changed to ${newStatus}: ${issue.title}`;
      const message = `${actorName} transitioned "${issue.title}" from ${oldStatus} to ${newStatus}.`;

      for (const recipient of recipients) {
        // 1. In-App Notification
        await Notification.create({
          recipient: recipient._id,
          type: 'STATUS_CHANGE',
          issue: issue._id,
          actor: actor?.id || actor?._id,
          title,
          message,
        });

        // 2. Fire-and-forget Email
        this._sendEmailSafe({
          to: recipient.email,
          subject: `[BugBoard] ${title}`,
          text: `${message}\n\nCurrent Status: ${newStatus}`,
        });
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to record status change notification');
    }
  }

  /**
   * List paginated notifications for the authenticated user
   */
  async listUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const query = { recipient: userId };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('actor', '_id name email role')
        .populate({
          path: 'issue',
          select: '_id title status priority severity project',
          populate: { path: 'project', select: '_id key name' },
        }),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return {
      data: notifications,
      unreadCount,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 0,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    return notification;
  }

  /**
   * Mark all notifications for the authenticated user as read
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    return { success: true, message: 'All notifications marked as read' };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
