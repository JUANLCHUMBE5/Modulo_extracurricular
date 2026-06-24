import { createClient } from '@supabase/supabase-js';

const URL = "https://wgimhsphifnayijqwxxf.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnaW1oc3BoaWZuYXlpanF3eHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI0NzQ0MCwiZXhwIjoyMDk3ODIzNDQwfQ.8F_GbjFb-h06OHu0JtlatTEIJGeGyJKMQ9qkQ_Jii08";

const supabase = createClient(URL, KEY);

const TABLES_TO_CLEAR = [
  "asistencias",
  "pagos",
  "inscripciones",
  "invitados_programa",
  "programas_configuraciones",
  "programas_horarios",
  "programas_servicios",
  "programas_documentos",
  "programas_anuncios",
  "programas",
  "estudiantes_externos",
  "historial_cargas",
  "audit_logs"
];

async function clearData() {
  console.log("🧹 Iniciando la limpieza de registros operacionales en Supabase...");
  
  for (const table of TABLES_TO_CLEAR) {
    console.log(`⏳ Vaciando la tabla '${table}'...`);
    try {
      let query = supabase.from(table).delete();
      
      if (table === "invitados_programa") {
        query = query.neq("dni", "dummy");
      } else if (table === "programas_configuraciones" || table === "programas_horarios" || table === "programas_servicios" || table === "programas_documentos" || table === "programas_anuncios") {
        query = query.neq("programaId", "dummy");
      } else if (table === "programas") {
        query = query.neq("id", "dummy");
      } else if (table === "estudiantes_externos" || table === "estudiantes") {
        query = query.neq("dni", "dummy");
      } else {
        query = query.neq("id", "dummy");
      }

      const { error } = await query;
      
      if (error) {
        console.error(`❌ Error al vaciar tabla '${table}':`, error.message);
      } else {
        console.log(`✅ Tabla '${table}' vaciada con éxito.`);
      }
    } catch (e) {
      console.error(`❌ Excepción en tabla '${table}':`, e.message);
    }
  }

  // Double check how many students remain in the database
  const { count, error } = await supabase.from('estudiantes').select('*', { count: 'exact', head: true });
  if (error) {
    console.error("❌ Error verificando estudiantes restantes:", error.message);
  } else {
    console.log(`\n👥 Estudiantes principales que quedan en la base de datos: ${count} (esperados: 15)`);
  }

  console.log("\n🎉 ¡PROCESO DE LIMPIEZA FINALIZADO! 🎉");
}

clearData();
