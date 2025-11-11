"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { getBookings, getRooms } from "@/lib/supabase-service"
import type { Booking, Room } from "@/lib/types"
import { AdminNav } from "@/components/layout/admin-nav"
import { StatsCard } from "@/components/dashboard/stats-card"
import { BookingList } from "@/components/dashboard/booking-list"
import { RoomStatusOverview } from "@/components/dashboard/room-status-overview"
import { BookingCalendar } from "@/components/admin/booking-calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, Building2 } from "lucide-react"

interface UserProfile {
  role: string | null
}

export default function StaffPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/")
          return
        }
        setUser(user)

        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (!profileData || profileData.role !== "staff") {
          router.push("/")
          return
        }

        setProfile(profileData)
      } catch (error) {
        console.error("Error loading user:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.push("/")
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  useEffect(() => {
    if (profile?.role === "staff") {
      const fetchAll = async () => {
        try {
          // Fetch all bookings directly with authenticated client
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select("*")
            .order("created_at", { ascending: false })

          if (bookingsError) throw bookingsError

          // Convert timestamps
          const convertedBookings = bookingsData.map((booking: any) => ({
            ...booking,
            id: booking.id,
            createdAt: new Date(booking.created_at),
            updatedAt: new Date(booking.updated_at),
            checkInDate: new Date(booking.check_in_date),
            checkOutDate: new Date(booking.check_out_date),
            checkIn: new Date(booking.check_in_date), // Backward compatibility
            checkOut: new Date(booking.check_out_date), // Backward compatibility
            floorId: booking.floor_id,
            roomTypeId: booking.room_type_id,
            roomId: booking.room_id,
            userId: booking.user_id,
            guestName: booking.guest_name,
            guestEmail: booking.guest_email,
            guestPhone: booking.guest_phone,
            guestCount: booking.guest_count,
            guests: booking.guest_count, // Backward compatibility
            bookingReference: booking.booking_reference,
            paymentMethod: booking.payment_method,
            paidAmount: booking.paid_amount,
            paymentStatus: booking.payment_status,
            bookingType: booking.room_id ? 'room' : 'service',
            totalPrice: booking.total_price,
            status: booking.status,
            services: booking.services || [],
          })) as Booking[]

          const roomsData = await getRooms()
          setBookings(convertedBookings)
          setRooms(roomsData)
          console.log("Staff loaded bookings:", convertedBookings.length)
        } catch (error) {
          console.error("Error fetching staff data:", error)
        }
      }
      fetchAll()
    }
  }, [profile, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
        <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile || profile.role !== "staff") {
    return null
  }

  // Calculate statistics
  const todayBookings = bookings.filter((b) => {
    const today = new Date()
    const checkIn = new Date(b.checkIn)
    return (
      checkIn.getDate() === today.getDate() &&
      checkIn.getMonth() === today.getMonth() &&
      checkIn.getFullYear() === today.getFullYear()
    )
  }).length

  const pendingBookings = bookings.filter((b) => b.status === "pending").length
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="glass-card border-0 animate-fade-in">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="glass-banner border-0 p-6 rounded-lg animate-fade-in-up">
              <h2 className="text-4xl font-display font-bold mb-2 text-slate-900">Staff Dashboard</h2>
              <p className="text-muted-foreground text-lg">Manage daily operations and guest services</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div style={{ animationDelay: '0s' }}>
                <StatsCard
                  title="Today's Check-ins"
                  value={todayBookings}
                  description="Guests arriving today"
                  icon={Calendar}
                />
              </div>
              <div style={{ animationDelay: '0.1s' }}>
                <StatsCard
                  title="Pending Bookings"
                  value={pendingBookings}
                  description="Awaiting confirmation"
                  icon={Users}
                />
              </div>
              <div style={{ animationDelay: '0.2s' }}>
                <StatsCard
                  title="Occupied Rooms"
                  value={occupiedRooms}
                  description={`Out of ${rooms.length} total`}
                  icon={Building2}
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BookingList limit={10} />
              </div>
              <div className="lg:col-span-1">
                <RoomStatusOverview />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <BookingList />
          </TabsContent>

          <TabsContent value="calendar">
            <BookingCalendar />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
