import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let client = null;
if (supabaseUrl && supabaseKey) {
  client = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("⚠️ Advertencia: No se inicializó el cliente de Supabase por falta de credenciales en .env. Esto es correcto si estás usando el modo local.");
}

export const supabase = client;

