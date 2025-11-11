"use client"

import { supabase } from "./supabase-config"

/**
 * Clear all authentication data from browser storage
 * Useful when dealing with invalid/expired tokens
 */
export async function clearAuthStorage() {
  if (typeof window === 'undefined') return

  try {
    // Clear Supabase session
    if (supabase) {
      await supabase.auth.signOut()
    }

    // Clear localStorage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('supabase.') ||
        key.startsWith('sb-') ||
        key.includes('auth-token') ||
        key.includes('refresh-token')
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))

    // Clear sessionStorage
    const sessionKeysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (
        key.startsWith('supabase.') ||
        key.startsWith('sb-') ||
        key.includes('auth-token') ||
        key.includes('refresh-token')
      )) {
        sessionKeysToRemove.push(key)
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))

    console.log('🧹 Auth storage cleared')
  } catch (error) {
    console.error('Error clearing auth storage:', error)
  }
}

/**
 * Check if the current session is valid
 * Returns true if valid, false if invalid/expired
 */
export async function validateSession(): Promise<boolean> {
  if (!supabase) return false

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // Handle refresh token errors gracefully
    if (error) {
      const isRefreshTokenError = error.message?.includes('refresh') || 
                                  error.message?.includes('Refresh Token Not Found') ||
                                  error.message?.includes('Invalid Refresh Token')
      
      if (isRefreshTokenError) {
        console.warn('Invalid refresh token, clearing storage')
        await clearAuthStorage()
        return false
      }
      
      console.warn('Session validation error:', error.message)
      return false
    }

    if (!session) {
      return false
    }

    // Check if token is expired
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000)
      const now = new Date()
      
      if (expiresAt < now) {
        console.warn('Session expired')
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error validating session:', error)
    return false
  }
}

/**
 * Attempt to refresh the session
 * Returns true if successful, false otherwise
 */
export async function refreshSession(): Promise<boolean> {
  if (!supabase) return false

  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.warn('Session refresh error:', error.message)
      return false
    }

    if (!data.session) {
      return false
    }

    console.log('✅ Session refreshed successfully')
    return true
  } catch (error) {
    console.error('Error refreshing session:', error)
    return false
  }
}

/**
 * Handle authentication errors gracefully
 * Clears invalid sessions and redirects to login if needed
 */
export async function handleAuthError(error: any, redirectToLogin = true) {
  const errorMessage = error?.message || ''
  const isAuthError = 
    errorMessage.includes('refresh') ||
    errorMessage.includes('Refresh Token Not Found') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('token') ||
    errorMessage.includes('session') ||
    errorMessage.includes('Invalid') ||
    error?.status === 401

  if (isAuthError) {
    console.warn('🔒 Auth error detected, clearing session:', errorMessage)
    await clearAuthStorage()

    if (redirectToLogin && typeof window !== 'undefined') {
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && 
          currentPath !== '/auth/signup' && 
          currentPath !== '/auth/callback' &&
          !currentPath.startsWith('/auth/')) {
        // Store current URL for redirect after login
        sessionStorage.setItem('redirectAfterLogin', currentPath)
        
        // Small delay to ensure storage is cleared
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
    }
  }
}

/**
 * Initialize auth recovery on app start
 * Cleans up invalid sessions automatically
 */
export async function initAuthRecovery() {
  if (typeof window === 'undefined') return

  try {
    const isValid = await validateSession()
    
    if (!isValid) {
      // Try to refresh session
      const refreshed = await refreshSession()
      
      if (!refreshed) {
        // Session cannot be recovered, clear it
        await clearAuthStorage()
        console.log('🔄 Invalid session cleared on startup')
      }
    }
  } catch (error) {
    console.error('Error in auth recovery:', error)
    await clearAuthStorage()
  }
}
