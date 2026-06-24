/**
 * Script de limpieza de datos operacionales.
 * Elimina registros de: inscripciones, pagos, asistencias, audit_logs,
 * historial_cargas, estudiantes_externos, configuracion (excepto correlativos).
 * Mantiene: usuarios, estudiantes (15), programas, invitados_programa,
 *           programas_configuraciones, programas_horarios, programas_servicios,
 *           programas_documentos, programas_anuncios, categorias.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function deleteAll(table) {
  // Supabase requiere un filtro; usamos un truco: id != 'IMPOSSIBLE' o gt(0)
  // Intentamos varias estrategias dependiendo de la tabla
  const { data, error } = await supabase.from(table).delete().gte('id', 0);
  if (error) {
    // Si falla con 'id', intentar con otro approach
    const res2 = await supabase.from(table).delete().neq('id', 'NONE_MATCH_IMPOSSIBLE_VALUE');
    if (res2.error) {
      console.error(`  ❌ Error borrando ${table}:`, res2.error.message);
      return false;
    }
  }
  console.log(`  ✅ ${table} - limpiada`);
  return true;
}

async function deleteAllGeneric(table, column, value) {
  const { error } = await supabase.from(table).delete().neq(column, value);
  if (error) {
    console.error(`  ❌ Error borrando ${table}:`, error.message);
    return false;
  }
  console.log(`  ✅ ${table} - limpiada`);
  return true;
}

async function main() {
  console.log("🧹 Iniciando limpieza de datos operacionales...\n");

  // 1. Primero verificar cuántos estudiantes hay
  const { data: estudiantes } = await supabase.from('estudiantes').select('dni, nombres');
  console.log(`📋 Estudiantes actuales: ${estudiantes?.length || 0}`);
  if (estudiantes) {
    estudiantes.forEach((e, i) => console.log(`   ${i + 1}. ${e.nombres} (${e.dni})`));
  }

  console.log("\n--- Limpiando tablas operacionales ---\n");

  // 2. Borrar asistencias (depende de inscripciones)
  {
    const { error } = await supabase.from('asistencias').delete().neq('id', 'NONE');
    console.log(error ? `  ❌ asistencias: ${error.message}` : '  ✅ asistencias - limpiada');
  }

  // 3. Borrar pagos (depende de inscripciones)
  {
    const { error } = await supabase.from('pagos').delete().neq('id', 'NONE');
    console.log(error ? `  ❌ pagos: ${error.message}` : '  ✅ pagos - limpiada');
  }

  // 4. Borrar inscripciones
  {
    const { error } = await supabase.from('inscripciones').delete().neq('id', 'NONE');
    console.log(error ? `  ❌ inscripciones: ${error.message}` : '  ✅ inscripciones - limpiada');
  }

  // 5. Borrar audit_logs
  {
    const { error } = await supabase.from('audit_logs').delete().neq('id', 'NONE');
    console.log(error ? `  ❌ audit_logs: ${error.message}` : '  ✅ audit_logs - limpiada');
  }

  // 6. Borrar historial_cargas
  {
    const { error } = await supabase.from('historial_cargas').delete().neq('id', 'NONE');
    console.log(error ? `  ❌ historial_cargas: ${error.message}` : '  ✅ historial_cargas - limpiada');
  }

  // 7. Borrar estudiantes_externos
  {
    const { error } = await supabase.from('estudiantes_externos').delete().neq('dni', 'NONE');
    console.log(error ? `  ❌ estudiantes_externos: ${error.message}` : '  ✅ estudiantes_externos - limpiada');
  }

  // 8. Borrar configuracion (excepto correlativos si existen)
  {
    const { data: config } = await supabase.from('configuracion').select('*');
    if (config && config.length > 0) {
      // Mantener solo correlativos, borrar el resto
      const { error } = await supabase.from('configuracion').delete().neq('clave', 'correlativos');
      console.log(error ? `  ❌ configuracion: ${error.message}` : '  ✅ configuracion - limpiada (correlativos preservados)');
    } else {
      console.log('  ℹ️  configuracion - sin datos');
    }
  }

  // 9. Reset de cuposOcupados en programas a 0
  {
    const { data: programas } = await supabase.from('programas').select('id, nombre, cuposOcupados');
    if (programas && programas.length > 0) {
      for (const prog of programas) {
        if (prog.cuposOcupados > 0) {
          const { error } = await supabase.from('programas').update({ cuposOcupados: 0 }).eq('id', prog.id);
          console.log(error ? `  ❌ programas reset cupos ${prog.nombre}: ${error.message}` : `  ✅ programas - ${prog.nombre} cuposOcupados reset a 0`);
        }
      }
    }
  }

  // 10. Reset estadoInscripcion y estadoCaja en estudiantes
  {
    const { error } = await supabase.from('estudiantes').update({ 
      estadoInscripcion: null, 
      estadoCaja: null 
    }).neq('dni', 'NONE');
    console.log(error ? `  ❌ estudiantes reset estados: ${error.message}` : '  ✅ estudiantes - estadoInscripcion y estadoCaja reseteados');
  }

  console.log("\n--- Verificación post-limpieza ---\n");

  // Verificación
  const tables = ['inscripciones', 'pagos', 'asistencias', 'audit_logs', 'historial_cargas'];
  for (const t of tables) {
    const { data, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    const { count: cnt } = await supabase.from(t).select('*', { count: 'exact' });
    console.log(`  ${t}: ${cnt || 0} registros`);
  }

  const { data: estudiantesPost } = await supabase.from('estudiantes').select('dni, nombres');
  console.log(`\n📋 Estudiantes después de limpieza: ${estudiantesPost?.length || 0}`);
  
  const { data: invitados } = await supabase.from('invitados_programa').select('*');
  console.log(`📋 Invitados programa: ${invitados?.length || 0}`);

  const { data: progs } = await supabase.from('programas').select('id, nombre, cuposOcupados');
  console.log(`📋 Programas: ${progs?.length || 0}`);
  progs?.forEach(p => console.log(`   - ${p.nombre}: cuposOcupados=${p.cuposOcupados}`));

  console.log("\n✅ Limpieza completada exitosamente.");
}

main().catch(console.error);
