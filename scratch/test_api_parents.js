async function testApiParents() {
  const host = 'http://127.0.0.1:5175';

  console.log("Logging in as 'secretaria' (since it can access parents summary too)...");
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

  console.log("\nQuerying parent summary for DNI 66667777...");
  const parentRes = await fetch(`${host}/api/v1/extracurricular/padres/resumen/66667777`, { headers });
  const parentData = await parentRes.json();

  if (!parentRes.ok) {
    console.error("❌ Request failed:", parentData);
    return;
  }

  const res = parentData.data;
  console.log("Resumen student:");
  console.log(`- DNI: ${res.estudiante_id}`);
  console.log(`- nombres: ${res.nombres}`);
  
  const inv = res.invitaciones?.[0];
  console.log("First invitation in resume:");
  console.log(`- programa_id: ${inv?.programa_id}`);
  console.log(`- programa: ${inv?.programa}`);
  console.log(`- seleccion: '${inv?.seleccion}' (Expected: 'C')`);
  console.log(`- nivel_cambridge: '${inv?.nivel_cambridge}' (Expected: 'Flyers')`);

  if (inv?.seleccion === 'C' && inv?.nivel_cambridge === 'Flyers') {
    console.log("\n✅ Parents summary API integration works perfectly!");
  } else {
    console.error("\n❌ Parents summary API integration failed!");
  }
}

testApiParents();
