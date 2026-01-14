/**
 * Server-Side Validation Schemas
 * Using Zod for type-safe validation
 */

import { z } from "zod"

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const uuidSchema = z.string().uuid("Invalid ID format")

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254, "Email too long")
  .transform((val) => val.toLowerCase().trim())

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

export const phoneSchema = z
  .string()
  .regex(/^[\d+\-\s()]{7,20}$/, "Invalid phone number format")
  .transform((val) => val.replace(/\s+/g, ""))

export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .refine(
    (val) => val.startsWith("http://") || val.startsWith("https://"),
    "URL must start with http:// or https://"
  )

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val))
  .refine((date) => !isNaN(date.getTime()), "Invalid date")

export const futureDateSchema = dateSchema.refine(
  (date) => date > new Date(),
  "Date must be in the future"
)

export const priceSchema = z
  .number()
  .min(0, "Price cannot be negative")
  .max(1000000, "Price too high")
  .multipleOf(0.01, "Price must have at most 2 decimal places")

export const positiveIntSchema = z
  .number()
  .int("Must be a whole number")
  .positive("Must be positive")

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
})

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name too long")
      .regex(/^[a-zA-Z\s'-]+$/, "Invalid characters in name"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name too long")
      .regex(/^[a-zA-Z\s'-]+$/, "Invalid characters in name"),
    phone: phoneSchema.optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  })

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const bookingSchema = z
  .object({
    roomId: uuidSchema,
    checkInDate: futureDateSchema,
    checkOutDate: futureDateSchema,
    guestCount: positiveIntSchema.max(10, "Maximum 10 guests"),
    guestName: z
      .string()
      .min(2, "Guest name too short")
      .max(100, "Guest name too long"),
    guestEmail: emailSchema,
    guestPhone: phoneSchema.optional(),
    specialRequests: z.string().max(500, "Special requests too long").optional(),
    serviceIds: z.array(uuidSchema).max(20, "Too many services").optional(),
  })
  .refine(
    (data) => data.checkOutDate > data.checkInDate,
    {
      message: "Check-out date must be after check-in date",
      path: ["checkOutDate"],
    }
  )
  .refine(
    (data) => {
      const nights = Math.ceil(
        (data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return nights <= 30
    },
    {
      message: "Maximum booking duration is 30 nights",
      path: ["checkOutDate"],
    }
  )

export const bookingUpdateSchema = z.object({
  status: z.enum(["confirmed", "checked_in", "checked_out", "cancelled", "no_show"]).optional(),
  guestName: z.string().min(2).max(100).optional(),
  guestEmail: emailSchema.optional(),
  guestPhone: phoneSchema.optional(),
  specialRequests: z.string().max(500).optional(),
})

// ============================================================================
// SERVICE SCHEMAS
// ============================================================================

export const serviceSchema = z.object({
  name: z
    .string()
    .min(2, "Service name too short")
    .max(100, "Service name too long")
    .regex(/^[a-zA-Z0-9\s\-&']+$/, "Invalid characters in service name"),
  description: z.string().max(1000, "Description too long").optional(),
  price: priceSchema,
  category: z.enum(["spa", "dining", "transport", "laundry", "room_service", "other"]),
  available: z.boolean().default(true),
  thumbnailUrl: urlSchema.optional().or(z.literal("")),
  images: z.array(urlSchema).max(10, "Maximum 10 images").optional(),
})

export const serviceUpdateSchema = serviceSchema.partial()

// ============================================================================
// ROOM SCHEMAS
// ============================================================================

export const roomSchema = z.object({
  roomNumber: z
    .string()
    .min(1, "Room number is required")
    .max(10, "Room number too long")
    .regex(/^[A-Z0-9\-]+$/i, "Invalid room number format"),
  floorId: uuidSchema,
  roomTypeId: uuidSchema,
  status: z.enum(["available", "occupied", "maintenance", "reserved"]).default("available"),
})

export const roomUpdateSchema = roomSchema.partial()

export const roomTypeSchema = z.object({
  name: z
    .string()
    .min(2, "Room type name too short")
    .max(50, "Room type name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  basePrice: priceSchema,
  maxOccupancy: positiveIntSchema.max(10, "Maximum occupancy is 10"),
  amenities: z.array(z.string().max(50)).max(20, "Maximum 20 amenities").optional(),
  images: z.array(urlSchema).max(10, "Maximum 10 images").optional(),
})

export const roomTypeUpdateSchema = roomTypeSchema.partial()

// ============================================================================
// FLOOR SCHEMAS
// ============================================================================

export const floorSchema = z.object({
  name: z
    .string()
    .min(1, "Floor name is required")
    .max(50, "Floor name too long"),
  number: z.number().int().min(-10, "Floor number too low").max(200, "Floor number too high"),
  description: z.string().max(500, "Description too long").optional(),
})

export const floorUpdateSchema = floorSchema.partial()

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const paymentSchema = z.object({
  bookingId: uuidSchema,
  amount: priceSchema.positive("Amount must be positive"),
  currency: z.enum(["USD", "EUR", "KHR"]).default("USD"),
  method: z.enum(["credit_card", "debit_card", "bank_transfer", "khqr", "cash"]),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
})

export const refundSchema = z.object({
  paymentId: uuidSchema,
  amount: priceSchema.positive("Refund amount must be positive"),
  reason: z.string().min(10, "Please provide a reason").max(500, "Reason too long"),
})

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/).optional(),
  lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/).optional(),
  phone: phoneSchema.optional(),
  avatarUrl: urlSchema.optional().or(z.literal("")),
  preferences: z
    .object({
      newsletter: z.boolean().optional(),
      notifications: z.boolean().optional(),
      language: z.enum(["en", "km", "zh"]).optional(),
      currency: z.enum(["USD", "EUR", "KHR"]).optional(),
    })
    .optional(),
})

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError["errors"] }

/**
 * Validate data against a schema and return typed result
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, errors: result.error.errors }
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: z.ZodError["errors"]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}
  
  for (const error of errors) {
    const path = error.path.join(".") || "root"
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(error.message)
  }
  
  return formatted
}

/**
 * Create validation middleware for API routes
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    let body: unknown
    
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    
    const result = validate(schema, body)
    
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: formatValidationErrors(result.errors),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    
    return handler(result.data, request)
  }
}
