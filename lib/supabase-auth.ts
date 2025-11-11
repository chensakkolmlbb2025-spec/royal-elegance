"use client"

import { supabase } from "./supabase-config"
import type { User as SupabaseUser, Session, AuthError } from "@supabase/supabase-js"

// User role type
export type UserRole = "admin" | "staff" | "user"

// Extended user interface with profile data
export interface User {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: UserRole
  avatarUrl: string | null
  emailVerified: boolean
  phoneVerified: boolean
  mfaEnabled: boolean
  accountLocked: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

// Auth response types
export interface AuthResponse {
  user: User | null
  session: Session | null
  error: AuthError | null
}

export interface SignUpData {
  email: string
  password: string
  fullName: string
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface PasswordResetData {
  email: string
}

export interface UpdatePasswordData {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileData {
  fullName?: string
  phone?: string
  avatarUrl?: string
}

// Convert Supabase user to our User type
const convertToUser = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  if (!supabase) return null

  try {
    // Fetch profile data
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .single()

    if (error) {
      // Check if error is due to missing table (schema not set up yet)
      const code = (error as any)?.code
      const message = (error as any)?.message || ""
      const details = (error as any)?.details || ""

      if (code === "42P01" || message.includes("relation") || message.includes("does not exist")) {
        console.warn("⚠️ Profiles table not found. Please run the database schema from supabase-auth-schema.sql")
        console.warn("📚 See AUTHENTICATION_SETUP.md for setup instructions")
        return null
      }

      // Handle common RLS/permission-denied cases more gracefully
      const rlsLikely = code === "PGRST116" || /RLS|row level|Policies|permission/i.test(message) || /RLS|Policies|permission/i.test(details)
      if (rlsLikely) {
        console.warn(
          "Profile query blocked by RLS. Ensure a policy allows users to read their own profile. See supabase-auth-fix.sql or apply policy: CREATE POLICY \"Users can view own profile\" ON public.profiles FOR SELECT USING ((SELECT auth.uid())::uuid = id);",
          { code, message }
        )
        return null
      }

      console.error("Error fetching profile:", { code, message, details })
      return null
    }

    if (!profile) {
      console.warn(
        "Profile not found for user. Ensure signup trigger created a profile row (see supabase-auth-schema.sql) or insert policy allows creation.",
        { userId: supabaseUser.id }
      )
      return null
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      fullName: profile.full_name,
      phone: profile.phone,
      role: profile.role as UserRole,
      avatarUrl: profile.avatar_url,
      emailVerified: profile.email_verified || false,
      phoneVerified: profile.phone_verified || false,
      mfaEnabled: profile.mfa_enabled || false,
      accountLocked: profile.account_locked || false,
      lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : null,
      createdAt: new Date(profile.created_at),
    }
  } catch (error) {
    console.error("Error converting user:", error)
    return null
  }
}

// Log login attempt
const logLoginAttempt = async (email: string, success: boolean, ipAddress?: string) => {
  if (!supabase) return

  try {
    await supabase.from("login_attempts").insert([
      {
        email,
        success,
        ip_address: ipAddress,
        attempted_at: new Date().toISOString(),
      },
    ])
  } catch (error) {
    console.error("Error logging login attempt:", error)
  }
}

// Check if account is locked
const checkAccountLocked = async (email: string): Promise<boolean> => {
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("account_locked, failed_login_attempts")
      .eq("email", email)
      .single()

    if (error || !data) return false

    return data.account_locked || false
  } catch (error) {
    console.error("Error checking account lock:", error)
    return false
  }
}

// Increment failed login attempts
const incrementFailedLogin = async (email: string) => {
  if (!supabase) return

  try {
    await supabase.rpc("increment_failed_login", { user_email: email })
  } catch (error) {
    console.error("Error incrementing failed login:", error)
  }
}

// Reset failed login attempts
const resetFailedLogin = async (email: string) => {
  if (!supabase) return

  try {
    await supabase.rpc("reset_failed_login", { user_email: email })
  } catch (error) {
    console.error("Error resetting failed login:", error)
  }
}

// Create session record
const createSessionRecord = async (userId: string, deviceInfo?: string) => {
  if (!supabase) return

  try {
    await supabase.from("user_sessions").insert([
      {
        user_id: userId,
        device_info: deviceInfo || navigator.userAgent,
        user_agent: navigator.userAgent,
        last_activity: new Date().toISOString(),
      },
    ])
  } catch (error) {
    console.error("Error creating session record:", error)
  }
}

/**
 * Sign up a new user with email and password
 */
export const signUp = async (data: SignUpData): Promise<AuthResponse> => {
  if (!supabase) {
    return { user: null, session: null, error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return { user: null, session: null, error }
    }

    if (!authData.user) {
      return { user: null, session: null, error: { message: "User creation failed" } as AuthError }
    }

    const user = await convertToUser(authData.user)
    return { user, session: authData.session, error: null }
  } catch (error) {
    console.error("Sign up error:", error)
    return { user: null, session: null, error: error as AuthError }
  }
}

/**
 * Sign in with email and password
 */
export const signIn = async (data: SignInData): Promise<AuthResponse> => {
  if (!supabase) {
    return { user: null, session: null, error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    // Check if account is locked
    const isLocked = await checkAccountLocked(data.email)
    if (isLocked) {
      return {
        user: null,
        session: null,
        error: {
          message: "Account is locked due to multiple failed login attempts. Please contact support.",
        } as AuthError,
      }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    // Log login attempt
    await logLoginAttempt(data.email, !error)

    if (error) {
      // Increment failed login attempts
      await incrementFailedLogin(data.email)
      return { user: null, session: null, error }
    }

    if (!authData.user) {
      return { user: null, session: null, error: { message: "Sign in failed" } as AuthError }
    }

    // Reset failed login attempts on successful login
    await resetFailedLogin(data.email)

    // Create session record
    await createSessionRecord(authData.user.id)

    const user = await convertToUser(authData.user)
    return { user, session: authData.session, error: null }
  } catch (error) {
    console.error("Sign in error:", error)
    return { user: null, session: null, error: error as AuthError }
  }
}

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
  if (!supabase) {
    console.error("Google OAuth: Supabase not initialized")
    return { error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    console.log("Google OAuth: Starting sign in...")
    console.log("Google OAuth: Redirect URL:", `${window.location.origin}/auth/callback`)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    })

    console.log("Google OAuth: Response data:", data)
    console.log("Google OAuth: Response error:", error)

    if (error) {
      console.error("Google OAuth: Authentication error:", error)
      
      // Check for common Google OAuth errors
      if (error.message?.includes('Google')) {
        console.error("Google OAuth: This might be a Google provider configuration issue in Supabase dashboard")
      }
      if (error.message?.includes('redirect')) {
        console.error("Google OAuth: This might be a redirect URL mismatch issue")
      }
      if (error.message?.includes('client')) {
        console.error("Google OAuth: This might be a Google Client ID/Secret configuration issue")
      }
    }

    return { error }
  } catch (error) {
    console.error("Google OAuth: Exception occurred:", error)
    return { error: error as AuthError }
  }
}

/**
 * Sign in with phone OTP
 */
export const signInWithPhone = async (phone: string): Promise<{ error: AuthError | null }> => {
  if (!supabase) {
    return { error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    })

    return { error }
  } catch (error) {
    console.error("Phone sign in error:", error)
    return { error: error as AuthError }
  }
}

