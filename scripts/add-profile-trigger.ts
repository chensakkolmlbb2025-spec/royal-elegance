import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"

// Load environment variables
function loadLocalEnv() {
  try {
    const cwd = process.cwd()
    const candidates = [".env.local", ".env"]
    for (const file of candidates) {
      const p = path.join(cwd, file)
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8")
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith("#")) continue
          const idx = trimmed.indexOf("=")
          if (idx === -1) continue
          const key = trimmed.slice(0, idx).trim()
          let value = trimmed.slice(idx + 1).trim()
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          if (!(key in process.env)) process.env[key] = value
        }
        console.log(`Loaded environment variables from ${file}`)
        return
      }
    }
  } catch (e) {
    console.warn("Failed to load local env file:", e)
  }
}

loadLocalEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = `
-- Function: Handle new user creation (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`

async function addTrigger() {
  console.log("Adding profile creation trigger...")
  
  const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql })
  
  if (error) {
    console.error("Error:", error)
    // Try alternative method using direct SQL execution
    console.log("\nTrying alternative method...")
    
    // Split SQL into separate statements
    const statements = [
      `CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
      `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`,
      `CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
    ]
    
    for (const stmt of statements) {
      const { error: stmtError } = await supabase.rpc("exec_sql", { sql_string: stmt })
      if (stmtError) {
        console.error("Statement error:", stmtError)
      }
    }
    
    console.log("\n⚠️  Could not add trigger automatically.")
    console.log("Please run this SQL manually in Supabase SQL Editor:")
    console.log("=" .repeat(60))
    console.log(sql)
    console.log("=" .repeat(60))
  } else {
    console.log("✓ Profile creation trigger added successfully!")
  }
}

addTrigger()
