import { NextResponse } from "next/server"
import Stripe from "stripe"

export const runtime = "nodejs"

export async function GET() {
  const raw = process.env.STRIPE_SECRET_KEY
  const trimmed = raw?.trim()

  if (!trimmed) {
    return NextResponse.json({ ok: false, reason: "missing_key" }, { status: 500 })
  }

  try {
    const stripe = new Stripe(trimmed, { apiVersion: "2024-06-20" })
    const acct = await stripe.accounts.retrieve()
    // Mask sensitive fields
    const id = acct.id
    const maskedId = id ? `${id.slice(0, 3)}…${id.slice(-3)}` : null
    return NextResponse.json({
      ok: true,
      account: {
        id: maskedId,
        business_type: acct.business_type || null,
        country: acct.country || null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      reason: "auth_failed",
      errorType: err?.type || null,
      statusCode: err?.statusCode || null,
      message: err?.message || "",
    }, { status: 500 })
  }
}