/**
 * Verify phone OTP
 */
export const verifyPhoneOtp = async (phone: string, token: string): Promise<AuthResponse> => {
  if (!supabase) {
    return { user: null, session: null, error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { data: authData, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    })

    if (error || !authData.user) {
      return { user: null, session: null, error }
    }

    // Update phone verified status
    await supabase.from("profiles").update({ phone_verified: true }).eq("id", authData.user.id)

    const user = await convertToUser(authData.user)
    return { user, session: authData.session, error: null }
  } catch (error) {
    console.error("Phone OTP verification error:", error)
    return { user: null, session: null, error: error as AuthError }
  }
}

/**
 * Sign out
 */
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  if (!supabase) {
    return { error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    console.error("Sign out error:", error)
    return { error: error as AuthError }
  }
}

/**
 * Request password reset email
 */
export const requestPasswordReset = async (data: PasswordResetData): Promise<{ error: AuthError | null }> => {
  if (!supabase) {
    return { error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    return { error }
  } catch (error) {
    console.error("Password reset request error:", error)
    return { error: error as AuthError }
  }
}

/**
 * Update password (requires current password)
 */
export const updatePassword = async (data: UpdatePasswordData): Promise<{ error: AuthError | null }> => {
  if (!supabase) {
    return { error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    // First verify current password by attempting to sign in
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) {
      return { error: { message: "User not found" } as AuthError }
    }

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: data.currentPassword,
    })

    if (verifyError) {
      return { error: { message: "Current password is incorrect" } as AuthError }
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    return { error }
  } catch (error) {
    console.error("Password update error:", error)
    return { error: error as AuthError }
  }
}

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<{ error: Error | null }> => {
  if (!supabase) {
    return { error: new Error("Supabase not initialized") }
  }

  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return { error: new Error("User not found") }
    }

    const updates: any = {}
    if (data.fullName !== undefined) updates.full_name = data.fullName
    if (data.phone !== undefined) updates.phone = data.phone
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl

    const { error } = await supabase.from("profiles").update(updates).eq("id", userData.user.id)

    return { error }
  } catch (error) {
    console.error("Profile update error:", error)
    return { error: error as Error }
  }
}

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  if (!supabase) return null

  try {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return null

    return await convertToUser(supabaseUser)
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}

/**
 * Get current session
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  if (!supabase) return null

  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error("Get current session error:", error)
    return null
  }
}

/**
 * Refresh session
 */
export const refreshSession = async (): Promise<{ session: Session | null; error: AuthError | null }> => {
  if (!supabase) {
    return { session: null, error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { data, error } = await supabase.auth.refreshSession()
    return { session: data.session, error }
  } catch (error) {
    console.error("Refresh session error:", error)
    return { session: null, error: error as AuthError }
  }
}

/**
 * Resend email verification
 */
export const resendEmailVerification = async (): Promise<{ error: AuthError | null }> => {
  if (!supabase) {
    return { error: { message: "Supabase not initialized" } as AuthError }
  }

  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.email) {
      return { error: { message: "User not found" } as AuthError }
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: userData.user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    return { error }
  } catch (error) {
    console.error("Resend email verification error:", error)
    return { error: error as AuthError }
  }
}

/**
 * Get user sessions
 */
export const getUserSessions = async (): Promise<any[]> => {
  if (!supabase) return []

  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return []

    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("last_activity", { ascending: false })

    if (error) {
      console.error("Get user sessions error:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Get user sessions error:", error)
    return []
  }
}

/**
 * Delete a specific session
 */
export const deleteSession = async (sessionId: string): Promise<{ error: Error | null }> => {
  if (!supabase) {
    return { error: new Error("Supabase not initialized") }
  }

  try {
    const { error } = await supabase.from("user_sessions").delete().eq("id", sessionId)

    return { error }
  } catch (error) {
    console.error("Delete session error:", error)
    return { error: error as Error }
  }
}

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

