import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { Issue } from '../src/models/Issue.js';
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
let project;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Activity.deleteMany({});
  await Issue.deleteMany({});
  await Project.deleteMany({});
  await User.deleteMany({});

  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    passwordHash: 'Password123!',
    role: ROLES.ADMIN,
  });
  adminToken = signToken(adminUser);

  devUser = await User.create({
    name: 'Dev Lead',
    email: 'dev@example.com',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  devToken = signToken(devUser);

  testerUser = await User.create({
    name: 'QA Engineer',
    email: 'tester@example.com',
    passwordHash: 'Password123!',
    role: ROLES.TESTER,
  });
  testerToken = signToken(testerUser);

  outsiderUser = await User.create({
    name: 'Outsider User',
    email: 'outsider@example.com',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  outsiderToken = signToken(outsiderUser);

  // Project with admin, dev, tester as members
  project = await Project.create({
    name: 'BugBoard Core',
    key: 'BBC',
    description: 'Core bug tracking system',
    members: [adminUser._id, devUser._id, testerUser._id],
  });
});

describe('Issue API Endpoints & Workflow Engine (Phase 3)', () => {
  describe('POST /api/v1/issues', () => {
    test('1. Creation forces reporter to req.user.id regardless of request body (Decision #1)', async () => {
      const spoofedReporterId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          title: 'Login button broken on Safari',
          description: 'Clicking submit does not trigger fetch request',
          project: project._id.toString(),
          severity: ISSUE_SEVERITY.HIGH,
          priority: ISSUE_PRIORITY.HIGH,
          reporter: spoofedReporterId, // Spoofed attempt
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reporter._id.toString()).toBe(devUser._id.toString());
      expect(res.body.data.reporter._id.toString()).not.toBe(spoofedReporterId);
    });

    test('2. Assignee must be an active project member (Decision #2) -> 422 if not', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          title: 'Memory leak in worker thread',
          description: 'Worker fails to garbage collect buffers',
          project: project._id.toString(),
          severity: ISSUE_SEVERITY.CRITICAL,
          priority: ISSUE_PRIORITY.URGENT,
          assignee: outsiderUser._id.toString(), // Valid user, but NOT member of project
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/active member of this project/i);
    });

    test('3. Creation rejects invalid or non-existent project id', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          title: 'Orphaned bug report',
          description: 'No matching project',
          project: fakeProjectId,
          severity: ISSUE_SEVERITY.LOW,
          priority: ISSUE_PRIORITY.LOW,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/project not found/i);
    });

    test('4. Non-member cannot create issue in private project -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          title: 'Intrusion bug',
          description: 'Unauthorized creation',
          project: project._id.toString(),
          severity: ISSUE_SEVERITY.LOW,
          priority: ISSUE_PRIORITY.LOW,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/issues/:issueId/status — State Machine Matrix', () => {
    let issue;

    beforeEach(async () => {
      issue = await Issue.create({
        title: 'Workflow test issue',
        description: 'Testing the state transitions',
        project: project._id,
        severity: ISSUE_SEVERITY.MEDIUM,
        priority: ISSUE_PRIORITY.MEDIUM,
        status: ISSUE_STATUS.OPEN,
        reporter: devUser._id,
      });
    });

    test('Row 1: Open -> In Progress allowed for Developer -> 200 & creates Activity', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.IN_PROGRESS);

      const activity = await Activity.findOne({ issue: issue._id });
      expect(activity).toBeDefined();
      expect(activity.action).toBe('STATUS_UPDATED');
      expect(activity.field).toBe('status');
      expect(activity.oldValue).toBe(ISSUE_STATUS.OPEN);
      expect(activity.newValue).toBe(ISSUE_STATUS.IN_PROGRESS);
    });

    test('Row 2: In Progress -> Testing allowed for Developer -> 200', async () => {
      issue.status = ISSUE_STATUS.IN_PROGRESS;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.TESTING });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.TESTING);
    });

    test('Row 3: Testing -> Resolved allowed for Tester -> 200', async () => {
      issue.status = ISSUE_STATUS.TESTING;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${testerToken}`)
        .send({ status: ISSUE_STATUS.RESOLVED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.RESOLVED);
    });

    test('Row 4: Testing -> Open bounce-back allowed for Tester -> 200', async () => {
      issue.status = ISSUE_STATUS.TESTING;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${testerToken}`)
        .send({ status: ISSUE_STATUS.OPEN });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.OPEN);
    });

    test('Row 5: Resolved -> Closed allowed for Tester -> 200', async () => {
      issue.status = ISSUE_STATUS.RESOLVED;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${testerToken}`)
        .send({ status: ISSUE_STATUS.CLOSED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.CLOSED);
    });

    test('Row 6: Resolved -> Open re-opening allowed for Tester -> 200', async () => {
      issue.status = ISSUE_STATUS.RESOLVED;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${testerToken}`)
        .send({ status: ISSUE_STATUS.OPEN });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.OPEN);
    });

    test('Row 7: Closed -> Open allowed for Admin only -> 200', async () => {
      issue.status = ISSUE_STATUS.CLOSED;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ISSUE_STATUS.OPEN });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ISSUE_STATUS.OPEN);
    });

    // Invalid Case 1: Skipping step (Open -> Resolved)
    test('Invalid 1: Skipping steps (Open -> Resolved) is rejected -> 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ISSUE_STATUS.RESOLVED });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot transition issue status from "Open" to "Resolved"/i);
      expect(res.body.message).toMatch(/Legal next states from "Open": In Progress/i);
    });

    // Invalid Case 2: Wrong role (Developer attempting Closed transition)
    test('Invalid 2: Wrong role (Developer attempting Resolved -> Closed) is rejected -> 400', async () => {
      issue.status = ISSUE_STATUS.RESOLVED;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: ISSUE_STATUS.CLOSED });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Role "Developer" is not authorized/i);
    });

    // Invalid Case 3: Transitioning from state with no such edge (In Progress -> Closed)
    test('Invalid 3: Transition with no edge (In Progress -> Closed) is rejected -> 400', async () => {
      issue.status = ISSUE_STATUS.IN_PROGRESS;
      await issue.save();

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ISSUE_STATUS.CLOSED });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot transition issue status from "In Progress" to "Closed"/i);
    });
  });

  describe('PATCH /api/v1/issues/:issueId/assignee', () => {
    test('Assignee change creates an Activity record', async () => {
      const issue = await Issue.create({
        title: 'Assignee test issue',
        description: 'Testing assignee activity creation',
        project: project._id,
        severity: ISSUE_SEVERITY.LOW,
        priority: ISSUE_PRIORITY.LOW,
        reporter: devUser._id,
      });

      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/assignee`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ assignee: devUser._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.assignee._id.toString()).toBe(devUser._id.toString());

      const activity = await Activity.findOne({ issue: issue._id, action: 'ASSIGNEE_UPDATED' });
      expect(activity).toBeDefined();
      expect(activity.field).toBe('assignee');
      expect(activity.newValue).toBe(devUser._id.toString());
    });
  });

  describe('GET /api/v1/issues — Filtering, Search & Pagination', () => {
    beforeEach(async () => {
      // Seed 25 issues across severity, priority, status
      const seedIssues = [];
      for (let i = 1; i <= 25; i++) {
        seedIssues.push({
          title: `Bug ticket number ${i} crash report`,
          description: i % 2 === 0 ? 'Buffer overflow memory exception' : 'UI rendering artifact issue',
          project: project._id,
          severity: i <= 5 ? ISSUE_SEVERITY.CRITICAL : ISSUE_SEVERITY.LOW,
          priority: i <= 10 ? ISSUE_PRIORITY.URGENT : ISSUE_PRIORITY.LOW,
          status: i <= 7 ? ISSUE_STATUS.RESOLVED : ISSUE_STATUS.OPEN,
          reporter: i % 2 === 0 ? devUser._id : testerUser._id,
          assignee: i % 3 === 0 ? devUser._id : null,
          createdAt: new Date(Date.now() - i * 60000),
        });
      }
      await Issue.insertMany(seedIssues);
    });

    test('1. Pagination default: page=1, limit=20, total=25, totalPages=2', async () => {
      const res = await request(app)
        .get('/api/v1/issues')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.total).toBe(25);
      expect(res.body.totalPages).toBe(2);
      expect(res.body.data.length).toBe(20);
    });

    test('2. Filter by status returns only matching docs', async () => {
      const res = await request(app)
        .get(`/api/v1/issues?status=${encodeURIComponent(ISSUE_STATUS.RESOLVED)}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(7);
      res.body.data.forEach((iss) => {
        expect(iss.status).toBe(ISSUE_STATUS.RESOLVED);
      });
    });

    test('3. Filter by severity returns only matching docs', async () => {
      const res = await request(app)
        .get(`/api/v1/issues?severity=${ISSUE_SEVERITY.CRITICAL}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      res.body.data.forEach((iss) => {
        expect(iss.severity).toBe(ISSUE_SEVERITY.CRITICAL);
      });
    });

    test('4. Full-text search on title/description returns matches and excludes non-matches', async () => {
      const res = await request(app)
        .get('/api/v1/issues?search=overflow')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      res.body.data.forEach((iss) => {
        const text = `${iss.title} ${iss.description}`.toLowerCase();
        expect(text).toContain('overflow');
      });
    });
  });
});
