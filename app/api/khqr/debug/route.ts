import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Debug endpoint to test RSA signature generation
 */
export async function GET(request: NextRequest) {
  try {
    const privateKey = process.env.PAYWAY_PRIVATE_KEY
    
    if (!privateKey) {
      return NextResponse.json({ error: 'Private key not found in environment' }, { status: 400 })
    }

    // Test data
    const testData = 'test string for signing'
    
    let signatureResult = {
      privateKeyPresent: !!privateKey,
      privateKeyLength: privateKey.length,
      privateKeyFormat: privateKey.substring(0, 50) + '...',
      testData,
      signature: null as string | null,
      error: null as string | null
    }

    try {
      // Format private key properly
      let formattedPrivateKey = privateKey
      if (!privateKey.includes('\n')) {
        formattedPrivateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
          .replace(/(.{64})/g, '$1\n')
          .replace(/\n\n/g, '\n')
          .replace(/\n-----END/g, '\n-----END')
      }
      
      const sign = crypto.createSign('RSA-SHA256')
      sign.update(testData, 'utf8')
      sign.end()
      
      const signature = sign.sign(formattedPrivateKey, 'base64')
      signatureResult.signature = signature
      
    } catch (error) {
      signatureResult.error = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json({
      status: 'debug',
      timestamp: new Date().toISOString(),
      signatureTest: signatureResult
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Debug test failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}