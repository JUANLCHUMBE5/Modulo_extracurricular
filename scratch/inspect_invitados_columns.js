import { supabase } from '../server/supabaseClient.js';

async function main() {
  console.log("=== INSPECTING invitados_programa TABLE ===");
  const { data, error } = await supabase
    .from('invitados_programa')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching from invitados_programa:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columnas de invitados_programa encontradas:", Object.keys(data[0]));
    console.log("Datos de muestra:", data[0]);
  } else {
    console.log("No se encontraron registros en invitados_programa.");
  }
}

main();
