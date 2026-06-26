import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: program } = await supabase
    .from('programas')
    .select('*')
    .eq('id', 'PROG-003');
  console.log("Program PROG-003:", JSON.stringify(program, null, 2));
}

main().catch(console.error);
