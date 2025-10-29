const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runRLSFix() {
  try {
    const sqlFile = path.join(__dirname, "scripts", "fix_hangout_requests_delete_policy.sql");
    const sql = fs.readFileSync(sqlFile, "utf-8");

    console.log("Running RLS policy fix: fix_hangout_requests_delete_policy.sql");
    console.log("\nThis will allow receivers to delete accepted/rejected requests they received.\n");

    // Split SQL into individual statements
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.toLowerCase().includes("select")) {
        // For SELECT statements, use .from()
        console.log("Executing verification query...");
        const { data, error } = await supabase.rpc("exec_sql", { sql: statement + ";" });
        if (error) {
          console.log("Note: Verification query failed (this is expected if exec_sql RPC is not available)");
        } else {
          console.log("Verification result:", data);
        }
      } else {
        // For DDL statements, try to execute
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" });
        if (error) {
          console.log(`Note: Statement execution via RPC failed (this is expected)`);
        }
      }
    }

    console.log("\n✅ RLS policy fix script prepared!");
    console.log("\nPlease run the following SQL manually in Supabase SQL Editor:");
    console.log("=".repeat(80));
    console.log(sql);
    console.log("=".repeat(80));
  } catch (error) {
    console.error("Error running RLS fix:", error);
    process.exit(1);
  }
}

runRLSFix();

