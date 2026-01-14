/**
 * API Route Security Middleware
 * 
 * Features:
 * - Authentication verification
 * - Role-based access control
 * - Rate limiting integration
 * - Request validation
 * - Audit logging
 * - CORS handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitPresets } from '@/lib/security/rate-limit'
import { validateCsrfToken } from '@/lib/security/csrf'
import { sanitizeObject } from '@/lib/security/sanitize'

// User roles
export const UserRole = {
  GUEST: 'guest',
  USER: 'user',
  STAFF: 'staff',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: UserRoleType[] = [
  UserRole.GUEST,
  UserRole.USER,
  UserRole.STAFF,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN
]

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRoleType
  metadata?: Record<string, any>
}

export interface SecureRouteConfig {
  // Minimum required role
  requiredRole?: UserRoleType
  // Allow unauthenticated access
  allowGuest?: boolean
  // Rate limit preset to use
  rateLimit?: 'auth' | 'api' | 'booking' | 'sensitive'
  // Custom rate limit config
  customRateLimit?: {
    maxRequests: number
    windowMs: number
  }
  // Require CSRF token
  requireCsrf?: boolean
  // Allowed HTTP methods
  allowedMethods?: string[]
  // Validate request body with schema
  bodySchema?: any // Zod schema
}

export interface RouteContext {
  user: AuthenticatedUser | null
  request: NextRequest
  params?: Record<string, string>
}

type RouteHandler = (
  context: RouteContext
) => Promise<NextResponse> | NextResponse

/**
 * Create a secure route wrapper with authentication and authorization
 */
export function secureRoute(config: SecureRouteConfig, handler: RouteHandler) {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      // 1. Check allowed methods
      if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        )
      }

      // 2. Apply rate limiting
      const rateLimitResult = applyRateLimit(request, config)
      if (rateLimitResult) {
        return rateLimitResult
      }

      // 3. Verify CSRF token for mutations
      if (config.requireCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const csrfToken = request.headers.get('x-csrf-token')
        if (!csrfToken || !validateCsrfToken(csrfToken)) {
          return NextResponse.json(
            { error: 'Invalid or missing CSRF token' },
            { status: 403 }
          )
        }
      }

      // 4. Authenticate user
      const user = await authenticateRequest(request)

      // 5. Check authorization
      if (!config.allowGuest && !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      if (config.requiredRole && user) {
        if (!hasRequiredRole(user.role, config.requiredRole)) {
          await logSecurityEvent({
            type: 'AUTHORIZATION_DENIED',
            userId: user.id,
            requiredRole: config.requiredRole,
            actualRole: user.role,
            path: request.nextUrl.pathname
          })
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }

      // 6. Validate request body if schema provided
      if (config.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const validationResult = await validateRequestBody(request, config.bodySchema)
        if (!validationResult.success) {
          return NextResponse.json(
            { error: 'Validation failed', details: validationResult.errors },
            { status: 400 }
          )
        }
      }

      // 7. Call the handler
      const routeContext: RouteContext = {
        user,
        request,
        params: context?.params
      }

      return await handler(routeContext)
    } catch (error: any) {
      console.error('[SecureRoute] Error:', error)
      
      // Don't expose internal errors
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Authenticate request and return user info
 */
async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, metadata')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email || '',
      role: (profile?.role as UserRoleType) || UserRole.USER,
      metadata: profile?.metadata
    }
  } catch (error) {
    console.error('[SecureRoute] Auth error:', error)
    return null
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: UserRoleType, requiredRole: UserRoleType): boolean {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole)
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole)
  return userRoleIndex >= requiredRoleIndex
}

/**
 * Apply rate limiting based on config
 */
function applyRateLimit(request: NextRequest, config: SecureRouteConfig): NextResponse | null {
  const ip = getClientIP(request)
  
  let maxRequests: number
  let windowMs: number

  if (config.customRateLimit) {
    maxRequests = config.customRateLimit.maxRequests
    windowMs = config.customRateLimit.windowMs
  } else if (config.rateLimit) {
    const preset = rateLimitPresets[config.rateLimit]
    maxRequests = preset.maxRequests
    windowMs = preset.windowMs
  } else {
    // Default: 100 requests per minute
    maxRequests = 100
    windowMs = 60 * 1000
  }

  const { allowed, remaining, retryAfter } = rateLimit(
    `${request.nextUrl.pathname}:${ip}`,
    maxRequests,
    windowMs
  )

  if (!allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        retryAfter: Math.ceil(retryAfter! / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(retryAfter! / 1000)),
          'X-RateLimit-Remaining': '0'
        }
      }
    )
  }

  return null
}

/**
 * Validate request body against schema
 */
async function validateRequestBody(
  request: NextRequest,
  schema: any
): Promise<{ success: boolean; data?: any; errors?: any }> {
  try {
    const body = await request.json()
    
    // Sanitize input first
    const sanitizedBody = sanitizeObject(body)
    
    // Validate against schema
    const result = schema.safeParse(sanitizedBody)
    
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors
      }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      errors: { _form: ['Invalid JSON body'] }
    }
  }
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Log security event
 */
async function logSecurityEvent(event: {
  type: string
  userId?: string
  [key: string]: any
}): Promise<void> {
  try {
    // Log to console in development
    console.log('[Security Event]', JSON.stringify(event, null, 2))
    
    // In production, log to database or external service
    // await supabase.from('security_logs').insert({ ...event, created_at: new Date() })
  } catch (error) {
    console.error('[Security] Failed to log event:', error)
  }
}

// ============================================================================
// Convenience Functions for Common Patterns
// ============================================================================

/**
 * Public route - anyone can access, rate limited
 */
export function publicRoute(handler: RouteHandler) {
  return secureRoute({ allowGuest: true, rateLimit: 'api' }, handler)
}

/**
 * Authenticated route - user must be logged in
 */
export function authenticatedRoute(handler: RouteHandler) {
  return secureRoute({ allowGuest: false, rateLimit: 'api' }, handler)
}

/**
 * Admin route - admin role required
 */
export function adminRoute(handler: RouteHandler) {
  return secureRoute({
    requiredRole: UserRole.ADMIN,
    rateLimit: 'api',
    requireCsrf: true
  }, handler)
}

/**
 * Staff route - staff role or higher required
 */
export function staffRoute(handler: RouteHandler) {
  return secureRoute({
    requiredRole: UserRole.STAFF,
    rateLimit: 'api'
  }, handler)
}

/**
 * Sensitive route - extra protection for sensitive operations
 */
export function sensitiveRoute(handler: RouteHandler) {
  return secureRoute({
    allowGuest: false,
    rateLimit: 'sensitive',
    requireCsrf: true
  }, handler)
}

// ============================================================================
// Response Helpers
// ============================================================================

export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status: number = 400, details?: any): NextResponse {
  return NextResponse.json(
    { success: false, error: message, ...(details && { details }) },
    { status }
  )
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse(`${resource} not found`, 404)
}

export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return errorResponse(message, 401)
}

export function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return errorResponse(message, 403)
}

export function validationErrorResponse(errors: Record<string, string[]>): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Validation failed', errors },
    { status: 400 }
  )
}
