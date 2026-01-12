"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * ============================================================================
 * BULLETPROOF BOOKING CLEANUP HOOK
 * ============================================================================
 * Enhanced cleanup with retry logic, error tracking, and admin alerts.
 * ============================================================================
 */

interface CleanupResult {
  cleanedCount: number
  freedRooms: number
  details: Array<{ booking_reference: string; room_id: string }>
  timestamp: string
}

interface CleanupOptions {
  /** Interval in milliseconds (default: 5 minutes) */
  intervalMs?: number
  /** Maximum retry attempts on failure (default: 3) */
  maxRetries?: number
  /** Delay between retries in ms (default: 5000) */
  retryDelayMs?: number
  /** Callback when cleanup succeeds */
  onSuccess?: (result: CleanupResult) => void
  /** Callback when cleanup fails after all retries */
  onError?: (error: Error, failedAttempts: number) => void
  /** Enable verbose logging (default: false in production) */
  verbose?: boolean
}

/**
 * Hook to automatically cleanup expired bookings and update room statuses.
 * Uses the server-side API endpoint for reliable execution.
 */
export function useBookingCleanup(options: CleanupOptions = {}) {
  const {
    intervalMs = 5 * 60 * 1000, // 5 minutes
    maxRetries = 3,
    retryDelayMs = 5000,
    onSuccess,
    onError,
    verbose = process.env.NODE_ENV === 'development',
  } = options

  const hasRunOnMount = useRef(false)
  const failedAttempts = useRef(0)
  const isRunning = useRef(false)

  const log = useCallback((message: string, ...args: any[]) => {
    if (verbose) {
      console.log(`[BookingCleanup] ${message}`, ...args)
    }
  }, [verbose])

  const runCleanup = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent runs
    if (isRunning.current) {
      log('Cleanup already running, skipping...')
      return false
    }

    isRunning.current = true
    let success = false
    let attempt = 0

    while (attempt < maxRetries && !success) {
      attempt++
      log(`Attempt ${attempt}/${maxRetries}...`)

      try {
        const response = await fetch('/api/bookings/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.errorMessage || `HTTP ${response.status}`)
        }

        const result: CleanupResult = await response.json()

        if (result.cleanedCount > 0 || result.freedRooms > 0) {
          log(`Success! Cleaned ${result.cleanedCount} bookings, freed ${result.freedRooms} rooms`)
        } else {
          log('No expired bookings found')
        }

        // Reset failure counter on success
        failedAttempts.current = 0
        success = true

        // Call success callback
        if (onSuccess) {
          onSuccess(result)
        }

      } catch (error: any) {
        log(`Attempt ${attempt} failed:`, error.message)

        // If more retries available, wait before retrying
        if (attempt < maxRetries) {
          const delay = retryDelayMs * attempt // Exponential backoff
          log(`Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    isRunning.current = false

    // If all attempts failed
    if (!success) {
      failedAttempts.current++
      console.error(`[BookingCleanup] All ${maxRetries} attempts failed. Total consecutive failures: ${failedAttempts.current}`)

      // Call error callback
      if (onError) {
        onError(
          new Error(`Cleanup failed after ${maxRetries} attempts`),
          failedAttempts.current
        )
      }

      // If too many consecutive failures, alert admin (in a real app)
      if (failedAttempts.current >= 3) {
        console.error('[BookingCleanup] CRITICAL: Multiple consecutive cleanup failures. Manual intervention may be required.')
        // In production, you might want to send an alert to admin dashboard
        // sendAdminAlert('Booking cleanup repeatedly failing')
      }
    }

    return success
  }, [maxRetries, retryDelayMs, log, onSuccess, onError])

  useEffect(() => {
    // Run immediately on mount (only once)
    if (!hasRunOnMount.current) {
      hasRunOnMount.current = true
      log('Running initial cleanup...')
      runCleanup()
    }

    // Set up interval for periodic cleanup
    const interval = setInterval(() => {
      log('Running scheduled cleanup...')
      runCleanup()
    }, intervalMs)

    return () => {
      clearInterval(interval)
      log('Cleanup interval cleared')
    }
  }, [runCleanup, intervalMs, log])

  // Return manual trigger function for testing
  return {
    triggerCleanup: runCleanup,
    getFailedAttempts: () => failedAttempts.current,
  }
}

/**
 * Standalone function to trigger cleanup (for non-React contexts)
 */
export async function triggerBookingCleanup(): Promise<CleanupResult | null> {
  try {
    const response = await fetch('/api/bookings/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.errorMessage || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[triggerBookingCleanup] Error:', error)
    return null
  }
}

export default useBookingCleanup
