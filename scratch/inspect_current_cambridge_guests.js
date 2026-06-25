import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  const { data: progs, error: err1 } = await supabase.from('programas').select('*');
  console.log("=== PROGRAMAS IN SUPABASE ===");
  if (err1) console.error(err1.message);
  else console.log(JSON.stringify(progs, null, 2));

  const { data: guests, error: err2 } = await supabase.from('invitados_programa').select('*');
  console.log("\n=== INVITADOS IN SUPABASE ===");
  if (err2) console.error(err2.message);
  else console.log(JSON.stringify(guests, null, 2));
}

main().catch(console.error);
