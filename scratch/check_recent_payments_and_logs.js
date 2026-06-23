import { supabase } from '../server/supabaseClient.js';

async function checkRecentData() {
  const { data: logs, error: errLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (errLogs) {
    console.error('Error fetching logs:', errLogs);
  } else {
    console.log('Recent Audit Logs:', logs.map(l => ({
      id: l.id,
      usuario: l.usuario,
      accion: l.accion,
      detalles: l.detalles,
      fecha: l.created_at || l.fecha
    })));
  }

  const { data: payments, error: errPayments } = await supabase
    .from('pagos')
    .select('*')
    .order('id', { ascending: false })
    .limit(5);

  if (errPayments) {
    console.error('Error fetching payments:', errPayments);
  } else {
    console.log('Recent Payments:', payments.map(p => ({
      id: p.id,
      dniEstudiante: p.dniEstudiante,
      monto: p.monto,
      estado: p.estado,
      origenRegistro: p.origenRegistro,
      fecha: p.fechaPago || p.fecha
    })));
  }
}

checkRecentData();
