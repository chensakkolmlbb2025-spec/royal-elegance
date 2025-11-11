import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate Supabase configuration
function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase] Missing configuration. Please check your environment variables.")
    console.error("[Supabase] Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return false
  }
  return true
}

let supabase: SupabaseClient | undefined

// Initialize Supabase
try {
  if (validateSupabaseConfig() && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
    console.log("[Supabase] Client initialized successfully")
  } else {
    console.error("[Supabase] Configuration validation failed. Please check your environment variables.")
  }
} catch (error) {
  console.error("[Supabase] Initialization error:", error)
}

export { supabase, validateSupabaseConfig }

