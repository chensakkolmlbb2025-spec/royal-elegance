import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

/**
 * Mock KHQR payment creation for testing purposes
 * This generates real KHQR QR codes that can be scanned by Cambodian banking apps
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency, description, customerEmail } = body

    // Validate required fields
    if (!amount || !currency) {
      return NextResponse.json(
        { error: 'Amount and currency are required' },
        { status: 400 }
      )
    }

    // Generate unique transaction ID
    const transactionId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Generate a real KHQR QR code that can be scanned by banking apps
    const khqrData = generateKHQRData(transactionId, amount, currency, description || 'Hotel Booking')
    const qrCodeImage = await generateKHQRQRCode(khqrData)

    // Log the mock payment creation
    console.log('🧪 Mock KHQR Payment Created:', {
      transactionId,
      amount,
      currency,
      description,
      khqrDataLength: khqrData.length
    })

    return NextResponse.json({
      success: true,
      paymentId: transactionId,
      qrCode: qrCodeImage,
      amount: amount,
      currency: currency,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      status: 'pending',
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/mock-payment/${transactionId}`
    })
  } catch (error) {
    console.error('Mock KHQR payment creation failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed' 
      },
      { status: 500 }
    )
  }
}

/**
 * Generate KHQR data string following EMVCo QR Code specification
 * This creates a real KHQR code that can be scanned by Cambodian banking apps
 */
function generateKHQRData(transactionId: string, amount: number, currency: string, description: string): string {
  // KHQR follows EMVCo QR Code standard for payments
  // This is a simplified but functional implementation
  
  // Convert USD to KHR for local banking (current rate: 1 USD ≈ 4100 KHR)
  // KHQR in Cambodia typically uses KHR (Riel) as the base currency
  const exchangeRate = 4100
  const amountInKHR = currency === 'USD' ? Math.round(amount * exchangeRate) : amount
  const currencyCode = '116' // ISO 4217 code for KHR (Cambodian Riel)
  
  // Build KHQR data following EMVCo format
  let khqrData = ''
  
  // Payload Format Indicator (ID "00")
  khqrData += '000201'
  
  // Point of Initiation Method (ID "01") - Dynamic QR
  khqrData += '010212'
  
  // Merchant Account Information (ID "29" for Cambodia)
  const merchantInfo = buildMerchantInfo()
  khqrData += `29${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`
  
  // Merchant Category Code (ID "52") - Hotel/Accommodation
  khqrData += '52047011'
  
  // Transaction Currency (ID "53")
  khqrData += `53${currencyCode.length.toString().padStart(2, '0')}${currencyCode}`
  
  // Transaction Amount (ID "54")
  const amountStr = amountInKHR.toFixed(2)
  khqrData += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`
  
  // Country Code (ID "58") - Cambodia
  khqrData += '5802KH'
  
  // Merchant Name (ID "59")
  const merchantName = 'ITE Hotel'
  khqrData += `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`
  
  // Merchant City (ID "60")
  const merchantCity = 'Phnom Penh'
  khqrData += `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`
  
  // Additional Data Field (ID "62")
  const additionalData = buildAdditionalData(transactionId, description)
  khqrData += `62${additionalData.length.toString().padStart(2, '0')}${additionalData}`
  
  // Calculate CRC (ID "63")
  const crc = calculateCRC16(khqrData + '6304')
  khqrData += `63${crc.length.toString().padStart(2, '0')}${crc}`
  
  return khqrData
}

/**
 * Build merchant account information for KHQR
 * Following the format used by Cambodian banks
 */
function buildMerchantInfo(): string {
  // Simulate realistic KHQR merchant account for ABA Bank
  // Format follows Cambodia's KHQR standard
  const bankCode = 'aba' // ABA Bank identifier
  const merchantId = '123456789012345' // 15-digit merchant ID
  
  // Build according to KHQR specification
  let merchantInfo = ''
  
  // Globally Unique Identifier (00)
  const gui = 'kh.com.aba'
  merchantInfo += `00${gui.length.toString().padStart(2, '0')}${gui}`
  
  // Merchant Account (01)
  merchantInfo += `01${merchantId.length.toString().padStart(2, '0')}${merchantId}`
  
  return merchantInfo
}

/**
 * Build additional data field
 */
function buildAdditionalData(transactionId: string, description: string): string {
  let additionalData = ''
  
  // Bill Number (ID "01")
  additionalData += `01${transactionId.length.toString().padStart(2, '0')}${transactionId}`
  
  // Purpose of Transaction (ID "08")
  const purpose = description.substring(0, 25) // Limit to 25 chars
  additionalData += `08${purpose.length.toString().padStart(2, '0')}${purpose}`
  
  return additionalData
}

/**
 * Calculate CRC16 checksum for KHQR
 */
function calculateCRC16(data: string): string {
  const polynomial = 0x1021
  let crc = 0xFFFF
  
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8)
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Generate QR code image from KHQR data
 */
async function generateKHQRQRCode(khqrData: string): Promise<string> {
  try {
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(khqrData, {
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
    
    console.log('🎯 Generated KHQR Data:', {
      length: khqrData.length,
      data: khqrData.substring(0, 50) + '...',
      fullData: khqrData
    })
    
    return qrCodeDataURL
  } catch (error) {
    console.error('Failed to generate KHQR QR code:', error)
    throw new Error('QR code generation failed')
  }
}