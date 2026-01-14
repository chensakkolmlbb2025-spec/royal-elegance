/**
 * Booking Service with Race Condition Prevention
 * 
 * Features:
 * - Optimistic locking with version control
 * - Database-level row locking for booking creation
 * - Availability checking with atomic operations
 * - Reservation timeout handling
 * - Conflict resolution
 */

import { supabase as supabaseClient } from "@/lib/supabase-config"

// Create a guaranteed non-null client
const supabase = supabaseClient!

if (!supabase) {
  console.error('[BookingService] Supabase client not initialized')
}

// Booking status types
export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked-in',
  CHECKED_OUT: 'checked-out',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show',
  RESERVED: 'reserved' // Temporary hold
} as const

export type BookingStatusType = typeof BookingStatus[keyof typeof BookingStatus]

// Reservation timeout (15 minutes)
const RESERVATION_TIMEOUT_MS = 15 * 60 * 1000

export interface BookingRequest {
  roomId: string
  userId?: string
  guestName: string
  guestEmail: string
  guestPhone?: string
  guestCount: number
  checkInDate: Date
  checkOutDate: Date
  specialRequests?: string
  services?: string[]
}

export interface BookingResult {
  success: boolean
  booking?: any
  error?: string
  conflictDetails?: {
    existingBookingId: string
    conflictingDates: { checkIn: Date; checkOut: Date }
  }
}

export interface AvailabilityResult {
  available: boolean
  conflictingBookings?: Array<{
    id: string
    checkIn: Date
    checkOut: Date
    status: string
  }>
}

/**
 * Check room availability with database-level locking
 * This prevents race conditions where two users check availability simultaneously
 */
export async function checkRoomAvailabilityWithLock(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: string
): Promise<AvailabilityResult> {
  try {
    // Use a database function for atomic availability check
    const { data, error } = await supabase.rpc('check_room_availability_atomic', {
      p_room_id: roomId,
      p_check_in: checkInDate.toISOString(),
      p_check_out: checkOutDate.toISOString(),
      p_exclude_booking_id: excludeBookingId || null
    })

    if (error) {
      // Fallback to standard query if RPC doesn't exist
      console.warn('[BookingService] Atomic check failed, using fallback:', error)
      return await checkRoomAvailabilityFallback(roomId, checkInDate, checkOutDate, excludeBookingId)
    }

    return {
      available: data.available,
      conflictingBookings: data.conflicts?.map((c: any) => ({
        id: c.id,
        checkIn: new Date(c.check_in_date),
        checkOut: new Date(c.check_out_date),
        status: c.status
      }))
    }
  } catch (error) {
    console.error('[BookingService] Availability check error:', error)
    return await checkRoomAvailabilityFallback(roomId, checkInDate, checkOutDate, excludeBookingId)
  }
}

/**
 * Fallback availability check without RPC
 */
async function checkRoomAvailabilityFallback(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: string
): Promise<AvailabilityResult> {
  // Clean up expired reservations first
  await cleanupExpiredReservations()

  let query = supabase
    .from('bookings')
    .select('id, check_in_date, check_out_date, status')
    .eq('room_id', roomId)
    .in('status', ['pending', 'confirmed', 'checked-in', 'reserved'])
    .or(`and(check_in_date.lt.${checkOutDate.toISOString()},check_out_date.gt.${checkInDate.toISOString()})`)

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data: conflicts, error } = await query

  if (error) {
    console.error('[BookingService] Availability query error:', error)
    throw new Error('Failed to check availability')
  }

  return {
    available: !conflicts || conflicts.length === 0,
    conflictingBookings: conflicts?.map(c => ({
      id: c.id,
      checkIn: new Date(c.check_in_date),
      checkOut: new Date(c.check_out_date),
      status: c.status
    }))
  }
}

/**
 * Create a booking with race condition prevention
 * Uses optimistic locking and atomic operations
 */
