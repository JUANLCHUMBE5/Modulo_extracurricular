import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  console.log("📊 Verificando estado de Supabase...\n");

  const tablas = [
    'usuarios', 'estudiantes', 'programas', 'inscripciones', 'pagos',
    'asistencias', 'invitados_programa', 'audit_logs', 'categorias',
    'historial_cargas', 'configuracion', 'estudiantes_externos',
    'programas_configuraciones', 'programas_horarios', 'programas_servicios',
    'programas_documentos', 'programas_anuncios'
  ];

  let totalRegistros = 0;
  console.log("=== REGISTROS POR TABLA ===\n");
  
  for (const t of tablas) {
    const start = Date.now();
    const { data, error, count } = await supabase.from(t).select('*', { count: 'exact' });
    const ms = Date.now() - start;
    
    const cant = data?.length || 0;
    totalRegistros += cant;
    
    // Estimar tamaño en bytes
    const sizeBytes = JSON.stringify(data || []).length;
    const sizeKB = (sizeBytes / 1024).toFixed(1);
    
    console.log(`  ${t}: ${cant} registros | ~${sizeKB} KB | ${ms}ms`);
  }

  console.log(`\n📊 Total registros: ${totalRegistros}`);
  
  // Test de velocidad
  console.log("\n=== TEST DE VELOCIDAD ===\n");
  
  const t1 = Date.now();
  await supabase.from('estudiantes').select('*');
  console.log(`  SELECT estudiantes: ${Date.now() - t1}ms`);
  
  const t2 = Date.now();
  await supabase.from('estudiantes').select('dni').limit(1);
  console.log(`  SELECT 1 campo limit 1: ${Date.now() - t2}ms`);

  const t3 = Date.now();
  await supabase.from('configuracion').select('*');
  console.log(`  SELECT configuracion: ${Date.now() - t3}ms`);

  console.log("\n=== LÍMITES PLAN FREE SUPABASE ===");
  console.log("  Base de datos: 500 MB");
  console.log("  Ancho de banda: 5 GB/mes");
  console.log("  Filas: Sin límite");
  console.log("  API requests: 500K/mes");
  console.log("  Storage: 1 GB");
  console.log("\n  ℹ️  Si la DB supera 500MB o el bandwidth 5GB, Supabase pausa el proyecto.");
  console.log("  ℹ️  Puedes verificar en: https://supabase.com/dashboard → Settings → Usage");
}

main().catch(console.error);
