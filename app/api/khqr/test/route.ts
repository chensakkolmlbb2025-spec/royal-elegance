import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to verify Payway configuration and connectivity
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const config = {
      merchantId: process.env.PAYWAY_MERCHANT_ID,
      publicKey: process.env.PAYWAY_PUBLIC_KEY,
      privateKey: process.env.PAYWAY_PRIVATE_KEY ? '[PRESENT]' : '[MISSING]',
      apiUrl: process.env.PAYWAY_API_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    }

    // Test a simple ping to the Payway API
    let apiStatus = 'unknown'
    try {
      const testResponse = await fetch(`${process.env.PAYWAY_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      apiStatus = testResponse.ok ? 'reachable' : `error_${testResponse.status}`
    } catch (error) {
      apiStatus = 'unreachable'
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config,
      apiStatus,
      message: 'KHQR test endpoint is working'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}