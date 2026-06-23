async function verifyWebPaymentFlow() {
  const host = 'http://127.0.0.1:5175';
  
  // 1. Login as caja
  const loginRes = await fetch(`${host}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'caja', password: '1234' })
  });
  
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Caja login failed:', loginData);
    return;
  }
  
  const token = loginData.data.token;
  console.log('Caja login successful.');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Fetch pending web payments
  const bandejaRes = await fetch(`${host}/api/v1/extracurricular/caja/bandeja-pagos-web?periodo=escolar`, { headers });
  const bandeja = await bandejaRes.json();
  if (!bandeja.success || bandeja.data.length === 0) {
    console.log('No pending web payments found to test.');
    return;
  }

  const paymentToTest = bandeja.data[0];
  const pagoId = paymentToTest.pago_id || paymentToTest.id;
  console.log(`Found pending web payment: ID=${pagoId}, Estudiante=${paymentToTest.estudiante}`);

  // 3. Validate payment
  const validarRes = await fetch(`${host}/api/v1/extracurricular/pagos/${pagoId}/validar`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ observaciones: 'Aprobación de prueba' })
  });
  console.log('PUT /pagos/:pagoId/validar status:', validarRes.status);
  const valResult = await validarRes.json();
  console.log('Validated payment receipt number:', valResult.data.nroRecibo || valResult.data.nro_recibo);

  // 4. Check if virtual correlativo is updated
  // Get correlativos (we need dir user for PUT/GET or caja has GET access)
  const corrRes = await fetch(`${host}/api/v1/extracurricular/direccion/correlativos`, { headers });
  const corrData = await corrRes.json();
  console.log('Updated virtual correlativo sequence:', corrData.data.reciboVirtual);

  // 5. Void the payment
  const anularRes = await fetch(`${host}/api/v1/extracurricular/pagos/${pagoId}/anular`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ observaciones: 'Error de prueba, anulando recibo.' })
  });
  console.log('PUT /pagos/:pagoId/anular status:', anularRes.status);
  const anulResult = await anularRes.json();
  console.log('Voided payment status:', anulResult.data.estado_pago || anulResult.data.estado);
  console.log('Voided payment observations:', anulResult.data.motivo_observacion || anulResult.data.observaciones);
}

verifyWebPaymentFlow();
