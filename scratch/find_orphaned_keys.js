import { supabase } from "../server/supabaseClient.js";

async function run() {
  console.log("=== CHECKING FOR MISMATCHED/ORPHANED FOREIGN KEYS ===");

  const { data: inscripciones, error: insErr } = await supabase.from("inscripciones").select("id, dniEstudiante, programa, pagoId");
  const { data: pagos, error: pagErr } = await supabase.from("pagos").select("id, dniEstudiante, programa");

  if (insErr || pagErr) {
    console.error("Error reading tables:", { insErr, pagErr });
    return;
  }

  const pagoIds = new Set(pagos.map(p => p.id));
  console.log(`Total pagos in DB: ${pagos.length}`);
  console.log(`Total inscripciones in DB: ${inscripciones.length}`);

  let orphans = 0;
  inscripciones.forEach(ins => {
    if (ins.pagoId && !pagoIds.has(ins.pagoId)) {
      console.log(`❌ Orphan found! Inscripcion ${ins.id} (Estudiante DNI: ${ins.dniEstudiante}, Programa: ${ins.programa}) has pagoId '${ins.pagoId}', but that payment ID does NOT exist in the pagos table.`);
      orphans++;
    }
  });

  if (orphans === 0) {
    console.log("✅ No orphaned pagoId references found in the database!");
  } else {
    console.log(`Found ${orphans} orphaned records.`);
  }
}

run();
