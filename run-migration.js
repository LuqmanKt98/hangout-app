const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const sqlFile = path.join(__dirname, "scripts", "036_fix_groups_table.sql");
    const sql = fs.readFileSync(sqlFile, "utf-8");

    console.log("Running migration: 036_fix_groups_table.sql");
    console.log("SQL:", sql.substring(0, 100) + "...");

    // Execute the SQL using the rpc function or direct query
    const { data, error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log("Migration completed successfully!");
    console.log("Result:", data);
  } catch (error) {
    console.error("Error running migration:", error);
    process.exit(1);
  }
}

runMigration();

