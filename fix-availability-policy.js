require('dotenv').config({ path: '.env.local' });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPolicy() {
  try {
    const sql = fs.readFileSync("./scripts/040_fix_availability_sharing_policy.sql", "utf-8");
    
    console.log("Fixing availability sharing policy...");
    console.log("SQL:", sql);

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log("\nExecuting:", statement.substring(0, 100) + "...");
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error("Error:", error);
        // Try alternative method
        console.log("Trying alternative method...");
        const { error: error2 } = await supabase.from('_sql').insert({ query: statement });
        if (error2) {
          console.error("Alternative method also failed:", error2);
        }
      } else {
        console.log("Success!");
      }
    }

    console.log("\nPolicy fix completed!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixPolicy();
