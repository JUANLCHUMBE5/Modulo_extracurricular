import { supabase } from '../server/supabaseClient.js';

async function main() {
  console.log('--- RAW INSCRIPCIONES ---');
  const { data: ins, error: insErr } = await supabase.from('inscripciones').select('*');
  if (insErr) {
    console.error('Error fetching raw inscripciones:', insErr.message);
  } else {
    console.log(ins.map(i => ({ id: i.id, dni: i.dniEstudiante, nombre: i.nombresEstudiante, estado: i.estadoPago })));
  }

  console.log('--- RAW INVITADOS_PROGRAMA ---');
  const { data: inv, error: invErr } = await supabase.from('invitados_programa').select('*');
  if (invErr) {
    console.error('Error fetching raw invitados:', invErr.message);
  } else {
    console.log(inv);
  }
}
main();