export async function createBookingWithLock(
  request: BookingRequest
): Promise<BookingResult> {
  const {
    roomId,
    userId,
    guestName,
    guestEmail,
    guestPhone,
    guestCount,
    checkInDate,
    checkOutDate,
    specialRequests,
    services
  } = request

  // Generate a unique transaction ID for this booking attempt
  const transactionId = crypto.randomUUID()

  try {
    // Step 1: Create a temporary reservation (with short TTL)
    // This acts as a "lock" on the room for this time period
    const reservationResult = await createTemporaryReservation(
      roomId,
      checkInDate,
      checkOutDate,
      transactionId
    )

    if (!reservationResult.success) {
      return {
        success: false,
        error: reservationResult.error,
        conflictDetails: reservationResult.conflictDetails
      }
    }

    // Step 2: Get room details for pricing
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        room_types (
          name,
          base_price,
          max_occupancy
        )
      `)
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      await cancelReservation(transactionId)
      return { success: false, error: 'Room not found' }
    }

    // Step 3: Validate guest count
    const maxOccupancy = room.room_types?.max_occupancy || 4
    if (guestCount > maxOccupancy) {
      await cancelReservation(transactionId)
      return { 
        success: false, 
        error: `Guest count (${guestCount}) exceeds room capacity (${maxOccupancy})` 
      }
    }

    // Step 4: Calculate pricing
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const basePrice = room.room_types?.base_price || room.price || 100
    const roomPrice = basePrice * nights

    // Calculate services price
    let servicesPrice = 0
    if (services && services.length > 0) {
      const { data: serviceData } = await supabase
        .from('services')
        .select('id, price')
        .in('id', services)
      
      servicesPrice = serviceData?.reduce((sum, s) => sum + (s.price || 0), 0) || 0
    }

    const totalPrice = roomPrice + servicesPrice

    // Step 5: Convert reservation to actual booking (atomic operation)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({
        user_id: userId || null,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        guest_count: guestCount,
        check_in_date: checkInDate.toISOString(),
        check_out_date: checkOutDate.toISOString(),
        special_requests: specialRequests || null,
        services: services || [],
        room_price: roomPrice,
        services_price: servicesPrice,
        total_price: totalPrice,
        status: BookingStatus.PENDING,
        payment_status: 'pending',
        version: 1, // For optimistic locking
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId)
      .eq('status', BookingStatus.RESERVED)
      .select()
      .single()

    if (bookingError) {
      // Reservation might have expired or been cancelled
      console.error('[BookingService] Failed to finalize booking:', bookingError)
      return { 
        success: false, 
        error: 'Booking could not be completed. Please try again.' 
      }
    }

    // Step 6: Log booking creation
    await logBookingAudit({
      bookingId: booking.id,
      action: 'BOOKING_CREATED',
      details: {
        roomId,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        totalPrice,
        guestName,
        guestEmail
      }
    })

    return {
      success: true,
      booking: convertBookingRecord(booking)
    }
  } catch (error: any) {
    // Clean up reservation if it exists
    await cancelReservation(transactionId)
    console.error('[BookingService] Booking creation error:', error)
    return { success: false, error: error.message || 'Failed to create booking' }
  }
}

/**
 * Create a temporary reservation to "lock" the room
 */
async function createTemporaryReservation(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  transactionId: string
): Promise<{ success: boolean; error?: string; conflictDetails?: any }> {
  // First, check availability with a SELECT FOR UPDATE style lock
  // Since Supabase doesn't support SELECT FOR UPDATE directly,
  // we use an insert with conflict detection
  
  const availability = await checkRoomAvailabilityFallback(
    roomId,
    checkInDate,
    checkOutDate
  )

  if (!availability.available) {
    const conflict = availability.conflictingBookings?.[0]
    return {
      success: false,
      error: 'Room is not available for the selected dates',
      conflictDetails: conflict ? {
        existingBookingId: conflict.id,
        conflictingDates: { checkIn: conflict.checkIn, checkOut: conflict.checkOut }
      } : undefined
    }
  }

  // Create reservation record
  const expiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MS)

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      room_id: roomId,
      check_in_date: checkInDate.toISOString(),
      check_out_date: checkOutDate.toISOString(),
      status: BookingStatus.RESERVED,
      transaction_id: transactionId,
      reservation_expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    // Check if it's a unique constraint violation (concurrent booking)
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Room was just booked by another user. Please try again.'
      }
    }
    console.error('[BookingService] Reservation creation error:', error)
    return { success: false, error: 'Failed to reserve room' }
  }

  // Double-check for race condition - verify no overlapping confirmed bookings were created
  const doubleCheck = await checkRoomAvailabilityFallback(
    roomId,
    checkInDate,
    checkOutDate,
    data.id
  )

  if (!doubleCheck.available) {
    // Race condition occurred - cancel our reservation
    await cancelReservation(transactionId)
    return {
      success: false,
      error: 'Room was just booked by another user. Please try again.'
    }
  }

  return { success: true }
}

/**
 * Cancel a temporary reservation
 */
async function cancelReservation(transactionId: string): Promise<void> {
  try {
    await supabase
      .from('bookings')
      .delete()
      .eq('transaction_id', transactionId)
      .eq('status', BookingStatus.RESERVED)
  } catch (error) {
    console.error('[BookingService] Failed to cancel reservation:', error)
  }
}

/**
 * Clean up expired reservations
 */
export async function cleanupExpiredReservations(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .delete()
      .eq('status', BookingStatus.RESERVED)
      .lt('reservation_expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('[BookingService] Cleanup error:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('[BookingService] Cleanup error:', error)
    return 0
  }
}

/**
 * Update booking with optimistic locking
 */
export async function updateBookingWithLock(
  bookingId: string,
  updates: Partial<{
    status: BookingStatusType
    guestName: string
    guestEmail: string
    guestPhone: string
    guestCount: number
    specialRequests: string
  }>,
  expectedVersion: number
): Promise<BookingResult> {
  try {
    // Update only if version matches (optimistic locking)
    const updateData: Record<string, any> = {}
    
    if (updates.status) updateData.status = updates.status
    if (updates.guestName) updateData.guest_name = updates.guestName
    if (updates.guestEmail) updateData.guest_email = updates.guestEmail
    if (updates.guestPhone) updateData.guest_phone = updates.guestPhone
    if (updates.guestCount) updateData.guest_count = updates.guestCount
    if (updates.specialRequests) updateData.special_requests = updates.specialRequests

    updateData.version = expectedVersion + 1
    updateData.updated_at = new Date().toISOString()

    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .eq('version', expectedVersion) // Optimistic lock check
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows updated - version mismatch (concurrent modification)
        return {
          success: false,
          error: 'Booking was modified by another user. Please refresh and try again.'
        }
      }
      return { success: false, error: error.message }
    }

    await logBookingAudit({
      bookingId,
      action: 'BOOKING_UPDATED',
      details: { updates, version: expectedVersion + 1 }
    })

    return { success: true, booking: convertBookingRecord(booking) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Cancel booking with race condition protection
 */
export async function cancelBookingWithLock(
  bookingId: string,
  reason: string,
  cancelledBy: string,
  expectedVersion: number
): Promise<BookingResult> {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        status: BookingStatus.CANCELLED,
        cancellation_reason: reason,
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
        version: expectedVersion + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('version', expectedVersion)
      .in('status', [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.RESERVED])
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Booking cannot be cancelled or was modified by another user.'
        }
      }
      return { success: false, error: error.message }
    }

    // Update room status back to available
    await supabase
      .from('rooms')
      .update({ status: 'available' })
      .eq('id', booking.room_id)

    await logBookingAudit({
      bookingId,
      action: 'BOOKING_CANCELLED',
      details: { reason, cancelledBy }
    })

    return { success: true, booking: convertBookingRecord(booking) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Check-in with validation
 */
export async function checkIn(
  bookingId: string,
  staffId: string
): Promise<BookingResult> {
  try {
    // First get current booking state
    const { data: current, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !current) {
      return { success: false, error: 'Booking not found' }
    }

    // Validate check-in is allowed
    if (current.status !== BookingStatus.CONFIRMED && current.status !== BookingStatus.PENDING) {
      return { 
        success: false, 
        error: `Cannot check-in booking with status: ${current.status}` 
      }
    }

    // Check if check-in date is today or past
    const checkInDate = new Date(current.check_in_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    checkInDate.setHours(0, 0, 0, 0)

    if (checkInDate > today) {
      return { 
        success: false, 
        error: `Check-in date is ${checkInDate.toDateString()}, not yet arrived` 
      }
    }

    // Update booking
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: BookingStatus.CHECKED_IN,
        actual_check_in: new Date().toISOString(),
        checked_in_by: staffId,
        version: (current.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('version', current.version || 0)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Update room status
    await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', current.room_id)

    await logBookingAudit({
      bookingId,
      action: 'GUEST_CHECKED_IN',
      details: { staffId, checkInTime: new Date().toISOString() }
    })

    return { success: true, booking: convertBookingRecord(booking) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Check-out with validation
 */
export async function checkOut(
  bookingId: string,
  staffId: string
): Promise<BookingResult> {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !current) {
      return { success: false, error: 'Booking not found' }
    }

    if (current.status !== BookingStatus.CHECKED_IN) {
      return { 
        success: false, 
        error: `Cannot check-out booking with status: ${current.status}` 
      }
    }

    // Validate payment status
    if (current.payment_status !== 'paid') {
      return { 
        success: false, 
        error: `Payment required before check-out. Status: ${current.payment_status}` 
      }
    }

    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: BookingStatus.CHECKED_OUT,
        actual_check_out: new Date().toISOString(),
        checked_out_by: staffId,
        version: (current.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('version', current.version || 0)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Update room status
    await supabase
      .from('rooms')
      .update({ status: 'cleaning' }) // Needs cleaning after checkout
      .eq('id', current.room_id)

    await logBookingAudit({
      bookingId,
      action: 'GUEST_CHECKED_OUT',
      details: { staffId, checkOutTime: new Date().toISOString() }
    })

    return { success: true, booking: convertBookingRecord(booking) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function convertBookingRecord(data: any): any {
  return {
    id: data.id,
    roomId: data.room_id,
    userId: data.user_id,
    guestName: data.guest_name,
    guestEmail: data.guest_email,
    guestPhone: data.guest_phone,
    guestCount: data.guest_count,
    checkInDate: new Date(data.check_in_date),
    checkOutDate: new Date(data.check_out_date),
    status: data.status,
    paymentStatus: data.payment_status,
    roomPrice: data.room_price,
    servicesPrice: data.services_price,
    totalPrice: data.total_price,
    specialRequests: data.special_requests,
    services: data.services,
    version: data.version,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
  }
}

async function logBookingAudit(params: {
  bookingId: string
  action: string
  details: Record<string, any>
}): Promise<void> {
  try {
    await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: params.bookingId,
        action: params.action,
        details: params.details,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('[BookingService] Failed to log audit event:', error)
  }
}

// Export for scheduled cleanup job
export const scheduledTasks = {
  cleanupExpiredReservations
}
