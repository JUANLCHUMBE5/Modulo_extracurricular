import { supabase } from '../server/supabaseClient.js';

async function main() {
  const dni = '66667777';
  console.log(`=== ANALYZING STUDENT STATE FOR DNI: ${dni} ===\n`);

  console.log('--- Table: estudiantes ---');
  const { data: est, error: estErr } = await supabase.from('estudiantes').select('*').eq('dni', dni);
  if (estErr) console.error('Error:', estErr.message);
  else console.log(JSON.stringify(est, null, 2));

  console.log('\n--- Table: invitados_programa ---');
  const { data: inv, error: invErr } = await supabase.from('invitados_programa').select('*').eq('dni', dni);
  if (invErr) console.error('Error:', invErr.message);
  else console.log(JSON.stringify(inv, null, 2));

  console.log('\n--- Table: inscripciones ---');
  const { data: ins, error: insErr } = await supabase.from('inscripciones').select('*').eq('dniEstudiante', dni);
  if (insErr) console.error('Error:', insErr.message);
  else console.log(JSON.stringify(ins, null, 2));

  console.log('\n--- Table: pagos ---');
  const { data: pag, error: pagErr } = await supabase.from('pagos').select('*').eq('dniEstudiante', dni);
  if (pagErr) console.error('Error:', pagErr.message);
  else console.log(JSON.stringify(pag, null, 2));

  console.log('\n--- Table: asistencias ---');
  const { data: ast, error: astErr } = await supabase.from('asistencias').select('*').eq('dniEstudiante', dni);
  if (astErr) console.error('Error:', astErr.message);
  else console.log(JSON.stringify(ast, null, 2));
}

main();
