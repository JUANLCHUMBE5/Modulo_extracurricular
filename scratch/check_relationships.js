import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  // Consultar foreign keys del schema public
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        tc.table_name AS tabla_origen,
        kcu.column_name AS columna,
        ccu.table_name AS tabla_destino,
        ccu.column_name AS columna_destino,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `
  });

  if (error) {
    console.log("RPC no disponible, intentando con query directa...\n");
    
    // Alternativa: listar tablas y sus columnas
    const tablas = [
      'usuarios', 'estudiantes', 'programas', 'inscripciones', 'pagos',
      'asistencias', 'invitados_programa', 'audit_logs', 'categorias',
      'historial_cargas', 'configuracion', 'estudiantes_externos',
      'programas_configuraciones', 'programas_horarios', 'programas_servicios',
      'programas_documentos', 'programas_anuncios'
    ];

    console.log("=== TABLAS EN SUPABASE ===\n");
    for (const t of tablas) {
      const { data: sample, error: err } = await supabase.from(t).select('*').limit(1);
      if (err) {
        console.log(`❌ ${t}: ${err.message}`);
      } else {
        const cols = sample && sample.length > 0 ? Object.keys(sample[0]) : ['(vacía)'];
        console.log(`📋 ${t}:`);
        console.log(`   Columnas: ${cols.join(', ')}`);
      }
    }
  } else {
    console.log("=== FOREIGN KEYS ===\n");
    if (data && data.length > 0) {
      data.forEach(fk => {
        console.log(`  ${fk.tabla_origen}.${fk.columna} → ${fk.tabla_destino}.${fk.columna_destino}`);
      });
    } else {
      console.log("  ⚠️ No se encontraron foreign keys definidas.");
    }
  }
}

main().catch(console.error);
