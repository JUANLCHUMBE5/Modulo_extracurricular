import { supabase } from '../server/supabaseClient.js';

async function main() {
  console.log('Reverting test payment and resetting Camila Paredes Silva to pending...');

  // 1. Update the inscription INS-001117 to set estadoPago='pendiente' and pagoId=null
  const { error: insErr } = await supabase
    .from('inscripciones')
    .update({
      estadoPago: 'pendiente',
      estadoCaja: 'derivado_caja',
      pagoId: null
    })
    .eq('id', 'INS-001117');

  if (insErr) {
    console.error('Error updating inscription INS-001117:', insErr.message);
  } else {
    console.log('Successfully updated inscription INS-001117.');
  }

  // 2. Make sure student record has correct states
  const { error: stdErr } = await supabase
    .from('estudiantes')
    .update({
      estadoInscripcion: 'confirmada',
      estadoCaja: 'derivado_caja'
    })
    .eq('dni', '55556666');

  if (stdErr) {
    console.error('Error updating student record:', stdErr.message);
  } else {
    console.log('Successfully updated student record.');
  }

  console.log('Reversion complete.');
}

main().catch(console.error);
