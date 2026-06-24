import { supabase } from '../server/supabaseClient.js';
import { getDb, saveDb } from '../server/localDb.js';

async function main() {
  console.log("=== STARTING DATABASE SYNC TEST ===");

  const dni = '66667777';
  const programaId = 'PROG-001';

  // 1. Direct Supabase Update
  console.log("\n1. Updating Supabase directly with selection 'B' and level 'Movers'...");
  const { error: updateErr } = await supabase
    .from('invitados_programa')
    .update({ seleccion: 'B', nivelCambridge: 'Movers' })
    .eq('programaId', programaId)
    .eq('dni', dni);

  if (updateErr) {
    console.error("❌ Error updating Supabase directly:", updateErr.message);
    return;
  }
  console.log("✅ Supabase directly updated successfully.");

  // 2. Read through localDb mapping (calls readFromSupabase)
  console.log("\n2. Reading database via localDb.js getDb()...");
  const db = await getDb();
  const invitados = db.invitadosPorPrograma[programaId] || [];
  const inv = invitados.find(i => i.dni === dni);

  if (!inv) {
    console.error("❌ Guest invitation not found in in-memory database!");
    return;
  }

  console.log("Result loaded in-memory:");
  console.log(`- DNI: ${inv.dni}`);
  console.log(`- Nombres: ${inv.nombres}`);
  console.log(`- seleccion: '${inv.seleccion}' (Expected: 'B')`);
  console.log(`- nivelCambridge: '${inv.nivelCambridge}' (Expected: 'Movers')`);

  if (inv.seleccion === 'B' && inv.nivelCambridge === 'Movers') {
    console.log("✅ readFromSupabase mapping works perfectly!");
  } else {
    console.error("❌ readFromSupabase mapping failed!");
    return;
  }

  // 3. Update in-memory database and save back to Supabase (calls saveDb)
  console.log("\n3. Updating in-memory object to selection 'C' and level 'Flyers'...");
  inv.seleccion = 'C';
  inv.nivelCambridge = 'Flyers';

  console.log("Saving database via localDb.js saveDb()...");
  await saveDb(db);
  console.log("✅ Database saved successfully.");

  // 4. Verify in Supabase directly
  console.log("\n4. Reading from Supabase directly to verify update...");
  const { data: rawInv, error: readErr } = await supabase
    .from('invitados_programa')
    .select('*')
    .eq('programaId', programaId)
    .eq('dni', dni);

  if (readErr) {
    console.error("❌ Error reading Supabase directly:", readErr.message);
    return;
  }

  if (rawInv && rawInv.length > 0) {
    const raw = rawInv[0];
    console.log("Raw row in Supabase:");
    console.log(`- DNI: ${raw.dni}`);
    console.log(`- seleccion: '${raw.seleccion}' (Expected: 'C')`);
    console.log(`- nivelCambridge: '${raw.nivelCambridge}' (Expected: 'Flyers')`);

    if (raw.seleccion === 'C' && raw.nivelCambridge === 'Flyers') {
      console.log("✅ saveDb mapping works perfectly!");
    } else {
      console.error("❌ saveDb mapping failed!");
    }
  } else {
    console.error("❌ Row not found in Supabase after save!");
  }
}

main();
