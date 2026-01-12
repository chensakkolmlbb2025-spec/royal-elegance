/**
 * ============================================================================
 * BOOKING CLEANUP API (CRON JOB ENDPOINT)
 * ============================================================================
 * Server-side API for automatic expired booking cleanup.
 * Can be called by Vercel Cron Jobs or external schedulers.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// ============================================================================
// CLEANUP HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, verify the request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, errorMessage: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cleanup] Starting expired booking cleanup...')

    // Call the database cleanup function
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_bookings')

    if (error) {
      console.error('[Cleanup] Database error:', error)
      return NextResponse.json(
        { 
          success: false, 
          errorMessage: 'Cleanup failed',
          error: error.message 
        },
        { status: 500 }
      )
    }

    const result = Array.isArray(data) ? data[0] : data

    console.log(`[Cleanup] Completed: ${result?.cleaned_count || 0} bookings processed, ${result?.freed_rooms || 0} rooms freed`)

    return NextResponse.json({
      success: true,
      cleanedCount: result?.cleaned_count || 0,
      freedRooms: result?.freed_rooms || 0,
      details: result?.details || [],
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('[Cleanup] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        errorMessage: 'An unexpected error occurred',
        error: error.message 
      },
      { status: 500 }
    )
  }
}

// Also support GET for manual triggers (development)
export async function GET(request: NextRequest) {
  // In production, you might want to restrict this
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev) {
    // Check for secret in query param
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, errorMessage: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // Forward to POST handler
  return POST(request)
}
