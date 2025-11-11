import { NextRequest, NextResponse } from 'next/server'
import { updateBooking } from '@/lib/supabase-service'
import { khqrService } from '@/lib/khqr-payment'

/**
 * KHQR Webhook Handler
 * Receives payment status updates from KHQR system
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-khqr-signature')
    const rawBody = await request.text()
    
    // TODO: Verify webhook signature for security
    // const isValid = khqrService.verifyWebhookSignature(rawBody, signature)
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const payload = JSON.parse(rawBody)
    
    // Extract payment information
    const {
      transaction_id,
      status,
      amount,
      currency,
      merchant_reference, // This should be your booking reference
      customer_reference,
      bank_code,
      paid_at
    } = payload

    console.log('[KHQR Webhook] Received payment update:', {
      transaction_id,
      status,
      merchant_reference
    })

    // Find booking by reference
    if (!merchant_reference) {
      console.error('[KHQR Webhook] No merchant reference provided')
      return NextResponse.json({ error: 'Missing merchant reference' }, { status: 400 })
    }

    // TODO: Add function to find booking by reference
    // const booking = await getBookingByReference(merchant_reference)
    // if (!booking) {
    //   console.error('[KHQR Webhook] Booking not found:', merchant_reference)
    //   return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    // }

    // Update booking status based on KHQR payment status
    let bookingStatus: 'pending' | 'confirmed' | 'cancelled' = 'pending'
    let paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' = 'pending'

    switch (status) {
      case 'success':
      case 'completed':
        bookingStatus = 'confirmed'
        paymentStatus = 'paid'
        break
      case 'failed':
      case 'expired':
      case 'cancelled':
        paymentStatus = 'failed'
        break
      default:
        paymentStatus = 'pending'
    }

    // TODO: Update booking with payment status
    // await updateBooking(booking.id, {
    //   status: bookingStatus,
    //   paymentStatus,
    //   paymentMethod: 'khqr',
    //   // Store KHQR transaction details
    //   paymentReference: transaction_id,
    //   paidAt: paid_at ? new Date(paid_at) : undefined
    // })

    console.log('[KHQR Webhook] Booking updated successfully:', {
      reference: merchant_reference,
      status: bookingStatus,
      paymentStatus
    })

    // Send confirmation email if payment successful
    if (paymentStatus === 'paid') {
      // TODO: Send booking confirmation email
      console.log('[KHQR Webhook] Payment successful, should send confirmation email')
    }

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully' 
    })

  } catch (error) {
    console.error('[KHQR Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

/**
 * Handle GET requests (for webhook verification)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    // KHQR webhook verification
    return NextResponse.json({ challenge })
  }
  
  return NextResponse.json({ 
    message: 'KHQR webhook endpoint',
    timestamp: new Date().toISOString()
  })
}