import dotenv from 'dotenv';
dotenv.config();
import { getDb, saveDb } from '../server/localDb.js';

async function testIncrement() {
  const host = 'http://127.0.0.1:5175';

  console.log('Preparing database for clean test...');
  const db = await getDb();
  
  // Clone an existing valid inscription to guarantee all DB constraints are met
  const templateIns = db.inscripciones[0];
  if (!templateIns) {
    console.error('No inscriptions found in database to clone.');
    return;
  }
  
  const testIns = {
    ...templateIns,
    id: 'INS-TEST-99',
    estadoPago: 'pendiente',
    estadoInscripcion: 'pendiente_pago',
    pagoId: null,
    fechaPago: null,
    derivadoCaja: true,
    estadoCaja: ''
  };
  
  // Clean up any leftovers from previous aborted test runs
  db.inscripciones = db.inscripciones.filter(i => i.id !== 'INS-TEST-99');
  db.pagos = db.pagos.filter(p => p.inscripcionId !== 'INS-TEST-99');
  
  // Push the test inscription
  db.inscripciones.push(testIns);

  // Set correlativos starting sequence to REC-0500
  db.correlativos = db.correlativos || {};
  db.correlativos.recibo = 'REC-0500';
  db.correlativos.reciboVirtual = 'V-1001';
  db.correlativos.egreso = 'EGR-0200';
  
  await saveDb(db);
  console.log('Temporary DB state saved.');

  // Login as 'caja'
  const loginRes = await fetch(`${host}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'caja', password: '1234' })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Login failed:', loginData);
    return;
  }
  const token = loginData.data.token;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Fetch current correlativos via API
  const getRes = await fetch(`${host}/api/v1/extracurricular/direccion/correlativos`, { headers });
  const getData = await getRes.json();
  const currentRecibo = getData.data.recibo;
  console.log('Current API db.correlativos.recibo:', currentRecibo);

  // Register payment for INS-TEST-99 using currentRecibo (REC-0500)
  console.log(`Registering payment with receipt number: ${currentRecibo}`);
  const payRes = await fetch(`${host}/api/v1/extracurricular/pagos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inscripcionId: 'INS-TEST-99',
      dniEstudiante: testIns.dniEstudiante,
      monto: Number(testIns.costo || 50),
      formaPago: 'Efectivo',
      nroRecibo: currentRecibo
    })
  });
  const payData = await payRes.json();
  console.log('Register payment status:', payRes.status);
  
  // Fetch correlativos again to see if it incremented
  const getRes2 = await fetch(`${host}/api/v1/extracurricular/direccion/correlativos`, { headers });
  const getData2 = await getRes2.json();
  console.log('New db.correlativos.recibo after registration:', getData2.data.recibo);

  // CLEAN UP: Remove the temporary test inscription and payment to restore DB to original state
  console.log('Restoring DB to original clean state...');
  const finalDb = await getDb();
  
  // Remove the test payment and inscription we created
  finalDb.inscripciones = finalDb.inscripciones.filter(i => i.id !== 'INS-TEST-99');
  finalDb.pagos = finalDb.pagos.filter(p => p.inscripcionId !== 'INS-TEST-99');
  
  await saveDb(finalDb);
  console.log('Clean up complete. DB restored.');
}

testIncrement();
