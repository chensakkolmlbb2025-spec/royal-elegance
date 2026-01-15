import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: NextRequest) {
  try {
    // Get the user ID from the request
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      )
    }

    // Verify the requesting user is an admin
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the requesting user is admin
    const token = authHeader.replace("Bearer ", "")
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !requestingUser) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
        { status: 401 }
      )
    }

    // Check if requesting user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", requestingUser.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete users" },
        { status: 403 }
      )
    }

    // Prevent admin from deleting themselves
    if (userId === requestingUser.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    // Delete the user from Supabase Auth (this will cascade delete the profile via trigger)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("[Admin Delete] Error deleting user from auth:", deleteError)
      throw deleteError
    }

    // Also delete the profile directly to ensure cleanup
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (profileError) {
      console.error("[Admin Delete] Error deleting profile:", profileError)
      // Don't throw - auth user is already deleted
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error: any) {
    console.error("[Admin Delete] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete user",
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
