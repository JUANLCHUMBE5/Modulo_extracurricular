import { getDb, saveDb } from "../server/localDb.js";

// Set env variables
process.env.DATA_MODE = "supabase";
process.env.VITE_DATA_MODE = "supabase";

async function run() {
  console.log("=== SIMULATING PAYMENT SUBMISSION ===");
  const db = await getDb();

  const enrollmentId = "INS-954768";
  const inscrip = (db.inscripciones || []).find(item => item.id === enrollmentId);
  if (!inscrip) {
    console.error(`Enrollment ${enrollmentId} not found in DB!`);
    return;
  }

  // Generate a mock payment
  const mockPagoId = `PAG-TST-${String(Date.now()).slice(-4)}`;
  const nuevoPago = {
    id: mockPagoId,
    inscripcionId: enrollmentId,
    dniEstudiante: inscrip.dniEstudiante,
    nombresEstudiante: inscrip.nombresEstudiante,
    programaId: inscrip.programaId,
    programa: inscrip.programa,
    periodo: inscrip.periodo,
    monto: Number(inscrip.costo || 0),
    formaPago: "Yape",
    numeroOperacion: "1234567890",
    telefonoOperacion: "999999999",
    capturaPagoNombre: "test.png",
    capturaPagoBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    estado: "verificando",
    estadoVerificacion: "pendiente",
    fecha: new Date().toISOString(),
    fechaPago: new Date().toISOString(),
    origenRegistro: "Portal padres"
  };

  db.pagos = db.pagos || [];
  db.pagos.push(nuevoPago);

  inscrip.estadoPago = "pendiente";
  inscrip.estadoInscripcion = "Pago en proceso";
  inscrip.pagoId = mockPagoId;

  console.log(`Prepared new payment: ${mockPagoId} for enrollment: ${enrollmentId}`);
  console.log("Calling saveDb...");
  try {
    await saveDb(db);
    console.log("✅ saveDb completed successfully!");
  } catch (error) {
    console.error("❌ saveDb failed with error:", error);
  }
}

run().catch(console.error);
