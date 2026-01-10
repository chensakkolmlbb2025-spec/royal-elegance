"use client"

import { useEffect, useRef } from "react"
import { cleanupExpiredBookings } from "@/lib/supabase-service"

/**
 * Hook to automatically cleanup expired bookings and update room statuses
 * Runs on mount and then every 5 minutes
 */
export function useBookingCleanup() {
  const hasRunOnMount = useRef(false)

  useEffect(() => {
    // Run immediately on mount (only once)
    if (!hasRunOnMount.current) {
      hasRunOnMount.current = true
      cleanupExpiredBookings().catch(error => {
        console.error("Failed to cleanup expired bookings on mount:", error)
      })
    }

    // Set up interval to run every 5 minutes
    const interval = setInterval(() => {
      cleanupExpiredBookings().catch(error => {
        console.error("Failed to cleanup expired bookings:", error)
      })
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [])
}
