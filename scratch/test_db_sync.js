import { getDb } from "../server/localDb.js";

// Set env variables
process.env.DATA_MODE = "supabase";
process.env.VITE_DATA_MODE = "supabase";

async function run() {
  const db = await getDb();
  console.log("=== MEMORY DB STATE ===");
  console.log(`Inscripciones count: ${db.inscripciones?.length}`);
  console.log(`Pagos count: ${db.pagos?.length}`);

  // Let's check every enrollment's pagoId
  const pagoIds = new Set((db.pagos || []).map(p => p.id));
  console.log("Available Pago IDs in memory:", Array.from(pagoIds));

  db.inscripciones.forEach(ins => {
    console.log(`Enrollment ID: ${ins.id}, DNI: ${ins.dniEstudiante}, Program: ${ins.programa}, pagoId: '${ins.pagoId}', type: ${typeof ins.pagoId}`);
    if (ins.pagoId && !pagoIds.has(ins.pagoId)) {
      console.log(`❌ Mismatch found in memory! Enrollment ${ins.id} references pagoId '${ins.pagoId}' which is NOT in memory payments.`);
    }
  });
}

run().catch(console.error);
