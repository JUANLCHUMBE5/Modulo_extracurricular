import { supabase } from "../server/supabaseClient.js";

async function run() {
  const dni = "55556667"; // Mariana Gutierrez Leon, should be clean
  const { data: est, error } = await supabase
    .from("estudiantes")
    .select("dni, nombres, estadoInscripcion, estadoCaja")
    .eq("dni", dni);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Mariana Gutierrez Leon status in DB:", est);
  }
}

run();
