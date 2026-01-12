/**
 * ============================================================================
 * BULLETPROOF BOOKING API - CREATE BOOKING
 * ============================================================================
 * Server-side API route for transaction-safe booking creation.
 * Validates all inputs and uses database-level locking.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createBookingSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  roomTypeId: z.string().uuid('Invalid room type ID'),
  checkInDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid check-in date'
  ),
  checkOutDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid check-out date'
  ),
  guestName: z.string().min(2, 'Guest name is required').max(100),
  guestEmail: z.string().email('Invalid email address'),
  guestPhone: z.string().min(6, 'Valid phone number required').max(20),
  guestCount: z.number().int().min(1).max(10).default(1),
  roomPrice: z.number().min(0),
  servicesPrice: z.number().min(0).default(0),
  totalPrice: z.number().min(0),
  specialRequests: z.string().max(1000).optional(),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'online_banking', 'e_wallet', 'other']).optional(),
  services: z.array(z.object({
    serviceId: z.string().uuid(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    serviceDate: z.string().optional(),
    serviceTime: z.string().optional(),
  })).optional(),
})

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          errorCode: 'UNAUTHORIZED',
          errorMessage: 'You must be logged in to create a booking' 
        },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validationResult = createBookingSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      
      return NextResponse.json(
        { 
          success: false, 
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid booking data',
          errors 
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 3. Additional date validation
    const checkInDate = new Date(data.checkInDate)
    const checkOutDate = new Date(data.checkOutDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      return NextResponse.json(
        { 
          success: false, 
          errorCode: 'PAST_DATE',
          errorMessage: 'Check-in date cannot be in the past' 
        },
        { status: 400 }
      )
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { 
          success: false, 
          errorCode: 'INVALID_DATES',
          errorMessage: 'Check-out date must be after check-in date' 
        },
        { status: 400 }
      )
    }

    // 4. Call the transaction-safe database function
    const { data: result, error: rpcError } = await supabase.rpc('create_booking_safe', {
      p_user_id: user.id,
      p_room_id: data.roomId,
      p_room_type_id: data.roomTypeId,
      p_check_in_date: data.checkInDate,
      p_check_out_date: data.checkOutDate,
      p_guest_name: data.guestName,
      p_guest_email: data.guestEmail,
      p_guest_phone: data.guestPhone,
      p_guest_count: data.guestCount,
      p_room_price: data.roomPrice,
      p_services_price: data.servicesPrice,
      p_total_price: data.totalPrice,
      p_special_requests: data.specialRequests || null,
      p_payment_method: data.paymentMethod || null,
    })

    if (rpcError) {
      console.error('[API] create_booking_safe RPC error:', rpcError)
      return NextResponse.json(
        { 
          success: false, 
          errorCode: 'DATABASE_ERROR',
          errorMessage: 'Failed to create booking. Please try again.' 
        },
        { status: 500 }
      )
    }

    // The function returns an array with one row
    const bookingResult = Array.isArray(result) ? result[0] : result

    if (!bookingResult?.success) {
      // Map database error codes to HTTP status codes
      const statusMap: Record<string, number> = {
        'INVALID_DATES': 400,
        'PAST_DATE': 400,
        'ROOM_NOT_FOUND': 404,
        'ROOM_NOT_AVAILABLE': 409,
        'ROOM_LOCKED': 409,
      }

      return NextResponse.json(
        { 
          success: false, 
          errorCode: bookingResult?.error_code || 'UNKNOWN_ERROR',
          errorMessage: bookingResult?.error_message || 'Failed to create booking' 
        },
        { status: statusMap[bookingResult?.error_code] || 500 }
      )
    }

    // 5. Add services if provided
    if (data.services && data.services.length > 0 && bookingResult.booking_id) {
      const bookingServices = data.services.map(s => ({
        booking_id: bookingResult.booking_id,
        service_id: s.serviceId,
        quantity: s.quantity,
        unit_price: s.unitPrice,
        total_price: s.unitPrice * s.quantity,
        service_date: s.serviceDate || null,
        service_time: s.serviceTime || null,
        status: 'pending',
      }))

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(bookingServices)

      if (servicesError) {
        console.warn('[API] Failed to add booking services:', servicesError)
        // Don't fail the booking, just log the warning
      }
    }

    // 6. Return success response
    return NextResponse.json(
      { 
        success: true,
        bookingId: bookingResult.booking_id,
        bookingReference: bookingResult.booking_reference,
        message: 'Booking created successfully'
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('[API] Unexpected error in create booking:', error)
    return NextResponse.json(
      { 
        success: false, 
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'An unexpected error occurred. Please try again.' 
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIONS - CORS preflight
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
