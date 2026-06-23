import { supabase } from '../server/supabaseClient.js';

async function main() {
  const tables = [
    'usuarios',
    'estudiantes',
    'programas',
    'inscripciones',
    'pagos',
    'asistencias',
    'invitados_programa',
    'historial_cargas'
  ];

  console.log('--- SUPABASE RECORD COUNTS ---');
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count} rows`);
    }
  }
  console.log('------------------------------');

  // Let's also fetch a list of all students to see what is there
  const { data: students, error: stdError } = await supabase
    .from('estudiantes')
    .select('dni, nombres, estadoInscripcion, estadoCaja');
  if (stdError) {
    console.error('Error fetching students:', stdError.message);
  } else {
    console.log('Students list:', students);
  }

  // Let's check the list of all inscriptions
  const { data: inscripciones, error: insError } = await supabase
    .from('inscripciones')
    .select('id, dniEstudiante, nombresEstudiante, estadoPago, estadoInscripcion');
  if (insError) {
    console.error('Error fetching inscriptions:', insError.message);
  } else {
    console.log('Inscriptions list:', inscripciones);
  }
}

main();
