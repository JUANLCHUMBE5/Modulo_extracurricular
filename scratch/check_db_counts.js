import { supabase } from "../server/supabaseClient.js";

async function getCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error(`Error counting ${tableName}:`, error.message);
      return 0;
    }
    return count;
  } catch (err) {
    console.error(`Exception counting ${tableName}:`, err.message);
    return 0;
  }
}

async function run() {
  console.log("=== DB DATA VOLUME REPORT ===");
  if (!supabase) {
    console.error("Supabase client is null. Ensure .env has SUPABASE_URL and SUPABASE_KEY.");
    return;
  }

  const tables = [
    "usuarios",
    "estudiantes",
    "programas",
    "inscripciones",
    "pagos",
    "asistencias",
    "invitados_programa",
    "categorias",
    "audit_logs"
  ];

  const report = {};
  for (const table of tables) {
    const count = await getCount(table);
    report[table] = count;
  }

  console.log(JSON.stringify(report, null, 2));
}

run();
