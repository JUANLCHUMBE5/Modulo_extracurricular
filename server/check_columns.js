import { supabase } from "./supabaseClient.js";

async function check() {
  const { data: inscripciones, error } = await supabase.from("inscripciones").select("gradoEstudiante");
  if (error) {
    console.error("Error fetching inscripciones:", error);
    return;
  }
  const distinctGrades = Array.from(new Set(inscripciones.map(i => i.gradoEstudiante).filter(Boolean)));
  console.log("Distinct grades in database:", distinctGrades);
}

check();
