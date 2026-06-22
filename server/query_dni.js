import { supabase } from "./supabaseClient.js";

async function query() {
  const { data: invitados, error } = await supabase.from("invitados_programa").select("*").eq("dni", "55556666");
  if (error) {
    console.error("Error querying DNI in invitados_programa:", error);
    return;
  }
  console.log("Matches in invitados_programa:", invitados);

  const { data: inscripciones, error: errorIns } = await supabase.from("inscripciones").select("*").eq("dniEstudiante", "55556666");
  if (errorIns) {
    console.error("Error querying DNI in inscripciones:", errorIns);
    return;
  }
  console.log("Matches in inscripciones:", inscripciones);
}

query();
