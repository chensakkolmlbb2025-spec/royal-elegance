#!/usr/bin/env tsx
/**
 * Seed Demo Users Script
 * 
 * This script creates 3 demo users with different roles using Supabase Admin API
 * - Admin user: admin@luxuryhotel.com
 * - Staff user: staff@luxuryhotel.com
 * - Regular user: user@luxuryhotel.com
 * 
 * Usage: npx tsx scripts/seed-demo-users.ts
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"

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

// Load environment variables from .env.local or .env
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
    log.error("No .env.local or .env file found")
    return false
  } catch (e) {
    log.error(`Failed to load env file: ${e}`)
    return false
  }
}

// Demo users to create
const demoUsers = [
  {
    email: "admin@luxuryhotel.com",
    password: "Admin123!@#",
    fullName: "Admin User",
    role: "admin" as const,
    phone: "+1234567890",
  },
  {
    email: "staff@luxuryhotel.com",
    password: "Staff123!@#",
    fullName: "Staff User",
    role: "staff" as const,
    phone: "+1234567891",
  },
  {
    email: "user@luxuryhotel.com",
    password: "User123!@#",
    fullName: "Regular User",
    role: "user" as const,
    phone: "+1234567892",
  },
]

async function seedDemoUsers() {
  console.log(`\n${colors.bold}🌱 Seeding Demo Users...${colors.reset}\n`)

  // Load environment
  if (!loadLocalEnv()) {
    log.error("Cannot proceed without environment file")
    process.exit(1)
  }

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error("Missing required environment variables:")
    if (!supabaseUrl) log.error("  - NEXT_PUBLIC_SUPABASE_URL")
    if (!supabaseServiceKey) log.error("  - SUPABASE_SERVICE_ROLE_KEY")
    log.info("\nYou need the SERVICE_ROLE_KEY to create users programmatically")
    log.info("Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api")
    process.exit(1)
  }

  log.success("Environment variables loaded")

  // Initialize Supabase Admin client (with service role key)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  log.success("Supabase Admin client initialized")
  log.section("Creating Demo Users")

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const user of demoUsers) {
    try {
      log.info(`\nProcessing: ${user.email} (${user.role})`)

      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        log.error(`  Failed to check existing users: ${listError.message}`)
        errorCount++
        continue
      }

      const existingUser = existingUsers.users.find((u) => u.email === user.email)

      if (existingUser) {
        log.warning(`  User already exists, skipping creation`)
        
        // Update the profile role if it exists
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id, role")
          .eq("id", existingUser.id)
          .single()

        if (profileError) {
          log.warning(`  Could not check profile: ${profileError.message}`)
        } else if (profile.role !== user.role) {
          // Update role if different
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ 
              role: user.role,
              full_name: user.fullName,
              email_verified: true,
            })
            .eq("id", existingUser.id)

          if (updateError) {
            log.error(`  Failed to update role: ${updateError.message}`)
          } else {
            log.success(`  Updated role from ${profile.role} to ${user.role}`)
          }
        } else {
          log.success(`  Role is already correct: ${user.role}`)
        }

        skipCount++
        continue
      }

      // Create new user using Admin API
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: user.fullName,
          phone: user.phone,
        },
      })

      if (createError) {
        log.error(`  Failed to create user: ${createError.message}`)
        errorCount++
        continue
      }

      if (!authData.user) {
        log.error(`  User creation returned no data`)
        errorCount++
        continue
      }

      log.success(`  Created auth user: ${authData.user.id}`)

      // Wait a bit for the trigger to create the profile
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the profile with the correct role
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          role: user.role,
          full_name: user.fullName,
          phone: user.phone,
          email_verified: true,
        })
        .eq("id", authData.user.id)

      if (updateError) {
        log.error(`  Failed to update profile: ${updateError.message}`)
        log.warning(`  User created but role not set. Run create-demo-users.sql manually`)
        errorCount++
        continue
      }

      log.success(`  Set role to: ${user.role}`)
      log.success(`  ✓ User created successfully!`)
      successCount++
    } catch (error) {
      log.error(`  Unexpected error: ${error}`)
      errorCount++
    }
  }

  // Summary
  log.section("Summary")
  console.log(`\n${colors.bold}Results:${colors.reset}`)
  console.log(`  ${colors.green}✓ Created: ${successCount}${colors.reset}`)
  console.log(`  ${colors.yellow}⊘ Skipped: ${skipCount}${colors.reset}`)
  console.log(`  ${colors.red}✗ Errors: ${errorCount}${colors.reset}`)

  // Display credentials
  if (successCount > 0 || skipCount > 0) {
    log.section("Demo User Credentials")
    console.log(`\n${colors.bold}You can now log in with these accounts:${colors.reset}\n`)

    for (const user of demoUsers) {
      console.log(`${colors.cyan}${user.role.toUpperCase()} USER:${colors.reset}`)
      console.log(`  Email:    ${colors.bold}${user.email}${colors.reset}`)
      console.log(`  Password: ${colors.bold}${user.password}${colors.reset}`)
      console.log(`  Role:     ${colors.bold}${user.role}${colors.reset}`)
      console.log()
    }

    log.section("Next Steps")
    console.log(`\n1. Start your dev server: ${colors.bold}npm run dev${colors.reset}`)
    console.log(`2. Visit: ${colors.bold}http://localhost:3000/login${colors.reset}`)
    console.log(`3. Log in with any of the accounts above`)
    console.log(`4. Test role-based access control\n`)
  }

  if (errorCount > 0) {
    log.warning("\nSome users could not be created. Check the errors above.")
    process.exit(1)
  } else {
    log.success("\n✅ All demo users are ready!")
    process.exit(0)
  }
}

// Run the seeder
seedDemoUsers().catch((error) => {
  console.error(`\n${colors.red}${colors.bold}Fatal error:${colors.reset}`, error)
  process.exit(1)
})

