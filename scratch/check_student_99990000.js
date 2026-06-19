import { supabase } from "../server/supabaseClient.js";

async function run() {
  const dni = "99990000";
  console.log(`=== CHECKING DB RECORDS FOR DNI: ${dni} ===`);

  // Fetch student
  const { data: est, error: errEst } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("dni", dni);
  console.log("Estudiante:", est);

  // Fetch registrations
  const { data: insc, error: errInsc } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("dniEstudiante", dni);
  console.log("Inscripciones:", insc);

  // Fetch payments
  const { data: pagos, error: errPagos } = await supabase
    .from("pagos")
    .select("*")
    .eq("dniEstudiante", dni);
  console.log("Pagos:", pagos);

  // Fetch assistant/other state if any
  console.log("=== CHECK COMPLETE ===");
}

run();
