import { supabase } from '../server/supabaseClient.js';
import { getDb } from '../server/localDb.js';

async function main() {
  console.log("=== INSPECTING CURRENT CAMBRIDGE GUESTS ===");

  const db = await getDb();
  const programs = db.programas || [];
  
  // Find Cambridge programs
  const cambridgePrograms = programs.filter(p => {
    const text = String(p.nombre || p.programa || p.categoria || "").toLowerCase();
    return text.includes("cambridge") || text.includes("cambrigde") || text.includes("ingles");
  });

  console.log(`\nFound ${cambridgePrograms.length} Cambridge program(s):`);
  cambridgePrograms.forEach(p => console.log(`- [${p.id}] ${p.nombre} (${p.categoria || 'Sin categoria'})`));

  if (cambridgePrograms.length === 0) {
    console.log("No Cambridge programs found.");
    return;
  }

  for (const prog of cambridgePrograms) {
    console.log(`\nGuests for ${prog.nombre} (ID: ${prog.id}):`);
    const { data: guests, error } = await supabase
      .from('invitados_programa')
      .select('*')
      .eq('programaId', prog.id);

    if (error) {
      console.error(`❌ Error fetching guests for ${prog.id}:`, error.message);
      continue;
    }

    if (guests && guests.length > 0) {
      console.table(guests.map(g => ({
        DNI: g.dni,
        Nombres: g.nombres,
        Grado: g.grado,
        Sección: g.seccion || 'Sin sección',
        Selección: g.seleccion || 'NO ASIGNADA',
        NivelCambridge: g.nivelCambridge || 'NO ASIGNADO'
      })));
    } else {
      console.log("No guests registered for this program.");
    }
  }
}

main();
