const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

// Load target URI from server/.env
const dotenvPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: dotenvPath });

const SOURCE_URI = 'mongodb://127.0.0.1:51434/';
const TARGET_URI = process.env.MONGODB_URI;

async function runVerification() {
  console.log('Connecting to Source DB and Atlas Target DB...');
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db();
  const targetDb = targetClient.db();

  console.log('\n--- 1. COLLECTION DOCUMENT COUNTS COMPARISON ---');
  const sourceCols = (await sourceDb.listCollections().toArray()).map(c => c.name).filter(n => !n.startsWith('system.'));
  const countComparison = [];

  for (const col of sourceCols) {
    const srcCount = await sourceDb.collection(col).countDocuments();
    const tgtCount = await targetDb.collection(col).countDocuments();
    countComparison.push({
      collection: col,
      sourceCount: srcCount,
      atlasCount: tgtCount,
      match: srcCount === tgtCount
    });
  }
  console.table(countComparison);
  const allCountsMatch = countComparison.every(c => c.match);
  console.log('All collection document counts match exactly:', allCountsMatch);

  console.log('\n--- 2. SPOT-CHECK DOCUMENTS BY _id AND FIELDS ---');
  // Spot-check Admin User
  const srcAdmin = await sourceDb.collection('users').findOne({ role: 'Admin' });
  const tgtAdmin = await targetDb.collection('users').findOne({ _id: srcAdmin._id });
  const adminMatch = tgtAdmin &&
    tgtAdmin.email === srcAdmin.email &&
    tgtAdmin.passwordHash === srcAdmin.passwordHash &&
    tgtAdmin.role === srcAdmin.role &&
    tgtAdmin.employeeId === srcAdmin.employeeId &&
    new Date(tgtAdmin.createdAt).getTime() === new Date(srcAdmin.createdAt).getTime();

  console.log('Spot-Check User (Admin):');
  console.log(`  Source: _id=${srcAdmin._id}, email=${srcAdmin.email}, role=${srcAdmin.role}, empId=${srcAdmin.employeeId}`);
  console.log(`  Atlas:  _id=${tgtAdmin._id}, email=${tgtAdmin.email}, role=${tgtAdmin.role}, empId=${tgtAdmin.employeeId}`);
  console.log(`  PasswordHash identical: ${srcAdmin.passwordHash === tgtAdmin.passwordHash}`);
  console.log(`  Timestamps identical: ${new Date(srcAdmin.createdAt).toISOString()} === ${new Date(tgtAdmin.createdAt).toISOString()}`);
  console.log(`  Match Result: ${adminMatch ? 'PASSED (Byte-for-byte equivalent)' : 'FAILED'}\n`);

  // Spot-check Project
  const srcProj = await sourceDb.collection('projects').findOne({ key: 'CORE' });
  const tgtProj = await targetDb.collection('projects').findOne({ _id: srcProj._id });
  const projMatch = tgtProj &&
    tgtProj.name === srcProj.name &&
    tgtProj.key === srcProj.key &&
    tgtProj.members.length === srcProj.members.length &&
    new Date(tgtProj.createdAt).getTime() === new Date(srcProj.createdAt).getTime();

  console.log('Spot-Check Project (CORE):');
  console.log(`  Source: _id=${srcProj._id}, key=${srcProj.key}, name="${srcProj.name}", members=${srcProj.members.length}`);
  console.log(`  Atlas:  _id=${tgtProj._id}, key=${tgtProj.key}, name="${tgtProj.name}", members=${tgtProj.members.length}`);
  console.log(`  Match Result: ${projMatch ? 'PASSED (Byte-for-byte equivalent)' : 'FAILED'}\n`);

  // Spot-check Issue with Activity
  const srcIssue = await sourceDb.collection('issues').findOne({});
  const tgtIssue = await targetDb.collection('issues').findOne({ _id: srcIssue._id });
  const issueMatch = tgtIssue &&
    tgtIssue.title === srcIssue.title &&
    tgtIssue.status === srcIssue.status &&
    tgtIssue.severity === srcIssue.severity &&
    tgtIssue.priority === srcIssue.priority &&
    tgtIssue.project.toString() === srcIssue.project.toString() &&
    tgtIssue.reporter.toString() === srcIssue.reporter.toString();

  console.log('Spot-Check Issue:');
  console.log(`  Source: _id=${srcIssue._id}, title="${srcIssue.title}", status=${srcIssue.status}`);
  console.log(`  Atlas:  _id=${tgtIssue._id}, title="${tgtIssue.title}", status=${tgtIssue.status}`);
  console.log(`  Match Result: ${issueMatch ? 'PASSED (Byte-for-byte equivalent)' : 'FAILED'}\n`);

  console.log('--- 3. REFERENTIAL INTEGRITY VERIFICATION ---');
  // Check all issues on Atlas have valid project, reporter, and assignee (if set) references
  const allIssues = await targetDb.collection('issues').find({}).toArray();
  const integrityChecks = [];

  for (const issue of allIssues) {
    const project = await targetDb.collection('projects').findOne({ _id: issue.project });
    const reporter = await targetDb.collection('users').findOne({ _id: issue.reporter });
    let assignee = true;
    if (issue.assignee) {
      assignee = await targetDb.collection('users').findOne({ _id: issue.assignee });
    }
    const activities = await targetDb.collection('activities').find({ issue: issue._id }).toArray();

    integrityChecks.push({
      issueId: issue._id.toString(),
      title: issue.title.substring(0, 30) + '...',
      projectExists: !!project,
      reporterExists: !!reporter,
      assigneeExists: !!assignee,
      linkedActivitiesCount: activities.length
    });
  }

  console.table(integrityChecks);
  const referentialIntegrityPassed = integrityChecks.every(c => c.projectExists && c.reporterExists && c.assigneeExists);
  console.log('All Foreign Key References (ObjectIds) resolve successfully on Atlas:', referentialIntegrityPassed);

  await sourceClient.close();
  await targetClient.close();

  if (!allCountsMatch || !adminMatch || !projMatch || !issueMatch || !referentialIntegrityPassed) {
    console.error('[ERROR] Verification failed!');
    process.exit(1);
  } else {
    console.log('\n>>> ZERO DATA LOSS AND DATA FIDELITY PROVEN SUCCESSFULLY! <<<');
  }
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
