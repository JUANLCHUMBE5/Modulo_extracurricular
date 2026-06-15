import { supabase } from '../server/supabaseClient.js';

async function run() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(10);
  console.log("LAST 10 AUDIT LOGS:");
  data?.forEach(log => {
    console.log(`${log.fecha} - ${log.usuario} - ${log.accion} - ${log.detalles}`);
  });
}
run();
