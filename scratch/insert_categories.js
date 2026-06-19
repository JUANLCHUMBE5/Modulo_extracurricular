import { supabase } from "../server/supabaseClient.js";

async function run() {
  const newCats = [
    { categoria: 'Vacaciones Útiles' },
    { categoria: 'Talleres Recreativos' },
    { categoria: 'Talleres Deportivos' }
  ];
  
  const { data, error } = await supabase
    .from('categorias')
    .insert(newCats)
    .select();
    
  if (error) {
    console.error("Error inserting categories:", error.message, error.details || "");
  } else {
    console.log("Successfully inserted categories:", data);
  }
}

run();
