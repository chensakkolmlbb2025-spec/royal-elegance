"use client"

import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

type StripePaymentElementProps = {
  bookingId: string
  amount: number // smallest currency unit, e.g., cents
  currency?: string
  customerEmail?: string
}

export function StripePaymentElementWrapper(props: StripePaymentElementProps) {
  const { bookingId, amount, currency = "usd", customerEmail } = props
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const { toast } = useToast()

  const options = useMemo(() => ({
    clientSecret: clientSecret || undefined,
    appearance: { theme: "stripe" as const },
  }), [clientSecret])

  useEffect(() => {
    const createIntent = async () => {
      try {
        console.log("[Payment] Creating payment intent:", { bookingId, amount, currency })
        const res = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            amount,
            currency,
            customer_email: customerEmail,
          }),
        })
        
        const data = await res.json()
        console.log("[Payment] Payment intent response:", { status: res.status, hasClientSecret: !!data.clientSecret, error: data.error })
        
        if (!res.ok) {
          throw new Error(data.error || `Failed to create payment intent (${res.status})`)
        }
        
        if (!data.clientSecret) {
          throw new Error("No client secret received from server")
        }
        
        setClientSecret(data.clientSecret)
      } catch (error: any) {
        console.error("[Payment] Failed to create payment intent:", error)
        toast({
          title: "Payment setup failed",
          description: error.message || "Could not initialize payment",
          variant: "destructive",
        })
      }
    }
    createIntent()
  }, [bookingId, amount, currency, customerEmail, toast])

  if (!clientSecret) return <div className="p-4 text-sm text-muted-foreground">Preparing secure payment form…</div>

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentElementInner bookingId={props.bookingId} />
    </Elements>
  )
}

function StripePaymentElementInner({ bookingId }: { bookingId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || loading) return
    setLoading(true)

    try {
      console.log("[Payment] Starting payment confirmation for booking:", bookingId)
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-confirmation?id=${bookingId}`,
        },
        redirect: "if_required",
      })

      if (error) {
        console.error("[Payment] Payment failed:", error)
        toast({
          title: "Payment failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        })
      } else {
        console.log("[Payment] Payment successful:", paymentIntent?.status)
        toast({
          title: "Payment successful!",
          description: "Your booking has been confirmed.",
        })
        // Redirect to confirmation page
        window.location.href = `/booking-confirmation?id=${bookingId}`
      }
    } catch (err: any) {
      console.error("[Payment] Unexpected error:", err)
      toast({
        title: "Payment error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button disabled={!stripe || loading} onClick={handleSubmit} className="w-full">
        {loading ? "Processing…" : "Pay now"}
      </Button>
    </div>
  )
}
