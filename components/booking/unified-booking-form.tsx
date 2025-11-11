"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { StripePaymentElementWrapper } from "@/components/payment/stripe-payment-element"
import { useToast } from "@/hooks/use-toast"
import type { RoomType, Room, Service } from "@/lib/types"

interface UnifiedBookingFormProps {
  user: SupabaseUser
  roomType: RoomType
  room: Room
  services: Service[]
  onCancel?: () => void
}

export function UnifiedBookingForm({ user, roomType, room, services, onCancel }: UnifiedBookingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return nights > 0 ? nights : 0
  }

  const calculateTotal = () => {
    const nights = calculateNights()
    const roomPrice = roomType.basePrice * nights
    const servicesPrice = selectedServices.reduce((sum, id) => {
      const service = services.find(s => s.id === id)
      return sum + (service?.price || 0)
    }, 0)
    return roomPrice + servicesPrice
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(toSnakeCase)
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        acc[snakeKey] = toSnakeCase(obj[key])
        return acc
      }, {} as any)
    }
    return obj
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toISOString().split("T")[0]
  }

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const bookingData = {
        userId: user.id,
        guestName: (user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || "Guest",
        guestEmail: user.email || "",
        guestPhone: (user as any)?.user_metadata?.phone || "Not provided",
        guestCount: guests,
        roomId: room.id,
        roomTypeId: roomType.id,
        checkInDate: formatDate(checkIn),
        checkOutDate: formatDate(checkOut),
        roomPrice: roomType.basePrice * calculateNights(),
        servicesPrice: selectedServices.reduce((sum, id) => {
          const service = services.find((s) => s.id === id)
          return sum + (service?.price || 0)
        }, 0),
        totalPrice: calculateTotal(),
        status: "confirmed" as const,
        paymentStatus: "pending" as const,
        paymentMethod: "credit_card" as const,
        paidAmount: 0,
        bookingReference: `BK-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      }

      const dbBooking = toSnakeCase(bookingData)

      console.log("[Booking] Creating booking with data:", {
        userId: dbBooking.user_id,
        roomId: dbBooking.room_id,
        checkIn: dbBooking.check_in_date,
        checkOut: dbBooking.check_out_date,
        total: dbBooking.total_price,
        status: dbBooking.status,
        paymentStatus: dbBooking.payment_status
      })

      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert([dbBooking])
        .select()
        .single()

      if (bookingError || !newBooking) {
        console.error("[Booking] Failed to create booking:", bookingError)
        throw new Error(bookingError?.message || "Failed to create booking")
      }

      const bookingId = newBooking.id as string
      console.log("[Booking] Successfully created booking with ID:", bookingId)
      setCreatedBookingId(bookingId)

      // Add selected services
      if (selectedServices.length > 0) {
        const bookingServices = selectedServices.map(serviceId => {
          const service = services.find(s => s.id === serviceId)
          return {
            booking_id: bookingId,
            service_id: serviceId,
            quantity: 1,
            unit_price: service?.price || 0,
            total_price: service?.price || 0,
            status: 'confirmed'
          }
        })
        const { error: servicesError } = await supabase.from('booking_services').insert(bookingServices)
        if (servicesError) console.error("Error adding services:", servicesError)
      }

      setShowPayment(true)
    } catch (err: any) {
      console.error("[Booking] Failed to create booking:", err)
      toast({ 
        title: "Booking failed", 
        description: err.message || "Could not start payment.", 
        variant: "destructive" 
      })
    }
  }

  if (showPayment && createdBookingId) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StripePaymentElementWrapper
            bookingId={createdBookingId}
            amount={Math.round(calculateTotal() * 100)}
            currency="usd"
            customerEmail={user.email || undefined}
          />
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setShowPayment(false)}>Back</Button>
            {onCancel && <Button variant="outline" onClick={onCancel}>Cancel Booking</Button>}
          </div>
        </div>
        <div>
          <Card className="glass-card sticky top-24">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{roomType.name}</h3>
                <p className="text-sm text-muted-foreground">Room {room.roomNumber}</p>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount</span>
                <span className="price-badge">${calculateTotal()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>Complete Your Booking</CardTitle>
            <CardDescription>Fill in the details below to reserve your room</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContinueToPayment} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check-in Date</Label>
                  <Input
                    id="checkIn"
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check-out Date</Label>
                  <Input
                    id="checkOut"
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Input
                  id="guests"
                  type="number"
                  value={guests}
                  onChange={(e) => setGuests(Number.parseInt(e.target.value))}
                  min={1}
                  max={roomType.maxOccupancy}
                  required
                />
                <p className="text-sm text-muted-foreground">Maximum {roomType.maxOccupancy} guests</p>
              </div>

              {services.length > 0 && (
                <div className="space-y-2">
                  <Label>Additional Services (Optional)</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedServices.includes(service.id)
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        onClick={() => toggleService(service.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedServices.includes(service.id) ? "bg-primary border-primary" : "border-muted"
                          }`}>
                            {selectedServices.includes(service.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">${service.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 glass-button" size="lg">
                  Continue to Payment
                </Button>
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Booking Summary */}
      <div>
        <Card className="glass-card sticky top-24">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{roomType.name}</h3>
              <p className="text-sm text-muted-foreground">Room {room.roomNumber}</p>
            </div>
            <Separator />
            {checkIn && checkOut && (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="font-medium">{new Date(checkIn).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="font-medium">{new Date(checkOut).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nights</span>
                    <span className="font-medium">{calculateNights()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guests</span>
                    <span className="font-medium">{guests}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room ({calculateNights()} nights)</span>
                    <span className="font-medium">${roomType.basePrice * calculateNights()}</span>
                  </div>
                  {selectedServices.map((serviceId) => {
                    const service = services.find((s) => s.id === serviceId)
                    return (
                      <div key={serviceId} className="flex justify-between">
                        <span className="text-muted-foreground">{service?.name}</span>
                        <span className="font-medium">${service?.price}</span>
                      </div>
                    )
                  })}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="price-badge">${calculateTotal()}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
