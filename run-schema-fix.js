const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const envFile = fs.readFileSync(".env.local", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFix() {
  console.log("Adding role column to group_members...");
  
  const sql = fs.readFileSync("scripts/add_role_to_group_members.sql", "utf-8");
  
  // Execute using raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.log("Note: exec_sql RPC not available, this is expected.");
    console.log("Please run this SQL manually in Supabase SQL Editor:");
    console.log(sql);
  } else {
    console.log("✅ Schema updated successfully!");
  }
}

runFix();
