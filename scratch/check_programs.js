import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: programas, error } = await supabase.from('programas').select('*');
  if (error) {
    console.error('Error fetching programs:', error);
    return;
  }
  console.log('--- Programas Habilitados ---');
  programas.forEach(p => {
    let meta = {};
    if (p.grupo && p.grupo.startsWith('{')) {
      try {
        meta = JSON.parse(p.grupo);
      } catch (e) {}
    }
    console.log(`- ID: ${p.id}, Nombre: ${p.nombre}, Estado: ${p.estado || meta.estado}, Grados: ${p.gradosAplicables || meta.gradosAplicables}, Periodo: ${p.periodo}`);
  });
}

check();
