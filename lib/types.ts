export interface Floor {
  id: string
  name: string
  number: number
  description: string
  totalRooms?: number
  isActive?: boolean
  createdAt: Date
  updatedAt?: Date
}

export interface RoomType {
  id: string
  name: string
  slug: string
  description: string
  basePrice: number
  maxOccupancy: number
  amenities: string[]
  images: string[]
  createdAt: Date
}

export interface Room {
  id: string
  roomNumber: string
  floorId: string
  roomTypeId: string
  status: "available" | "occupied" | "maintenance" | "reserved"
  images?: string[] // Gallery images for individual rooms
  description?: string // Individual room description
  specialFeatures?: string[] // Room-specific features
  priceModifier?: number // Price adjustment from base room type price
  floor?: {
    id: string
    floor_number: number
    name: string
  } // Floor relationship data
  createdAt: Date
}

export interface Service {
  id: string
  name: string
  slug: string
  description: string
  price: number
  category: "spa" | "dining" | "transport" | "laundry" | "room_service" | "other"
  categoryId?: string // Foreign key to service_categories table
  available: boolean
  images?: string[]
  thumbnailUrl?: string
  createdAt: Date
}

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string // Emoji or icon name
  color: string // Color for UI (e.g., 'purple', 'blue', 'green')
  isDefault: boolean // Cannot be deleted if true
  sortOrder: number
  createdAt: Date
  updatedAt?: Date
}

export interface Booking {
  id: string
  bookingReference: string
  userId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  guestCount: number
  roomId: string | null
  roomTypeId?: string | null
  checkInDate: Date
  checkOutDate: Date
  nights?: number
  status: "pending" | "confirmed" | "cancelled" | "checked_in" | "checked_out" | "no_show"
  actualCheckInAt?: Date | null
  actualCheckOutAt?: Date | null
  roomPrice: number
  servicesPrice: number
  additionalCharges?: number
  discountAmount?: number
  taxAmount?: number
  totalPrice: number
  paymentStatus: "pending" | "paid" | "refunded" | "partial"
  paymentMethod?: "cash" | "card" | "online" | "bank_transfer" | "khqr" | null
  paidAmount?: number
  specialRequests?: string
  internalNotes?: string
  cancelledAt?: Date | null
  cancellationReason?: string
  refundAmount?: number
  createdAt: Date
  updatedAt?: Date
  // Virtual fields for backward compatibility and client-side use (always present after DB fetch)
  services: string[] // Loaded from booking_services table
  checkIn: Date // Alias for checkInDate (backward compatibility)
  checkOut: Date // Alias for checkOutDate (backward compatibility)  
  guests: number // Alias for guestCount (backward compatibility)
  bookingType: "room" | "service" | "both" // Virtual field for UI
}
