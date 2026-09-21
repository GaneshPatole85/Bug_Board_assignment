async function testLogin(email, password, roleDesc) {
  try {
    const res = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`[✓] Login SUCCESS for ${roleDesc} (${email}): user=${data.data.user.name}, role=${data.data.user.role}, tokenReceived=${!!data.data.token}`);
      return true;
    } else {
      console.error(`[X] Login FAILED for ${roleDesc} (${email}):`, data.message || data);
      return false;
    }
  } catch (err) {
    console.error(`[X] Login request error for ${email}:`, err.message);
    return false;
  }
}

async function run() {
  console.log('Testing authentication against BugBoard API connected to Atlas...');
  const r1 = await testLogin('gpatole473@gmail.com', 'Password123!', 'Admin User (gpatole473@gmail.com)');
  const r2 = await testLogin('shastrisujata006@gmail.com', 'Password123!', 'Lead Developer (shastrisujata006@gmail.com)');
  const r3 = await testLogin('tester@bugboard.test', 'Password123!', 'QA Tester (tester@bugboard.test)');

  const allPassed = r1 && r2 && r3;
  console.log('\nAuthentication verification result:', allPassed ? 'ALL PASSED (Admin, Developer, Tester)' : 'SOME FAILED');
  process.exit(allPassed ? 0 : 1);
}

run();
