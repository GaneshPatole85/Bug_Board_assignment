import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => {
    // Listen on random available port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API: Health Check returns standard health JSON structure', async () => {
  const res = await fetch(`${baseUrl}/api/v1/health`);
  // Without active DB connection in test, expect 503 Service Unavailable with valid degraded payload
  assert.ok(res.status === 200 || res.status === 503, `Status should be 200 or 503, got ${res.status}`);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.status === 'healthy' || body.status === 'degraded');
  assert.ok(body.timestamp);
  assert.ok(typeof body.uptimeSeconds === 'number');
  assert.equal(body.version, '1.0.0');
  assert.ok(body.database);
  assert.ok(typeof body.database.readyState === 'number');
  assert.ok(typeof body.database.status === 'string');
});

test('API: 404 handler returns uniform envelope { success, message, errors }', async () => {
  const res = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.message, 'Resource not found: GET /api/v1/unknown-endpoint');
  assert.deepEqual(body.errors, []);
});

test('API: Security headers applied by Helmet', async () => {
  const res = await fetch(`${baseUrl}/api/v1/health`);
  assert.ok(res.headers.get('x-content-type-options'), 'Should have X-Content-Type-Options header');
});
