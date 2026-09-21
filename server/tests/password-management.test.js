import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { signToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

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

describe('Change Password & Session Invalidation', () => {
  const createUser = async (overrides = {}) => {
    const user = new User({
      name: 'Test Engineer',
      email: 'engineer@bugboard.test',
      passwordHash: 'CurrentPassword123!',
      role: 'Developer',
      employeeId: 'DEV-9999',
      isActive: true,
      ...overrides,
    });
    await user.save();
    return user;
  };

  test('1. Wrong current password -> 422, password not changed', async () => {
    const user = await createUser();
    const token = signToken({ sub: user._id.toString(), role: user.role });

    const res = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.field === 'currentPassword')).toBe(true);

    // Verify password was NOT changed
    const userInDb = await User.findById(user._id).select('+passwordHash');
    const isOldValid = await userInDb.comparePassword('CurrentPassword123!');
    expect(isOldValid).toBe(true);
    expect(userInDb.passwordChangedAt).toBeNull();
  });

  test('2. New password equal to current password -> 422 rejected', async () => {
    const user = await createUser();
    const token = signToken({ sub: user._id.toString(), role: user.role });

    const res = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'CurrentPassword123!',
        confirmNewPassword: 'CurrentPassword123!',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.field === 'newPassword')).toBe(true);
  });

  test('3. Mismatched confirmNewPassword -> 422 rejected', async () => {
    const user = await createUser();
    const token = signToken({ sub: user._id.toString(), role: user.role });

    const res = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'DifferentPassword123!',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.field === 'confirmNewPassword')).toBe(true);
  });

  test('4. Correct current password + valid new password -> 200, updates password and passwordChangedAt', async () => {
    const user = await createUser();
    const token = signToken({ sub: user._id.toString(), role: user.role });

    const res = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await User.findById(user._id).select('+passwordHash');
    expect(await userInDb.comparePassword('BrandNewPassword123!')).toBe(true);
    expect(await userInDb.comparePassword('CurrentPassword123!')).toBe(false);
    expect(userInDb.passwordChangedAt).toBeInstanceOf(Date);
  });

  test('5. Session Invalidation: Token issued BEFORE password change is rejected by authenticate (401)', async () => {
    const user = await createUser();

    // Create a token issued in the past (e.g. 10 seconds ago)
    const pastIat = Math.floor(Date.now() / 1000) - 10;
    const oldToken = jwt.sign(
      { sub: user._id.toString(), role: user.role, iat: pastIat, exp: pastIat + 3600 },
      env.JWT_SECRET
    );

    // Verify old token works before password change
    const preCheck = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(preCheck.status).toBe(200);

    // Change password
    const changeRes = await request(app)
      .patch('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });
    expect(changeRes.status).toBe(200);

    // Verify old token is now REJECTED with 401
    const postCheckOld = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(postCheckOld.status).toBe(401);
    expect(postCheckOld.body.message).toMatch(/session expired/i);

    // Login with new password and verify new token works
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'engineer@bugboard.test',
        password: 'BrandNewPassword123!',
      });
    expect(loginRes.status).toBe(200);
    const newToken = loginRes.body.data.token;

    const postCheckNew = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newToken}`);
    expect(postCheckNew.status).toBe(200);
  });

  test('6. Backward compatibility: existing session with passwordChangedAt = null is NOT rejected', async () => {
    const user = await createUser({ passwordChangedAt: null });
    const token = signToken({ sub: user._id.toString(), role: user.role });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('7. Coexistence: deactivated user (isActive: false) rejected even with valid token', async () => {
    const user = await createUser({ isActive: false });
    const token = signToken({ sub: user._id.toString(), role: user.role });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

describe('Forgot Password (Anti-Enumeration) & Reset Password Flow', () => {
  const GENERIC_MSG = 'If an account with that email exists, a reset link has been sent.';

  test('8. Existing active user -> generic 200 response and SHA-256 token stored in DB', async () => {
    const user = new User({
      name: 'Active User',
      email: 'active@bugboard.test',
      passwordHash: 'Password123!',
      role: 'Developer',
      isActive: true,
    });
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'active@bugboard.test' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);

    // Verify token was generated and hashed in DB
    const userInDb = await User.findById(user._id).select('+passwordResetTokenHash');
    expect(userInDb.passwordResetTokenHash).toBeDefined();
    expect(typeof userInDb.passwordResetTokenHash).toBe('string');
    expect(userInDb.passwordResetTokenHash.length).toBe(64); // SHA-256 hex length
    expect(userInDb.passwordResetExpires).toBeInstanceOf(Date);
    expect(userInDb.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
  });

  test('9. Non-existent email -> identical generic 200 response, no token generated', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@bugboard.test' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);

    const count = await User.countDocuments();
    expect(count).toBe(0);
  });

  test('10. Inactive user email -> identical generic 200 response, NO token generated in DB', async () => {
    const user = new User({
      name: 'Deactivated User',
      email: 'deactivated@bugboard.test',
      passwordHash: 'Password123!',
      role: 'Developer',
      isActive: false,
    });
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'deactivated@bugboard.test' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);

    // Crucial anti-enumeration verification: inactive user must NOT get a reset token
    const userInDb = await User.findById(user._id).select('+passwordResetTokenHash');
    expect(userInDb.passwordResetTokenHash).toBeNull();
    expect(userInDb.passwordResetExpires).toBeNull();
  });

  test('11. Reset Password: valid unexpired token -> 200, updates password, sets passwordChangedAt, clears token', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = new User({
      name: 'Reset Tester',
      email: 'resettester@bugboard.test',
      passwordHash: 'OldPassword123!',
      role: 'Developer',
      isActive: true,
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins left
    });
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'BrandNewResetPassword123!',
        confirmNewPassword: 'BrandNewResetPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify in DB
    const userInDb = await User.findById(user._id).select('+passwordHash +passwordResetTokenHash');
    expect(await userInDb.comparePassword('BrandNewResetPassword123!')).toBe(true);
    expect(await userInDb.comparePassword('OldPassword123!')).toBe(false);
    expect(userInDb.passwordChangedAt).toBeInstanceOf(Date);
    // Token must be cleared (single-use)
    expect(userInDb.passwordResetTokenHash).toBeNull();
    expect(userInDb.passwordResetExpires).toBeNull();
  });

  test('12. Reset Password: reused token -> rejected with 400', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = new User({
      name: 'Reused Tester',
      email: 'reused@bugboard.test',
      passwordHash: 'OldPassword123!',
      role: 'Developer',
      isActive: true,
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
    });
    await user.save();

    // First use: succeeds
    const firstRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'FirstNewPassword123!',
        confirmNewPassword: 'FirstNewPassword123!',
      });
    expect(firstRes.status).toBe(200);

    // Second use with same token: rejected with 400
    const secondRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'SecondNewPassword123!',
        confirmNewPassword: 'SecondNewPassword123!',
      });
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.message).toMatch(/invalid or has expired/i);
  });

  test('13. Reset Password: expired token -> rejected with 400', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = new User({
      name: 'Expired Tester',
      email: 'expired@bugboard.test',
      passwordHash: 'OldPassword123!',
      role: 'Developer',
      isActive: true,
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: new Date(Date.now() - 5000), // Expired 5 seconds ago
    });
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  test('14. Reset Password: non-matching bogus token -> 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'completely-bogus-token-value',
        newPassword: 'BrandNewPassword123!',
        confirmNewPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });
});
