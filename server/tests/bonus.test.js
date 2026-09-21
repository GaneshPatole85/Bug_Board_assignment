import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { Issue } from '../src/models/Issue.js';
import { Notification } from '../src/models/Notification.js';
import { Attachment } from '../src/models/Attachment.js';
import { signToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';
import { ISSUE_STATUS, ISSUE_PRIORITY, ISSUE_SEVERITY } from '../src/constants/issueWorkflow.js';

let mongoServer;
let adminUser, devUser, testerUser, outsiderUser;
let adminToken, devToken, testerToken, outsiderToken;
let projectA, projectB;
let issueA;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  adminUser = await User.create({
    name: 'Admin Boss',
    email: 'admin@bonus.test',
    passwordHash: 'Password123!',
    role: ROLES.ADMIN,
  });
  adminToken = signToken(adminUser);

  devUser = await User.create({
    name: 'Dev Lead',
    email: 'dev@bonus.test',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  devToken = signToken(devUser);

  testerUser = await User.create({
    name: 'QA Tester',
    email: 'tester@bonus.test',
    passwordHash: 'Password123!',
    role: ROLES.TESTER,
  });
  testerToken = signToken(testerUser);

  outsiderUser = await User.create({
    name: 'Outsider User',
    email: 'outsider@bonus.test',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  outsiderToken = signToken(outsiderUser);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Notification.deleteMany({});
  await Attachment.deleteMany({});
  await Issue.deleteMany({});
  await Project.deleteMany({});

  projectA = await Project.create({
    name: 'Alpha Project',
    key: 'ALP',
    description: 'Alpha codebase',
    members: [adminUser._id, devUser._id, testerUser._id],
  });

  projectB = await Project.create({
    name: 'Beta Project',
    key: 'BET',
    description: 'Beta codebase',
    members: [adminUser._id, outsiderUser._id],
  });

  issueA = await Issue.create({
    title: 'Null pointer exception in parser',
    description: 'Parser crashes when input contains null byte',
    project: projectA._id,
    reporter: testerUser._id,
    assignee: devUser._id,
    status: ISSUE_STATUS.OPEN,
    priority: ISSUE_PRIORITY.HIGH,
    severity: ISSUE_SEVERITY.HIGH,
  });
});

describe('Bonus Features: Kanban, Notifications, and Attachments', () => {
  describe('1. Kanban Board & Status Workflow Transitions', () => {
    test('Legal transition (Open -> In Progress) succeeds and updates status', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issueA._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ISSUE_STATUS.IN_PROGRESS);

      const updated = await Issue.findById(issueA._id);
      expect(updated.status).toBe(ISSUE_STATUS.IN_PROGRESS);
    });

    test('Illegal transition (Open -> Closed) is rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issueA._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.CLOSED });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const unchanged = await Issue.findById(issueA._id);
      expect(unchanged.status).toBe(ISSUE_STATUS.OPEN);
    });
  });

  describe('2. In-App & Email Notifications', () => {
    test('Status change creates an in-app notification for the assignee', async () => {
      // Tom Tester moves Open -> In Progress (or Developer moves Open -> In Progress)
      // Dev moves it, so testerUser (reporter) should receive a notification
      const res = await request(app)
        .patch(`/api/v1/issues/${issueA._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      expect(res.status).toBe(200);

      // Wait a moment for fire-and-forget notification creation
      await new Promise((r) => setTimeout(r, 100));

      const notif = await Notification.findOne({ recipient: testerUser._id });
      expect(notif).toBeDefined();
      expect(notif.type).toBe('STATUS_CHANGE');
      expect(notif.title).toContain('Status changed to In Progress');
      expect(notif.read).toBe(false);
    });

    test('Assignee update creates in-app notification for new assignee', async () => {
      // Admin reassigns issue to Dev Lead
      await request(app)
        .patch(`/api/v1/issues/${issueA._id}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee: devUser._id.toString() });

      await new Promise((r) => setTimeout(r, 100));

      const notif = await Notification.findOne({ recipient: devUser._id, type: 'ASSIGNMENT' });
      expect(notif).toBeDefined();
      expect(notif.title).toContain('Assigned to you');
    });

    test('GET /api/v1/notifications lists notifications for authenticated user with unread count', async () => {
      await Notification.create({
        recipient: devUser._id,
        type: 'ASSIGNMENT',
        issue: issueA._id,
        actor: adminUser._id,
        title: 'Assigned to you: Test Issue',
        message: 'Admin assigned this to you',
        read: false,
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.unreadCount).toBe(1);
    });

    test('PATCH /api/v1/notifications/:id/read marks notification as read', async () => {
      const notif = await Notification.create({
        recipient: devUser._id,
        type: 'ASSIGNMENT',
        issue: issueA._id,
        actor: adminUser._id,
        title: 'Assigned to you: Test Issue',
        message: 'Admin assigned this to you',
        read: false,
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.read).toBe(true);

      const updated = await Notification.findById(notif._id);
      expect(updated.read).toBe(true);
    });

    test('PATCH /api/v1/notifications/read-all marks all user notifications as read', async () => {
      await Notification.create([
        {
          recipient: devUser._id,
          type: 'ASSIGNMENT',
          issue: issueA._id,
          actor: adminUser._id,
          title: 'Notif 1',
          message: 'Msg 1',
          read: false,
        },
        {
          recipient: devUser._id,
          type: 'STATUS_CHANGE',
          issue: issueA._id,
          actor: adminUser._id,
          title: 'Notif 2',
          message: 'Msg 2',
          read: false,
        },
      ]);

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const unread = await Notification.countDocuments({ recipient: devUser._id, read: false });
      expect(unread).toBe(0);
    });
  });

  describe('3. Screenshot & File Attachments', () => {
    test('Uploading valid image attachment succeeds and populates uploader', async () => {
      const pngBuffer = Buffer.from('fake-png-image-binary-data');

      const res = await request(app)
        .post(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${devToken}`)
        .attach('file', pngBuffer, 'screenshot.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalFilename).toBe('screenshot.png');
      expect(res.body.data.mimeType).toBe('image/png');
      expect(res.body.data.storageKey).toBeDefined();
      expect(res.body.data.storageKey).not.toBe('screenshot.png'); // UUID key, not user input!
      expect(res.body.data.uploader.name).toBe('Dev Lead');

      const saved = await Attachment.findById(res.body.data._id);
      expect(saved).toBeDefined();
      expect(saved.size).toBe(pngBuffer.length);
    });

    test('Uploading disallowed MIME type (e.g. .exe / executable) is rejected with 422', async () => {
      const exeBuffer = Buffer.from('MZ-fake-binary-executable');

      const res = await request(app)
        .post(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${devToken}`)
        .attach('file', exeBuffer, { filename: 'malicious.exe', contentType: 'application/x-msdownload' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Disallowed file type/i);
    });

    test('Non-member receives 403 Forbidden when attempting to upload attachment to foreign project', async () => {
      const pngBuffer = Buffer.from('fake-png-data');

      // outsiderUser is not a member of Project A
      const res = await request(app)
        .post(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .attach('file', pngBuffer, 'screenshot.png');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Listing attachments returns all attachments for an issue', async () => {
      await Attachment.create({
        issue: issueA._id,
        uploader: devUser._id,
        originalFilename: 'stacktrace.log',
        storageKey: 'unique-key-1.log',
        mimeType: 'text/plain',
        size: 512,
      });

      const res = await request(app)
        .get(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].originalFilename).toBe('stacktrace.log');
    });

    test('Downloading attachment by authorized user returns file buffer with correct headers', async () => {
      const pngBuffer = Buffer.from('sample-png-content-for-download');

      // Upload first
      const uploadRes = await request(app)
        .post(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${devToken}`)
        .attach('file', pngBuffer, 'error-diagram.png');

      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.data._id;

      // Download
      const downloadRes = await request(app)
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${testerToken}`); // testerUser is a member of Project A

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('image/png');
      expect(downloadRes.headers['content-disposition']).toContain('error-diagram.png');
      expect(downloadRes.body.toString()).toBe('sample-png-content-for-download');
    });

    test('Downloading attachment via query param token (?token=...) succeeds for authorized user', async () => {
      const pngBuffer = Buffer.from('query-token-test-content');

      const uploadRes = await request(app)
        .post(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${devToken}`)
        .attach('file', pngBuffer, 'query-diagram.png');

      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.data._id;

      // Download using ?token= query parameter without Authorization header
      const downloadRes = await request(app)
        .get(`/api/v1/attachments/${attachmentId}/download?token=${testerToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('image/png');
      expect(downloadRes.body.toString()).toBe('query-token-test-content');
    });

    test('Downloading attachment by non-project member receives 403 Forbidden', async () => {
      const pngBuffer = Buffer.from('sample-png-content');

      const uploadRes = await request(app)
        .post(`/api/v1/issues/${issueA._id}/attachments`)
        .set('Authorization', `Bearer ${devToken}`)
        .attach('file', pngBuffer, 'secret-bug.png');

      const attachmentId = uploadRes.body.data._id;

      const downloadRes = await request(app)
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${outsiderToken}`); // outsiderUser is NOT a member of Project A

      expect(downloadRes.status).toBe(403);
    });
  });
});
