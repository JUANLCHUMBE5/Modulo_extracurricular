import { createClient } from '@supabase/supabase-js';

const URL = "https://wgimhsphifnayijqwxxf.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnaW1oc3BoaWZuYXlpanF3eHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI0NzQ0MCwiZXhwIjoyMDk3ODIzNDQwfQ.8F_GbjFb-h06OHu0JtlatTEIJGeGyJKMQ9qkQ_Jii08";

const supabase = createClient(URL, KEY);

async function check() {
  const { count, error } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
  if (error) {
    console.error("Error connecting with service_role:", error.message);
  } else {
    console.log(`With service_role, usuarios count: ${count}`);
  }

  const { data: users, error: userError } = await supabase.from('usuarios').select('id, nombre');
  if (userError) {
    console.error("Error fetching users:", userError.message);
  } else {
    console.log("Users in new database:", users);
  }
}

check();
