import { supabase } from '../server/supabaseClient.js';

async function run() {
  const tables = ['usuarios', 'estudiantes', 'programas', 'inscripciones', 'pagos', 'asistencias', 'invitados_programa', 'audit_logs', 'categorias'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`Table ${table}: count = ${count}, error =`, error);
  }
}
run();
