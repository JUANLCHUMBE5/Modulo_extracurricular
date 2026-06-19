import { supabase } from "../server/supabaseClient.js";

async function run() {
  // Let's query foreign key constraint details from information_schema
  const { data: constraints, error: errCon } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'programas';
    `
  });

  if (errCon) {
    console.log("Error querying constraints via execute_sql (might not exist/have permission):", errCon.message);
    // Let's try directly fetching a program to see what the columns are
    const { data: progData, error: errProg } = await supabase.from('programas').select('*').limit(1);
    if (errProg) {
      console.log("Error selecting programs:", errProg.message);
    } else {
      console.log("Columns in programas (sample):", progData);
    }
  } else {
    console.log("Foreign keys on programas:", constraints);
  }
}

run();
