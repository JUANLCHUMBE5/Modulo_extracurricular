async function runTests() {
  const baseUrl = 'http://127.0.0.1:5175';
  console.log('--- Starting API Endpoint Verification Tests ---');

  let adminToken = '';
  let parentToken = '';

  // Test 1: login as admin
  try {
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '1234' })
    });
    const loginJson = await loginRes.json();
    console.log('Test 1 (Admin Login):', loginRes.status, loginJson.success ? 'SUCCESS' : 'FAILED');
    if (loginJson.success) {
      adminToken = loginJson.data.token;
    }
  } catch (e) {
    console.error('Test 1 Error:', e.message);
  }

  // Test 2: login as parent (should return token)
  try {
    const validateRes = await fetch(`${baseUrl}/api/v1/extracurricular/padres/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni: '11112223', fecha_nacimiento: '2010-01-01' })
    });
    const validateJson = await validateRes.json();
    console.log('Test 2 (Parent Validation/Login):', validateRes.status, validateJson.success ? 'SUCCESS' : 'FAILED');
    if (validateJson.success) {
      parentToken = validateJson.data.token;
      console.log('  Parent token returned:', parentToken ? 'YES' : 'NO');
    }
  } catch (e) {
    console.error('Test 2 Error:', e.message);
  }

  // Test 3: get programs without token (should be 401 Unauthorized)
  try {
    const progRes = await fetch(`${baseUrl}/api/v1/extracurricular/programas`);
    const progJson = await progRes.json();
    console.log('Test 3 (Access programs without token):', progRes.status, progRes.status === 401 ? 'SUCCESS (Blocked)' : 'FAILED (Allowed)', progJson.message);
  } catch (e) {
    console.error('Test 3 Error:', e.message);
  }

  // Test 4: get programs with admin token (should be 200 OK)
  if (adminToken) {
    try {
      const progRes = await fetch(`${baseUrl}/api/v1/extracurricular/programas`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const progJson = await progRes.json();
      console.log('Test 4 (Access programs with Admin token):', progRes.status, progRes.status === 200 ? 'SUCCESS' : 'FAILED', `Count: ${progJson.data?.length}`);
    } catch (e) {
      console.error('Test 4 Error:', e.message);
    }
  }

  // Test 5: get auth/me with admin token (should return user profile)
  if (adminToken) {
    try {
      const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const meJson = await meRes.json();
      console.log('Test 5 (Get /auth/me with token):', meRes.status, meJson.success ? 'SUCCESS' : 'FAILED', meJson.data?.user?.username);
    } catch (e) {
      console.error('Test 5 Error:', e.message);
    }
  }

  // Test 6: get raw db with admin token (should be 200 OK)
  if (adminToken) {
    try {
      const dbRes = await fetch(`${baseUrl}/api/db`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('Test 6 (Access raw /api/db with admin token):', dbRes.status, dbRes.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (e) {
      console.error('Test 6 Error:', e.message);
    }
  }

  // Test 7: get raw db with parent token (should be 403 Forbidden)
  if (parentToken) {
    try {
      const dbRes = await fetch(`${baseUrl}/api/db`, {
        headers: { 'Authorization': `Bearer ${parentToken}` }
      });
      console.log('Test 7 (Access raw /api/db with parent token):', dbRes.status, dbRes.status === 403 ? 'SUCCESS (Blocked)' : 'FAILED (Allowed)');
    } catch (e) {
      console.error('Test 7 Error:', e.message);
    }
  }
}

runTests();
