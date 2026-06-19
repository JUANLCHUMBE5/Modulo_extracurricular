import { supabase } from "../server/supabaseClient.js";

async function run() {
  const dni = "99990000";
  
  const { data: insc } = await supabase.from("inscripciones").select("id, programaId, estadoInscripcion, estadoPago").eq("dniEstudiante", dni);
  console.log("Inscripciones encontradas:");
  console.log(JSON.stringify(insc, null, 2));

  const { data: pagos } = await supabase.from("pagos").select("id, inscripcionId, estado, monto, numeroOperacion, capturaPagoBase64, formaPago, fechaPago").eq("dniEstudiante", dni);
  console.log("Pagos encontrados:");
  console.log(JSON.stringify(pagos, null, 2));
}

run();
