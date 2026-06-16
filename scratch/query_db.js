import { getDb } from "../server/localDb.js";
import { normalizarDuracionAvisoDias, obtenerVentanaInscripcion } from "../src/services/dateService.js";

// Set env variables so getDb knows we are in supabase mode
process.env.DATA_MODE = "supabase";
process.env.VITE_DATA_MODE = "supabase";

async function run() {
  const db = await getDb();
  const maraton = (db.programas || []).find(p => String(p.nombre || p.nombre_programa).toUpperCase().includes("MARATON"));
  console.log("PROGRAMA MARATON EN BD:", JSON.stringify(maraton, null, 2));
  
  if (maraton) {
    const duracion = maraton.duracionAvisoDias || maraton.duracion_aviso_dias || 1;
    const hora = maraton.horaLimiteAviso || maraton.hora_limite_aviso || "23:59";
    const fecha = maraton.fechaInicio || maraton.fecha_inicio || "";
    
    console.log("Mapeado de fecha:", fecha, "duracion:", duracion, "hora:", hora);
    const windowVal = obtenerVentanaInscripcion(fecha, new Date(), duracion, hora);
    console.log("VENTANA EN TIEMPO REAL:", JSON.stringify(windowVal, null, 2));
  }
}

run().catch(console.error);
