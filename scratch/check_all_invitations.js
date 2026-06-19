import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: invitados, error } = await supabase.from('invitados_programa').select('*, programas(*)');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('--- Todas las Invitaciones ---');
  invitados.forEach(i => {
    console.log(`DNI: ${i.dni}, Alumno: ${i.nombres}, Grado: ${i.grado}, ProgramaId: ${i.programaId}, ProgNombre: ${i.programas?.nombre}, ProgGrados: ${i.programas?.gradosAplicables}`);
  });
}

check();
