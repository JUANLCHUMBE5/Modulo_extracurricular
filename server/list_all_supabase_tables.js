import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listTables() {
  // Query Supabase's information schema via an RPC or raw SQL if allowed, or check standard system tables
  // Let's try to query public schemas or try querying a table named 'configuraciones' to see if it exists
  const tablesToTry = ["configuraciones", "configuracion", "correlativos", "ajustes", "config"];
  for (const t of tablesToTry) {
    try {
      const { data, error } = await supabase.from(t).select("*");
      if (error) {
        console.log(`Table '${t}' error:`, error.message);
      } else {
        console.log(`Table '${t}' exists! Data:`, data);
      }
    } catch (e) {
      console.log(`Table '${t}' exception:`, e.message);
    }
  }
}

listTables();
