import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { Issue } from '../src/models/Issue.js';
import { Comment } from '../src/models/Comment.js';
import { Activity } from '../src/models/Activity.js';
import { signToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';
import {
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  ISSUE_SEVERITY,
} from '../src/constants/issueWorkflow.js';

let mongoServer;
let adminUser, devUser, testerUser, outsiderUser;
let adminToken, devToken, testerToken, outsiderToken;
let projectA, projectB;
let issueA1, issueA2, issueB1;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  adminUser = await User.create({
    name: 'Admin Boss',
    email: 'admin@bugboard.test',
    passwordHash: 'Password123!',
    role: ROLES.ADMIN,
  });
  adminToken = signToken(adminUser);

  devUser = await User.create({
    name: 'Priya Dev',
    email: 'priya@bugboard.test',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  devToken = signToken(devUser);

  testerUser = await User.create({
    name: 'Tom Tester',
    email: 'tom@bugboard.test',
    passwordHash: 'Password123!',
    role: ROLES.TESTER,
  });
  testerToken = signToken(testerUser);

  outsiderUser = await User.create({
    name: 'Outsider Ollie',
    email: 'ollie@bugboard.test',
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
  await Activity.deleteMany({});
  await Comment.deleteMany({});
  await Issue.deleteMany({});
  await Project.deleteMany({});

  // Project A has Admin, Priya Dev, Tom Tester
  projectA = await Project.create({
    name: 'Alpha Project',
    key: 'ALP',
    description: 'Alpha codebase',
    members: [adminUser._id, devUser._id, testerUser._id],
  });

  // Project B has only Admin and Outsider Ollie
  projectB = await Project.create({
    name: 'Beta Project',
    key: 'BET',
    description: 'Beta codebase',
    members: [adminUser._id, outsiderUser._id],
  });

  // Issue A1 on Project A
  issueA1 = await Issue.create({
    title: 'Auth token expires prematurely',
    description: 'Tokens expire in 5 seconds instead of 1 hour',
    project: projectA._id,
    reporter: testerUser._id,
    assignee: devUser._id,
    status: ISSUE_STATUS.OPEN,
    priority: ISSUE_PRIORITY.HIGH,
    severity: ISSUE_SEVERITY.HIGH,
  });

  // Issue A2 on Project A
  issueA2 = await Issue.create({
    title: 'Database connection pool leakage',
    description: 'Pool exhausting under heavy load',
    project: projectA._id,
    reporter: devUser._id,
    assignee: devUser._id,
    status: ISSUE_STATUS.IN_PROGRESS,
    priority: ISSUE_PRIORITY.URGENT,
    severity: ISSUE_SEVERITY.CRITICAL,
  });

  // Issue B1 on Project B
  issueB1 = await Issue.create({
    title: 'CSS alignment bug in sidebar',
    description: 'Sidebar overflows screen on 1080p',
    project: projectB._id,
    reporter: outsiderUser._id,
    assignee: outsiderUser._id,
    status: ISSUE_STATUS.OPEN,
    priority: ISSUE_PRIORITY.LOW,
    severity: ISSUE_SEVERITY.LOW,
  });
});

describe('Phase 4: Comments, Activity Audit Log & Dashboard Analytics', () => {
  describe('1. Comments API & Project-Level Authorization', () => {
    test('Non-member receives 403 Forbidden when attempting to post comment on foreign project', async () => {
      // outsiderUser is NOT a member of Project A
      const res = await request(app)
        .post(`/api/v1/issues/${issueA1._id}/comments`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ content: 'I should not be able to comment here' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden|not have access/i);
    });

    test('Comment creation enforces author anti-spoofing using req.user.id', async () => {
      const spoofedAuthorId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/issues/${issueA1._id}/comments`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          content: 'Investigating token TTL now.',
          author: spoofedAuthorId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Investigating token TTL now.');
      expect(res.body.data.author._id.toString()).toBe(devUser._id.toString());
      expect(res.body.data.author.name).toBe('Priya Dev');

      const savedComment = await Comment.findById(res.body.data._id);
      expect(savedComment.author.toString()).toBe(devUser._id.toString());
      expect(savedComment.author.toString()).not.toBe(spoofedAuthorId);
    });

    test('Comment content validation rejects empty body or text > 2000 characters', async () => {
      // Empty content
      const emptyRes = await request(app)
        .post(`/api/v1/issues/${issueA1._id}/comments`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ content: '   ' });

      expect(emptyRes.status).toBe(422);
      expect(emptyRes.body.success).toBe(false);

      // Oversized content
      const hugeRes = await request(app)
        .post(`/api/v1/issues/${issueA1._id}/comments`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ content: 'A'.repeat(2001) });

      expect(hugeRes.status).toBe(422);
      expect(hugeRes.body.success).toBe(false);
    });

    test('Comments listing returns oldest-first ordering with pagination', async () => {
      // Create 3 comments with small deliberate delays
      const c1 = await Comment.create({
        issue: issueA1._id,
        author: devUser._id,
        content: 'First comment',
        createdAt: new Date(Date.now() - 3000),
      });
      const c2 = await Comment.create({
        issue: issueA1._id,
        author: testerUser._id,
        content: 'Second comment',
        createdAt: new Date(Date.now() - 2000),
      });
      const c3 = await Comment.create({
        issue: issueA1._id,
        author: adminUser._id,
        content: 'Third comment',
        createdAt: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .get(`/api/v1/issues/${issueA1._id}/comments?page=1&limit=2`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]._id.toString()).toBe(c1._id.toString());
      expect(res.body.data[1]._id.toString()).toBe(c2._id.toString());
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(2);
    });

    test('Non-member receives 403 when attempting to list comments on foreign project issue', async () => {
      const res = await request(app)
        .get(`/api/v1/issues/${issueA1._id}/comments`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Activity Audit Log Tracking & Explicit Description Exclusion', () => {
    test('Updating title, priority, and severity records Activity entries', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/issues/${issueA1._id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          title: 'Auth token expires prematurely (UPDATED)',
          priority: ISSUE_PRIORITY.URGENT,
          severity: ISSUE_SEVERITY.CRITICAL,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      const activities = await Activity.find({ issue: issueA1._id }).sort({ createdAt: 1 });
      const fields = activities.map((a) => a.field);

      expect(fields).toContain('title');
      expect(fields).toContain('priority');
      expect(fields).toContain('severity');

      const titleActivity = activities.find((a) => a.field === 'title');
      expect(titleActivity.oldValue).toBe('Auth token expires prematurely');
      expect(titleActivity.newValue).toBe('Auth token expires prematurely (UPDATED)');

      const priorityActivity = activities.find((a) => a.field === 'priority');
      expect(priorityActivity.oldValue).toBe(ISSUE_PRIORITY.HIGH);
      expect(priorityActivity.newValue).toBe(ISSUE_PRIORITY.URGENT);

      const severityActivity = activities.find((a) => a.field === 'severity');
      expect(severityActivity.oldValue).toBe(ISSUE_SEVERITY.HIGH);
      expect(severityActivity.newValue).toBe(ISSUE_SEVERITY.CRITICAL);
    });

    test('Explicit Design Decision: Updating description does NOT create an Activity log entry', async () => {
      const activityCountBefore = await Activity.countDocuments({ issue: issueA1._id });

      const updateRes = await request(app)
        .patch(`/api/v1/issues/${issueA1._id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          description: 'A completely new long description detailing the token leakage mechanism.',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe(
        'A completely new long description detailing the token leakage mechanism.'
      );

      const activityCountAfter = await Activity.countDocuments({ issue: issueA1._id });
      expect(activityCountAfter).toBe(activityCountBefore);

      const descActivity = await Activity.findOne({
        issue: issueA1._id,
        field: 'description',
      });
      expect(descActivity).toBeNull();
    });

    test('GET /api/v1/issues/:issueId/activity returns timeline list with actor populated', async () => {
      // Trigger status change to generate an activity
      await request(app)
        .patch(`/api/v1/issues/${issueA1._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      const res = await request(app)
        .get(`/api/v1/issues/${issueA1._id}/activity`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].actor).toBeDefined();
      expect(res.body.data[0].actor.name).toBe('Priya Dev');
    });
  });

  describe('3. Dashboard Summary Analytics (Database-Side Single Aggregation Pipeline)', () => {
    beforeEach(async () => {
      // Create additional issues to thoroughly test counts
      // Project A:
      // A1: OPEN, HIGH, HIGH, assigned to devUser
      // A2: IN_PROGRESS, URGENT, CRITICAL, assigned to devUser
      // Add A3: RESOLVED, MEDIUM, MEDIUM, assigned to devUser
      await Issue.create({
        title: 'Resolved bug on A',
        description: 'Fixed',
        project: projectA._id,
        reporter: testerUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.RESOLVED,
        priority: ISSUE_PRIORITY.MEDIUM,
        severity: ISSUE_SEVERITY.MEDIUM,
      });

      // Add A4: CLOSED, LOW, LOW, assigned to testerUser
      await Issue.create({
        title: 'Closed bug on A',
        description: 'Closed',
        project: projectA._id,
        reporter: testerUser._id,
        assignee: testerUser._id,
        status: ISSUE_STATUS.CLOSED,
        priority: ISSUE_PRIORITY.LOW,
        severity: ISSUE_SEVERITY.LOW,
      });

      // Project B:
      // B1: OPEN, LOW, LOW, assigned to outsiderUser
      // Add B2: IN_PROGRESS, URGENT, CRITICAL, assigned to outsiderUser
      await Issue.create({
        title: 'Critical bug on B',
        description: 'Crash',
        project: projectB._id,
        reporter: outsiderUser._id,
        assignee: outsiderUser._id,
        status: ISSUE_STATUS.IN_PROGRESS,
        priority: ISSUE_PRIORITY.URGENT,
        severity: ISSUE_SEVERITY.CRITICAL,
      });
    });

    test('Admin dashboard summary returns system-wide metrics across all projects', async () => {
      // Total issues across all projects:
      // A1 (Open), A2 (In Progress, Critical), A3 (Resolved), A4 (Closed)
      // B1 (Open), B2 (In Progress, Critical)
      // Total = 6
      // Open = 2 (A1, B1)
      // In Progress = 2 (A2, B2)
      // Critical = 2 (A2, B2)
      // Resolved = 1 (A3)
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totals).toEqual({
        total: 6,
        open: 2,
        inProgress: 2,
        critical: 2,
        resolved: 1,
      });
    });

    test('Non-Admin (Dev) dashboard summary scopes counts strictly to member projects', async () => {
      // devUser is only a member of Project A.
      // Project A issues:
      // A1 (Open), A2 (In Progress, Critical), A3 (Resolved), A4 (Closed)
      // Total = 4
      // Open = 1 (A1)
      // In Progress = 1 (A2)
      // Critical = 1 (A2)
      // Resolved = 1 (A3)
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totals).toEqual({
        total: 4,
        open: 1,
        inProgress: 1,
        critical: 1,
        resolved: 1,
      });
    });

    test('assignedToMe is capped at 5 and sorted by priority descending, then createdAt descending', async () => {
      // Assign 6 issues to devUser in Project A with varied priorities
      await Issue.deleteMany({ project: projectA._id });

      const i1 = await Issue.create({
        title: 'Low Priority 1',
        description: 'Details for low priority 1',
        project: projectA._id,
        reporter: devUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.OPEN,
        priority: ISSUE_PRIORITY.LOW,
        severity: ISSUE_SEVERITY.LOW,
        createdAt: new Date('2026-01-01'),
      });

      const i2 = await Issue.create({
        title: 'Medium Priority 1',
        description: 'Details for medium priority 1',
        project: projectA._id,
        reporter: devUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.OPEN,
        priority: ISSUE_PRIORITY.MEDIUM,
        severity: ISSUE_SEVERITY.MEDIUM,
        createdAt: new Date('2026-01-02'),
      });

      const i3 = await Issue.create({
        title: 'High Priority 1',
        description: 'Details for high priority 1',
        project: projectA._id,
        reporter: devUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.OPEN,
        priority: ISSUE_PRIORITY.HIGH,
        severity: ISSUE_SEVERITY.HIGH,
        createdAt: new Date('2026-01-03'),
      });

      const i4 = await Issue.create({
        title: 'Urgent Priority 1 Older',
        description: 'Details for urgent priority 1',
        project: projectA._id,
        reporter: devUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.OPEN,
        priority: ISSUE_PRIORITY.URGENT,
        severity: ISSUE_SEVERITY.CRITICAL,
        createdAt: new Date('2026-01-04'),
      });

      const i5 = await Issue.create({
        title: 'Urgent Priority 2 Newer',
        description: 'Details for urgent priority 2',
        project: projectA._id,
        reporter: devUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.OPEN,
        priority: ISSUE_PRIORITY.URGENT,
        severity: ISSUE_SEVERITY.CRITICAL,
        createdAt: new Date('2026-01-05'),
      });

      const i6 = await Issue.create({
        title: 'Low Priority 2',
        description: 'Details for low priority 2',
        project: projectA._id,
        reporter: devUser._id,
        assignee: devUser._id,
        status: ISSUE_STATUS.OPEN,
        priority: ISSUE_PRIORITY.LOW,
        severity: ISSUE_SEVERITY.LOW,
        createdAt: new Date('2026-01-06'),
      });

      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      const assigned = res.body.data.assignedToMe;
      expect(assigned.length).toBe(5); // Capped at 5

      // Check priority ordering: Urgent items first (i5, then i4 due to newer createdAt)
      expect(assigned[0].title).toBe('Urgent Priority 2 Newer');
      expect(assigned[1].title).toBe('Urgent Priority 1 Older');
      expect(assigned[2].title).toBe('High Priority 1');
      expect(assigned[3].title).toBe('Medium Priority 1');
      // Low Priority 2 was created after Low Priority 1, so i6 takes the 5th spot and i1 is excluded
      expect(assigned[4].title).toBe('Low Priority 2');
    });
  });
});
