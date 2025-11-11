"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { getBookings, getBookingsByUser, getRooms, getRoomTypes, getServices } from "@/lib/supabase-service"
import type { Booking, Room, RoomType, Service } from "@/lib/types"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Hotel, Sparkles, Calendar, Users, DollarSign, Copy, Check, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

function BookingConfirmationContent() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const bookingId = searchParams.get("id")

  const [booking, setBooking] = useState<Booking | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [copiedRef, setCopiedRef] = useState(false)

  // Initialize auth
  useEffect(() => {
    const supabase = createClient()
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
      if (!user) {
        router.push("/")
      }
    })

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Fetch booking data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const supabase = createClient()
        
        console.log("Fetching booking confirmation for ID:", bookingId)
        
        // Fetch booking directly with authenticated client for RLS
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single()

        if (bookingError) {
          console.error("Booking fetch error:", bookingError)
          throw bookingError
        }

        if (!bookingData) {
          console.error("No booking data returned for ID:", bookingId)
          throw new Error("Booking not found")
        }

        console.log("Fetched booking from database:", bookingData)

        // Convert timestamps and field names
        const targetBooking: Booking = {
          id: bookingData.id,
          bookingReference: bookingData.booking_reference,
          userId: bookingData.user_id,
          guestName: bookingData.guest_name,
          guestEmail: bookingData.guest_email,
          guestPhone: bookingData.guest_phone,
          guestCount: bookingData.guest_count,
          guests: bookingData.guest_count,
          roomId: bookingData.room_id,
          roomTypeId: bookingData.room_type_id,
          checkInDate: new Date(bookingData.check_in_date),
          checkOutDate: new Date(bookingData.check_out_date),
          checkIn: new Date(bookingData.check_in_date), // Backward compatibility
          checkOut: new Date(bookingData.check_out_date), // Backward compatibility
          status: bookingData.status,
          roomPrice: bookingData.room_price,
          servicesPrice: bookingData.services_price,
          totalPrice: bookingData.total_price,
          paymentStatus: bookingData.payment_status,
          paymentMethod: bookingData.payment_method,
          paidAmount: bookingData.paid_amount,
          bookingType: bookingData.room_id ? 'room' : 'service',
          createdAt: new Date(bookingData.created_at),
          updatedAt: bookingData.updated_at ? new Date(bookingData.updated_at) : undefined,
          services: bookingData.services || [],
        }

        console.log("Converted booking:", targetBooking)
        setBooking(targetBooking)

        // Fetch related data
        const [allRooms, allRoomTypes, allServices] = await Promise.all([
          getRooms(),
          getRoomTypes(),
          getServices(),
        ])

        setRooms(allRooms)
        setRoomTypes(allRoomTypes)
        setServices(allServices)

      } catch (error) {
        console.error("Error fetching booking data:", error)
        toast({
          title: "Error",
          description: "Failed to load booking confirmation.",
          variant: "destructive",
        })
      } finally {
        setLoadingData(false)
      }
    }

    if (user && bookingId) {
      fetchData()
    }
  }, [user, bookingId, toast])

  const handleCopyReference = () => {
    if (booking?.bookingReference) {
      navigator.clipboard.writeText(booking.bookingReference)
      setCopiedRef(true)
      toast({
        title: "Copied!",
        description: "Booking reference copied to clipboard.",
      })
      setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
        <PremiumNavbar />
        <main className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
          <Card className="glass-card max-w-2xl mx-auto border-0 animate-fade-in-scale">
            <CardContent className="pt-6 text-center space-y-4 bg-white/95">
              <AlertCircle className="w-16 h-16 mx-auto text-amber-500" />
              <h2 className="text-2xl font-bold">Booking Not Found</h2>
              <p className="text-muted-foreground">
                {bookingId 
                  ? `We couldn't find booking ID: ${bookingId}. It may still be processing.`
                  : "No booking ID provided."}
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </Button>
                <Link href="/bookings">
                  <Button variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Bookings
                  </Button>
                </Link>
                <Link href="/rooms">
                  <Button className="glass-button hover:border-[#d4af37]">
                    <Hotel className="w-4 h-4 mr-2" />
                    Browse Rooms
                  </Button>
                </Link>
                <Link href="/services">
                  <Button variant="outline" className="glass-button hover:border-[#d4af37]">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Browse Services
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const room = booking.roomId ? rooms.find((r) => r.id === booking.roomId) : null
  const roomType = room ? roomTypes.find((rt) => rt.id === room.roomTypeId) : null
  const bookingServices = booking.services.length > 0 ? services.filter((s) => booking.services.includes(s.id)) : []

  const isRoomBooking = booking.bookingType === "room" || booking.bookingType === "both"
  const isServiceBooking = booking.bookingType === "service" || booking.bookingType === "both"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <PremiumNavbar />
      <main className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
        <Card className="glass-banner max-w-3xl mx-auto border-0 animate-fade-in-scale">
          <CardHeader className="text-center bg-gradient-to-br from-white/95 to-background-accent/20">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full glass flex items-center justify-center animate-pulse border-2 border-[#d4af37]/30">
                <CheckCircle2 className="w-12 h-12 text-[#d4af37]" />
              </div>
            </div>
            <CardTitle className="text-4xl font-display bg-gradient-to-r from-[#d4af37] to-[#f4d03f] bg-clip-text text-transparent">
              Booking Confirmed!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Your reservation has been successfully created. We look forward to welcoming you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booking Reference */}
            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
                  <p className="text-2xl font-mono font-bold">{booking.bookingReference}</p>
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyReference}>
                  {copiedRef ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Please save this reference number for your records
              </p>
            </div>

            {/* Booking Type Badge */}
            <div className="flex items-center justify-center gap-2">
              {isRoomBooking && (
                <Badge className="bg-blue-500/20 text-blue-700 gap-1">
                  <Hotel className="w-3 h-3" />
                  Room Booking
                </Badge>
              )}
              {isServiceBooking && (
                <Badge className="bg-purple-500/20 text-purple-700 gap-1">
                  <Sparkles className="w-3 h-3" />
                  Service Booking
                </Badge>
              )}
              <Badge className="bg-green-500/20 text-green-700 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Confirmed
              </Badge>
            </div>

            {/* Room Details */}
            {isRoomBooking && roomType && (
              <div className="glass p-6 rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-xl flex items-center gap-2">
                      <Hotel className="w-5 h-5" />
                      {roomType.name}
                    </h3>
                    {room && <p className="text-sm text-muted-foreground mt-1">Room {room.roomNumber}</p>}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Check-in</p>
                      <p className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">After 3:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Check-out</p>
                      <p className="font-semibold">{new Date(booking.checkOut).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Before 11:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Guests</p>
                      <p className="font-semibold">{booking.guests}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Room Price</p>
                      <p className="font-semibold text-lg">${roomType.basePrice}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Details */}
            {isServiceBooking && bookingServices.length > 0 && (
              <div className="glass p-6 rounded-lg space-y-4">
                <h3 className="font-semibold text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {booking.bookingType === "service" ? "Service Booking" : "Additional Services"}
                </h3>

                <Separator />

                <div className="space-y-3">
                  {bookingServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                        <Badge className="mt-1 capitalize text-xs">{service.category}</Badge>
                      </div>
                      <p className="font-semibold text-lg">${service.price}</p>
                    </div>
                  ))}
                </div>

                {booking.bookingType === "service" && (
                  <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Service Date</p>
                        <p className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Guests</p>
                        <p className="font-semibold">{booking.guests}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Total Price */}
            <div className="glass p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="text-xs text-muted-foreground mt-1">Payment Status: {booking.paymentStatus}</p>
                </div>
                <p className="text-3xl font-bold text-primary">${booking.totalPrice}</p>
              </div>
            </div>

            {/* Important Information */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-muted-foreground">A confirmation email has been sent to your registered email address</p>
              </div>
              {isRoomBooking && (
                <>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <p className="text-muted-foreground">Check-in time is after 3:00 PM on your arrival date</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <p className="text-muted-foreground">Check-out time is before 11:00 AM on your departure date</p>
                  </div>
                </>
              )}
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-muted-foreground">Free cancellation up to 24 hours before your booking</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid gap-3 md:grid-cols-3 pt-4">
              <Link href="/bookings" className="md:col-span-1">
                <Button variant="default" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  View My Bookings
                </Button>
              </Link>
              <Link href="/rooms" className="md:col-span-1">
                <Button variant="outline" className="w-full">
                  <Hotel className="w-4 h-4 mr-2" />
                  Browse Rooms
                </Button>
              </Link>
              <Link href="/services" className="md:col-span-1">
                <Button variant="outline" className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Browse Services
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BookingConfirmationContent />
    </Suspense>
  )
}
