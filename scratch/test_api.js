
async function runTests() {
  console.log('--- STARTING BACKEND ROLE AND AUDIT LOG TESTS ---');
  
  const baseUrl = 'http://127.0.0.1:5175';
  
  // 1. Login as admin
  console.log('\n1. Logging in as admin...');
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '1234' })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Failed to log in as admin:', loginData);
    process.exit(1);
  }
  
  const adminToken = loginData.data.token;
  console.log('Admin login successful! Token retrieved.');

  // 2. Login as dir (Direccion role)
  console.log('\n2. Logging in as dir (Direccion)...');
  const dirLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dir', password: '1234' })
  });
  
  const dirLoginData = await dirLoginRes.json();
  if (!dirLoginData.success) {
    console.error('Failed to log in as dir:', dirLoginData);
    process.exit(1);
  }
  
  const dirToken = dirLoginData.data.token;
  console.log('Direccion login successful! Token retrieved.');

  // 3. Test endpoint role protection (Forbidden test)
  console.log('\n3. Testing endpoint role protection: Direccion calling Caja endpoint...');
  const testForbiddenRes = await fetch(`${baseUrl}/api/v1/extracurricular/caja/bandeja-pagos-web?periodo=escolar`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${dirToken}` }
  });
  
  const forbiddenStatus = testForbiddenRes.status;
  const forbiddenJson = await testForbiddenRes.json();
  console.log(`Response status: ${forbiddenStatus}`);
  console.log(`Response body:`, forbiddenJson);
  
  if (forbiddenStatus === 403) {
    console.log('✅ PASS: Access correctly denied (403 Forbidden) for unauthorized role.');
  } else {
    console.error('❌ FAIL: Access was not denied correctly for unauthorized role.');
    process.exit(1);
  }

  // 4. Test endpoint role protection (Success test for permitted role)
  console.log('\n4. Testing endpoint role protection: Direccion calling Direccion endpoint...');
  const testSuccessRes = await fetch(`${baseUrl}/api/v1/extracurricular/reportes/resumen?periodo=escolar`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${dirToken}` }
  });
  
  const successStatus = testSuccessRes.status;
  const successJson = await testSuccessRes.json();
  console.log(`Response status: ${successStatus}`);
  
  if (successStatus === 200) {
    console.log('✅ PASS: Access correctly granted (200 OK) for permitted role.');
  } else {
    console.error('❌ FAIL: Access denied for permitted role:', successJson);
    process.exit(1);
  }

  // 5. Test auditing: creating a program as admin
  console.log('\n5. Creating a test program as admin (triggers PROGRAMA_CREAR audit)...');
  const createProgramRes = await fetch(`${baseUrl}/api/v1/extracurricular/programas`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      nombre_programa: 'Taller de Robotica Prueba',
      categoria: 'Ciencia',
      fecha_inicio: '2026-06-10',
      fecha_fin: '2026-07-10',
      monto: 150,
      cupos: 20
    })
  });
  
  const programData = await createProgramRes.json();
  console.log('Program creation status:', createProgramRes.status);
  if (!programData.success) {
    console.error('Failed to create program:', programData);
    process.exit(1);
  }
  
  const newProgramId = programData.data.id;
  console.log(`Program created successfully! ID: ${newProgramId}`);

  // 6. Test audit logs endpoint
  console.log('\n6. Checking audit logs for new audit entries...');
  const logsRes = await fetch(`${baseUrl}/api/v1/administrador/audit-logs`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const logsData = await logsRes.json();
  if (!logsData.success) {
    console.error('Failed to fetch audit logs:', logsData);
    process.exit(1);
  }
  
  // Find our created program audit log
  const createdLog = logsData.data.find(log => log.accion === 'PROGRAMA_CREAR');
  console.log('Audit logs found:', logsData.data.slice(0, 5));
  
  if (createdLog) {
    console.log('✅ PASS: Audit log entry for PROGRAMA_CREAR was found successfully!');
    console.log(`Log details:`, createdLog);
  } else {
    console.error('❌ FAIL: Audit log entry for PROGRAMA_CREAR was NOT found.');
    process.exit(1);
  }

  // Cleanup: delete the test program
  console.log('\n7. Cleaning up test program...');
  const deleteRes = await fetch(`${baseUrl}/api/v1/extracurricular/programas/${newProgramId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Delete response status:', deleteRes.status);

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('Error during testing:', err);
  process.exit(1);
});
