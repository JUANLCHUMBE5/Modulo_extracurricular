import { supabase } from '../server/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
dotenv.config({ path: './server/.env' });

async function run() {
  const { data, error } = await supabase.from('categorias').select('*');
  console.log("Categorias in Supabase:", data, error);
}

run();
