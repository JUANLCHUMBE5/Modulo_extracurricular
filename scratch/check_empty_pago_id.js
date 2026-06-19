import { supabase } from "../server/supabaseClient.js";

async function run() {
  console.log("=== CHECKING FOR EMPTY STRING PAGO_ID IN INSCRIPCIONES ===");

  const { data: inscripciones, error } = await supabase.from("inscripciones").select("*");
  if (error) {
    console.error("Error fetching inscripciones:", error);
    return;
  }

  let count = 0;
  inscripciones.forEach(ins => {
    // Check if pagoId is empty string, spaces, or has "null" as string
    if (ins.pagoId === "" || ins.pagoId === "null" || (ins.pagoId && String(ins.pagoId).trim() === "")) {
      console.log(`⚠️ Found invalid/empty pagoId in DB:`, {
        id: ins.id,
        dniEstudiante: ins.dniEstudiante,
        programa: ins.programa,
        pagoId: ins.pagoId,
        type: typeof ins.pagoId
      });
      count++;
    }
  });

  console.log(`Total checked: ${inscripciones.length}. Invalid cased pagoId found: ${count}`);
}

run();
