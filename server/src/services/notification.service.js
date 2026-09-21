import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { NotFoundError } from '../utils/errors.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
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

      const isSecure = port === 465;
      const options = {
        host,
        port,
        secure: isSecure,
      };

      if (user && pass) {
        options.auth = { user, pass };
      } else if (host === 'localhost' || host === '127.0.0.1' || host === 'mailpit') {
        options.ignoreTLS = true;
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
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@bugboard.test';

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
   * Notify newly registered user and system administrator upon account registration
   */
  async notifyRegistration({ user }) {
    try {
      if (!user || !user.email) return;

      const role = user.role || 'Member';
      const empId = user.employeeId || 'Pending';
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const loginUrl = `${clientUrl}/login`;

      // 1. Welcome email to the newly registered user
      const welcomeSubject = `Welcome to BugBoard, ${user.name}!`;
      const welcomeText = `Hello ${user.name},\n\nYour BugBoard account has been successfully created.\n\nAccount Details:\n- Name: ${user.name}\n- Email: ${user.email}\n- Role: ${role}\n- Employee ID: ${empId}\n\nYou can sign in at: ${loginUrl}\n\nBest regards,\nThe BugBoard Team`;
      const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Welcome to BugBoard!</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your BugBoard account has been successfully registered. You can now log in and collaborate on tracked issues.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Employee ID:</strong> <span style="font-family: monospace; color: #4f46e5;">${empId}</span></p>
            <p style="margin: 4px 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 4px 0;"><strong>Registered Email:</strong> ${user.email}</p>
          </div>
          <p>
            <a href="${loginUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Sign In to BugBoard
            </a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">If you did not register for BugBoard, please contact your administrator.</p>
        </div>
      `;

      await this._sendEmailSafe({
        to: user.email,
        subject: welcomeSubject,
        text: welcomeText,
        html: welcomeHtml,
      });

      // 2. Alert email to Administrators
      const adminUsers = await User.find({ role: ROLES.ADMIN, isActive: true }).select('name email _id');
      const adminEmailFromEnv = process.env.ADMIN_EMAIL;

      const adminEmails = new Set(adminUsers.map((a) => a.email).filter(Boolean));
      if (adminEmailFromEnv) adminEmails.add(adminEmailFromEnv.toLowerCase().trim());

      const adminSubject = `[BugBoard] New User Registered: ${user.name} (${role})`;
      const adminText = `A new user has registered on BugBoard:\n\n- Name: ${user.name}\n- Email: ${user.email}\n- Role: ${role}\n- Employee ID: ${empId}\n- Registered At: ${new Date().toISOString()}`;
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="color: #0f172a; margin-top: 0;">New User Registration Alert</h3>
          <p>A new user has registered on BugBoard:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 4px 0;"><strong>Name:</strong> ${user.name}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 4px 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 4px 0;"><strong>Employee ID:</strong> <span style="font-family: monospace;">${empId}</span></p>
          </div>
          <p style="font-size: 13px; color: #64748b;">You can review team members and assignments from the Team Management console.</p>
        </div>
      `;

      for (const to of adminEmails) {
        if (to !== user.email) {
          await this._sendEmailSafe({
            to,
            subject: adminSubject,
            text: adminText,
            html: adminHtml,
          });
        }
      }

      // 3. In-App Notification for active Admin users
      for (const admin of adminUsers) {
        await Notification.create({
          recipient: admin._id,
          type: 'USER_REGISTERED',
          actor: user._id || user.id,
          title: `New user registration: ${user.name}`,
          message: `${user.name} (${user.email}) registered as ${role} [${empId}].`,
        });
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to record registration notification');
    }
  }

  /**
   * Send password reset link to user.
   * Fire-and-forget: does not throw if email delivery fails.
   */
  async sendPasswordResetEmail({ user, token }) {
    try {
      if (!user || !user.email || !token) return;

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const subject = '[BugBoard] Password Reset Request';
      const text = `Hello ${user.name},\n\nYou requested a password reset for your BugBoard account.\n\nPlease use the following link to reset your password:\n${resetUrl}\n\nThis link is valid for 30 minutes and can only be used once.\n\nIf you did not request this password reset, please ignore this email or contact your administrator if you suspect unauthorized activity.\n\nBest regards,\nThe BugBoard Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your BugBoard account password.</p>
          <div style="margin: 25px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #0f766e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #475569;">
            Or copy and paste this link into your browser:<br />
            <a href="${resetUrl}" style="color: #0f766e; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            <strong>Important:</strong> This reset link is valid for <strong>30 minutes</strong> and can only be used once.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `;

      await this._sendEmailSafe({
        to: user.email,
        subject,
        text,
        html,
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to dispatch password reset email');
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
