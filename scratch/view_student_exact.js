import { supabase } from "../server/supabaseClient.js";

async function run() {
  const dni = "99990000";
  console.log(`=== CHECKING STUDENT ${dni} ===`);

  const { data: est } = await supabase.from("estudiantes").select("dni, nombres").eq("dni", dni);
  console.log("Estudiante:", est);

  const { data: insc } = await supabase.from("inscripciones").select("id, " + '"pagoId"' + ", " + '"dniEstudiante"' + ", programa, " + '"estadoInscripcion"' + ", " + '"estadoPago"').eq("dniEstudiante", dni);
  console.log("Inscripciones:", insc);

  const { data: pagos } = await supabase.from("pagos").select("id, " + '"inscripcionId"' + ", " + '"dniEstudiante"' + ", programa, estado").eq("dniEstudiante", dni);
  console.log("Pagos:", pagos);
}

run();
