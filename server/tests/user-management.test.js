import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { Issue } from '../src/models/Issue.js';
import { Counter } from '../src/models/Counter.js';
import { ROLES } from '../src/constants/roles.js';
import { signToken } from '../src/utils/jwt.js';
import { migrateEmployeeIds } from '../src/utils/migrate-employee-ids.js';

describe('User Profiles & Admin User Management Feature', () => {
  let mongoServer;
  let adminUser, devUser, devUser2, testerUser;
  let adminToken, devToken, dev2Token, testerToken;
  let testProject;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Issue.deleteMany({});
    await Counter.deleteMany({});

    await Counter.create({ _id: 'ADM', seq: 1 });
    await Counter.create({ _id: 'DEV', seq: 2 });

    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@bugboard.test',
      passwordHash: 'Password123!',
      role: ROLES.ADMIN,
      employeeId: 'ADM-0001',
      designation: 'Principal Architect',
    });

    devUser = await User.create({
      name: 'Alice Developer',
      email: 'alice@bugboard.test',
      passwordHash: 'Password123!',
      role: ROLES.DEVELOPER,
      employeeId: 'DEV-0001',
      designation: 'Senior Backend Engineer',
    });

    devUser2 = await User.create({
      name: 'Bob Developer',
      email: 'bob@bugboard.test',
      passwordHash: 'Password123!',
      role: ROLES.DEVELOPER,
      employeeId: 'DEV-0002',
      designation: 'Frontend Engineer',
    });

    testerUser = await User.create({
      name: 'Charlie Tester',
      email: 'charlie@bugboard.test',
      passwordHash: 'Password123!',
      role: ROLES.TESTER,
    });

    adminToken = signToken(adminUser);
    devToken = signToken(devUser);
    dev2Token = signToken(devUser2);
    testerToken = signToken(testerUser);

    testProject = await Project.create({
      name: 'Core Platform',
      key: 'CORE',
      description: 'Core infrastructure services',
      members: [adminUser._id, devUser._id, devUser2._id, testerUser._id],
    });
  });

  describe('1. Self-Service Profile (GET & PATCH /api/v1/users/me)', () => {
    test('Authenticated user can retrieve their own full profile', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@bugboard.test');
      expect(res.body.data.user.employeeId).toBe('DEV-0001');
      expect(res.body.data.user.designation).toBe('Senior Backend Engineer');
      expect(res.body.data.user.isActive).toBe(true);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    test('User can update self-editable fields (name, phone, avatarUrl)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'Alice M. Developer',
          phone: '+1-555-0199',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Alice M. Developer');
      expect(res.body.data.user.phone).toBe('+1-555-0199');
      expect(res.body.data.user.avatarUrl).toBe('https://images.unsplash.com/photo-1494790108377-be9c29b29330');

      // Verify persistence in DB
      const updated = await User.findById(devUser._id);
      expect(updated.name).toBe('Alice M. Developer');
      expect(updated.phone).toBe('+1-555-0199');
    });

    test('Mass-assignment guard: attempting to set employeeId or department via self-update is rejected with 422', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          employeeId: 'DEV-9999',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot be modified via self-update/i);

      const resDept = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          department: 'Executive Leadership',
        });

      expect(resDept.status).toBe(422);
      expect(resDept.body.success).toBe(false);
      expect(resDept.body.message).toMatch(/cannot be modified via self-update/i);

      // Verify employeeId was not changed in DB
      const unchanged = await User.findById(devUser._id);
      expect(unchanged.employeeId).toBe('DEV-0001');
    });

    test('Mass-assignment guard: attempting to set isActive or role via self-update is rejected with 422', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          role: 'Admin',
          isActive: false,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot be modified via self-update/i);
    });
  });

  describe('2. Admin User Directory & RBAC Protections', () => {
    test('Non-admin access scoping and 403 protections on user management endpoints', async () => {
      // 1. Non-admin accessing Admin Directory
      const resDev = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${devToken}`);

      // Developers only see users in their shared projects
      expect(resDev.status).toBe(200);
      expect(resDev.body.data.every((u) => u.role !== ROLES.ADMIN)).toBe(true);

      // 2. Non-admin attempting to view single user by ID -> 403
      const resDevGet = await request(app)
        .get(`/api/v1/users/${devUser2._id}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(resDevGet.status).toBe(403);
      expect(resDevGet.body.success).toBe(false);

      // 3. Non-admin attempting to PATCH another user -> 403
      const resDevPatch = await request(app)
        .patch(`/api/v1/users/${devUser2._id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ designation: 'Tech Lead' });

      expect(resDevPatch.status).toBe(403);
      expect(resDevPatch.body.success).toBe(false);
    });

    test('Admin can list all users and filter by role', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4);

      // Filter by role: Developer
      const resDevs = await request(app)
        .get('/api/v1/users?role=Developer')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDevs.status).toBe(200);
      expect(resDevs.body.data.length).toBe(2);
      expect(resDevs.body.data.every((u) => u.role === 'Developer')).toBe(true);
    });

    test('Admin can update department, role, and isActive for another user, while employeeId in body is ignored (immutable)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${testerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'DEV-9999', // Disallowed field should be ignored
          department: 'Quality Assurance',
          role: 'Developer',
          isActive: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.department).toBe('Quality Assurance');
      expect(res.body.data.user.role).toBe('Developer');

      const updated = await User.findById(testerUser._id);
      expect(updated.department).toBe('Quality Assurance');
      expect(updated.role).toBe('Developer');
      expect(updated.employeeId).toBeUndefined(); // Ignored, not changed to DEV-9999
    });

    test('Admin blanket self-edit guard: Admin cannot modify their own record via admin endpoint (403)', async () => {
      // 1. Attempting to change designation on own record via /users/:userId -> 403
      const resDesignation = await request(app)
        .patch(`/api/v1/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          designation: 'Chief Architect',
        });

      expect(resDesignation.status).toBe(403);
      expect(resDesignation.body.success).toBe(false);
      expect(resDesignation.body.message).toMatch(/administrators cannot edit their own organizational record through this endpoint/i);

      // 2. Attempting to change isActive on own record via /users/:userId -> 403 (subsumes self-deactivation)
      const resDeactivate = await request(app)
        .patch(`/api/v1/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
        });

      expect(resDeactivate.status).toBe(403);
      expect(resDeactivate.body.success).toBe(false);
      expect(resDeactivate.body.message).toMatch(/administrators cannot edit their own organizational record through this endpoint/i);

      // Verify Admin record in DB remains completely unchanged
      const unchanged = await User.findById(adminUser._id);
      expect(unchanged.isActive).toBe(true);
      expect(unchanged.designation).toBe('Principal Architect');
    });

    test('Immutability: employeeId cannot be modified via PATCH /users/:userId; original is preserved while designation updates', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${devUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'DEV-8888',
          designation: 'Staff Architect',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.employeeId).toBe('DEV-0001'); // Preserved original
      expect(res.body.data.user.designation).toBe('Staff Architect');

      const updated = await User.findById(devUser._id);
      expect(updated.employeeId).toBe('DEV-0001');
      expect(updated.designation).toBe('Staff Architect');
    });
  });

  describe('3. Account Deactivation & Immediate Token Revocation', () => {
    test('Deactivated user token is immediately rejected on subsequent requests (401)', async () => {
      // 1. Verify token works before deactivation
      const checkBefore = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`);
      expect(checkBefore.status).toBe(200);

      // 2. Admin deactivates devUser
      const deactivateRes = await request(app)
        .patch(`/api/v1/users/${devUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.data.user.isActive).toBe(false);

      // 3. Immediately retry request with devToken — must fail with 401
      const checkAfter = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${devToken}`);

      expect(checkAfter.status).toBe(401);
      expect(checkAfter.body.success).toBe(false);
      expect(checkAfter.body.message).toBe('Your account has been deactivated. Contact an administrator.');
    });

    test('Login attempt for a deactivated account is rejected with 401 and specific message', async () => {
      // Deactivate Bob
      await User.findByIdAndUpdate(devUser2._id, { isActive: false });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bob@bugboard.test',
          password: 'Password123!',
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.success).toBe(false);
      expect(loginRes.body.message).toBe('Your account has been deactivated. Contact an administrator.');
    });
  });

  describe('4. Extended Assignee Validation (Active Status Rule)', () => {
    test('Creating an issue with an inactive developer assignee is rejected with 422', async () => {
      // Deactivate devUser2
      await User.findByIdAndUpdate(devUser2._id, { isActive: false });

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Memory leak in worker thread',
          description: 'Background worker allocates memory without freeing buffer pools',
          project: testProject._id,
          priority: 'High',
          severity: 'High',
          assignee: devUser2._id,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/assignee is inactive/i);
    });

    test('Reassigning an issue to an inactive developer is rejected with 422', async () => {
      // Create issue assigned to active devUser
      const issue = await Issue.create({
        title: 'Buffer overflow vulnerability',
        description: 'Check payload boundary bounds',
        project: testProject._id,
        priority: 'Urgent',
        severity: 'Critical',
        assignee: devUser._id,
        reporter: adminUser._id,
      });

      // Deactivate devUser2
      await User.findByIdAndUpdate(devUser2._id, { isActive: false });

      // Attempt reassignment
      const res = await request(app)
        .patch(`/api/v1/issues/${issue._id}/assignee`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignee: devUser2._id,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/assignee is inactive/i);
    });
  });

  describe('5. Atomic System-Generated Employee IDs & Backfill Migration', () => {
    test('Registration generates atomic, sequential role-prefixed employeeId', async () => {
      const devRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Dana Developer',
          email: 'dana@bugboard.test',
          password: 'Password123!',
          role: 'Developer',
        });

      expect(devRes.status).toBe(201);
      expect(devRes.body.data.user.employeeId).toBe('DEV-0003');

      const testerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Tara Tester',
          email: 'tara@bugboard.test',
          password: 'Password123!',
          role: 'Tester',
        });

      expect(testerRes.status).toBe(201);
      expect(testerRes.body.data.user.employeeId).toBe('TST-0001');
    });

    test('Concurrency: Simultaneous registrations never produce duplicate employee IDs', async () => {
      const registrations = [1, 2, 3, 4, 5].map((i) =>
        request(app)
          .post('/api/v1/auth/register')
          .send({
            name: `Concurrent Dev ${i}`,
            email: `concurrent${i}@bugboard.test`,
            password: 'Password123!',
            role: 'Developer',
          })
      );

      const results = await Promise.all(registrations);
      results.forEach((r) => expect(r.status).toBe(201));

      const employeeIds = results.map((r) => r.body.data.user.employeeId);
      const uniqueIds = new Set(employeeIds);

      // Verify no duplicates across concurrent requests
      expect(uniqueIds.size).toBe(5);
      employeeIds.forEach((id) => {
        expect(id).toMatch(/^DEV-\d{4}$/);
      });
    });

    test('Backfill migration assigns sequential IDs to users missing employeeId and is idempotent', async () => {
      // Clear counters and create legacy users without employeeId
      await Counter.deleteMany({});
      await User.deleteMany({});

      const u1 = await User.create({
        name: 'Legacy Admin',
        email: 'legacyadmin@bugboard.test',
        passwordHash: 'Password123!',
        role: ROLES.ADMIN,
        createdAt: new Date('2025-01-01'),
      });

      const u2 = await User.create({
        name: 'Legacy Dev 1',
        email: 'legacydev1@bugboard.test',
        passwordHash: 'Password123!',
        role: ROLES.DEVELOPER,
        createdAt: new Date('2025-01-02'),
      });

      const u3 = await User.create({
        name: 'Legacy Dev 2',
        email: 'legacydev2@bugboard.test',
        passwordHash: 'Password123!',
        role: ROLES.DEVELOPER,
        createdAt: new Date('2025-01-03'),
      });

      const u4 = await User.create({
        name: 'Legacy Tester',
        email: 'legacytester@bugboard.test',
        passwordHash: 'Password123!',
        role: ROLES.TESTER,
        createdAt: new Date('2025-01-04'),
      });

      // Run migration 1st time
      const result1 = await migrateEmployeeIds();
      expect(result1.count).toBe(4);

      const refreshedU1 = await User.findById(u1._id);
      const refreshedU2 = await User.findById(u2._id);
      const refreshedU3 = await User.findById(u3._id);
      const refreshedU4 = await User.findById(u4._id);

      expect(refreshedU1.employeeId).toBe('ADM-0001');
      expect(refreshedU2.employeeId).toBe('DEV-0001');
      expect(refreshedU3.employeeId).toBe('DEV-0002');
      expect(refreshedU4.employeeId).toBe('TST-0001');

      // Run migration 2nd time: idempotent (0 updated)
      const result2 = await migrateEmployeeIds();
      expect(result2.count).toBe(0);
    });
  });
});
