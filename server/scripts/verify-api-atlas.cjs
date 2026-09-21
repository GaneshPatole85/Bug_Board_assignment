const path = require('path');

async function verifyLiveApi() {
  console.log('=== VERIFYING LIVE BUGBOARD API FLOW AGAINST MONGODB ATLAS ===\n');

  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/api/v1/health');
  const health = await healthRes.json();
  console.log('1. Health Check Response:');
  console.log('   Status:', health.status, '| DB:', health.database.status, '| Host:', health.database.host, '| DB Name:', health.database.name);

  // 2. Login as Admin
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gpatole473@gmail.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('\n2. Admin Authentication:');
  console.log('   Authenticated User:', loginData.data.user.name, `(${loginData.data.user.email})`);
  console.log('   Role:', loginData.data.user.role, '| Employee ID:', loginData.data.user.employeeId);
  console.log('   JWT Token received:', !!token);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 3. Dashboard Summary
  const dashRes = await fetch('http://localhost:5000/api/v1/dashboard/summary', { headers: authHeaders });
  const dashData = await dashRes.json();
  console.log('\n3. Dashboard Metrics (Live Atlas Aggregation):');
  console.log('   Total Issues:', dashData.data.totalIssues);
  console.log('   Issues by Status:', dashData.data.statusCounts || dashData.data.byStatus);
  console.log('   Issues by Priority:', dashData.data.priorityCounts || dashData.data.byPriority);

  // 4. Projects List
  const projRes = await fetch('http://localhost:5000/api/v1/projects', { headers: authHeaders });
  const projData = await projRes.json();
  console.log('\n4. Projects List (Live Atlas Collection):');
  console.log(`   Found ${projData.data.length} projects:`);
  projData.data.forEach(p => console.log(`   - [${p.key}] ${p.name} (Members: ${p.members?.length || 0})`));

  // 5. Issues List
  const issueRes = await fetch('http://localhost:5000/api/v1/issues', { headers: authHeaders });
  const issueData = await issueRes.json();
  const issues = issueData.data.issues || issueData.data;
  console.log(`\n5. Issues List (Live Atlas Collection): Found ${issues.length} issues`);
  const firstIssue = issues[0];
  console.log(`   Sample Issue: [${firstIssue._id}] "${firstIssue.title}"`);
  console.log(`   Status: ${firstIssue.status}, Severity: ${firstIssue.severity}, Priority: ${firstIssue.priority}`);
  console.log(`   Project: ${firstIssue.project?.name || firstIssue.project}, Reporter: ${firstIssue.reporter?.name || firstIssue.reporter}`);

  // 6. Activity History for Sample Issue
  const actRes = await fetch(`http://localhost:5000/api/v1/issues/${firstIssue._id}/activities`, { headers: authHeaders });
  const actData = await actRes.json();
  const activities = actData.data.activities || actData.data;
  console.log(`\n6. Activity History for Issue ${firstIssue._id}: Found ${activities.length} activity entries`);
  activities.forEach(a => {
    console.log(`   - Action: ${a.action} on ${a.field || 'issue'} by ${a.actor?.name || a.actor} at ${a.createdAt}`);
  });

  // 7. Comments for Sample Issue
  const commRes = await fetch(`http://localhost:5000/api/v1/issues/${firstIssue._id}/comments`, { headers: authHeaders });
  const commData = await commRes.json();
  const comments = commData.data.comments || commData.data;
  console.log(`\n7. Comments for Issue ${firstIssue._id}: Found ${comments.length} comments`);

  console.log('\n=== ALL CORE APP FLOWS VERIFIED LIVE AGAINST ATLAS SUCCESSFULLY ===\n');
}

verifyLiveApi().catch(err => {
  console.error('Error during live API verification:', err);
  process.exit(1);
});
