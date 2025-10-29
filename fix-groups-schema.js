#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGroupsSchema() {
  try {
    console.log("Attempting to fix groups table schema...");

    // Step 1: Check if owner_id column exists
    const { data: columns, error: columnsError } = await supabase
      .from("groups")
      .select("*")
      .limit(1);

    if (columnsError) {
      console.error("Error checking groups table:", columnsError);
      return;
    }

    if (columns && columns.length > 0) {
      const firstRow = columns[0];
      console.log("Current groups table columns:", Object.keys(firstRow));

      if ("created_by" in firstRow && !("owner_id" in firstRow)) {
        console.log("Found created_by column, need to migrate to owner_id");
        console.log("\nIMPORTANT: You need to run the following SQL in Supabase SQL Editor:");
        console.log("=".repeat(80));

        const sqlFile = path.join(__dirname, "scripts", "036_fix_groups_table.sql");
        const sql = fs.readFileSync(sqlFile, "utf-8");
        console.log(sql);

        console.log("=".repeat(80));
        console.log("\nPlease copy the SQL above and run it in your Supabase dashboard:");
        console.log("1. Go to https://supabase.com/dashboard");
        console.log("2. Select your project");
        console.log("3. Go to SQL Editor");
        console.log("4. Create a new query");
        console.log("5. Paste the SQL above");
        console.log("6. Click 'Run'");
      } else if ("owner_id" in firstRow) {
        console.log("✓ Groups table already has owner_id column");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

fixGroupsSchema();

