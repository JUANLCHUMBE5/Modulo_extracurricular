import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  console.log("🗑️  Eliminando taller y datos relacionados...\n");

  // 1. Ver qué programas hay
  const { data: programas } = await supabase.from('programas').select('id, nombre');
  console.log(`📋 Programas actuales: ${programas?.length || 0}`);
  programas?.forEach(p => console.log(`   - ${p.nombre} (id: ${p.id})`));

  // 2. Borrar tablas dependientes del programa
  const tablas = [
    'invitados_programa',
    'programas_configuraciones',
    'programas_horarios',
    'programas_servicios',
    'programas_documentos',
    'programas_anuncios'
  ];

  for (const tabla of tablas) {
    const { error } = await supabase.from(tabla).delete().neq('programaId', 'NONE');
    console.log(error ? `  ❌ ${tabla}: ${error.message}` : `  ✅ ${tabla} - limpiada`);
  }

  // 3. Borrar el programa en sí
  {
    const { error } = await supabase.from('programas').delete().neq('id', 'NONE');
    console.log(error ? `  ❌ programas: ${error.message}` : '  ✅ programas - eliminado');
  }

  // 4. Borrar categorías
  {
    const { error } = await supabase.from('categorias').delete().gt('id', 0);
    console.log(error ? `  ❌ categorias: ${error.message}` : '  ✅ categorias - limpiada');
  }

  // Verificación
  console.log("\n--- Verificación ---");
  const { data: progsPost } = await supabase.from('programas').select('*');
  console.log(`  Programas: ${progsPost?.length || 0}`);
  const { data: invPost } = await supabase.from('invitados_programa').select('*');
  console.log(`  Invitados: ${invPost?.length || 0}`);

  console.log("\n✅ Taller eliminado completamente.");
}

main().catch(console.error);
