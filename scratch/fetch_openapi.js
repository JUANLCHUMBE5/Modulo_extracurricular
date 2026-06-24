import { supabase } from '../server/supabaseClient.js';

async function main() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/`;
  const key = process.env.SUPABASE_KEY;

  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  const schema = await res.json();
  console.log("=== FUNCTIONS / RPCS ===");
  if (schema.paths) {
    const rpcs = Object.keys(schema.paths).filter(p => p.startsWith('/rpc/'));
    console.log(rpcs);
  } else {
    console.log("No paths found in schema");
  }
}

main();
