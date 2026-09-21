/**
 * BugBoard — Super Deep Bug Hunter Test Suite (Run 3)
 * Comprehensive testing for Cross-Feature Interactions, Chaos/Dependency Failures,
 * Systematic Mass-Assignment, Concurrency at Load, and OWASP API Security.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { Issue } from '../src/models/Issue.js';
import { Attachment } from '../src/models/Attachment.js';
import { Notification } from '../src/models/Notification.js';
import { Counter } from '../src/models/Counter.js';
import { signToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';
import { notificationService } from '../src/services/notification.service.js';
import { storageService } from '../src/services/storage.service.js';

let mongoServer;
let adminUser, devUser, testerUser, outsiderUser;
let adminToken, devToken, testerToken, outsiderToken;
let testProject;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Clean DB
  await User.deleteMany({});
  await Project.deleteMany({});
  await Issue.deleteMany({});
  await Attachment.deleteMany({});
  await Notification.deleteMany({});
  await Counter.deleteMany({});

  await Counter.create([
    { _id: 'ADM', seq: 10 },
    { _id: 'DEV', seq: 10 },
    { _id: 'TST', seq: 10 },
  ]);

  // Seed baseline users
  adminUser = await User.create({
    name: 'Admin Boss',
    email: 'admin_run3@example.com',
    passwordHash: 'Password123!',
    role: ROLES.ADMIN,
    employeeId: 'ADM-0001',
    isActive: true,
  });
  adminToken = signToken(adminUser);

  devUser = await User.create({
    name: 'Developer Alice',
    email: 'alice_run3@example.com',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
    employeeId: 'DEV-0001',
    isActive: true,
  });
  devToken = signToken(devUser);

  testerUser = await User.create({
    name: 'Tester Bob',
    email: 'bob_run3@example.com',
    passwordHash: 'Password123!',
    role: ROLES.TESTER,
    employeeId: 'TST-0001',
    isActive: true,
  });
  testerToken = signToken(testerUser);

  outsiderUser = await User.create({
    name: 'Outsider Dave',
    email: 'dave_run3@example.com',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
    employeeId: 'DEV-0002',
    isActive: true,
  });
  outsiderToken = signToken(outsiderUser);

  // Baseline project
  testProject = await Project.create({
    name: 'Super Deep Project',
    key: 'SDP',
    description: 'Project for super deep hunt testing',
    members: [adminUser._id, devUser._id, testerUser._id],
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Dimension 1: Cross-Feature Interaction Matrix', () => {
  describe('XF-01: Deactivation × Password Reset (Bug B49)', () => {
    it('demonstrates vulnerability where an account deactivated post-token issuance can still reset password', async () => {
      // 1. Create a dedicated victim user
      const victim = await User.create({
        name: 'Victim User',
        email: 'victim_xf1@example.com',
        passwordHash: 'Password123!',
        role: ROLES.DEVELOPER,
        employeeId: 'DEV-0099',
        isActive: true,
      });

      // 2. Victim requests password reset
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'victim_xf1@example.com' });
      expect(forgotRes.status).toBe(200);

      // Inspect DB to set a known raw token for verification
      const rawTestToken = 'test-token-deactivation-secret-raw-12345';
      const tokenHash = crypto.createHash('sha256').update(rawTestToken).digest('hex');
      await User.findByIdAndUpdate(victim._id, {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
      });

      // 3. Admin deactivates the victim before the reset token is used
      await request(app)
        .patch(`/api/v1/users/${victim._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      const deactivatedVictim = await User.findById(victim._id);
      expect(deactivatedVictim.isActive).toBe(false);

      // 4. Deactivated user attempts to reset password using token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawTestToken,
          newPassword: 'BrandNewPassword123!',
          confirmNewPassword: 'BrandNewPassword123!',
        });

      // Permanent regression assertion for B49: reset request on deactivated account is rejected with 400
      expect(resetRes.status).toBe(400);
      expect(resetRes.body.message).toMatch(/invalid or has expired/i);
    });
  });

  describe('XF-02: Deactivation × Assignment', () => {
    let assignedIssue;
    let assignmentDev;

    beforeAll(async () => {
      assignmentDev = await User.create({
        name: 'Assignment Dev',
        email: 'assign_dev@example.com',
        passwordHash: 'Password123!',
        role: ROLES.DEVELOPER,
        employeeId: 'DEV-0044',
        isActive: true,
      });
      await Project.findByIdAndUpdate(testProject._id, { $addToSet: { members: assignmentDev._id } });
    });

    it('assigns an active developer to an issue', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Issue for Deactivation Assignment Test',
          description: 'Testing deactivation interaction with assignments',
          project: testProject._id.toString(),
          priority: 'High',
          severity: 'High',
          assignee: assignmentDev._id.toString(),
        });
      expect(res.status).toBe(201);
      assignedIssue = res.body.data;
      expect(assignedIssue.assignee._id.toString()).toBe(assignmentDev._id.toString());
    });

    it('retains existing assignment and renders details cleanly after user deactivation', async () => {
      // Deactivate assignmentDev
      await User.findByIdAndUpdate(assignmentDev._id, { isActive: false });

      // Fetch issue detail as Admin
      const res = await request(app)
        .get(`/api/v1/issues/${assignedIssue._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assignee).toBeDefined();
      expect(res.body.data.assignee.name).toBe(assignmentDev.name);
      expect(res.body.data.assignee.email).toBe(assignmentDev.email);
    });

    it('blocks newly assigning a deactivated user to an issue', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${assignedIssue._id}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee: assignmentDev._id.toString() });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/inactive/i);
    });
  });

  describe('XF-03: Password Change × Active Sessions / In-Flight Transitions', () => {
    it('immediately rejects in-flight requests using tokens issued prior to password change', async () => {
      // 1. Create a dedicated dev user
      const sessionUser = await User.create({
        name: 'Session Dev',
        email: 'session_dev@example.com',
        passwordHash: 'OldPassword123!',
        role: ROLES.DEVELOPER,
        employeeId: 'DEV-0077',
        isActive: true,
      });
      await Project.findByIdAndUpdate(testProject._id, { $addToSet: { members: sessionUser._id } });

      // 2. Issue Token A (simulating Tab A)
      const tokenTabA = signToken(sessionUser);

      // Wait 1.1s so passwordChangedAt timestamp is strictly greater than tokenTabA.iat
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 3. User changes password in Tab B (PATCH /api/v1/auth/change-password)
      const changeRes = await request(app)
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokenTabA}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewSecurePassword123!',
          confirmNewPassword: 'NewSecurePassword123!',
        });
      expect(changeRes.status).toBe(200);

      // 4. Tab A attempts an in-flight Kanban transition using the old token
      const issue = await Issue.create({
        title: 'Kanban In-flight Drop Test',
        description: 'Testing token revocation during drag and drop',
        project: testProject._id,
        reporter: adminUser._id,
        status: 'Open',
      });

      const dragDropRes = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${tokenTabA}`)
        .send({ status: 'In Progress' });

      // Must be rejected with 401 Unauthorized
      expect(dragDropRes.status).toBe(401);
      expect(dragDropRes.body.message).toMatch(/Session expired/i);

      // Confirm issue status was NOT mutated
      const unchangedIssue = await Issue.findById(issue._id);
      expect(unchangedIssue.status).toBe('Open');
    });
  });

  describe('XF-04: Employee ID Immutability × Team Edit × Self-Guard', () => {
    it('updates designation while silently ignoring injected employeeId, and blocks self-edit', async () => {
      // 1. Admin edits devUser's designation while passing employeeId: 'HACKED-001'
      const originalDev = await User.findById(devUser._id);
      const originalEmpId = originalDev.employeeId;

      const editRes = await request(app)
        .patch(`/api/v1/users/${devUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          designation: 'Staff Principal Engineer',
          employeeId: 'HACKED-9999',
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.user.designation).toBe('Staff Principal Engineer');
      expect(editRes.body.data.user.employeeId).toBe(originalEmpId); // Preserved!

      // 2. Admin attempts to edit their own record via PATCH /users/:adminId
      const selfEditRes = await request(app)
        .patch(`/api/v1/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ designation: 'Super Admin' });

      expect(selfEditRes.status).toBe(403);
      expect(selfEditRes.body.message).toMatch(/administrators cannot edit their own/i);
    });
  });

  describe('XF-05: Attachments × Project Membership Change', () => {
    it('blocks downloaded attachments when a user is removed from project membership', async () => {
      // Create dedicated dev user for membership test
      const memberDev = await User.create({
        name: 'Member Dev',
        email: 'member_dev@example.com',
        passwordHash: 'Password123!',
        role: ROLES.DEVELOPER,
        employeeId: 'DEV-0066',
        isActive: true,
      });
      const memberDevToken = signToken(memberDev);
      await Project.findByIdAndUpdate(testProject._id, { $addToSet: { members: memberDev._id } });

      // 1. Dev uploads an attachment to an issue in testProject
      const testIssue = await Issue.create({
        title: 'Attachment Membership Test Issue',
        description: 'Verifying attachment authorization upon membership change',
        project: testProject._id,
        reporter: memberDev._id,
      });

      const fileBuffer = Buffer.from('hello attachment test content');
      const uploadRes = await request(app)
        .post(`/api/v1/issues/${testIssue._id}/attachments`)
        .set('Authorization', `Bearer ${memberDevToken}`)
        .attach('file', fileBuffer, 'spec.txt');

      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.data._id;

      // 2. Dev can download the attachment while in project
      const downloadAllowedRes = await request(app)
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${memberDevToken}`);
      expect(downloadAllowedRes.status).toBe(200);

      // 3. Admin removes memberDev from testProject members
      const removeRes = await request(app)
        .patch(`/api/v1/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          members: [adminUser._id.toString(), devUser._id.toString(), testerUser._id.toString()],
        });
      expect(removeRes.status).toBe(200);

      // 4. Removed memberDev attempts to download the attachment
      const downloadBlockedRes = await request(app)
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${memberDevToken}`);
      expect(downloadBlockedRes.status).toBe(403);
      expect(downloadBlockedRes.body.message).toMatch(/Forbidden/i);

      // 5. Existing project member (Tester) can still download
      const testerDownloadRes = await request(app)
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${testerToken}`);
      expect(testerDownloadRes.status).toBe(200);
    });
  });

  describe('XF-06: Notifications × Deactivation (B50)', () => {
    it('demonstrates notification dispatch to deactivated assignee/reporter', async () => {
      const notifDev = await User.create({
        name: 'Notif Dev',
        email: 'notif_dev@example.com',
        passwordHash: 'Password123!',
        role: ROLES.DEVELOPER,
        employeeId: 'DEV-0033',
        isActive: true,
      });
      await Project.findByIdAndUpdate(testProject._id, { $addToSet: { members: notifDev._id } });

      const issue = await Issue.create({
        title: 'Notification Deactivation Issue',
        description: 'Testing deactivation interaction with notifications',
        project: testProject._id,
        reporter: adminUser._id,
        assignee: notifDev._id,
        status: 'Open',
      });

      // Deactivate notifDev
      await User.findByIdAndUpdate(notifDev._id, { isActive: false });
      const countBefore = await Notification.countDocuments({ recipient: notifDev._id });

      // Admin transitions status
      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'In Progress' });
      expect(res.status).toBe(200);

      // B50 regression: deactivated user does NOT receive notification
      const countAfter = await Notification.countDocuments({ recipient: notifDev._id });
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('XF-07: Issue Deletion × Attachment Cascade Cleanup (B51 Fixed)', () => {
    it('verifies Attachment document and storage are cascade deleted when parent issue is deleted', async () => {
      const delIssue = await Issue.create({
        title: 'Issue with Attachment for Deletion',
        description: 'Testing attachment cleanup on issue deletion',
        project: testProject._id,
        reporter: adminUser._id,
      });

      const fileBuffer = Buffer.from('content to be cleaned on issue delete');
      const uploadRes = await request(app)
        .post(`/api/v1/issues/${delIssue._id}/attachments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileBuffer, 'clean-issue-att.txt');
      expect(uploadRes.status).toBe(201);
      const attId = uploadRes.body.data._id;

      // Delete the issue
      const delRes = await request(app)
        .delete(`/api/v1/issues/${delIssue._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);

      // B51 regression: Attachment document must be deleted!
      const remainingAtt = await Attachment.findById(attId);
      expect(remainingAtt).toBeNull();
    });
  });

  describe('XF-08: Project Deletion × Attachment Cascade Cleanup (B51 Fixed)', () => {
    it('verifies Attachment documents are cascade deleted when parent project is deleted', async () => {
      const tempProject = await Project.create({
        name: 'Temp Project for Cascade',
        key: 'TPC',
        members: [adminUser._id],
      });

      const tempIssue = await Issue.create({
        title: 'Temp Issue in Temp Project',
        description: 'Testing project cascade on attachments',
        project: tempProject._id,
        reporter: adminUser._id,
      });

      const fileBuffer = Buffer.from('temp attachment content');
      const uploadRes = await request(app)
        .post(`/api/v1/issues/${tempIssue._id}/attachments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileBuffer, 'temp-project-att.txt');
      expect(uploadRes.status).toBe(201);
      const attId = uploadRes.body.data._id;

      // Delete the project
      const delRes = await request(app)
        .delete(`/api/v1/projects/${tempProject._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);

      // B51 regression: Attachment document must be deleted!
      const remainingAtt = await Attachment.findById(attId);
      expect(remainingAtt).toBeNull();
    });
  });
});

describe('Dimension 2: Chaos & Dependency-Failure Testing', () => {
  describe('CH-01: SMTP / Mailpit Unavailability (Fire-and-Forget)', () => {
    let origGetTransporter;

    beforeAll(() => {
      origGetTransporter = notificationService._getTransporter;
      notificationService._getTransporter = () => ({
        sendMail: jest.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:1025 Mailpit offline')),
      });
    });

    afterAll(() => {
      notificationService._getTransporter = origGetTransporter;
    });

    it('completes user registration successfully when SMTP is down', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Chaos Reg User',
          email: 'chaos_reg@example.com',
          password: 'Password123!',
          role: 'Developer',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('completes forgot password request cleanly when SMTP is down', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: devUser.email });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('completes issue assignment cleanly when SMTP is down', async () => {
      const issue = await Issue.create({
        title: 'Chaos SMTP Assignment Issue',
        description: 'Testing SMTP failure resilience',
        project: testProject._id,
        reporter: adminUser._id,
      });

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignee: devUser._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('CH-02: Storage Failure during Upload (No Orphaned Records)', () => {
    it('leaves no dangling Attachment document if storage service fails', async () => {
      const issue = await Issue.create({
        title: 'Storage Failure Issue',
        description: 'Verifying atomic upload behavior',
        project: testProject._id,
        reporter: adminUser._id,
      });

      // Mock storageService.uploadFile to fail
      const originalUpload = storageService.uploadFile;
      storageService.uploadFile = jest.fn().mockRejectedValue(new Error('MinIO S3 network timeout'));

      const fileBuffer = Buffer.from('test content');
      const res = await request(app)
        .post(`/api/v1/issues/${issue._id}/attachments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileBuffer, 'crash.txt');

      expect(res.status).toBe(500);

      // Verify no orphaned Attachment document was persisted
      const danglingDocs = await Attachment.find({ issue: issue._id });
      expect(danglingDocs.length).toBe(0);

      storageService.uploadFile = originalUpload;
    });
  });

  describe('CH-03: Unexpected Server Error Response Hygiene', () => {
    it('suppresses stack traces and leaks no DB connection string on internal errors', async () => {
      const origFind = Issue.findById;
      Issue.findById = jest.fn().mockImplementation(() => {
        throw new Error('MongoNetworkError: connection 127.0.0.1:27017 timed out with secret mongodb+srv://cluster0');
      });

      const res = await request(app)
        .get(`/api/v1/issues/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
      expect(res.body.errors).toEqual([]);
      // Ensure no sensitive connection details in response body
      expect(JSON.stringify(res.body)).not.toContain('mongodb+srv');
      expect(JSON.stringify(res.body)).not.toContain('MongoNetworkError');

      Issue.findById = origFind;
    });
  });
});

describe('Dimension 3: Systematic Mass-Assignment Sweep', () => {
  it('sweeps POST /api/v1/auth/register with injected sensitive fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Mass Assign Reg',
        email: 'mass_assign_reg2@example.com',
        password: 'Password123!',
        role: 'Developer',
        employeeId: 'ADM-9999',
        isActive: false,
        passwordChangedAt: new Date(0),
        _id: new mongoose.Types.ObjectId(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('Developer');
    expect(res.body.data.user.employeeId).not.toBe('ADM-9999');
    expect(res.body.data.user.isActive).toBe(true);
  });

  it('sweeps PATCH /api/v1/users/me with injected sensitive fields', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        name: 'Dev Alice Updated',
        role: 'Admin',
        isActive: false,
        employeeId: 'ADM-8888',
      });

    // Rejection with 422 per checkSelfUpdateMassAssignment
    expect(res.status).toBe(422);
  });

  it('sweeps PATCH /api/v1/users/:id as Admin with injected employeeId and _id', async () => {
    const targetUser = await User.create({
      name: 'Sweep Target',
      email: 'sweep_target@example.com',
      passwordHash: 'Password123!',
      role: ROLES.DEVELOPER,
      employeeId: 'DEV-0055',
      isActive: true,
    });

    const res = await request(app)
      .patch(`/api/v1/users/${targetUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        designation: 'Lead Tester',
        employeeId: 'INJECTED-ID',
        _id: new mongoose.Types.ObjectId(),
      });

    expect(res.status).toBe(200);
    const updated = await User.findById(targetUser._id);
    expect(updated.employeeId).toBe('DEV-0055'); // Protected
  });

  it('sweeps POST /api/v1/issues with spoofed reporter and status', async () => {
    const fakeReporter = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/v1/issues')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        title: 'Mass Assignment Issue Test',
        description: 'Testing reporter spoofing',
        project: testProject._id.toString(),
        priority: 'Medium',
        severity: 'Medium',
        reporter: fakeReporter.toString(), // Injected
        status: 'Closed', // Injected
      });

    expect(res.status).toBe(201);
    expect(res.body.data.reporter._id.toString()).toBe(devUser._id.toString()); // Forced to caller
    expect(res.body.data.status).toBe('Open'); // Injected status ignored
  });

  it('sweeps PATCH /api/v1/issues/:id with forbidden status injection', async () => {
    const issue = await Issue.create({
      title: 'Sweep PATCH Issue',
      description: 'Before update',
      project: testProject._id,
      reporter: devUser._id,
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/issues/${issue._id}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        title: 'Updated Title',
        status: 'Closed',
      });

    // updateIssueValidator explicitly rejects status modification with 422
    expect(res.status).toBe(422);
  });

  it('sweeps POST /api/v1/issues/:id/comments with spoofed author', async () => {
    const issue = await Issue.create({
      title: 'Comment Mass Assign Issue',
      description: 'Issue for comment test',
      project: testProject._id,
      reporter: devUser._id,
    });

    const fakeAuthor = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/v1/issues/${issue._id}/comments`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        content: 'Testing author spoofing in comment',
        author: fakeAuthor.toString(),
        role: 'Admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.author._id.toString()).toBe(devUser._id.toString());
  });
});

describe('Dimension 4: Concurrency at Load', () => {
  it('handles 25 simultaneous issue creation requests without race corruption', async () => {
    const concurrentRequests = Array.from({ length: 25 }).map((_, index) =>
      request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Concurrent Issue #${index + 1}`,
          description: `Concurrent load testing payload ${index + 1}`,
          project: testProject._id.toString(),
          priority: 'Medium',
          severity: 'Low',
        })
    );

    const responses = await Promise.all(concurrentRequests);
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.status).toBe('Open');
    }
  });

  it('handles concurrent state transitions on the same issue predictably', async () => {
    const issue = await Issue.create({
      title: 'Concurrent Transition Target',
      description: 'Testing concurrent transitions',
      project: testProject._id,
      reporter: adminUser._id,
      status: 'Open',
    });

    // Two parallel requests attempting Open -> In Progress
    const [res1, res2] = await Promise.all([
      request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'In Progress' }),
      request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: 'In Progress' }),
    ]);

    const statuses = [res1.status, res2.status];
    // One succeeds (200), and the other either succeeds or gets 400 (already in status)
    expect(statuses).toContain(200);
    const finalIssue = await Issue.findById(issue._id);
    expect(finalIssue.status).toBe('In Progress');
  });
});

describe('Dimension 5: OWASP API Security Top 10 Sweep', () => {
  it('API1 (BOLA): blocks cross-project issue reading by non-members', async () => {
    const privateProject = await Project.create({
      name: 'Private Secret Project',
      key: 'PSP',
      members: [adminUser._id],
    });

    const privateIssue = await Issue.create({
      title: 'Secret Issue',
      description: 'Non-members cannot read',
      project: privateProject._id,
      reporter: adminUser._id,
    });

    const res = await request(app)
      .get(`/api/v1/issues/${privateIssue._id}`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  it('API2 (Broken Auth): rejects expired or tampered JWT signatures', async () => {
    const tamperedToken = `${devToken}corrupted`;
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
  });

  it('API3 (BOPLA): prevents mass-assignment and excessive data exposure', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.passwordResetTokenHash).toBeUndefined();
  });

  it('API6 (SSRF): avatarUrl is never fetched server-side and blocks non-http schemes', async () => {
    const badSchemeRes = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ avatarUrl: 'file:///etc/passwd' });

    expect(badSchemeRes.status).toBe(422);

    const javascriptRes = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ avatarUrl: 'javascript:alert(1)' });

    expect(javascriptRes.status).toBe(422);
  });

  it('API8 (Injection): rejects NoSQL injection operators in query filters', async () => {
    const res = await request(app)
      .get('/api/v1/issues?status={"$gt":""}')
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(422);
  });
});
