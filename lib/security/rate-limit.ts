/**
 * Rate Limiting Utility
 * In-memory rate limiter with sliding window algorithm
 * For production, use Redis-based implementation
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  blockedUntil?: number
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional: block duration after limit exceeded (ms) */
  blockDurationMs?: number
  /** Identifier prefix (e.g., "auth", "api") */
  prefix?: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  blockedUntil?: number
  retryAfter?: number
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const {
    maxRequests,
    windowMs,
    blockDurationMs = 0,
    prefix = "default"
  } = config

  const key = `${prefix}:${identifier}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Check if currently blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
    }
  }

  // Reset window if expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs
    }
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    if (blockDurationMs > 0) {
      entry.blockedUntil = now + blockDurationMs
    }
    
    rateLimitStore.set(key, entry)
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }

  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Simple rate limit function for backward compatibility
 */
export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  return checkRateLimit(identifier, { maxRequests, windowMs })
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Fallback to a hash of user agent + accept headers
  const ua = request.headers.get("user-agent") || "unknown"
  const accept = request.headers.get("accept") || ""
  
  return `${ua}:${accept}`.slice(0, 100)
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  /** Auth endpoints: 5 requests per minute, block for 15 minutes after */
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
    prefix: "auth"
  },
  
  /** Login attempts: 3 per minute, block for 30 minutes */
  login: {
    maxRequests: 3,
    windowMs: 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
    prefix: "login"
  },
  
  /** Password reset: 3 per hour */
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000,
    prefix: "pwd-reset"
  },
  
  /** API endpoints: 100 requests per minute */
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    prefix: "api"
  },
  
  /** Booking creation: 10 per minute */
  booking: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    prefix: "booking"
  },
  
  /** Payment: 5 per minute */
  payment: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
    prefix: "payment"
  }
} as const

/**
 * Apply rate limiting to an API route handler
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const identifier = getClientIdentifier(request)
    const result = checkRateLimit(identifier, config)
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: result.retryAfter,
          blockedUntil: result.blockedUntil
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.retryAfter || 60),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetTime)
          }
        }
      )
    }
    
    const response = await handler(request)
    
    // Add rate limit headers to response
    const newHeaders = new Headers(response.headers)
    newHeaders.set("X-RateLimit-Remaining", String(result.remaining))
    newHeaders.set("X-RateLimit-Reset", String(result.resetTime))
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
  }
}

/**
 * Preset configurations export for backward compatibility
 */
export const rateLimitPresets = {
  auth: RateLimiters.login,
  api: RateLimiters.api,
  booking: RateLimiters.booking,
  sensitive: RateLimiters.passwordReset
}
