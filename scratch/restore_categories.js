import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const DEFAULT_CATEGORIES = [
  "Academico",
  "Deportivo",
  "Arte",
  "Maraton",
  "Otro",
  "Vacaciones Útiles",
  "Talleres Recreativos",
  "Talleres Deportivos"
];

async function main() {
  console.log("🔄 Restaurando categorías en Supabase...\n");

  // 1. Limpiar la tabla de categorías primero (excepto ID <= 0 si los hay)
  const { error: deleteError } = await supabase.from('categorias').delete().gt('id', 0);
  if (deleteError) {
    console.error("❌ Error al limpiar categorías:", deleteError.message);
    return;
  }
  console.log("✅ Categorías previas eliminadas.");

  // 2. Insertar las categorías por defecto
  const rowsToInsert = DEFAULT_CATEGORIES.map(cat => ({ categoria: cat }));
  const { error: insertError, data } = await supabase.from('categorias').insert(rowsToInsert).select();
  
  if (insertError) {
    console.error("❌ Error al insertar categorías:", insertError.message);
    return;
  }

  console.log("✅ Categorías restauradas con éxito:");
  rowsToInsert.forEach(row => console.log(`   - ${row.categoria}`));
}

main().catch(console.error);
