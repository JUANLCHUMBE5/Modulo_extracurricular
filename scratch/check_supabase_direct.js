import { supabase } from '../server/supabaseClient.js';

async function run() {
  const { data: progs, error: err1 } = await supabase.from('programas').select('*');
  console.log("Programas in Supabase directly:", progs, err1);

  const { data: insc, error: err2 } = await supabase.from('inscripciones').select('*');
  console.log("Inscripciones in Supabase directly:", insc, err2);
}
run();
