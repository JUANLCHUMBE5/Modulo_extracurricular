import { createClient } from '@supabase/supabase-js';

const URL = "https://wgimhsphifnayijqwxxf.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnaW1oc3BoaWZuYXlpanF3eHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI0NzQ0MCwiZXhwIjoyMDk3ODIzNDQwfQ.8F_GbjFb-h06OHu0JtlatTEIJGeGyJKMQ9qkQ_Jii08";

const supabase = createClient(URL, KEY);

async function run() {
  const { data, error } = await supabase.from('usuarios').select('*');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
