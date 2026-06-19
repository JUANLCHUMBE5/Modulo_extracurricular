import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: invitados, error } = await supabase.from('invitados_programa').select('*, programas(*)').eq('dni', '22223333');
  if (error) {
    console.error('Error fetching invitations:', error);
    return;
  }
  console.log('--- Invitaciones de Mateo Quispe Huaman ---');
  console.log(JSON.stringify(invitados, null, 2));
}

check();
