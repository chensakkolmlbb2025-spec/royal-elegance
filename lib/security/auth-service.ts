/**
 * Enhanced Authentication Service
 * Fixes P0 security issues:
 * - Email verification
 * - Strong password policies
 * - Account lockout after failed attempts
 * - Secure password reset
 * - Auth event audit logging
 */

import { createClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { checkRateLimit, RateLimiters, getClientIdentifier } from "@/lib/security/rate-limit"
import { validate, loginSchema, registerSchema, passwordResetSchema, changePasswordSchema } from "@/lib/validation/schemas"
import { sanitizeEmail, sanitizeString } from "@/lib/security/sanitize"

// ============================================================================
// TYPES
// ============================================================================

export interface AuthResult {
  success: boolean
  error?: string
  data?: unknown
  requiresVerification?: boolean
}

export interface LoginAttempt {
  email: string
  timestamp: Date
  success: boolean
  ip?: string
  userAgent?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// In-memory store for login attempts (use Redis in production)
const loginAttempts = new Map<string, LoginAttempt[]>()

// ============================================================================
// LOGIN ATTEMPT TRACKING
// ============================================================================

/**
 * Track login attempt for account lockout
 */
function trackLoginAttempt(email: string, success: boolean, ip?: string, userAgent?: string): void {
  const key = email.toLowerCase()
  const attempts = loginAttempts.get(key) || []
  
  // Add new attempt
  attempts.push({
    email,
    timestamp: new Date(),
    success,
    ip,
    userAgent,
  })
  
  // Keep only attempts from last 30 minutes
  const cutoff = Date.now() - LOCKOUT_DURATION_MS
  const recentAttempts = attempts.filter((a) => a.timestamp.getTime() > cutoff)
  
  if (recentAttempts.length > 0) {
    loginAttempts.set(key, recentAttempts)
  } else {
    loginAttempts.delete(key)
  }
}

/**
 * Check if account is locked due to failed attempts
 */
function isAccountLocked(email: string): { locked: boolean; remainingTime?: number } {
  const key = email.toLowerCase()
  const attempts = loginAttempts.get(key) || []
  
  // Count failed attempts in last 30 minutes
  const cutoff = Date.now() - LOCKOUT_DURATION_MS
  const recentFailures = attempts.filter(
    (a) => !a.success && a.timestamp.getTime() > cutoff
  )
  
  if (recentFailures.length >= MAX_LOGIN_ATTEMPTS) {
    // Find oldest failure to calculate remaining lockout time
    const oldestFailure = recentFailures[0]
    const unlockTime = oldestFailure.timestamp.getTime() + LOCKOUT_DURATION_MS
    const remainingTime = unlockTime - Date.now()
    
    if (remainingTime > 0) {
      return { locked: true, remainingTime }
    }
  }
  
  return { locked: false }
}

/**
 * Clear login attempts after successful login
 */
function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase())
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

/**
 * Enhanced login with rate limiting and account lockout
 */
export async function secureLogin(
  email: string,
  password: string,
  clientIp?: string,
  userAgent?: string
): Promise<AuthResult> {
  // Sanitize inputs
  const sanitizedEmail = sanitizeEmail(email)
  
  // Rate limit check
  const rateLimit = checkRateLimit(sanitizedEmail, RateLimiters.login)
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
    }
  }
  
  // Account lockout check
  const lockStatus = isAccountLocked(sanitizedEmail)
  if (lockStatus.locked) {
    const minutes = Math.ceil((lockStatus.remainingTime || 0) / 60000)
    return {
      success: false,
      error: `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minutes.`,
    }
  }
  
  // Validate inputs
  const validation = validate(loginSchema, { email: sanitizedEmail, password })
  if (!validation.success) {
    return { success: false, error: "Invalid email or password format" }
  }
  
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    })
    
    if (error) {
      // Track failed attempt
      trackLoginAttempt(sanitizedEmail, false, clientIp, userAgent)
      
      // Log auth event
      await logAuthEvent(sanitizedEmail, "login_failed", { error: error.message, ip: clientIp })
      
      return {
        success: false,
        error: "Invalid email or password",
      }
    }
    
    // Check if email is verified (if you have email confirmation enabled)
    if (data.user && !data.user.email_confirmed_at) {
      return {
        success: false,
        error: "Please verify your email address before logging in.",
        requiresVerification: true,
      }
    }
    
    // Clear failed attempts on success
    clearLoginAttempts(sanitizedEmail)
    
    // Log successful login
    await logAuthEvent(sanitizedEmail, "login_success", { ip: clientIp })
    
    return {
      success: true,
      data: { user: data.user, session: data.session },
    }
  } catch (error) {
    console.error("[Auth] Login error:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

/**
 * Enhanced registration with email verification
 */
export async function secureRegister(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string
): Promise<AuthResult> {
  // Sanitize inputs
  const sanitizedData = {
    email: sanitizeEmail(email),
    firstName: sanitizeString(firstName, { maxLength: 50 }),
    lastName: sanitizeString(lastName, { maxLength: 50 }),
    phone: phone ? sanitizeString(phone, { maxLength: 20 }) : undefined,
  }
  
  // Validate
  const validation = validate(registerSchema, {
    email: sanitizedData.email,
    password,
    confirmPassword: password,
    firstName: sanitizedData.firstName,
    lastName: sanitizedData.lastName,
    phone: sanitizedData.phone,
    acceptTerms: true,
  })
  
  if (!validation.success) {
    const firstError = validation.errors[0]
    return { success: false, error: firstError.message }
  }
  
  try {
    const supabase = createClient()
    
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", sanitizedData.email)
      .single()
    
    if (existingUser) {
      return { success: false, error: "An account with this email already exists" }
    }
    
    // Create user with email confirmation
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedData.email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          first_name: sanitizedData.firstName,
          last_name: sanitizedData.lastName,
          phone: sanitizedData.phone,
        },
      },
    })
    
    if (error) {
      await logAuthEvent(sanitizedData.email, "register_failed", { error: error.message })
      return { success: false, error: error.message }
    }
    
    // Log successful registration
    await logAuthEvent(sanitizedData.email, "register_success", { userId: data.user?.id })
    
    return {
      success: true,
      data: { user: data.user },
      requiresVerification: true,
    }
  } catch (error) {
    console.error("[Auth] Registration error:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

/**
 * Secure password reset request with rate limiting
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const sanitizedEmail = sanitizeEmail(email)
  
  // Rate limit
  const rateLimit = checkRateLimit(sanitizedEmail, RateLimiters.passwordReset)
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many reset requests. Please try again in ${Math.ceil((rateLimit.retryAfter || 60) / 60)} minutes.`,
    }
  }
  
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })
    
    // Always return success to prevent email enumeration
    await logAuthEvent(sanitizedEmail, "password_reset_requested", { error: error?.message })
    
    return {
      success: true,
      data: { message: "If an account exists with this email, you will receive a password reset link." },
    }
  } catch (error) {
    console.error("[Auth] Password reset error:", error)
    return { success: true } // Don't reveal if email exists
  }
}

/**
 * Complete password reset with new password
 */
export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  // Validate new password
  const validation = validate(passwordResetSchema, {
    token,
    password: newPassword,
    confirmPassword: newPassword,
  })
  
  if (!validation.success) {
    const firstError = validation.errors[0]
    return { success: false, error: firstError.message }
  }
  
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    
    if (error) {
      return { success: false, error: "Failed to reset password. The link may have expired." }
    }
    
    await logAuthEvent(data.user?.email || "unknown", "password_reset_completed", {
      userId: data.user?.id,
    })
    
    return { success: true, data: { user: data.user } }
  } catch (error) {
    console.error("[Auth] Password reset completion error:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Change password for logged-in user
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  const validation = validate(changePasswordSchema, {
    currentPassword,
    newPassword,
    confirmPassword: newPassword,
  })
  
  if (!validation.success) {
    const firstError = validation.errors[0]
    return { success: false, error: firstError.message }
  }
  
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }
    
    // Verify current password by attempting re-authentication
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })
    
    if (verifyError) {
      await logAuthEvent(user.email!, "password_change_failed", { reason: "wrong_current_password" })
      return { success: false, error: "Current password is incorrect" }
    }
    
    // Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      return { success: false, error: "Failed to change password" }
    }
    
    await logAuthEvent(user.email!, "password_changed", { userId: user.id })
    
    return { success: true }
  } catch (error) {
    console.error("[Auth] Password change error:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Resend email verification
 */
export async function resendVerificationEmail(email: string): Promise<AuthResult> {
  const sanitizedEmail = sanitizeEmail(email)
  
  // Rate limit
  const rateLimit = checkRateLimit(sanitizedEmail, RateLimiters.auth)
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Please wait ${rateLimit.retryAfter} seconds before requesting another email.`,
    }
  }
  
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sanitizedEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })
    
    if (error) {
      return { success: false, error: "Failed to send verification email" }
    }
    
    await logAuthEvent(sanitizedEmail, "verification_email_resent")
    
    return { success: true }
  } catch (error) {
    console.error("[Auth] Resend verification error:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log authentication events for audit trail
 */
async function logAuthEvent(
  email: string,
  event: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient()
    
    await supabase.from("auth_events").insert({
      email,
      event,
      details,
      created_at: new Date().toISOString(),
    }).single()
  } catch (error) {
    // Log to console if DB insert fails (table might not exist)
    console.log(`[AuthEvent] ${event} for ${email}`, details)
  }
}

// ============================================================================
// PASSWORD STRENGTH CHECKER
// ============================================================================

export interface PasswordStrength {
  score: number // 0-4
  feedback: string[]
  isStrong: boolean
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0
  
  if (password.length >= 8) score++
  else feedback.push("Password should be at least 8 characters")
  
  if (password.length >= 12) score++
  
  if (/[A-Z]/.test(password)) score++
  else feedback.push("Add uppercase letters")
  
  if (/[a-z]/.test(password)) {
    // Already has lowercase, no extra point
  } else {
    feedback.push("Add lowercase letters")
  }
  
  if (/[0-9]/.test(password)) score++
  else feedback.push("Add numbers")
  
  if (/[^A-Za-z0-9]/.test(password)) score++
  else feedback.push("Add special characters (!@#$%^&*)")
  
  // Check for common patterns
  const commonPatterns = [
    /^123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /(.)\1{2,}/, // Repeated characters
  ]
  
  if (commonPatterns.some((p) => p.test(password))) {
    score = Math.max(0, score - 2)
    feedback.push("Avoid common patterns")
  }
  
  return {
    score: Math.min(4, score),
    feedback,
    isStrong: score >= 3,
  }
}
