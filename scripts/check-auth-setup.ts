#!/usr/bin/env tsx

/**
 * Authentication Setup Checker
 *
 * This script checks if your Supabase authentication system is properly configured.
 * Run this before testing authentication to ensure everything is set up correctly.
 *
 * Usage: npx tsx scripts/check-auth-setup.ts
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

// Load environment variables from .env.local
try {
  const envPath = resolve(process.cwd(), ".env.local")
  const envContent = readFileSync(envPath, "utf-8")

  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=")
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "")
        process.env[key.trim()] = value.trim()
      }
    }
  })
} catch (error) {
  console.warn("Warning: Could not load .env.local file")
}

// ANSI color codes for terminal output
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

async function checkAuthSetup() {
  console.log(`\n${colors.bold}🔍 Checking Authentication Setup...${colors.reset}\n`)

  let hasErrors = false
  let hasWarnings = false

  // Check 1: Environment Variables
  log.section("1. Environment Variables")
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl) {
    log.success(`NEXT_PUBLIC_SUPABASE_URL is set`)
  } else {
    log.error(`NEXT_PUBLIC_SUPABASE_URL is missing`)
    hasErrors = true
  }

  if (supabaseAnonKey) {
    log.success(`NEXT_PUBLIC_SUPABASE_ANON_KEY is set`)
  } else {
    log.error(`NEXT_PUBLIC_SUPABASE_ANON_KEY is missing`)
    hasErrors = true
  }

  if (supabaseServiceKey) {
    log.success(`SUPABASE_SERVICE_ROLE_KEY is set`)
  } else {
    log.warning(`SUPABASE_SERVICE_ROLE_KEY is missing (optional but recommended)`)
    hasWarnings = true
  }

  // Check optional OAuth credentials
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  if (googleClientId && googleClientSecret) {
    log.success(`Google OAuth credentials are configured`)
  } else {
    log.info(`Google OAuth not configured (optional)`)
  }

  // Check optional Twilio credentials
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER

  if (twilioSid && twilioToken && twilioPhone) {
    log.success(`Twilio SMS credentials are configured`)
  } else {
    log.info(`Twilio SMS not configured (optional)`)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    log.error(`\nCannot proceed without Supabase credentials. Please set them in .env.local`)
    process.exit(1)
  }

  // Check 2: Supabase Connection
  log.section("2. Supabase Connection")

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test connection by checking auth
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      log.error(`Failed to connect to Supabase: ${error.message}`)
      hasErrors = true
    } else {
      log.success(`Successfully connected to Supabase`)
    }
  } catch (error) {
    log.error(`Failed to initialize Supabase client: ${error}`)
    hasErrors = true
  }

  // Check 3: Database Tables
  log.section("3. Database Tables")

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Check profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)

    if (profilesError) {
      if (profilesError.code === "42P01" || profilesError.message?.includes("relation") || profilesError.message?.includes("does not exist")) {
        log.error(`Profiles table does not exist`)
        log.info(`  → Run the SQL from supabase-auth-schema.sql in Supabase SQL Editor`)
        hasErrors = true
      } else {
        log.warning(`Could not verify profiles table: ${profilesError.message}`)
        hasWarnings = true
      }
    } else {
      log.success(`Profiles table exists`)
    }

    // Check user_sessions table
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("user_sessions")
      .select("id")
      .limit(1)

    if (sessionsError) {
      if (sessionsError.code === "42P01" || sessionsError.message?.includes("relation") || sessionsError.message?.includes("does not exist")) {
        log.error(`User sessions table does not exist`)
        hasErrors = true
      } else {
        log.warning(`Could not verify user_sessions table: ${sessionsError.message}`)
        hasWarnings = true
      }
    } else {
      log.success(`User sessions table exists`)
    }

    // Check login_attempts table
    const { data: attemptsData, error: attemptsError } = await supabase
      .from("login_attempts")
      .select("id")
      .limit(1)

    if (attemptsError) {
      if (attemptsError.code === "42P01" || attemptsError.message?.includes("relation") || attemptsError.message?.includes("does not exist")) {
        log.error(`Login attempts table does not exist`)
        hasErrors = true
      } else {
        log.warning(`Could not verify login_attempts table: ${attemptsError.message}`)
        hasWarnings = true
      }
    } else {
      log.success(`Login attempts table exists`)
    }

    // Check mfa_recovery_codes table
    const { data: mfaData, error: mfaError } = await supabase
      .from("mfa_recovery_codes")
      .select("id")
      .limit(1)

    if (mfaError) {
      if (mfaError.code === "42P01" || mfaError.message?.includes("relation") || mfaError.message?.includes("does not exist")) {
        log.error(`MFA recovery codes table does not exist`)
        hasErrors = true
      } else {
        log.warning(`Could not verify mfa_recovery_codes table: ${mfaError.message}`)
        hasWarnings = true
      }
    } else {
      log.success(`MFA recovery codes table exists`)
    }
  } catch (error) {
    log.error(`Failed to check database tables: ${error}`)
    hasErrors = true
  }

  // Summary
  log.section("Summary")

  if (hasErrors) {
    console.log(`\n${colors.red}${colors.bold}❌ Setup is incomplete. Please fix the errors above.${colors.reset}\n`)
    console.log(`${colors.yellow}Next steps:${colors.reset}`)
    console.log(`  1. Set missing environment variables in .env.local`)
    console.log(`  2. Run the SQL from supabase-auth-schema.sql in Supabase SQL Editor`)
    console.log(`  3. Run this script again to verify\n`)
    console.log(`${colors.cyan}📚 See QUICK_START_AUTH.md for detailed instructions${colors.reset}\n`)
    process.exit(1)
  } else if (hasWarnings) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Setup is mostly complete but has some warnings.${colors.reset}\n`)
    console.log(`${colors.green}You can proceed with testing, but review the warnings above.${colors.reset}\n`)
    process.exit(0)
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All checks passed! Your authentication system is ready.${colors.reset}\n`)
    console.log(`${colors.cyan}Next steps:${colors.reset}`)
    console.log(`  1. Start your dev server: ${colors.bold}npm run dev${colors.reset}`)
    console.log(`  2. Visit: ${colors.bold}http://localhost:3000/login${colors.reset}`)
    console.log(`  3. Create a test account and try signing in\n`)
    process.exit(0)
  }
}

// Run the checker
checkAuthSetup().catch((error) => {
  console.error(`\n${colors.red}${colors.bold}Fatal error:${colors.reset}`, error)
  process.exit(1)
})

