"use server"

import { cookies } from "next/headers"
import crypto from "crypto"

const CSRF_TOKEN_NAME = "csrf_token"
const CSRF_SECRET = process.env.CSRF_SECRET || "default-csrf-secret-change-in-production"

/**
 * Generate a CSRF token for forms
 * Creates a signed token stored in httpOnly cookie
 */
export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const timestamp = Date.now().toString()
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(`${token}:${timestamp}`)
    .digest("hex")
  
  const fullToken = `${token}:${timestamp}:${signature}`
  
  const cookieStore = await cookies()
  cookieStore.set(CSRF_TOKEN_NAME, fullToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  })
  
  return token
}

/**
 * Verify a CSRF token from form submission
 * Checks signature and expiration
 */
export async function verifyCSRFToken(submittedToken: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const storedValue = cookieStore.get(CSRF_TOKEN_NAME)?.value
    
    if (!storedValue) {
      console.warn("[CSRF] No stored token found")
      return false
    }
    
    const [token, timestamp, signature] = storedValue.split(":")
    
    // Verify token matches
    if (token !== submittedToken) {
      console.warn("[CSRF] Token mismatch")
      return false
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(`${token}:${timestamp}`)
      .digest("hex")
    
    if (signature !== expectedSignature) {
      console.warn("[CSRF] Invalid signature")
      return false
    }
    
    // Check expiration (1 hour)
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (tokenAge > 60 * 60 * 1000) {
      console.warn("[CSRF] Token expired")
      return false
    }
    
    return true
  } catch (error) {
    console.error("[CSRF] Verification error:", error)
    return false
  }
}

/**
 * Middleware to validate CSRF token in API routes
 */
export async function validateCSRFMiddleware(request: Request): Promise<{ valid: boolean; error?: string }> {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return { valid: true }
  }
  
  const csrfToken = request.headers.get("X-CSRF-Token")
  
  if (!csrfToken) {
    return { valid: false, error: "Missing CSRF token" }
  }
  
  const isValid = await verifyCSRFToken(csrfToken)
  
  if (!isValid) {
    return { valid: false, error: "Invalid CSRF token" }
  }
  
  return { valid: true }
}

/**
 * Alias for backward compatibility
 */
export const validateCsrfToken = verifyCSRFToken
