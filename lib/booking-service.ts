/**
 * ============================================================================
 * BULLETPROOF BOOKING SERVICE
 * ============================================================================
 * Transaction-safe booking operations with race condition prevention.
 * Uses PostgreSQL functions for atomic operations.
 * ============================================================================
 */

import { createClient } from "./supabase/client"
import type { Booking } from "./types"

// ============================================================================
// TYPES
// ============================================================================

export interface BookingRequest {
  userId: string
  roomId: string
  roomTypeId: string
  checkInDate: Date | string
  checkOutDate: Date | string
  guestName: string
  guestEmail: string
  guestPhone: string
  guestCount?: number
  roomPrice: number
  servicesPrice?: number
  totalPrice: number
  specialRequests?: string
  paymentMethod?: string
}

export interface BookingResult {
  success: boolean
  bookingId?: string
  bookingReference?: string
  errorCode?: string
  errorMessage?: string
}

export interface AvailabilityResult {
  isAvailable: boolean
  conflictingBookings: Array<{
    id: string
    booking_reference: string
    check_in_date: string
    check_out_date: string
    status: string
  }>
}

export interface AvailableRoom {
  roomId: string
  roomNumber: string
  roomTypeId: string
  roomTypeName: string
  basePrice: number
  maxOccupancy: number
  floorNumber: number
}

export interface CleanupResult {
  cleanedCount: number
  freedRooms: number
  details: Array<{
    booking_reference: string
    room_id: string
  }>
}

// ============================================================================
// ERROR CODES (for client-side handling)
// ============================================================================

export const BookingErrorCodes = {
  INVALID_DATES: 'INVALID_DATES',
  PAST_DATE: 'PAST_DATE',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_NOT_AVAILABLE: 'ROOM_NOT_AVAILABLE',
  ROOM_LOCKED: 'ROOM_LOCKED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type BookingErrorCode = typeof BookingErrorCodes[keyof typeof BookingErrorCodes]

// Human-readable error messages
export const BookingErrorMessages: Record<BookingErrorCode, string> = {
  INVALID_DATES: 'Check-out date must be after check-in date.',
  PAST_DATE: 'Check-in date cannot be in the past.',
  ROOM_NOT_FOUND: 'The selected room no longer exists.',
  ROOM_NOT_AVAILABLE: 'This room has just been booked by another guest. Please select different dates or another room.',
  ROOM_LOCKED: 'Another guest is currently booking this room. Please wait a moment and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
}

// ============================================================================
// CORE BOOKING FUNCTIONS
// ============================================================================

/**
 * Create a booking using transaction-safe database function.
 * This prevents race conditions and double-booking.
 */
export async function createBookingSafe(request: BookingRequest): Promise<BookingResult> {
  const supabase = createClient()
  
  // Format dates to ISO string (date only)
  const checkInDate = request.checkInDate instanceof Date 
    ? request.checkInDate.toISOString().split('T')[0]
    : new Date(request.checkInDate).toISOString().split('T')[0]
  
  const checkOutDate = request.checkOutDate instanceof Date
    ? request.checkOutDate.toISOString().split('T')[0]
    : new Date(request.checkOutDate).toISOString().split('T')[0]

  try {
    const { data, error } = await supabase.rpc('create_booking_safe', {
      p_user_id: request.userId,
      p_room_id: request.roomId,
      p_room_type_id: request.roomTypeId,
      p_check_in_date: checkInDate,
      p_check_out_date: checkOutDate,
      p_guest_name: request.guestName,
      p_guest_email: request.guestEmail,
      p_guest_phone: request.guestPhone,
      p_guest_count: request.guestCount || 1,
      p_room_price: request.roomPrice,
      p_services_price: request.servicesPrice || 0,
      p_total_price: request.totalPrice,
      p_special_requests: request.specialRequests || null,
      p_payment_method: request.paymentMethod || null,
    })

    if (error) {
      console.error('[createBookingSafe] Database error:', error)
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error.message,
      }
    }

    // The function returns a table, so data is an array
    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'No response from database',
      }
    }

    return {
      success: result.success,
      bookingId: result.booking_id,
      bookingReference: result.booking_reference,
      errorCode: result.error_code,
      errorMessage: result.error_message,
    }
  } catch (err: any) {
    console.error('[createBookingSafe] Exception:', err)
    return {
      success: false,
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: err.message || 'Failed to create booking',
    }
  }
}

