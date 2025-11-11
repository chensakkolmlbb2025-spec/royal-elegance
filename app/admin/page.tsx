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
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { RoomStatusOverview } from "@/components/dashboard/room-status-overview"
import { FloorManagement } from "@/components/admin/floor-management"
import { RoomTypeManagement } from "@/components/admin/room-type-management"
import { RoomManagement } from "@/components/admin/room-management"
import { ServiceManagement } from "@/components/admin/service-management"
import { ServiceCategoryManagement } from "@/components/admin/service-category-management"
import { UserManagement } from "@/components/admin/user-management"
import { RoomAvailabilityChecker } from "@/components/booking/room-availability-checker"
import { BookingCalendar } from "@/components/admin/booking-calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, DollarSign, Users, Calendar } from "lucide-react"
import { SeedDatabaseButton } from "@/components/admin/seed-database-button"

interface UserProfile {
  role: string | null
}

export default function AdminPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [dataLoading, setDataLoading] = useState(true)

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

        if (!profileData || profileData.role !== "admin") {
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
    if (profile?.role === "admin") {
      const fetchData = async () => {
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
          console.log("Admin loaded bookings:", convertedBookings.length)
        } catch (error) {
          console.error("Error fetching admin data:", error)
        } finally {
          setDataLoading(false)
        }
      }
      fetchData()
    }
  }, [profile, supabase])

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
        <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile || profile.role !== "admin") {
    return null
  }

  // Calculate statistics
  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length
  const totalRevenue = bookings.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.totalPrice, 0)
  const occupancyRate =
    rooms.length > 0 ? Math.round((rooms.filter((r) => r.status === "occupied").length / rooms.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="glass-card border-0 animate-fade-in">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="floors">Floors</TabsTrigger>
            <TabsTrigger value="room-types">Room Types</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="service-categories">Categories</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center justify-between glass-banner border-0 p-6 rounded-lg animate-fade-in-up">
              <div>
                <h2 className="text-4xl font-display font-bold mb-2 text-slate-900">Admin Dashboard</h2>
                <p className="text-muted-foreground text-lg">Overview of your hotel operations</p>
              </div>
              <SeedDatabaseButton />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div style={{ animationDelay: '0s' }}>
                <StatsCard
                  title="Total Bookings"
                  value={totalBookings}
                  description="All time bookings"
                  icon={Calendar}
                  trend={{ value: 12, isPositive: true }}
                />
              </div>
              <div style={{ animationDelay: '0.1s' }}>
                <StatsCard
                  title="Confirmed Bookings"
                  value={confirmedBookings}
                  description="Active reservations"
                  icon={Users}
                  trend={{ value: 8, isPositive: true }}
                />
              </div>
              <div style={{ animationDelay: '0.2s' }}>
                <StatsCard
                  title="Total Revenue"
                  value={`$${totalRevenue.toLocaleString()}`}
                  description="All time revenue"
                  icon={DollarSign}
                  trend={{ value: 15, isPositive: true }}
                />
              </div>
              <div style={{ animationDelay: '0.3s' }}>
                <StatsCard
                  title="Occupancy Rate"
                  value={`${occupancyRate}%`}
                  description="Current occupancy"
                  icon={Building2}
                  trend={{ value: 5, isPositive: true }}
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RevenueChart />
              </div>
              <div className="lg:col-span-1">
                <RoomStatusOverview />
              </div>
            </div>

            <BookingList limit={10} bookings={bookings} rooms={rooms} />
          </TabsContent>

          <TabsContent value="floors">
            <FloorManagement />
          </TabsContent>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          <TabsContent value="room-types">
            <RoomTypeManagement />
          </TabsContent>
          <TabsContent value="rooms">
            <RoomManagement />
          </TabsContent>
          <TabsContent value="service-categories">
            <ServiceCategoryManagement />
          </TabsContent>
          <TabsContent value="services">
            <ServiceManagement />
          </TabsContent>
          <TabsContent value="availability">
            <RoomAvailabilityChecker />
          </TabsContent>
          <TabsContent value="calendar">
            <BookingCalendar />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
