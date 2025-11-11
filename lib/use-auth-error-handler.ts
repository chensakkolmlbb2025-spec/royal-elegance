"use client"

import { useEffect } from "react"
import { handleAuthError } from "./auth-recovery"

/**
 * Global error handler for authentication errors
 * Catches unhandled auth errors and clears invalid sessions
 */
export function useAuthErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      const message = error?.message || event.message || ''
      
      // Check if it's an auth-related error
      if (
        message.includes('refresh') ||
        message.includes('token') ||
        message.includes('session') ||
        message.includes('Invalid') ||
        message.includes('AuthApiError')
      ) {
        console.warn('🔒 Global auth error caught:', message)
        handleAuthError(error, false)
        event.preventDefault()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const message = error?.message || ''
      
      // Check if it's an auth-related error
      if (
        message.includes('refresh') ||
        message.includes('token') ||
        message.includes('session') ||
        message.includes('Invalid') ||
        message.includes('AuthApiError')
      ) {
        console.warn('🔒 Global auth rejection caught:', message)
        handleAuthError(error, false)
        event.preventDefault()
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
}