/**
 * Check if a specific room is available for given dates.
 * Returns availability status and any conflicting bookings.
 */
export async function checkRoomAvailability(
  roomId: string,
  checkInDate: Date | string,
  checkOutDate: Date | string
): Promise<AvailabilityResult> {
  const supabase = createClient()
  
  const checkIn = checkInDate instanceof Date 
    ? checkInDate.toISOString().split('T')[0]
    : new Date(checkInDate).toISOString().split('T')[0]
  
  const checkOut = checkOutDate instanceof Date
    ? checkOutDate.toISOString().split('T')[0]
    : new Date(checkOutDate).toISOString().split('T')[0]

  try {
    const { data, error } = await supabase.rpc('check_room_availability', {
      p_room_id: roomId,
      p_check_in_date: checkIn,
      p_check_out_date: checkOut,
    })

    if (error) {
      console.error('[checkRoomAvailability] Error:', error)
      // Assume not available on error (safer)
      return {
        isAvailable: false,
        conflictingBookings: [],
      }
    }

    const result = Array.isArray(data) ? data[0] : data

    return {
      isAvailable: result?.is_available ?? false,
      conflictingBookings: result?.conflicting_bookings || [],
    }
  } catch (err) {
    console.error('[checkRoomAvailability] Exception:', err)
    return {
      isAvailable: false,
      conflictingBookings: [],
    }
  }
}

/**
 * Get all available rooms for a date range.
 * Optionally filter by room type and guest count.
 */
export async function getAvailableRooms(
  checkInDate: Date | string,
  checkOutDate: Date | string,
  roomTypeId?: string,
  guestCount: number = 1
): Promise<AvailableRoom[]> {
  const supabase = createClient()
  
  const checkIn = checkInDate instanceof Date 
    ? checkInDate.toISOString().split('T')[0]
    : new Date(checkInDate).toISOString().split('T')[0]
  
  const checkOut = checkOutDate instanceof Date
    ? checkOutDate.toISOString().split('T')[0]
    : new Date(checkOutDate).toISOString().split('T')[0]

  try {
    const { data, error } = await supabase.rpc('get_available_rooms', {
      p_check_in_date: checkIn,
      p_check_out_date: checkOut,
      p_room_type_id: roomTypeId || null,
      p_guest_count: guestCount,
    })

    if (error) {
      console.error('[getAvailableRooms] Error:', error)
      return []
    }

    return (data || []).map((room: any) => ({
      roomId: room.room_id,
      roomNumber: room.room_number,
      roomTypeId: room.room_type_id,
      roomTypeName: room.room_type_name,
      basePrice: parseFloat(room.base_price),
      maxOccupancy: room.max_occupancy,
      floorNumber: room.floor_number,
    }))
  } catch (err) {
    console.error('[getAvailableRooms] Exception:', err)
    return []
  }
}

/**
 * Clean up expired bookings and free rooms.
 * Call this periodically (e.g., every 5 minutes).
 */
