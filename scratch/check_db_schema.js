import { supabase } from "../server/supabaseClient.js";

async function run() {
  console.log("=== CHECKING COLUMNS IN SUPABASE ===");

  const { data: insSample, error: insErr } = await supabase.from("inscripciones").select("*").limit(1);
  if (insErr) {
    console.error("Error reading inscripciones:", insErr);
  } else if (insSample && insSample.length > 0) {
    console.log("Inscripciones columns:", Object.keys(insSample[0]));
  } else {
    console.log("No records in inscripciones, fetching schema info or empty");
  }

  const { data: pagSample, error: pagErr } = await supabase.from("pagos").select("*").limit(1);
  if (pagErr) {
    console.error("Error reading pagos:", pagErr);
  } else if (pagSample && pagSample.length > 0) {
    console.log("Pagos columns:", Object.keys(pagSample[0]));
  } else {
    console.log("No records in pagos, fetching schema info or empty");
  }
}

run();
