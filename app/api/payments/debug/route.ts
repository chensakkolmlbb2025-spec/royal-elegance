import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const raw = process.env.STRIPE_SECRET_KEY
  const trimmed = raw?.trim()

  const info = {
    hasKey: Boolean(trimmed),
    isTestKey: trimmed ? trimmed.startsWith("sk_test_") : false,
    isLiveKey: trimmed ? trimmed.startsWith("sk_live_") : false,
    length: trimmed?.length ?? 0,
    hadWhitespace: raw !== undefined && raw !== trimmed,
    // Do NOT return the key. Only expose minimal diagnostics.
  }

  return NextResponse.json(info)
}
