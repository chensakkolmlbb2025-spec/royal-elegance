"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { getRooms } from "@/lib/supabase-service"
import type { Booking, Room } from "@/lib/types"

// Icons
import { 
  LayoutDashboard, 
  CalendarDays, 
  BedDouble, 
  LogOut, 
  Menu, 
  Plus, 
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  ClipboardList
} from "lucide-react"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Loading from "@/components/ui/loading"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// System Components
import { BookingCleanupProvider } from "@/components/system/booking-cleanup-provider"

// Existing Components (Preserved)
import { BookingList } from "@/components/dashboard/booking-list"
import { RoomStatusOverview } from "@/components/dashboard/room-status-overview"
import { BookingCalendar } from "@/components/admin/booking-calendar"
import { BookingManagement } from "@/components/admin/booking-management"
import { checkInBooking, checkOutBooking, getRoomTypes } from "@/lib/supabase-service"
import type { RoomType } from "@/lib/types"

// --- 1. Custom Hook for Data Logic ---
const useStaffData = (user: SupabaseUser | null) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })

        if (bookingsError) throw bookingsError

        // Transformation Logic
        const convertedBookings = bookingsData.map((booking: any) => ({
          ...booking,
          id: booking.id,
          roomId: booking.room_id,
          roomTypeId: booking.room_type_id,
          userId: booking.user_id,
          bookingReference: booking.booking_reference,
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at),
          checkInDate: new Date(booking.check_in_date),
          checkOutDate: new Date(booking.check_out_date),
          checkIn: new Date(booking.check_in_date),
          checkOut: new Date(booking.check_out_date),
          status: booking.status,
          totalPrice: booking.total_price,
          roomPrice: booking.room_price,
          servicesPrice: booking.services_price || 0,
          guestName: booking.guest_name,
          guestEmail: booking.guest_email,
          guestPhone: booking.guest_phone,
          guestCount: booking.guest_count || 1,
          guests: booking.guest_count || 1, // Add guests field for compatibility
          paymentStatus: booking.payment_status,
          paymentMethod: booking.payment_method,
          specialRequests: booking.special_requests,
          internalNotes: booking.internal_notes,
        })) as Booking[]

        const roomsData = await getRooms()
        setBookings(convertedBookings)
        setRooms(roomsData)
      } catch (error) {
        console.error("Error fetching staff data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, supabase])

  // Memoized Stats
  const stats = useMemo(() => {
    const today = new Date()
    const todayBookings = bookings.filter((b) => {
      const checkIn = new Date(b.checkIn)
      return (
        checkIn.getDate() === today.getDate() &&
        checkIn.getMonth() === today.getMonth() &&
        checkIn.getFullYear() === today.getFullYear()
      )
    }).length

    const pendingBookings = bookings.filter((b) => b.status === "pending").length
    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length
    const dirtyRooms = rooms.filter((r) => r.status === "maintenance").length

    return { todayBookings, pendingBookings, occupiedRooms, dirtyRooms }
  }, [bookings, rooms])

  return { bookings, rooms, loading, stats }
}

// --- 2. Sub-Components ---

const StatCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between"
  >
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon className="w-6 h-6" />
    </div>
  </motion.div>
)

const QuickActionButton = ({ icon: Icon, label, onClick }: any) => (
  <Button 
    variant="outline" 
    className="h-auto flex-col gap-2 py-4 px-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
    onClick={onClick}
  >
    <Icon className="w-5 h-5" />
    <span className="text-xs font-medium">{label}</span>
  </Button>
)

// --- 3. Main Page Component ---

