async function testApiGuest() {
  const host = 'http://127.0.0.1:5175';

  console.log("Logging in as 'secretaria'...");
  const loginRes = await fetch(`${host}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'secretaria', password: '1234' })
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error("❌ Login failed:", loginData);
    return;
  }

  const token = loginData.data.token;
  console.log("✅ Logged in successfully.");

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log("\nQuerying student 66667777 for period 'escolar'...");
  const studentRes = await fetch(`${host}/api/v1/extracurricular/secretaria/estudiantes/66667777?periodo=escolar`, { headers });
  const studentData = await studentRes.json();

  if (!studentRes.ok) {
    console.error("❌ Request failed:", studentData);
    return;
  }

  const student = studentData.data;
  console.log("API response student fields:");
  console.log(`- DNI: ${student?.dni_estudiante}`);
  console.log(`- nombres: ${student?.nombres}`);
  console.log(`- tieneInvitacion: ${student?.tieneInvitacion}`);
  console.log(`- seleccion: '${student?.seleccion}' (Expected: 'C')`);
  console.log(`- nivelCambridge: '${student?.nivelCambridge}' (Expected: 'Flyers')`);

  if (student?.seleccion === 'C' && student?.nivelCambridge === 'Flyers') {
    console.log("\n✅ API integration works perfectly!");
  } else {
    console.error("\n❌ API integration failed!");
  }
}

testApiGuest();
