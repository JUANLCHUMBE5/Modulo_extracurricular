import { supabase } from "../server/supabaseClient.js";

async function check() {
  const { data, error } = await supabase.from('categorias').select('*');
  if (error) {
    console.log("Error fetching categories:", error.message);
  } else {
    console.log("Categories in Supabase:", data);
  }
}

check();