export default function StaffPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [checkInDialog, setCheckInDialog] = useState(false)
  const [checkOutDialog, setCheckOutDialog] = useState(false)
  const [scanDialog, setScanDialog] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState("")
  const [scanCode, setScanCode] = useState("")
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      const { data }: { data: { user: SupabaseUser | null } } = await supabase.auth.getUser()
      const u = (data as any)?.user ?? null

      if (u) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .single()

        if (profile?.role !== "staff") {
          router.push("/")
          return
        }
        setUser(u)
        return
      }

      // Grace period: wait briefly for auth state change before redirecting
      let redirected = false
      const timer = setTimeout(() => {
        if (!redirected) router.push("/")
      }, 800)

      const { data: subData } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
        const sUser = session?.user ?? null
        if (!sUser) return
        redirected = true
        clearTimeout(timer)

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", sUser.id)
          .single()

        if (profile?.role !== "staff") {
          router.push("/")
          return
        }
        setUser(sUser)
      })

      const subscription = (subData as any)?.subscription ?? subData
      return () => {
        clearTimeout(timer)
        subscription?.unsubscribe?.()
      }
    }

    const maybeCleanup = checkAuth()
    return () => {
      if (typeof (maybeCleanup as any) === 'function') (maybeCleanup as any)()
    }
  }, [supabase, router])

  const { bookings, rooms, loading, stats } = useStaffData(user)

  // Memoize filtered bookings lists
  const checkInEligibleBookings = useMemo(() => 
    bookings.filter(b => b.status === "confirmed" || b.status === "pending"),
    [bookings]
  )

  const checkOutEligibleBookings = useMemo(() => 
    bookings.filter(b => b.status === "checked_in"),
    [bookings]
  )

  // Quick action handlers
  const handleCheckIn = async () => {
    if (!user) return
    
    if (!selectedBookingId) {
      toast({
        title: "Error",
        description: "Please select a booking to check in",
        variant: "destructive"
      })
      return
    }

    try {
      await checkInBooking(selectedBookingId, user.id)
      toast({
        title: "Success",
        description: "Guest checked in successfully"
      })
      setCheckInDialog(false)
      setSelectedBookingId("")
      // Refresh data
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check in guest",
        variant: "destructive"
      })
    }
  }

  const handleCheckOut = async () => {
    if (!user) return
    
    if (!selectedBookingId) {
      toast({
        title: "Error",
        description: "Please select a booking to check out",
        variant: "destructive"
      })
      return
    }

    try {
      await checkOutBooking(selectedBookingId, user.id)
      toast({
        title: "Success",
        description: "Guest checked out successfully. Room is now available."
      })
      setCheckOutDialog(false)
      setSelectedBookingId("")
      // Refresh data
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check out guest",
        variant: "destructive"
      })
    }
  }

  const handleScanPass = async () => {
    if (!user) return
    
    if (!scanCode) {
      toast({
        title: "Error",
        description: "Please enter a booking reference",
        variant: "destructive"
      })
      return
    }

    try {
      // Find booking by reference
      const booking = bookings.find(b => 
        b.bookingReference?.toLowerCase() === scanCode.toLowerCase()
      )

      if (!booking) {
        toast({
          title: "Not Found",
          description: "No booking found with this reference",
          variant: "destructive"
        })
        return
      }

      // Auto check-in if booking is confirmed
      if (booking.status === "confirmed" || booking.status === "pending") {
        await checkInBooking(booking.id, user.id)
        toast({
          title: "Success",
          description: `Guest ${booking.guestName} checked in successfully`
        })
        setScanDialog(false)
        setScanCode("")
        window.location.reload()
      } else {
        toast({
          title: "Cannot Check In",
          description: `Booking status: ${booking.status}`,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process scan",
        variant: "destructive"
      })
    }
  }

  if (loading || !user) return <Loading message="Preparing staff workspace..." size="lg" />

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Staff<span className="text-primary">Portal</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Operations Center</p>
      </div>
      
      <div className="flex-1 px-4 space-y-2">
        <Button 
          variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 h-12 text-base font-normal"
          onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false) }}
        >
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </Button>
        <Button 
          variant={activeTab === "bookings" ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 h-12 text-base font-normal"
          onClick={() => { setActiveTab("bookings"); setIsSidebarOpen(false) }}
        >
          <ClipboardList className="w-5 h-5" /> All Bookings
        </Button>
        <Button 
          variant={activeTab === "calendar" ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 h-12 text-base font-normal"
          onClick={() => { setActiveTab("calendar"); setIsSidebarOpen(false) }}
        >
          <CalendarDays className="w-5 h-5" /> Calendar
        </Button>
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">ST</span>
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
            <p className="text-xs text-slate-500">Staff Member</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={async () => {
             await supabase.auth.signOut()
             router.push("/")
          }}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <BookingCleanupProvider>
      <div className="min-h-screen bg-slate-50/80 flex font-sans text-slate-900">
        
        {/* Desktop Sidebar */}
        <aside className="hidden xl:block w-64 bg-white border-r border-slate-200 fixed inset-y-0 z-30">
          <SidebarContent />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 xl:pl-64 flex flex-col min-h-screen">
          
          {/* Mobile / Tablet Header */}
          <header className="xl:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
            <span className="font-bold text-lg">StaffPortal</span>
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="w-6 h-6" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Top Bar: Page Title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {activeTab === 'dashboard' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <p className="text-slate-500 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Render Active Tab with Animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Quick Actions Toolbar */}
                  <section>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <QuickActionButton icon={Plus} label="New Booking" onClick={() => setActiveTab('bookings')} />
                      <QuickActionButton icon={CheckCircle2} label="Check-In" onClick={() => setCheckInDialog(true)} />
                      <QuickActionButton icon={LogOut} label="Check-Out" onClick={() => setCheckOutDialog(true)} />
                      <QuickActionButton icon={QrCode} label="Scan Pass" onClick={() => setScanDialog(true)} />
                    </div>
                  </section>

                  {/* Stats Grid */}
                  <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                      title="Arrivals Today" 
                      value={stats.todayBookings} 
                      subtext="Guests checking in"
                      icon={CalendarDays} 
                      colorClass="bg-blue-50 text-blue-600" 
                    />
                    <StatCard 
                      title="Pending" 
                      value={stats.pendingBookings} 
                      subtext="Needs confirmation"
                      icon={AlertCircle} 
                      colorClass="bg-amber-50 text-amber-600" 
                    />
                    <StatCard 
                      title="Occupancy" 
                      value={stats.occupiedRooms} 
                      subtext="Rooms occupied"
                      icon={BedDouble} 
                      colorClass="bg-emerald-50 text-emerald-600" 
                    />
                    <StatCard 
                      title="Maintenance" 
                      value={stats.dirtyRooms} 
                      subtext="Rooms to clean"
                      icon={ClipboardList} 
                      colorClass="bg-rose-50 text-rose-600" 
                    />
                  </section>

                  {/* Main Split View */}
                  <div className="grid gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
                      <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Recent Bookings</CardTitle>
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => setActiveTab("bookings")}>View All</Button>
                        </div>
                        <CardDescription>Latest reservations requiring attention</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-auto">
                          <BookingList limit={5} bookings={bookings} rooms={rooms} />
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border-slate-200 shadow-sm h-fit">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Room Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <RoomStatusOverview />
                        </CardContent>
                      </Card>
                      
                      {/* Staff Notice Board */}
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-md">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400" /> Shift Notice
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300">
                          Please ensure Room 302 is prioritized for cleaning before 2 PM. VIP guest arrival.
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'bookings' && (
                <BookingManagement />
              )}

              {activeTab === 'calendar' && (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="pt-6">
                    <BookingCalendar />
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Check-In Dialog */}
      <Dialog open={checkInDialog} onOpenChange={setCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Check-In</DialogTitle>
            <DialogDescription>
              Select a booking to check in the guest
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Booking</Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a booking..." />
                </SelectTrigger>
                <SelectContent>
                  {checkInEligibleBookings.length === 0 ? (
                    <SelectItem value="none" disabled>No eligible bookings</SelectItem>
                  ) : (
                    checkInEligibleBookings.map(booking => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.guestName} - {booking.bookingReference} (Room {rooms.find(r => r.id === booking.roomId)?.roomNumber || 'N/A'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialog(false)}>Cancel</Button>
            <Button onClick={handleCheckIn} disabled={!selectedBookingId}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={checkOutDialog} onOpenChange={setCheckOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Check-Out</DialogTitle>
            <DialogDescription>
              Select a booking to check out the guest
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Booking</Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a booking..." />
                </SelectTrigger>
                <SelectContent>
                  {checkOutEligibleBookings.length === 0 ? (
                    <SelectItem value="none" disabled>No checked-in guests</SelectItem>
                  ) : (
                    checkOutEligibleBookings.map(booking => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.guestName} - Room {rooms.find(r => r.id === booking.roomId)?.roomNumber || 'N/A'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutDialog(false)}>Cancel</Button>
            <Button onClick={handleCheckOut} disabled={!selectedBookingId}>
              <LogOut className="w-4 h-4 mr-2" />
              Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Pass Dialog */}
      <Dialog open={scanDialog} onOpenChange={setScanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Booking Pass</DialogTitle>
            <DialogDescription>
              Enter the booking reference code to quickly check in a guest
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Reference</Label>
              <Input 
                placeholder="Enter booking reference (e.g., BK-12345)"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanPass()}
                className="font-mono uppercase"
              />
              <p className="text-xs text-slate-500">
                Tip: Guests can find this on their confirmation email
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialog(false)}>Cancel</Button>
            <Button onClick={handleScanPass} disabled={!scanCode}>
              <QrCode className="w-4 h-4 mr-2" />
              Process Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </BookingCleanupProvider>
  )
}