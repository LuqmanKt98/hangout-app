const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Read .env.local file
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanAllData() {
  console.log("🧹 Starting data cleanup...\n");

  try {
    // Delete in order to respect foreign key constraints
    const tables = [
      "bookings",
      "bookable_availability",
      "request_messages",
      "hangout_requests",
      "availability_shares",
      "availability",
      "group_members",
      "groups",
      "friend_requests",
      "friendships",
      "profiles"
    ];

    for (const table of tables) {
      console.log(`Deleting from ${table}...`);
      const { error, count } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error(`❌ Error deleting from ${table}:`, error.message);
      } else {
        console.log(`✅ Deleted from ${table}`);
      }
    }

    console.log("\n✨ Data cleanup complete!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

cleanAllData();
