import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Force Node.js runtime (Stripe SDK requires Node, not Edge)
export const runtime = "nodejs"

// Ensure env var exists (trim to avoid accidental whitespace/newlines)
const rawStripeSecret = process.env.STRIPE_SECRET_KEY
const stripeSecret = rawStripeSecret?.trim()
if (!stripeSecret) {
  console.warn("[Stripe] STRIPE_SECRET_KEY is not set. Payment API will fail until configured.")
}

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : (null as unknown as Stripe)

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    // Debug hints without exposing secrets
    if (rawStripeSecret && rawStripeSecret !== stripeSecret) {
      console.warn("[Stripe] Detected trailing/leading whitespace in STRIPE_SECRET_KEY. It has been trimmed.")
    }
    if (stripeSecret && !/^sk_(test|live)_/.test(stripeSecret)) {
      console.warn("[Stripe] STRIPE_SECRET_KEY does not start with expected 'sk_test_' or 'sk_live_' prefix.")
    }

    const body = await req.json()
    const {
      bookingId,
      amount, // in smallest currency unit (e.g., cents)
      currency = "usd",
      customer_email,
      metadata = {},
    } = body || {}

    if (!bookingId || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid booking or amount" }, { status: 400 })
    }

    // Create or reuse a PaymentIntent (idempotent by booking)
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        receipt_email: customer_email,
        metadata: {
          bookingId,
          ...metadata,
        },
        automatic_payment_methods: { enabled: true },
      },
      {
        idempotencyKey: `booking:${bookingId}`,
      }
    )

    return NextResponse.json({ clientSecret: intent.client_secret })
  } catch (err: any) {
    console.error("[Stripe] create-intent error:", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
