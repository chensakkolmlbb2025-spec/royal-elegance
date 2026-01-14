/**
 * Input Sanitization & Validation Utilities
 * Prevents XSS, SQL injection, and other injection attacks
 */

// HTML entities map for escaping
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return ""
  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(str: string): string {
  if (typeof str !== "string") return ""
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
}

/**
 * Sanitize string for safe display
 * - Removes HTML tags
 * - Escapes special characters
 * - Trims whitespace
 * - Limits length
 */
export function sanitizeString(
  str: unknown,
  options: {
    maxLength?: number
    allowNewlines?: boolean
    preserveCase?: boolean
  } = {}
): string {
  const { maxLength = 10000, allowNewlines = false, preserveCase = true } = options

  if (typeof str !== "string") return ""

  let result = str
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters except newlines/tabs if allowed
    .replace(allowNewlines ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g : /[\x00-\x1F\x7F]/g, "")
    // Normalize unicode
    .normalize("NFC")
    // Trim
    .trim()

  // Strip HTML
  result = stripHtml(result)

  // Escape remaining special chars
  result = escapeHtml(result)

  // Limit length
  if (result.length > maxLength) {
    result = result.slice(0, maxLength)
  }

  // Case handling
  if (!preserveCase) {
    result = result.toLowerCase()
  }

  return result
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== "string") return ""

  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w.@+-]/g, "")
    .slice(0, 254) // Max email length
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: unknown): string {
  if (typeof phone !== "string") return ""

  return phone
    .replace(/[^\d+\-\s()]/g, "")
    .trim()
    .slice(0, 20)
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: unknown): string {
  if (typeof url !== "string") return ""

  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return ""
    }
    return parsed.href
  } catch {
    return ""
  }
}

/**
 * Sanitize filename (for uploads)
 */
export function sanitizeFilename(filename: unknown): string {
  if (typeof filename !== "string") return ""

  return filename
    // Remove path traversal
    .replace(/\.\./g, "")
    .replace(/[\/\\]/g, "")
    // Remove dangerous characters
    .replace(/[<>:"|?*\x00-\x1F]/g, "")
    // Limit length
    .slice(0, 255)
    .trim()
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(
  value: unknown,
  options: {
    min?: number
    max?: number
    decimals?: number
    default?: number
  } = {}
): number {
  const { min = -Infinity, max = Infinity, decimals = 2, default: defaultValue = 0 } = options

  let num: number

  if (typeof value === "number") {
    num = value
  } else if (typeof value === "string") {
    num = parseFloat(value.replace(/[^\d.-]/g, ""))
  } else {
    return defaultValue
  }

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue
  }

  // Clamp to range
  num = Math.max(min, Math.min(max, num))

  // Round to decimals
  const factor = Math.pow(10, decimals)
  num = Math.round(num * factor) / factor

  return num
}

/**
 * Sanitize date input
 */
export function sanitizeDate(value: unknown): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxDepth?: number
    maxStringLength?: number
    allowedKeys?: string[]
  } = {}
): Partial<T> {
  const { maxDepth = 5, maxStringLength = 10000, allowedKeys } = options

  function sanitizeValue(val: unknown, depth: number): unknown {
    if (depth > maxDepth) return undefined

    if (val === null || val === undefined) return val

    if (typeof val === "string") {
      return sanitizeString(val, { maxLength: maxStringLength })
    }

    if (typeof val === "number") {
      return sanitizeNumber(val)
    }

    if (typeof val === "boolean") {
      return val
    }

    if (Array.isArray(val)) {
      return val.slice(0, 100).map((item) => sanitizeValue(item, depth + 1))
    }

    if (typeof val === "object") {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(val)) {
        // Skip disallowed keys
        if (allowedKeys && !allowedKeys.includes(key)) continue
        // Sanitize key name
        const sanitizedKey = sanitizeString(key, { maxLength: 100 })
        if (sanitizedKey) {
          result[sanitizedKey] = sanitizeValue(value, depth + 1)
        }
      }
      return result
    }

    return undefined
  }

  return sanitizeValue(obj, 0) as Partial<T>
}

/**
 * Validate and sanitize form data
 */
export function sanitizeFormData(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    const sanitizedKey = sanitizeString(key, { maxLength: 100 })
    if (!sanitizedKey) continue

    if (value instanceof File) {
      // Don't include files in sanitized output, handle separately
      result[sanitizedKey] = {
        __type: "file",
        name: sanitizeFilename(value.name),
        size: value.size,
        type: value.type,
      }
    } else {
      result[sanitizedKey] = sanitizeString(value)
    }
  }

  return result
}

/**
 * Check for common SQL injection patterns
 */
export function hasSqlInjectionPatterns(str: string): boolean {
  if (typeof str !== "string") return false

  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(--|\#|\/\*)/,
    /(\bEXEC\b|\bXP_)/i,
    /(;|\||`)/,
  ]

  return patterns.some((pattern) => pattern.test(str))
}

/**
 * Check for XSS patterns
 */
export function hasXssPatterns(str: string): boolean {
  if (typeof str !== "string") return false

  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
  ]

  return patterns.some((pattern) => pattern.test(str))
}

/**
 * Comprehensive input validation
 * Returns sanitized value or throws error
 */
export function validateAndSanitize<T>(
  value: unknown,
  validator: (val: unknown) => T,
  errorMessage: string
): T {
  try {
    const sanitized = validator(value)
    return sanitized
  } catch {
    throw new Error(errorMessage)
  }
}
