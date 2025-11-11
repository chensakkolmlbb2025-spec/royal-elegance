"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Lock } from "lucide-react"
import { mockPayment } from "@/lib/mock-payment"
import { useToast } from "@/hooks/use-toast"

interface PaymentFormProps {
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({ amount, onSuccess, onCancel }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryMonth, setExpiryMonth] = useState("")
  const [expiryYear, setExpiryYear] = useState("")
  const [cvv, setCvv] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const fillTestCard = () => {
    setCardNumber(mockPayment.testCards.success)
    setCardName("Test User")
    setExpiryMonth(mockPayment.testExpiry.month)
    setExpiryYear(mockPayment.testExpiry.year)
    setCvv(mockPayment.testCVV)
    toast({
      title: "Test card loaded",
      description: "Click 'Pay' to complete the test booking",
    })
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "")
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(" ").substring(0, 19)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value.replace(/\D/g, ""))
    setCardNumber(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Validate card
      const isValid = mockPayment.validateCard(
        cardNumber,
        cvv,
        Number.parseInt(expiryMonth),
        Number.parseInt(expiryYear),
      )

      if (!isValid) {
        toast({
          title: "Invalid card details",
          description: "Please check your card information and try again.",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      // Create payment intent
      const paymentIntent = await mockPayment.createPaymentIntent(amount)

      // Process payment
      const result = await mockPayment.processPayment(paymentIntent.id, {
        type: "card",
        last4: cardNumber.slice(-4),
        brand: "visa",
        expiryMonth: Number.parseInt(expiryMonth),
        expiryYear: Number.parseInt(expiryYear),
      })

      if (result.status === "succeeded") {
        toast({
          title: "Payment successful!",
          description: "Your booking has been confirmed.",
        })
        onSuccess()
      } else {
        toast({
          title: "Payment failed",
          description: "Please try again or use a different payment method.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Payment error",
        description: "An error occurred while processing your payment.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i)
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))

  return (
    <Card className="glass-card border-0 animate-fade-in-up">
      <CardHeader className="bg-white/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#d4af37]" />
            <div>
              <CardTitle className="font-display text-slate-900">Secure Payment</CardTitle>
              <CardDescription>Mock payment for testing - Your payment information is encrypted and secure</CardDescription>
            </div>
          </div>
                    <Button 
            type="button" 
            onClick={fillTestCard}
            size="sm"
            variant="outline"
            className="info-badge"
          >
            Quick Fill Test Card
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
                className="glass-button pl-10"
              />
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardName">Cardholder Name</Label>
            <Input
              id="cardName"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="John Doe"
              required
              className="glass-button"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryMonth">Month</Label>
              <Select value={expiryMonth} onValueChange={setExpiryMonth} required>
                <SelectTrigger className="glass-button">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryYear">Year</Label>
              <Select value={expiryYear} onValueChange={setExpiryYear} required>
                <SelectTrigger className="glass-button">
                  <SelectValue placeholder="YYYY" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                placeholder="123"
                maxLength={3}
                required
                className="glass-button"
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount</span>
              <span className="price-badge">${amount}</span>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 glass-button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isProcessing} 
                className="flex-1 glass-button hover:border-[#d4af37] bg-slate-900 text-white hover:bg-slate-800"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Pay $${amount}`
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-900">🧪 Test Mode Active</p>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Test Cards:</strong></p>
              <p>• Success: {mockPayment.testCards.success}</p>
              <p>• Failure: {mockPayment.testCards.failure}</p>
              <p>• CVV: {mockPayment.testCVV} | Expiry: {mockPayment.testExpiry.month}/{mockPayment.testExpiry.year}</p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
