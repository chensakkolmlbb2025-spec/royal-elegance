"use client"

import { useAuthErrorHandler } from "@/lib/use-auth-error-handler"

/**
 * Component that handles global authentication errors
 * Place this in your root layout to catch auth errors across the app
 */
export function AuthErrorHandler() {
  useAuthErrorHandler()
  return null
}
