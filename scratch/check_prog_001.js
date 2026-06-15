import { supabase } from '../server/supabaseClient.js';

async function run() {
  const { data: enrollments, error: err1 } = await supabase
    .from('inscripciones')
    .select('id, dniEstudiante, nombresEstudiante, programaId, programa');

  if (err1) {
    console.error("Error fetching enrollments:", err1);
    return;
  }

  console.log("ALL ENROLLMENTS IN SUPABASE:");
  console.log(enrollments);
  
  const prog001 = enrollments.filter(e => e.programaId === 'PROG-001');
  console.log("\nPROG-001 ENROLLMENTS:");
  console.log(prog001);
}
run();
