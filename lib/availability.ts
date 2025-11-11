import type { Room, Booking } from "./types"

export function isRoomAvailable(
  room: Room,
  checkIn: Date,
  checkOut: Date,
  bookings: Booking[],
  excludeBookingId?: string,
): boolean {
  // Check if room status allows booking
  if (room.status !== "available") {
    return false
  }

  // Check for overlapping bookings
  const roomBookings = bookings.filter(
    (b) => b.roomId === room.id && b.status !== "cancelled" && b.id !== excludeBookingId,
  )

  for (const booking of roomBookings) {
    const bookingCheckIn = new Date(booking.checkIn)
    const bookingCheckOut = new Date(booking.checkOut)

    // Check if dates overlap
    if (checkIn < bookingCheckOut && checkOut > bookingCheckIn) {
      return false
    }
  }

  return true
}

export function getAvailableRooms(
  rooms: Room[],
  checkIn: Date,
  checkOut: Date,
  bookings: Booking[],
  roomTypeId?: string,
): Room[] {
  return rooms.filter((room) => {
    if (roomTypeId && room.roomTypeId !== roomTypeId) {
      return false
    }
    return isRoomAvailable(room, checkIn, checkOut, bookings)
  })
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function calculateTotalPrice(basePrice: number, nights: number, services: number[]): number {
  const roomTotal = basePrice * nights
  const servicesTotal = services.reduce((sum, price) => sum + price, 0)
  return roomTotal + servicesTotal
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}
