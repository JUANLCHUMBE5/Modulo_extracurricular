import { getDb, saveDb } from "../server/localDb.js";

process.env.DATA_MODE = "supabase";
process.env.VITE_DATA_MODE = "supabase";

async function run() {
  const db = await getDb();
  const maraton = (db.programas || []).find(p => p.id === "PROG-002" || String(p.nombre || p.nombre_programa).toUpperCase().includes("MARATON"));
  
  if (maraton) {
    maraton.horaLimiteAviso = "09:18";
    await saveDb(db);
    console.log("BASE DE DATOS ACTUALIZADA CON EXITO PARA MARATON (09:18)!");
  } else {
    console.log("No se encontro el programa MARATON.");
  }
}

run().catch(console.error);
