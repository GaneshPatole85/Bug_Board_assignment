import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { signToken } from '../src/utils/jwt.js';
import { authorizeRole } from '../src/middlewares/authorizeRole.js';
import { authorizeProjectAccess } from '../src/middlewares/authorizeProjectAccess.js';

let mongoServer;

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
  await User.deleteMany({});
});

describe('POST /api/v1/auth/register', () => {
  test('1. Successful registration -> 201, no password in response', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Developer',
        email: 'jane.dev@example.com',
        password: 'Password123!',
        role: 'Developer',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('jane.dev@example.com');
    expect(res.body.data.user.role).toBe('Developer');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('2. Duplicate email registration -> 409 Conflict', async () => {
    // First registration
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Developer',
        email: 'duplicate@example.com',
        password: 'Password123!',
        role: 'Developer',
      });

    // Duplicate registration attempt
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        role: 'Tester',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered/i);
  });

  test('3. Registration with role: "Admin" -> rejected with 422 Unprocessable Entity', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Sneaky Admin',
        email: 'sneaky@example.com',
        password: 'Password123!',
        role: 'Admin',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.some((e) => e.message.includes('Admin accounts cannot be self-registered'))).toBe(true);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    // Seed user for login tests
    const user = new User({
      name: 'Existing Developer',
      email: 'testlogin@example.com',
      passwordHash: 'ValidPassword123!',
      role: 'Developer',
    });
    await user.save();
  });

  test('4. Successful login -> 200 with JWT token and user profile', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testlogin@example.com',
        password: 'ValidPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user.email).toBe('testlogin@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('5. Login with wrong password -> 401 with generic error message', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testlogin@example.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('6. Login with non-existent email -> 401 with same generic message (proves no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('GET /api/v1/auth/me', () => {
  let seededUser;
  let validToken;

  beforeEach(async () => {
    seededUser = new User({
      name: 'Me User',
      email: 'me@example.com',
      passwordHash: 'Password123!',
      role: 'Developer',
    });
    await seededUser.save();

    validToken = signToken({ sub: seededUser._id.toString(), role: seededUser.role });
  });

  test('7. GET /auth/me with no token -> 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('8. GET /auth/me with malformed/invalid token -> 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.string');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('9. GET /auth/me with expired token -> 401 Unauthorized', async () => {
    // Sign token with -1s expiry to simulate expiration
    const expiredToken = signToken(
      { sub: seededUser._id.toString(), role: seededUser.role },
      '-1s'
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  test('10. GET /auth/me with valid token -> 200 with user data', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('me@example.com');
    expect(res.body.data.user.role).toBe('Developer');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

describe('RBAC Middleware Unit Tests', () => {
  test('11. authorizeRole middleware allows permitted role and rejects unpermitted role with 403', () => {
    const adminReq = { user: { id: 'u1', role: 'Admin' } };
    const devReq = { user: { id: 'u2', role: 'Developer' } };
    const unauthReq = {};

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const mockRes = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.data = data;
        return res;
      };
      return res;
    };

    // Case A: Admin allowed
    const adminOnlyMiddleware = authorizeRole('Admin');
    nextCalled = false;
    adminOnlyMiddleware(adminReq, {}, next);
    expect(nextCalled).toBe(true);

    // Case B: Developer blocked from Admin route with 403
    nextCalled = false;
    const res = mockRes();
    adminOnlyMiddleware(devReq, res, next);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.data.success).toBe(false);

    // Case C: Unauthenticated req blocked with 401
    const unauthRes = mockRes();
    adminOnlyMiddleware(unauthReq, unauthRes, next);
    expect(unauthRes.statusCode).toBe(401);
  });

  test('12. authorizeProjectAccess middleware: allows member or admin, rejects non-member with 403', () => {
    const memberId = new mongoose.Types.ObjectId();
    const nonMemberId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const mockProject = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Alpha Project',
      members: [memberId],
    };

    const mockRes = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.data = data;
        return res;
      };
      return res;
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    // Case A: Member is allowed
    nextCalled = false;
    authorizeProjectAccess(
      { user: { id: memberId.toString(), role: 'Developer' }, project: mockProject },
      {},
      next
    );
    expect(nextCalled).toBe(true);

    // Case B: Admin is universally allowed even if not in members list
    nextCalled = false;
    authorizeProjectAccess(
      { user: { id: adminId.toString(), role: 'Admin' }, project: mockProject },
      {},
      next
    );
    expect(nextCalled).toBe(true);

    // Case C: Non-member is rejected with 403
    nextCalled = false;
    const forbiddenRes = mockRes();
    authorizeProjectAccess(
      { user: { id: nonMemberId.toString(), role: 'Developer' }, project: mockProject },
      forbiddenRes,
      next
    );
    expect(nextCalled).toBe(false);
    expect(forbiddenRes.statusCode).toBe(403);
    expect(forbiddenRes.data.success).toBe(false);
  });
});
