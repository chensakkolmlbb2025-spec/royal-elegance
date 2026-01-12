"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { 
  Calendar as CalendarIcon, 
  Users, 
  Check, 
  ArrowRight, 
  CreditCard, 
  Sparkles, 
  Minus, 
  Plus,
  AlertCircle,
  Loader2,
  ShieldCheck
} from "lucide-react"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StripePaymentElementWrapper } from "@/components/payment/stripe-payment-element"
import { useToast } from "@/hooks/use-toast"

// Transaction-safe booking service
import { 
  createBookingWithRetry, 
  checkRoomAvailability,
  BookingErrorMessages,
  type BookingErrorCode 
} from "@/lib/booking-service"

// Types
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

  // State
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [roomAvailable, setRoomAvailable] = useState<boolean | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  // --- Real-time availability check ---
  useEffect(() => {
    const checkAvailability = async () => {
      if (!checkIn || !checkOut) {
        setRoomAvailable(null)
        setAvailabilityError(null)
        return
      }

      // Skip if dates are invalid
      if (new Date(checkOut) <= new Date(checkIn)) {
        return
      }

      setIsCheckingAvailability(true)
      setAvailabilityError(null)

      try {
        const result = await checkRoomAvailability(room.id, checkIn, checkOut)
        setRoomAvailable(result.isAvailable)
        
        if (!result.isAvailable && result.conflictingBookings.length > 0) {
          setAvailabilityError(
            `This room is already booked for some of your selected dates. Please choose different dates.`
          )
        }
      } catch (error) {
        console.error('Availability check failed:', error)
        setAvailabilityError('Could not verify availability. Please try again.')
      } finally {
        setIsCheckingAvailability(false)
      }
    }

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [checkIn, checkOut, room.id])

  // --- Calculations ---

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [checkIn, checkOut])

  const totals = useMemo(() => {
    const roomPrice = roomType.basePrice * nights
    const servicesPrice = selectedServices.reduce((sum, id) => {
      const service = services.find(s => s.id === id)
      return sum + (service?.price || 0)
    }, 0)
    return {
      room: roomPrice,
      services: servicesPrice,
      total: roomPrice + servicesPrice
    }
  }, [nights, roomType.basePrice, selectedServices, services])

  const dateError = useMemo(() => {
    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      return "Check-out date must be after check-in date."
    }
    return null
  }, [checkIn, checkOut])

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    return (
      checkIn && 
      checkOut && 
      !dateError && 
      roomAvailable === true && 
      !isCheckingAvailability &&
      !isSubmitting
    )
  }, [checkIn, checkOut, dateError, roomAvailable, isCheckingAvailability, isSubmitting])

  // --- Handlers ---

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleGuestChange = (delta: number) => {
    setGuests(prev => {
      const newVal = prev + delta
      if (newVal < 1) return 1
      if (newVal > roomType.maxOccupancy) return roomType.maxOccupancy
      return newVal
    })
  }

  // Transaction-safe booking creation
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    
    setIsSubmitting(true)

    try {
      // Use the transaction-safe booking API with retry logic
      const result = await createBookingWithRetry({
        userId: user.id,
        roomId: room.id,
        roomTypeId: roomType.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestName: (user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || "Guest",
        guestEmail: user.email || "",
        guestPhone: (user as any)?.user_metadata?.phone || "Not provided",
        guestCount: guests,
        roomPrice: totals.room,
        servicesPrice: totals.services,
        totalPrice: totals.total,
        specialRequests: undefined,
        paymentMethod: "credit_card",
      }, 3, 500) // 3 retries, 500ms base delay

      if (!result.success) {
        // Get user-friendly error message
        const errorMessage = result.errorCode 
          ? BookingErrorMessages[result.errorCode as BookingErrorCode] || result.errorMessage
          : result.errorMessage

        throw new Error(errorMessage || "Failed to create booking")
      }

      const bookingId = result.bookingId!
      setCreatedBookingId(bookingId)

      // Insert Services using supabase directly (or could add to booking-service)
      if (selectedServices.length > 0 && bookingId) {
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
        await supabase.from('booking_services').insert(bookingServices)
      }

      toast({
        title: "Booking created!",
        description: `Reference: ${result.bookingReference}`,
      })

      setShowPayment(true)
    } catch (err: any) {
      console.error('Booking error:', err)
      toast({ 
        title: "Booking failed", 
        description: err.message, 
        variant: "destructive" 
      })
      
      // Re-check availability in case room was booked by someone else
      setRoomAvailable(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Render Helpers ---

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  // --- Payment View ---
  if (showPayment && createdBookingId) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-8 lg:grid-cols-3"
      >
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Secure Payment
              </CardTitle>
              <CardDescription>Complete your reservation for {roomType.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <StripePaymentElementWrapper
                bookingId={createdBookingId}
                amount={Math.round(totals.total * 100)}
                currency="usd"
                customerEmail={user.email || undefined}
              />
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-6 flex justify-between rounded-b-xl">
              <Button variant="ghost" onClick={() => setShowPayment(false)}>Back to details</Button>
              {onCancel && <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onCancel}>Cancel Booking</Button>}
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-slate-200 shadow-md bg-slate-50/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground">Total Due</span>
                 <span className="text-xl font-bold text-primary">{formatCurrency(totals.total)}</span>
               </div>
               <Separator />
               <div className="text-xs text-muted-foreground">
                 Payment is processed securely via Stripe. Your card information is not stored on our servers.
               </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    )
  }

  // --- Booking Form View ---
  return (
    <div className="grid gap-8 lg:grid-cols-3 items-start">
      
      {/* Left Column: The Form */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="lg:col-span-2 space-y-6"
      >
        <form onSubmit={handleCreateBooking}>
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-display">Reservation Details</CardTitle>
              <CardDescription>Customize your stay at Royal Elegance</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8">
              
              {/* 1. Dates Section - High Contrast Update */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" /> Dates
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn" className="text-sm font-semibold text-slate-700">
                      Check-in Date
                    </Label>
                    <div className="relative">
                      <Input
                        id="checkIn"
                        type="date"
                        className="pl-2.5 h-12 bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all font-medium shadow-sm"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut" className="text-sm font-semibold text-slate-700">
                      Check-out Date
                    </Label>
                    <div className="relative">
                      <Input
                        id="checkOut"
                        type="date"
                        className={`pl-2.5 h-12 bg-slate-50 text-slate-900 transition-all font-medium shadow-sm ${dateError ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:bg-white focus:border-primary'}`}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        min={checkIn || new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                  </div>
                </div>
                {dateError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{dateError}</AlertDescription>
                  </Alert>
                )}

                {/* Availability Status Indicator */}
                {checkIn && checkOut && !dateError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border transition-all duration-300">
                    {isCheckingAvailability ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Checking availability...</span>
                      </>
                    ) : roomAvailable === true ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">Room available for selected dates</span>
                      </>
                    ) : roomAvailable === false ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600 font-medium">{availabilityError || 'Room not available'}</span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <Separator />

              {/* 2. Guests Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Guests
                </h3>
                
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div>
                    <Label className="text-base font-semibold text-slate-900">Adults & Children</Label>
                    <p className="text-sm text-muted-foreground">Max occupancy: {roomType.maxOccupancy}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleGuestChange(-1)}
                      disabled={guests <= 1}
                      className="h-8 w-8 rounded-md hover:bg-slate-100"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-lg text-slate-900">{guests}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleGuestChange(1)}
                      disabled={guests >= roomType.maxOccupancy}
                      className="h-8 w-8 rounded-md hover:bg-slate-100"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 3. Services Section (Scrollable) */}
              <AnimatePresence>
                {services.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <Separator />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Upgrades & Services
                    </h3>
                    
                    {/* SCROLLABLE CONTAINER */}
                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid gap-4 md:grid-cols-2">
                        {services.map((service) => {
                          const isSelected = selectedServices.includes(service.id)
                          return (
                            <div
                              key={service.id}
                              onClick={() => toggleService(service.id)}
                              className={`
                                relative p-4 border rounded-xl cursor-pointer transition-all duration-200 group
                                ${isSelected 
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                  : "border-slate-200 hover:border-primary/50 hover:shadow-md bg-white"
                                }
                              `}
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className={`font-medium ${isSelected ? "text-primary" : "text-slate-900"}`}>
                                    {service.name}
                                  </p>
                                  <p className="text-sm font-semibold text-slate-700">
                                    {formatCurrency(service.price)}
                                  </p>
                                </div>
                                <div className={`
                                  w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                  ${isSelected ? "bg-primary border-primary" : "border-slate-300 group-hover:border-primary"}
                                `}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </CardContent>
            
            <CardFooter className="bg-slate-50/50 p-6 rounded-b-xl flex flex-col sm:flex-row gap-4 border-t">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:flex-1 font-semibold text-base h-12 shadow-lg hover:shadow-xl transition-all"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Creating Booking...
                  </>
                ) : isCheckingAvailability ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Checking Availability...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
              
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg"
                  onClick={onCancel}
                  className="w-full sm:w-auto h-12"
                >
                  Cancel
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </motion.div>

      {/* Right Column: Sticky Summary */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="lg:col-span-1"
      >
        <Card className="sticky top-24 border-border/60 shadow-lg overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="bg-slate-50/50 pb-4 border-b">
            <CardTitle className="text-lg">Booking Summary</CardTitle>
            <CardDescription>Review your trip details</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            
            {/* Room Info */}
            <div className="space-y-1">
              <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">Room {room.roomNumber}</Badge>
              <h3 className="font-bold text-xl text-slate-900 leading-tight">{roomType.name}</h3>
              <p className="text-sm text-muted-foreground">Max {roomType.maxOccupancy} Guests</p>
            </div>

            {checkIn && checkOut && !dateError ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 bg-slate-50 rounded-lg space-y-3 text-sm border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Dates</span>
                    <span className="font-medium text-slate-900">
                      {new Date(checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-slate-900">{nights} Nights</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Guests</span>
                    <span className="font-medium text-slate-900">{guests}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room rate</span>
                    <span>{formatCurrency(totals.room)}</span>
                  </div>
                  
                  {selectedServices.map((id) => {
                    const s = services.find(serv => serv.id === id)
                    return (
                      <div key={id} className="flex justify-between text-emerald-600">
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {s?.name}</span>
                        <span>{s ? formatCurrency(s.price) : 0}</span>
                      </div>
                    )
                  })}
                  
                  <div className="flex justify-between text-muted-foreground text-xs pt-2">
                    <span>Taxes & Fees</span>
                    <span>Included</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Select dates to see pricing
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}