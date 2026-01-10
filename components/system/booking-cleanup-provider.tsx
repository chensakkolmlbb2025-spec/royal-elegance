"use client"

import { useBookingCleanup } from "@/hooks/use-booking-cleanup"

/**
 * Client component that runs booking cleanup in the background
 * Add this to any client component that should trigger periodic cleanup
 */
export function BookingCleanupProvider({ children }: { children: React.ReactNode }) {
  useBookingCleanup()
  return <>{children}</>
}
