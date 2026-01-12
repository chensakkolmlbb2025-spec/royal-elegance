/**
 * ============================================================================
 * ROOM AVAILABILITY API
 * ============================================================================
 * Server-side API for checking room availability.
 * Uses database-level queries for accuracy.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const availabilitySchema = z.object({
  checkInDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid check-in date'
  ),
  checkOutDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid check-out date'
  ),
  roomTypeId: z.string().uuid().optional(),
  guestCount: z.number().int().min(1).max(10).default(1),
})

// ============================================================================
// GET - Get all available rooms
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      checkInDate: searchParams.get('checkInDate'),
      checkOutDate: searchParams.get('checkOutDate'),
      roomTypeId: searchParams.get('roomTypeId') || undefined,
      guestCount: parseInt(searchParams.get('guestCount') || '1', 10),
    }

    // Validate parameters
    if (!params.checkInDate || !params.checkOutDate) {
      return NextResponse.json(
        { 
          success: false, 
          errorMessage: 'checkInDate and checkOutDate are required' 
        },
        { status: 400 }
      )
    }

    const validationResult = availabilitySchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          errorMessage: 'Invalid parameters',
          errors: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const data = validationResult.data
    const supabase = await createClient()

    // Call database function to get available rooms
    const { data: rooms, error } = await supabase.rpc('get_available_rooms', {
      p_check_in_date: data.checkInDate,
      p_check_out_date: data.checkOutDate,
      p_room_type_id: data.roomTypeId || null,
      p_guest_count: data.guestCount,
    })

    if (error) {
      console.error('[API] get_available_rooms error:', error)
      return NextResponse.json(
        { 
          success: false, 
          errorMessage: 'Failed to fetch available rooms' 
        },
        { status: 500 }
      )
    }

    // Transform response
    const availableRooms = (rooms || []).map((room: any) => ({
      roomId: room.room_id,
      roomNumber: room.room_number,
      roomTypeId: room.room_type_id,
      roomTypeName: room.room_type_name,
      basePrice: parseFloat(room.base_price),
      maxOccupancy: room.max_occupancy,
      floorNumber: room.floor_number,
    }))

    return NextResponse.json({
      success: true,
      rooms: availableRooms,
      count: availableRooms.length,
      params: {
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        roomTypeId: data.roomTypeId,
        guestCount: data.guestCount,
      },
    })

  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        errorMessage: 'An unexpected error occurred' 
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Check specific room availability
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, checkInDate, checkOutDate } = body

    if (!roomId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { 
          success: false, 
          errorMessage: 'roomId, checkInDate, and checkOutDate are required' 
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call database function to check specific room
    const { data: result, error } = await supabase.rpc('check_room_availability', {
      p_room_id: roomId,
      p_check_in_date: checkInDate,
      p_check_out_date: checkOutDate,
    })

    if (error) {
      console.error('[API] check_room_availability error:', error)
      return NextResponse.json(
        { 
          success: false, 
          errorMessage: 'Failed to check room availability' 
        },
        { status: 500 }
      )
    }

    const availability = Array.isArray(result) ? result[0] : result

    return NextResponse.json({
      success: true,
      isAvailable: availability?.is_available ?? false,
      conflictingBookings: availability?.conflicting_bookings || [],
    })

  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        errorMessage: 'An unexpected error occurred' 
      },
      { status: 500 }
    )
  }
}
