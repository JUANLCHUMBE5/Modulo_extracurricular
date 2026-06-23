import { supabase } from '../server/supabaseClient.js';

async function main() {
  console.log('Starting cleanup of test data in Supabase...');

  // 1. Update/Delete INS-TEST-99 from inscripciones
  const { error: insErr } = await supabase
    .from('inscripciones')
    .delete()
    .eq('id', 'INS-TEST-99');
  
  if (insErr) {
    console.error('Error deleting INS-TEST-99:', insErr.message);
  } else {
    console.log('Successfully deleted INS-TEST-99 from inscripciones.');
  }

  // 2. Delete PAG-753202 from pagos
  const { error: payErr } = await supabase
    .from('pagos')
    .delete()
    .eq('id', 'PAG-753202');

  if (payErr) {
    console.error('Error deleting PAG-753202:', payErr.message);
  } else {
    console.log('Successfully deleted PAG-753202 from pagos.');
  }

  console.log('Cleanup finished.');
}

main().catch(console.error);
