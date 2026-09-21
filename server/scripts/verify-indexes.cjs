const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load URI from server/.env
const dotenvPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: dotenvPath });

async function verifyIndexes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in server/.env');
    process.exit(1);
  }

  console.log('Connecting to Atlas to verify collection indexes...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const collections = await db.listCollections().toArray();
  const report = {};

  for (const col of collections) {
    const indexes = await db.collection(col.name).indexes();
    report[col.name] = indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique || false,
      sparse: idx.sparse || false,
      weights: idx.weights || undefined
    }));
  }

  await client.close();

  console.log('\n=== ATLAS INDEX REPORT ===\n');
  for (const [colName, idxList] of Object.entries(report)) {
    console.log(`Collection: ${colName} (${idxList.length} indexes)`);
    idxList.forEach(idx => {
      const flags = [];
      if (idx.unique) flags.push('UNIQUE');
      if (idx.sparse) flags.push('SPARSE');
      if (idx.weights) flags.push('TEXT_WEIGHTS: ' + JSON.stringify(idx.weights));
      console.log(`  - ${idx.name}: key=${JSON.stringify(idx.key)} ${flags.length ? '(' + flags.join(', ') + ')' : ''}`);
    });
    console.log('');
  }

  // Cross-reference checks
  const checks = [];

  // Check 1: User email unique
  const userIndexes = report['users'] || [];
  const hasUserEmailUnique = userIndexes.some(i => i.key.email === 1 && i.unique);
  checks.push({ check: 'User.email unique index', passed: hasUserEmailUnique });

  // Check 2: User employeeId sparse unique
  const hasUserEmpId = userIndexes.some(i => i.key.employeeId === 1 && i.unique && i.sparse);
  checks.push({ check: 'User.employeeId sparse unique index', passed: hasUserEmpId });

  // Check 3: Project key unique
  const projIndexes = report['projects'] || [];
  const hasProjKeyUnique = projIndexes.some(i => i.key.key === 1 && i.unique);
  checks.push({ check: 'Project.key unique index', passed: hasProjKeyUnique });

  // Check 4: Issue compound { project: 1, status: 1 }
  const issueIndexes = report['issues'] || [];
  const hasIssueCompound = issueIndexes.some(i => i.key.project === 1 && i.key.status === 1);
  checks.push({ check: 'Issue { project: 1, status: 1 } compound index', passed: hasIssueCompound });

  // Check 5: Issue text index or assignee/reporter/createdAt indexes
  const hasIssueAssignee = issueIndexes.some(i => i.key.assignee === 1);
  checks.push({ check: 'Issue.assignee index', passed: hasIssueAssignee });

  const hasIssueReporter = issueIndexes.some(i => i.key.reporter === 1);
  checks.push({ check: 'Issue.reporter index', passed: hasIssueReporter });

  const hasIssueCreatedAt = issueIndexes.some(i => i.key.createdAt === -1);
  checks.push({ check: 'Issue.createdAt desc index', passed: hasIssueCreatedAt });

  // Check 6: Activity.issue index
  const actIndexes = report['activities'] || [];
  const hasActIssue = actIndexes.some(i => i.key.issue === 1);
  checks.push({ check: 'Activity.issue index', passed: hasActIssue });

  console.log('=== DATABASE DESIGN CONFORMANCE CHECKS ===');
  console.table(checks);
  const allPassed = checks.every(c => c.passed);
  console.log('All documented index checks passed:', allPassed);
}

verifyIndexes().catch(err => {
  console.error('Index check failed:', err);
  process.exit(1);
});
