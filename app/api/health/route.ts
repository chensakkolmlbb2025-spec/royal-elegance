import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    status: "ok",
    checks: {
      environment: { status: "ok", details: "" },
      supabase: { status: "ok", details: "" },
      database: { status: "ok", details: "" },
      rls: { status: "ok", details: "" },
      data: { status: "ok", details: "" },
    },
  }

  try {
    // 1. Check environment variables
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      health.checks.environment.status = "error"
      health.checks.environment.details = "Missing SUPABASE_URL or SERVICE_ROLE_KEY"
      health.status = "error"
    } else {
      health.checks.environment.details = "All required env vars present"
    }

    // 2. Check Supabase connection
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: testData, error: testError } = await supabase
      .from("profiles")
      .select("count", { count: "exact" })
      .limit(1)

    if (testError) {
      health.checks.supabase.status = "error"
      health.checks.supabase.details = `Connection failed: ${testError.message}`
      health.status = "error"
    } else {
      health.checks.supabase.details = "Connected successfully"
    }

    // 3. Check database tables exist
    const tables = ["profiles", "bookings", "rooms", "room_types", "services", "floors"]
    const tableChecks: Record<string, boolean> = {}

    for (const table of tables) {
      const { error } = await supabase.from(table).select("count", { count: "exact" }).limit(1)
      tableChecks[table] = !error
    }

    const allTablesExist = Object.values(tableChecks).every((v) => v)
    if (!allTablesExist) {
      health.checks.database.status = "warning"
      health.checks.database.details = `Missing tables: ${Object.entries(tableChecks)
        .filter(([, exists]) => !exists)
        .map(([table]) => table)
        .join(", ")}`
    } else {
      health.checks.database.details = "All tables exist"
    }

    // 4. Check RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc("_role_for_auth_uid", {
      p_uid: "00000000-0000-0000-0000-000000000000",
    })

    if (policiesError && policiesError.message.includes("does not exist")) {
      health.checks.rls.status = "error"
      health.checks.rls.details = "RLS helper functions not found. Run superbase-secure-rls.sql"
      health.status = "error"
    } else if (policiesError) {
      health.checks.rls.status = "warning"
      health.checks.rls.details = `RLS check inconclusive: ${policiesError.message}`
    } else {
      health.checks.rls.details = "RLS helpers present"
    }

    // 5. Check data presence
    const { count: profileCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    const { count: roomCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })

    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })

    const { count: serviceCount } = await supabase
      .from("services")
      .select("*", { count: "exact", head: true })

    health.checks.data.details = `Profiles: ${profileCount || 0}, Rooms: ${roomCount || 0}, Bookings: ${bookingCount || 0}, Services: ${serviceCount || 0}`

    if ((roomCount || 0) === 0 || (serviceCount || 0) === 0) {
      health.checks.data.status = "warning"
      health.checks.data.details += " (seed database to populate)"
    }

    return NextResponse.json(health, { status: health.status === "error" ? 500 : 200 })
  } catch (error) {
    health.status = "error"
    health.checks.supabase.status = "error"
    health.checks.supabase.details = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(health, { status: 500 })
  }
}

