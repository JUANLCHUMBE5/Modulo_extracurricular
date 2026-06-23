import { supabase } from '../server/supabaseClient.js';

async function checkEnrollment() {
  const { data, error } = await supabase
    .from('inscripciones')
    .select('*')
    .eq('dniEstudiante', '44445555');

  if (error) {
    console.error('Error fetching enrollment:', error);
  } else {
    console.log('Enrollment details:', data);
  }
}

checkEnrollment();
