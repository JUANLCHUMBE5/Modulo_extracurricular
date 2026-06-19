import { supabase } from "../server/supabaseClient.js";

async function run() {
  const dni = "99990000";
  console.log(`=== FETCHING INSCRIPCIONES FOR ${dni} ===`);
  const { data, error } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("dniEstudiante", dni);

  if (error) {
    console.error("❌ Error fetching inscripciones:", error);
  } else {
    console.log("✅ Success! Data:", data);
  }
}

run();