export async function cleanupExpiredBookings(): Promise<CleanupResult> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('cleanup_expired_bookings')

    if (error) {
      console.error('[cleanupExpiredBookings] Error:', error)
      return {
        cleanedCount: 0,
        freedRooms: 0,
        details: [],
      }
    }

    const result = Array.isArray(data) ? data[0] : data

    return {
      cleanedCount: result?.cleaned_count || 0,
      freedRooms: result?.freed_rooms || 0,
      details: result?.details || [],
    }
  } catch (err) {
    console.error('[cleanupExpiredBookings] Exception:', err)
    return {
      cleanedCount: 0,
      freedRooms: 0,
      details: [],
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the number of nights between two dates.
 */
export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  const start = checkIn instanceof Date ? checkIn : new Date(checkIn)
  const end = checkOut instanceof Date ? checkOut : new Date(checkOut)
  
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Validate booking dates.
 */
export function validateBookingDates(
  checkIn: Date | string, 
  checkOut: Date | string
): { valid: boolean; error?: string } {
  const checkInDate = checkIn instanceof Date ? checkIn : new Date(checkIn)
  const checkOutDate = checkOut instanceof Date ? checkOut : new Date(checkOut)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }

  if (checkInDate < today) {
    return { valid: false, error: BookingErrorMessages.PAST_DATE }
  }

  if (checkOutDate <= checkInDate) {
    return { valid: false, error: BookingErrorMessages.INVALID_DATES }
  }

  return { valid: true }
}

/**
 * Generate a user-friendly error message from a booking result.
 */
export function getBookingErrorMessage(result: BookingResult): string {
  if (result.success) return ''
  
  if (result.errorCode && result.errorCode in BookingErrorMessages) {
    return BookingErrorMessages[result.errorCode as BookingErrorCode]
  }
  
  return result.errorMessage || BookingErrorMessages.UNKNOWN_ERROR
}

// ============================================================================
// RETRY LOGIC FOR RACE CONDITIONS
// ============================================================================

/**
 * Attempt to create a booking with automatic retry on lock conflicts.
 * Use this when you want the system to automatically retry if another
 * user is currently booking the same room.
 */
export async function createBookingWithRetry(
  request: BookingRequest,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<BookingResult> {
  let lastResult: BookingResult = {
    success: false,
    errorCode: 'UNKNOWN_ERROR',
    errorMessage: 'No attempt made',
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await createBookingSafe(request)

    // If successful or error is not retryable, return immediately
    if (lastResult.success || lastResult.errorCode !== 'ROOM_LOCKED') {
      return lastResult
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      console.log(`[createBookingWithRetry] Attempt ${attempt} failed (room locked), retrying in ${delayMs * attempt}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }

  console.warn(`[createBookingWithRetry] All ${maxRetries} attempts failed`)
  return lastResult
}

// ============================================================================
// BOOKING SERVICES LINK
// ============================================================================

/**
 * Add services to an existing booking.
 */
export async function addBookingServices(
  bookingId: string,
  services: Array<{
    serviceId: string
    quantity: number
    unitPrice: number
    serviceDate?: Date | string
    serviceTime?: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const bookingServices = services.map(s => ({
      booking_id: bookingId,
      service_id: s.serviceId,
      quantity: s.quantity,
      unit_price: s.unitPrice,
      total_price: s.unitPrice * s.quantity,
      service_date: s.serviceDate 
        ? (s.serviceDate instanceof Date 
            ? s.serviceDate.toISOString().split('T')[0]
            : new Date(s.serviceDate).toISOString().split('T')[0])
        : null,
      service_time: s.serviceTime || null,
      status: 'pending',
    }))

    const { error } = await supabase
      .from('booking_services')
      .insert(bookingServices)

    if (error) {
      console.error('[addBookingServices] Error:', error)
      return { success: false, error: error.message }
    }

    // Update booking services_price
    const totalServicesPrice = services.reduce(
      (sum, s) => sum + (s.unitPrice * s.quantity), 
      0
    )

    await supabase
      .from('bookings')
      .update({ 
        services_price: totalServicesPrice,
        total_price: supabase.rpc('get_booking_total', { booking_id: bookingId }) // Will be calculated by DB
      })
      .eq('id', bookingId)

    return { success: true }
  } catch (err: any) {
    console.error('[addBookingServices] Exception:', err)
    return { success: false, error: err.message }
  }
}

// ============================================================================
// EXPORT DEFAULT FOR CONVENIENCE
// ============================================================================

const bookingService = {
  createBookingSafe,
  createBookingWithRetry,
  checkRoomAvailability,
  getAvailableRooms,
  cleanupExpiredBookings,
  addBookingServices,
  calculateNights,
  validateBookingDates,
  getBookingErrorMessage,
  BookingErrorCodes,
  BookingErrorMessages,
}

export default bookingService
