import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { ROLES_LIST } from '../src/constants/roles.js';
import {
  ISSUE_SEVERITY_LIST,
  ISSUE_PRIORITY_LIST,
  ISSUE_STATUS_LIST,
} from '../src/constants/issueWorkflow.js';
import { User, Project, Issue, Comment, Activity } from '../src/models/index.js';

test('Foundation: Environment configuration defaults', () => {
  assert.ok(env.PORT, 'PORT should be defined');
  assert.equal(env.API_VERSION, 'v1', 'API version should default to v1');
  assert.ok(env.MONGODB_URI, 'MONGODB_URI should be defined');
  assert.ok(env.CLIENT_URL, 'CLIENT_URL should be defined');
});

test('Foundation: Constants definition', () => {
  assert.deepEqual(ROLES_LIST, ['Admin', 'Developer', 'Tester']);
  assert.deepEqual(ISSUE_SEVERITY_LIST, ['Low', 'Medium', 'High', 'Critical']);
  assert.deepEqual(ISSUE_PRIORITY_LIST, ['Low', 'Medium', 'High', 'Urgent']);
  assert.deepEqual(ISSUE_STATUS_LIST, ['Open', 'In Progress', 'Testing', 'Resolved', 'Closed']);
});

test('Database Schema: User Model constraints and fields', () => {
  const schema = User.schema;
  assert.ok(schema.path('name'), 'User must have name');
  assert.equal(schema.path('name').isRequired, true);
  assert.ok(schema.path('email'), 'User must have email');
  assert.equal(schema.path('email').isRequired, true);
  assert.ok(schema.path('passwordHash'), 'User must have passwordHash');
  assert.equal(schema.path('passwordHash').isRequired, true);
  assert.ok(schema.path('role'), 'User must have role');
  assert.equal(schema.path('role').isRequired, true);
  assert.deepEqual(schema.path('role').enumValues, ['Admin', 'Developer', 'Tester']);
  assert.equal(schema.options.timestamps, true, 'User must have timestamps enabled');
});

test('Database Schema: Project Model constraints and fields', () => {
  const schema = Project.schema;
  assert.ok(schema.path('name'), 'Project must have name');
  assert.equal(schema.path('name').isRequired, true);
  assert.ok(schema.path('key'), 'Project must have key');
  assert.equal(schema.path('key').isRequired, true);
  assert.ok(schema.path('description'), 'Project must have description');
  assert.ok(schema.path('members'), 'Project must have members array');
  assert.equal(schema.options.timestamps, true, 'Project must have timestamps enabled');
});

test('Database Schema: Issue Model constraints, enums, and indexes', () => {
  const schema = Issue.schema;
  assert.ok(schema.path('title'), 'Issue must have title');
  assert.equal(schema.path('title').isRequired, true);
  assert.ok(schema.path('description'), 'Issue must have description');
  assert.equal(schema.path('description').isRequired, true);
  assert.ok(schema.path('project'), 'Issue must have project ref');
  assert.equal(schema.path('project').isRequired, true);
  assert.ok(schema.path('severity'), 'Issue must have severity');
  assert.deepEqual(schema.path('severity').enumValues, ['Low', 'Medium', 'High', 'Critical']);
  assert.ok(schema.path('priority'), 'Issue must have priority');
  assert.deepEqual(schema.path('priority').enumValues, ['Low', 'Medium', 'High', 'Urgent']);
  assert.ok(schema.path('status'), 'Issue must have status');
  assert.deepEqual(schema.path('status').enumValues, ['Open', 'In Progress', 'Testing', 'Resolved', 'Closed']);
  assert.ok(schema.path('reporter'), 'Issue must have reporter ref');
  assert.equal(schema.path('reporter').isRequired, true);
  assert.ok(schema.path('assignee'), 'Issue must have assignee ref');
  assert.equal(schema.options.timestamps, true, 'Issue must have timestamps enabled');

  // Verify indexes
  const indexes = schema.indexes();
  const indexedFields = indexes.map((idx) => Object.keys(idx[0])[0]);
  assert.ok(indexedFields.includes('project'), 'Issue should index project');
  assert.ok(indexedFields.includes('status'), 'Issue should index status');
  assert.ok(indexedFields.includes('priority'), 'Issue should index priority');
  assert.ok(indexedFields.includes('severity'), 'Issue should index severity');
  assert.ok(indexedFields.includes('reporter'), 'Issue should index reporter');
  assert.ok(indexedFields.includes('assignee'), 'Issue should index assignee');
  assert.ok(indexedFields.includes('createdAt'), 'Issue should index createdAt');
});

test('Database Schema: Comment Model constraints and fields', () => {
  const schema = Comment.schema;
  assert.ok(schema.path('issue'), 'Comment must have issue ref');
  assert.equal(schema.path('issue').isRequired, true);
  assert.ok(schema.path('author'), 'Comment must have author ref');
  assert.equal(schema.path('author').isRequired, true);
  assert.ok(schema.path('content'), 'Comment must have content');
  assert.equal(schema.path('content').isRequired, true);
  assert.equal(schema.options.timestamps, true, 'Comment must have timestamps enabled');
});

test('Database Schema: Activity Model constraints and fields', () => {
  const schema = Activity.schema;
  assert.ok(schema.path('issue'), 'Activity must have issue ref');
  assert.equal(schema.path('issue').isRequired, true);
  assert.ok(schema.path('actor'), 'Activity must have actor ref');
  assert.equal(schema.path('actor').isRequired, true);
  assert.ok(schema.path('action'), 'Activity must have action');
  assert.ok(schema.path('field'), 'Activity must have field');
  assert.ok(schema.path('createdAt'), 'Activity must have createdAt');
});
