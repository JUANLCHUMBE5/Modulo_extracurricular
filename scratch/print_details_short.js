import { supabase } from "../server/supabaseClient.js";
async function run() {
  const dni = "99990000";
  const { data: insc } = await supabase.from("inscripciones").select("*").eq("dniEstudiante", dni);
  const { data: pagos } = await supabase.from("pagos").select("*").eq("dniEstudiante", dni);
  console.log("INSCRIPCION: count =", insc ? insc.length : 0);
  if (insc && insc.length > 0) {
    insc.forEach((i, index) => {
      console.log(`[${index}] id: ${i.id}, estadoPago: ${i.estadoPago || i.estadoInscripcion}, pagoId: ${i.pagoId}`);
    });
  }
  console.log("PAGOS: count =", pagos ? pagos.length : 0);
  if (pagos && pagos.length > 0) {
    pagos.forEach((p, index) => {
      console.log(`[${index}] id: ${p.id}, estado: ${p.estado}, nroOperacion: "${p.numeroOperacion}", capturaLength: ${p.capturaPagoBase64 ? p.capturaPagoBase64.length : 0}, formaPago: ${p.formaPago}`);
    });
  }
}
run();
