import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { signToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';

let mongoServer;
let adminUser, devUser, devUser2, testerUser;
let adminToken, devToken, dev2Token, testerToken;

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
    name: 'Dev User One',
    email: 'dev1@example.com',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  devToken = signToken(devUser);

  devUser2 = await User.create({
    name: 'Dev User Two',
    email: 'dev2@example.com',
    passwordHash: 'Password123!',
    role: ROLES.DEVELOPER,
  });
  dev2Token = signToken(devUser2);

  testerUser = await User.create({
    name: 'QA Tester',
    email: 'tester@example.com',
    passwordHash: 'Password123!',
    role: ROLES.TESTER,
  });
  testerToken = signToken(testerUser);
});

describe('Project API Endpoints (Phase 3)', () => {
  describe('POST /api/v1/projects', () => {
    test('1. Admin can create project -> 201, auto-adds creating Admin to members', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Core Platform',
          key: 'core',
          description: 'Main platform architecture',
          members: [devUser._id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Core Platform');
      expect(res.body.data.key).toBe('CORE'); // Auto-uppercased
      const memberIds = res.body.data.members.map((m) => m._id.toString());
      expect(memberIds).toContain(adminUser._id.toString());
      expect(memberIds).toContain(devUser._id.toString());
    });

    test('2. Developer or Tester creating project -> 403 Forbidden', async () => {
      const devRes = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'Rogue Project',
          key: 'ROGUE',
        });
      expect(devRes.status).toBe(403);

      const testerRes = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${testerToken}`)
        .send({
          name: 'Rogue Project 2',
          key: 'ROGUE2',
        });
      expect(testerRes.status).toBe(403);
    });

    test('3. Duplicate project key -> 409 Conflict with clean message', async () => {
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Project Alpha',
          key: 'ALPHA',
        });

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Project Alpha Duplicate',
          key: 'alpha', // tests case-insensitivity & uppercase
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already in use/i);
    });

    test('4. Invalid key format (<2 chars or special chars) -> 422 Validation Error', async () => {
      const res1 = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Key Project',
          key: 'A', // Too short
        });
      expect(res1.status).toBe(422);

      const res2 = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Key Project 2',
          key: 'KEY_WITH_UNDERSCORE!',
        });
      expect(res2.status).toBe(422);
    });

    test('5. Non-existent member ID in creation -> 422 Unprocessable Entity', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Ghost Members Project',
          key: 'GHOST',
          members: [fakeId],
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/do not exist/i);
    });
  });

  describe('GET /api/v1/projects', () => {
    test('1. Admin sees all projects; Developer only sees projects where they are a member', async () => {
      // Seed Project 1 with devUser
      await Project.create({
        name: 'Project 1',
        key: 'PROJ1',
        members: [adminUser._id, devUser._id],
      });

      // Seed Project 2 with devUser2 only
      await Project.create({
        name: 'Project 2',
        key: 'PROJ2',
        members: [adminUser._id, devUser2._id],
      });

      // Admin request
      const adminRes = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBe(2);

      // Dev 1 request
      const dev1Res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${devToken}`);
      expect(dev1Res.status).toBe(200);
      expect(dev1Res.body.data.length).toBe(1);
      expect(dev1Res.body.data[0].key).toBe('PROJ1');
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    test('1. Non-member receives 403 Forbidden when requesting unauthorized project', async () => {
      const project = await Project.create({
        name: 'Secret Project',
        key: 'SECRET',
        members: [adminUser._id, devUser._id],
      });

      // devUser2 is not in members
      const res = await request(app)
        .get(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${dev2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/do not have access/i);
    });

    test('2. Member can view project details -> 200', async () => {
      const project = await Project.create({
        name: 'Team Project',
        key: 'TEAM',
        members: [adminUser._id, devUser._id],
      });

      const res = await request(app)
        .get(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.key).toBe('TEAM');
    });
  });

  describe('PATCH /api/v1/projects/:projectId', () => {
    test('1. Admin can update project name and members -> 200', async () => {
      const project = await Project.create({
        name: 'Original Name',
        key: 'ORIG',
        members: [adminUser._id],
      });

      const res = await request(app)
        .patch(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          members: [adminUser._id.toString(), devUser._id.toString()],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.memberCount).toBe(2);
    });

    test('2. Non-admin receives 403 on update attempt', async () => {
      const project = await Project.create({
        name: 'Original Name',
        key: 'ORIG2',
        members: [adminUser._id, devUser._id],
      });

      const res = await request(app)
        .patch(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });
});
