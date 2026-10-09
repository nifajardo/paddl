import { createClient } from "@supabase/supabase-js";

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project-id") || key.includes("your-anon-key")) {
    console.error("Set the public Supabase URL and anon/publishable key in .env.local. Never use a service-role key.");
    return 1;
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Anonymous probes contain no business data and cannot create an authenticated backup.
  const table = await client.from("paddl_backups").select("revision").limit(0);
  if (table.error?.code !== "42501") {
    console.error(table.error?.code === "PGRST205"
      ? "Storage table is missing. Run supabase/schema.sql in the Supabase SQL Editor."
      : "Anonymous table access does not match the repository's security policy. Review supabase/schema.sql.");
    return 1;
  }
  const rpc = await client.rpc("save_paddl_backup", {
    p_workspace: "PRODUCTION_SARI_SARI", p_expected_revision: 0, p_payload: {},
  });
  if (rpc.error?.code !== "42501") {
    console.error("Anonymous save access does not match the repository's security policy. Review the RPC grants in supabase/schema.sql.");
    return 1;
  }
  const legacyTables = ["products", "customers", "debt_entries", "transactions", "expenses", "cash_drawers", "store_settings", "staff_users"];
  const probes = await Promise.all(legacyTables.map(async (name) => ({
    name, result: await client.from(name).select("*").limit(0),
  })));
  for (const { name, result } of probes) {
    if (!["42501", "PGRST205"].includes(result.error?.code || "")) {
      console.error(`Legacy table ${name} is not confirmed protected. Review its permissions in Supabase.`);
      return 1;
    }
  }
  console.log("Supabase responds. Storage exists; anonymous reads/saves and legacy demo endpoints are blocked. Authenticated saving still needs an account smoke test.");
  return 0;
}

try { process.exitCode = await check(); }
catch { console.error("Could not reach Supabase. Check the connection settings and your network."); process.exitCode = 1; }
