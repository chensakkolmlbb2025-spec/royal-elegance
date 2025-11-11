"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QrCode, Clock, CheckCircle, XCircle, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { khqrService } from "@/lib/khqr-payment"
import Image from "next/image"

interface KHQRPaymentProps {
  amount: number
  bookingReference: string
  onSuccess: () => void
  onCancel: () => void
}

export function KHQRPayment({ amount, bookingReference, onSuccess, onCancel }: KHQRPaymentProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed' | 'expired'>('pending')
  const [qrCode, setQrCode] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes (Payway default)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [paymentId, setPaymentId] = useState<string>("")
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Real KHQR payment generation with Payway API
  const generateKHQR = async () => {
    setIsGeneratingQR(true)
    try {
      const response = await khqrService.createPayment({
        amount,
        currency: 'USD',
        description: `Hotel Booking - ${bookingReference}`,
        customerEmail: '', // Optional: get from user context
      })

      if (response.success && response.qrCode && response.paymentId) {
        setQrCode(response.qrCode)
        setPaymentId(response.paymentId)
        setPaymentStatus('processing')
        
        // Set expiry time from API response
        if (response.expiresAt) {
          const expiryTime = Math.floor((response.expiresAt.getTime() - Date.now()) / 1000)
          setTimeLeft(Math.max(0, expiryTime))
        }
        
        // Start payment status polling
        startPaymentPolling(response.paymentId)
        
        toast({
          title: "QR Code Generated",
          description: "Scan the QR code with your banking app to complete payment."
        })
      } else {
        throw new Error(response.error || 'Failed to generate QR code')
      }
    } catch (error) {
      console.error('KHQR Generation Error:', error)
      setPaymentStatus('failed')
      toast({
        title: "QR Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate KHQR code. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // Real payment status polling with Payway API
  const startPaymentPolling = (transactionId: string) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    const interval = setInterval(async () => {
      try {
        const statusResponse = await khqrService.checkPaymentStatus(transactionId)
        
        if (statusResponse.status === 'success') {
          setPaymentStatus('success')
          clearInterval(interval)
          pollIntervalRef.current = null
          
          toast({
            title: "Payment Successful! 🎉",
            description: "Your KHQR payment has been processed successfully.",
          })
          
          // Wait a moment for user to see success message, then proceed
          setTimeout(() => {
            onSuccess()
          }, 2000)
          
        } else if (statusResponse.status === 'failed') {
          setPaymentStatus('failed')
          clearInterval(interval)
          pollIntervalRef.current = null
          
          toast({
            title: "Payment Failed",
            description: "Your payment was not successful. Please try again.",
            variant: "destructive"
          })
          
        } else if (statusResponse.status === 'expired') {
          setPaymentStatus('expired')
          clearInterval(interval)
          pollIntervalRef.current = null
          
          toast({
            title: "Payment Expired",
            description: "The QR code has expired. Please generate a new one.",
            variant: "destructive"
          })
        }
        // If status is still 'pending' or 'processing', continue polling
        
      } catch (error) {
        console.error('Payment status check failed:', error)
        
        // Show a toast for network errors, but continue polling
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          console.warn('🌐 Network error during status check, will retry...')
          // Don't show toast for every network error to avoid spam
        }
        
        // Continue polling despite errors - could be temporary network issues
      }
    }, 5000) // Check every 5 seconds

    pollIntervalRef.current = interval
  }

  // Cleanup polling and timer on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    if (paymentStatus === 'processing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPaymentStatus('expired')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [paymentStatus])

  // Handle polling cleanup when payment expires or completes
  useEffect(() => {
    if (paymentStatus === 'expired' || paymentStatus === 'success' || paymentStatus === 'failed') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [paymentStatus])

  // Generate QR on component mount
  useEffect(() => {
    generateKHQR()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'processing': return 'bg-blue-500/20 text-blue-700'
      case 'success': return 'bg-green-500/20 text-green-700'
      case 'failed': return 'bg-red-500/20 text-red-700'
      case 'expired': return 'bg-yellow-500/20 text-yellow-700'
      default: return 'bg-gray-500/20 text-gray-700'
    }
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing': return <Clock className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'failed': return <XCircle className="w-5 h-5" />
      case 'expired': return <XCircle className="w-5 h-5" />
      default: return <QrCode className="w-5 h-5" />
    }
  }

  return (
    <Card className="glass-card border-0 animate-fade-in-up">
      <CardHeader className="bg-white/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-slate-900">KHQR Payment</CardTitle>
              <CardDescription>Scan QR code with your banking app</CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor()}>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {paymentStatus === 'processing' ? 'Waiting for Payment' : 
               paymentStatus === 'success' ? 'Payment Successful' :
               paymentStatus === 'failed' ? 'Payment Failed' :
               paymentStatus === 'expired' ? 'QR Code Expired' : 'Generating QR'}
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Payment Amount */}
        <div className="text-center p-4 bg-[#d4af37]/10 rounded-lg">
          <div className="price-badge text-2xl">
            ${amount}
          </div>
          <div className="text-sm text-muted-foreground">Amount to Pay</div>
        </div>

        {/* QR Code Display */}
        {paymentStatus === 'pending' || isGeneratingQR ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-muted-foreground">Generating KHQR code...</p>
          </div>
        ) : paymentStatus === 'processing' ? (
          <div className="flex flex-col items-center space-y-4">
            {/* Real QR Code Display */}
            <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center relative p-4">
              {qrCode ? (
                // Display the actual QR code from Payway API
                qrCode.startsWith('data:image') ? (
                  <Image
                    src={qrCode}
                    alt="KHQR Payment Code"
                    width={224}
                    height={224}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  // If it's not a data URL, create a QR code placeholder with the data
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">QR Code Ready</p>
                      <p className="text-xs text-gray-400 mt-1">Scan with banking app</p>
                    </div>
                  </div>
                )
              ) : (
                // Fallback if no QR code data
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-500">QR Code Loading...</p>
                  </div>
                </div>
              )}
              
              {/* KHQR Logo Overlay */}
              <div className="absolute bottom-2 right-2">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            
            {/* Timer */}
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="w-5 h-5 text-[#d4af37]" />
              <span>Time remaining: {formatTime(timeLeft)}</span>
            </div>
            
            <p className="text-center text-muted-foreground max-w-md">
              Open your banking app and scan this QR code to complete the payment
            </p>
          </div>
        ) : paymentStatus === 'success' ? (
          <div className="flex flex-col items-center space-y-4 text-center">
            <CheckCircle className="w-16 h-16 text-green-600" />
            <h3 className="text-xl font-semibold text-green-700">Payment Successful!</h3>
            <p className="text-muted-foreground">Your booking has been confirmed</p>
          </div>
        ) : paymentStatus === 'expired' || paymentStatus === 'failed' ? (
          <div className="flex flex-col items-center space-y-4 text-center">
            <XCircle className="w-16 h-16 text-red-600" />
            <h3 className="text-xl font-semibold text-red-700">
              {paymentStatus === 'expired' ? 'QR Code Expired' : 'Payment Failed'}
            </h3>
            <p className="text-muted-foreground">
              {paymentStatus === 'expired' 
                ? 'Please generate a new QR code to continue' 
                : 'Please try again or use a different payment method'}
            </p>
          </div>
        ) : null}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            How to pay with KHQR:
          </h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Open your banking app (ABA, ACLEDA, Canadia, etc.)</li>
            <li>Select "Scan QR" or "KHQR Payment"</li>
            <li>Scan the QR code above</li>
            <li>Confirm the payment amount</li>
            <li>Enter your PIN and complete payment</li>
          </ol>
        </div>

        {/* Booking Reference */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Booking Reference: <span className="font-semibold">{bookingReference}</span></p>
          {paymentId && (
            <p className="mt-1">Payment ID: <span className="font-mono text-xs">{paymentId}</span></p>
          )}
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 border rounded-lg p-3 text-xs space-y-2">
            <div className="font-semibold">Debug Info:</div>
            <div>Status: {paymentStatus}</div>
            <div>Payment ID: {paymentId || 'Not set'}</div>
            <div>QR Code: {qrCode ? 'Generated' : 'Not generated'}</div>
            <div>Polling: {pollIntervalRef.current ? 'Active' : 'Inactive'}</div>
            <div>Time Left: {timeLeft}s</div>
            
            {/* Mock payment controls */}
            {paymentId && paymentId.startsWith('MOCK_') && paymentStatus === 'processing' && (
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/khqr/mock-status/${paymentId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'success' })
                      })
                      toast({
                        title: "Mock Payment Completed",
                        description: "Payment marked as successful for testing.",
                      })
                    } catch (error) {
                      console.error('Failed to complete mock payment:', error)
                    }
                  }}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  ✅ Complete Payment
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/khqr/mock-status/${paymentId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'failed' })
                      })
                      toast({
                        title: "Mock Payment Failed",
                        description: "Payment marked as failed for testing.",
                        variant: "destructive"
                      })
                    } catch (error) {
                      console.error('Failed to fail mock payment:', error)
                    }
                  }}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  ❌ Fail Payment
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={paymentStatus === 'success'}
            className="flex-1 glass-button"
          >
            Cancel
          </Button>
          
          {(paymentStatus === 'expired' || paymentStatus === 'failed') && (
            <Button
              onClick={() => {
                // Reset state for new payment
                setQrCode("")
                setPaymentId("")
                setTimeLeft(900) // Reset to 15 minutes
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                }
                generateKHQR()
              }}
              disabled={isGeneratingQR}
              className="flex-1 glass-button"
            >
              {isGeneratingQR ? 'Generating...' : 'Generate New QR'}
            </Button>
          )}
          
          {paymentStatus === 'processing' && (
            <Button
              onClick={async () => {
                if (!paymentId) return
                
                toast({
                  title: "Checking Payment Status",
                  description: "Please wait while we verify your payment...",
                })

                try {
                  const statusResponse = await khqrService.checkPaymentStatus(paymentId)
                  
                  if (statusResponse.status === 'success') {
                    setPaymentStatus('success')
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current)
                      pollIntervalRef.current = null
                    }
                    
                    toast({
                      title: "Payment Successful! 🎉",
                      description: "Your KHQR payment has been processed successfully.",
                    })
                    
                    setTimeout(() => {
                      onSuccess()
                    }, 2000)
                    
                  } else if (statusResponse.status === 'failed') {
                    setPaymentStatus('failed')
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current)
                      pollIntervalRef.current = null
                    }
                    
                    toast({
                      title: "Payment Failed",
                      description: "Your payment was not successful. Please try again.",
                      variant: "destructive"
                    })
                    
                  } else {
                    toast({
                      title: "Payment Still Pending",
                      description: "Payment is still being processed. Please wait or scan the QR code if you haven't already.",
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Status Check Failed",
                    description: "Unable to check payment status. Please try again.",
                    variant: "destructive"
                  })
                }
              }}
              className="flex-1 glass-button"
            >
              Check Status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}