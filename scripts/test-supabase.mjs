import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : "";
const supabaseKey = keyMatch ? keyMatch[1].trim() : "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  const tables = ["products", "customers", "debt_entries", "transactions", "expenses", "store_settings", "staff_users"];
  const results = {};

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select("*", { count: "exact" }).limit(1);
      if (error) {
        results[table] = { status: "ERROR", message: error.message };
      } else {
        results[table] = { status: "OK", count };
      }
    } catch (err) {
      results[table] = { status: "EXCEPTION", message: err.message };
    }
  }

  console.log("Database Table Status Report:", JSON.stringify(results, null, 2));
}

checkAllTables();
