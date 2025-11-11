/**
 * DEPRECATED: Mock Payment Processing System
 * This module simulated payment processing for testing before Stripe integration.
 * It is retained temporarily for reference and will be removed.
 * Do not use in new code. Migrate to Stripe PaymentIntent + Elements flow.
 */

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: "pending" | "succeeded" | "failed"
  createdAt: Date
}

export interface PaymentMethod {
  type: "card" | "wallet"
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
}

export interface PaymentResult {
  id: string
  intentId: string
  status: "succeeded" | "failed" | "pending"
  amount: number
  method: PaymentMethod
  timestamp: Date
}

/**
 * Mock payment processing system
 * Simulates Stripe-like payment processing
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockPayment: any = {
  /**
   * Validate card details
   */
  // Deprecated card validation logic
  validateCard(
    cardNumber: string,
    cvv: string,
    expiryMonth: number,
    expiryYear: number,
  ): boolean {
    // Remove spaces from card number
    const cleanCardNumber = cardNumber.replace(/\s/g, "")

    // Check card number length (16 digits for most cards)
    if (cleanCardNumber.length !== 16) {
      return false
    }

    // Check if all characters are digits
    if (!/^\d+$/.test(cleanCardNumber)) {
      return false
    }

    // Luhn algorithm validation
    let sum = 0
    let isEven = false

    for (let i = cleanCardNumber.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(cleanCardNumber[i], 10)

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    if (sum % 10 !== 0) {
      return false
    }

    // Validate CVV (3-4 digits)
    if (!/^\d{3,4}$/.test(cvv)) {
      return false
    }

    // Validate expiry date
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    if (expiryYear < currentYear) {
      return false
    }

    if (expiryYear === currentYear && expiryMonth < currentMonth) {
      return false
    }

    if (expiryMonth < 1 || expiryMonth > 12) {
      return false
    }

    return true
  },

  /**
   * Create a payment intent
   */
  // Deprecated payment intent creator
  createPaymentIntent(amount: number): PaymentIntent {
    const id = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id,
      amount,
      currency: "USD",
      status: "pending",
      createdAt: new Date(),
    }
  },

  /**
   * Process a payment
   */
  // Deprecated payment processor
  async processPayment(intentId: string, method: PaymentMethod): Promise<PaymentResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simulate payment processing
    // In a real system, this would call a payment gateway API
    const succeeded = Math.random() > 0.1 // 90% success rate for demo

    return {
      id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      intentId,
      status: succeeded ? "succeeded" : "failed",
      amount: 0, // Amount would come from the intent
      method,
      timestamp: new Date(),
    }
  },

  /**
   * Get payment status
   */
  // Deprecated status fetcher
  getPaymentStatus(paymentId: string): "succeeded" | "failed" | "pending" {
    // In a real system, this would query the payment gateway
    return "succeeded"
  },

  /**
   * Refund a payment
   */
  // Deprecated refund logic
  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      intentId: paymentId,
      status: "succeeded",
      amount: amount || 0,
      method: {
        type: "card",
        last4: "4242",
        brand: "visa",
        expiryMonth: 12,
        expiryYear: 2025,
      },
      timestamp: new Date(),
    }
  },

  /**
   * Test card numbers for different scenarios
   */
  testCards: {
    // Visa card that always succeeds
    success: "4242 4242 4242 4242",
    // Visa card that always fails
    failure: "4000 0000 0000 0002",
    // Visa card that requires authentication
    requiresAuth: "4000 0025 0000 3155",
  },

  /**
   * Test CVV (any 3-4 digits work)
   */
  testCVV: "123",

  /**
   * Test expiry date (any future date works)
   */
  testExpiry: {
    month: "12",
    year: "2025",
  },
}

