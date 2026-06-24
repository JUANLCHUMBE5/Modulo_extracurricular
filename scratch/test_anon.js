import { createClient } from '@supabase/supabase-js';

const URL = "https://wgimhsphifnayijqwxxf.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnaW1oc3BoaWZuYXlpanF3eHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDc0NDAsImV4cCI6MjA5NzgyMzQ0MH0.q9jdsFBKky714Pj4dvwAz7IT9L1QRbRXuRiVMjJOXIk";

const supabase = createClient(URL, KEY);

async function test() {
  const { data, error } = await supabase.from('usuarios').select('id, nombre');
  if (error) {
    console.error("❌ Error with anon key:", error.message);
  } else {
    console.log("✅ Success with anon key! Users list:", data);
  }
}

test();
