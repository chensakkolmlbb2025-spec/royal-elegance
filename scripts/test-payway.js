/**
 * Test script for real Payway KHQR integration
 * Run with: node scripts/test-payway.js
 */

import fetch from 'node-fetch'

async function testPaywayPayment() {
  console.log('🚀 Testing Real Payway KHQR Payment...\n')

  try {
    // Test payment creation
    const paymentData = {
      amount: 50,
      currency: 'USD',
      description: 'Test Hotel Booking - Real Payway'
    }

    console.log('📝 Creating payment with data:', paymentData)
    
    const response = await fetch('http://localhost:3000/api/khqr/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    })

    const result = await response.json()
    
    console.log('\n📥 Payment Creation Response:')
    console.log('Status:', response.status, response.statusText)
    console.log('Success:', result.success)
    console.log('Payment ID:', result.paymentId)
    console.log('Has QR Code:', !!result.qrCode)
    
    if (result.qrCode) {
      console.log('QR Code Length:', result.qrCode.length)
      console.log('QR Code Sample:', result.qrCode.substring(0, 50) + '...')
    }
    
    if (result.error) {
      console.log('❌ Error:', result.error)
    }

    // If payment created successfully, test status check
    if (result.success && result.paymentId) {
      console.log('\n🔍 Testing Payment Status Check...')
      
      const statusResponse = await fetch(`http://localhost:3000/api/khqr/status/${result.paymentId}`)
      const statusResult = await statusResponse.json()
      
      console.log('\n📥 Status Check Response:')
      console.log('Status:', statusResponse.status, statusResponse.statusText)
      console.log('Payment Status:', statusResult.status)
      console.log('Transaction ID:', statusResult.transactionId)
      
      if (statusResult.error) {
        console.log('❌ Status Error:', statusResult.error)
      }
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.message)
  }

  console.log('\n✅ Test Complete!')
}

// Run the test
testPaywayPayment()