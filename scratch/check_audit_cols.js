import { supabase } from '../server/supabaseClient.js';

async function run() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .limit(1);
  console.log("LOG:", data, error);
}
run();
