#!/usr/bin/env tsx
/**
 * Test Authentication Script
 * 
 * This script tests the authentication system to diagnose issues
 * 
 * Usage: npx tsx scripts/test-auth.ts
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
}

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
}

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
        log.success(`Loaded environment from ${file}`)
        return true
      }
    }
    return false
  } catch (e) {
    log.error(`Failed to load env: ${e}`)
    return false
  }
}

async function testAuth() {
  console.log(`\n${colors.bold}🔐 Testing Authentication System...${colors.reset}\n`)

  // Load environment
  if (!loadLocalEnv()) {
    log.error("Cannot load environment file")
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Check environment variables
  log.section("1. Environment Variables")
  if (supabaseUrl) {
    log.success(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`)
  } else {
    log.error("NEXT_PUBLIC_SUPABASE_URL is missing")
  }

  if (supabaseAnonKey) {
    log.success(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`)
  } else {
    log.error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing")
  }

  if (supabaseServiceKey) {
    log.success(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 20)}...`)
  } else {
    log.warning("SUPABASE_SERVICE_ROLE_KEY is missing (optional for client)")
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    log.error("\nMissing required environment variables!")
    process.exit(1)
  }

  // Initialize Supabase client
  log.section("2. Supabase Client")
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  log.success("Supabase client initialized")

  // Test connection
  log.section("3. Database Connection")
  try {
    const { data, error } = await supabase.from("profiles").select("count").limit(1)
    if (error) {
      log.error(`Connection failed: ${error.message}`)
      log.info(`Error code: ${error.code}`)
      log.info(`Error details: ${JSON.stringify(error.details)}`)
    } else {
      log.success("Database connection successful")
    }
  } catch (error) {
    log.error(`Connection error: ${error}`)
  }

  // Check if profiles table exists
  log.section("4. Profiles Table")
  try {
    const { data, error } = await supabase.from("profiles").select("*").limit(1)
    if (error) {
      if (error.code === "42P01") {
        log.error("Profiles table does not exist!")
        log.info("Run: supabase-auth-schema.sql")
      } else {
        log.error(`Error: ${error.message}`)
      }
    } else {
      log.success("Profiles table exists")
      log.info(`Found ${data?.length || 0} profiles`)
    }
  } catch (error) {
    log.error(`Error checking profiles: ${error}`)
  }

  // Check RLS policies
  log.section("5. RLS Policies on Profiles")
  try {
    const { data, error } = await supabase.rpc("pg_policies", {}).select("*").eq("tablename", "profiles")
    if (error) {
      log.warning("Cannot check RLS policies (this is normal)")
    } else {
      log.info(`Found ${data?.length || 0} policies`)
    }
  } catch (error) {
    // This is expected to fail with anon key
    log.info("RLS policy check skipped (requires admin access)")
  }

  // Test signup with a test user
  log.section("6. Test Signup")
  const testEmail = `test${Date.now()}@gmail.com`
  const testPassword = "Test123!@#"
  
  log.info(`Attempting to sign up: ${testEmail}`)
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: "Test User",
        },
      },
    })

    if (error) {
      log.error(`Signup failed: ${error.message}`)
      log.info(`Error status: ${error.status}`)
      log.info(`Error name: ${error.name}`)
      
      if (error.message.includes("Email rate limit exceeded")) {
        log.warning("Rate limit hit - this is normal if testing multiple times")
      }
    } else if (data.user) {
      log.success(`Signup successful! User ID: ${data.user.id}`)
      log.info(`Email: ${data.user.email}`)
      log.info(`Email confirmed: ${data.user.email_confirmed_at ? "Yes" : "No"}`)
      
      // Wait a bit for trigger to create profile
      log.info("Waiting 2 seconds for profile creation...")
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      // Check if profile was created
      log.section("7. Profile Creation Check")
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()
      
      if (profileError) {
        log.error(`Profile not created: ${profileError.message}`)
        log.error(`Error code: ${profileError.code}`)
        log.error(`Error hint: ${profileError.hint}`)
        
        if (profileError.code === "PGRST116") {
          log.error("\n🚨 CRITICAL ISSUE: Profile was not created!")
          log.error("This means the trigger 'on_auth_user_created' failed")
          log.error("Most likely cause: Missing INSERT policy on profiles table")
          log.error("\n💡 SOLUTION: Run supabase-auth-fix.sql")
        }
      } else if (profile) {
        log.success("Profile created successfully!")
        log.info(`Profile ID: ${profile.id}`)
        log.info(`Full Name: ${profile.full_name}`)
        log.info(`Role: ${profile.role}`)
        log.info(`Email: ${profile.email}`)
      }
      
      // Test signin
      log.section("8. Test Sign In")
      log.info(`Attempting to sign in: ${testEmail}`)
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      })
      
      if (signInError) {
        log.error(`Sign in failed: ${signInError.message}`)
      } else if (signInData.user) {
        log.success("Sign in successful!")
        log.info(`User ID: ${signInData.user.id}`)
        log.info(`Session: ${signInData.session ? "Active" : "None"}`)
        
        // Clean up - delete test user
        log.section("9. Cleanup")
        log.info("Deleting test user...")
        
        // Sign out first
        await supabase.auth.signOut()
        
        // Note: We can't delete the user with anon key
        // It will be cleaned up manually or with service role key
        log.warning("Test user created but cannot be deleted with anon key")
        log.info(`Test user email: ${testEmail}`)
        log.info("You can delete it manually in Supabase Dashboard")
      }
    } else {
      log.warning("Signup returned no user and no error")
    }
  } catch (error: any) {
    log.error(`Unexpected error: ${error.message || error}`)
  }

  // Summary
  log.section("Summary")
  console.log(`\n${colors.bold}Authentication Test Complete${colors.reset}\n`)
  log.info("If you see errors above, check:")
  log.info("1. Database schema is set up (run supabase-auth-schema.sql)")
  log.info("2. RLS policies are correct (run supabase-auth-fix.sql)")
  log.info("3. Triggers are working (check Supabase Dashboard)")
  log.info("4. Environment variables are correct")
  console.log()
}

// Run the test
testAuth().catch((error) => {
  console.error(`\n${colors.red}${colors.bold}Fatal error:${colors.reset}`, error)
  process.exit(1)
})

