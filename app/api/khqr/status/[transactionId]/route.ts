import { NextRequest, NextResponse } from 'next/server'

/**
 * Check KHQR payment status with Payway API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Get Payway configuration from environment
    const paywayConfig = {
      merchantId: process.env.PAYWAY_MERCHANT_ID!,
      publicKey: process.env.PAYWAY_PUBLIC_KEY!,
      apiUrl: process.env.PAYWAY_API_URL!
    }

    // Log status check request (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Checking Payment Status:', {
        transactionId,
        url: `${paywayConfig.apiUrl}/payments/${transactionId}/status`
      })
    }

    // Make API call to Payway to check status
    const response = await fetch(`${paywayConfig.apiUrl}/payments/${transactionId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paywayConfig.publicKey}`
      }
    })

    // Log status response (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('� Status check response:', { 
        status: response.status, 
        ok: response.ok, 
        statusText: response.statusText 
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Status check failed:', { status: response.status, errorText })
      
      // Return a default pending status instead of throwing to prevent cascading failures
      return NextResponse.json({
        transactionId,
        status: 'pending',
        amount: 0,
        error: `HTTP ${response.status}: ${response.statusText}`
      })
    }

    const result = await response.json()

    // Log successful response (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Status check result:', result)
    }

    const mappedStatus = mapPaywayStatus(result.status)
    
    return NextResponse.json({
      transactionId: result.transaction_id || transactionId,
      status: mappedStatus,
      amount: parseFloat(result.amount || '0'),
      paidAt: result.paid_at ? new Date(result.paid_at) : undefined,
      bankCode: result.bank_code,
      customerReference: result.customer_reference
    })
  } catch (error) {
    console.error('💥 Payment status check error:', error)
    
    // Return a default response instead of throwing to prevent cascading failures
    // This ensures payment flow continues even during network issues
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      console.warn('🌐 Network error during status check, returning default pending status')
    }
    
    return NextResponse.json({
      transactionId: request.nextUrl.pathname.split('/').pop() || 'unknown',
      status: 'pending' as const,
      amount: 0,
      error: error instanceof Error ? error.message : 'Status check failed'
    })
  }
}

/**
 * Map Payway status to our internal status
 */
function mapPaywayStatus(paywayStatus: string): 'pending' | 'processing' | 'success' | 'failed' | 'expired' {
  switch (paywayStatus?.toLowerCase()) {
    case 'success':
    case 'completed':
      return 'success'
    case 'pending':
    case 'created':
      return 'pending'
    case 'processing':
      return 'processing'
    case 'failed':
    case 'error':
      return 'failed'
    case 'expired':
    case 'cancelled':
      return 'expired'
    default:
      return 'pending'
  }
}