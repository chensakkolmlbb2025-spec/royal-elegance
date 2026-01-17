# Admin Dashboard Code Implementation Guide

## 📝 Complete Code Walkthrough

### **File Structure**

```
app/
├─ admin/
│  └─ page.tsx              ← Main admin dashboard page
│
components/
├─ admin/
│  ├─ dashboard/
│  │  ├─ stats-card.tsx     ← Stats display card
│  │  ├─ revenue-chart.tsx  ← Revenue visualization
│  │  ├─ room-status.tsx    ← Room status overview
│  │  └─ booking-list.tsx   ← Recent bookings list
│  │
│  ├─ user-management.tsx    ← User CRUD operations
│  ├─ booking-management.tsx ← Booking CRUD operations
│  ├─ room-management.tsx    ← Room CRUD operations
│  ├─ floor-management.tsx   ← Floor CRUD operations
│  ├─ service-management.tsx ← Service CRUD operations
│  └─ [other management components]
│
lib/
├─ supabase.ts              ← Supabase client
│
utils/
└─ admin.ts                 ← Admin utilities
```

---

## 🔍 Main Component: AdminPage

### **Imports**

```typescript
"use client"

// React & Next.js
import { useEffect, useState, useMemo, useCallback, memo } from "react"
import { useRouter } from "next/navigation"

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

// Icons (Lucide React)
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Layers,
  BedDouble,
  DoorOpen,
  Tags,
  ConciergeBell,
  CheckCircle2,
  CalendarDays,
  Menu,
  LogOut,
} from "lucide-react"

// Animation
import { motion, AnimatePresence } from "framer-motion"

// Admin Components
import StatsCard from "@/components/admin/dashboard/stats-card"
import RevenueChart from "@/components/admin/dashboard/revenue-chart"
import RoomStatusOverview from "@/components/admin/dashboard/room-status"
import BookingList from "@/components/admin/dashboard/booking-list"
import BookingManagement from "@/components/admin/booking-management"
import UserManagement from "@/components/admin/user-management"
import FloorManagement from "@/components/admin/floor-management"
import RoomTypeManagement from "@/components/admin/room-type-management"
import RoomManagement from "@/components/admin/room-management"
import ServiceCategoryManagement from "@/components/admin/service-category-management"
import ServiceManagement from "@/components/admin/service-management"
import RoomAvailabilityChecker from "@/components/admin/room-availability-checker"
import BookingCalendar from "@/components/admin/booking-calendar"

// Database & Types
import { createClient } from "@/lib/supabase"
import { getRooms } from "@/utils/admin"
import { Booking, Room, SupabaseUser } from "@/types"
import { Loading } from "@/components/ui/loading"
```

---

### **Menu Items Configuration**

```typescript
const MENU_ITEMS = [
  { 
    value: "dashboard", 
    label: "Overview", 
    icon: LayoutDashboard,
    description: "Dashboard overview and statistics"
  },
  { 
    value: "bookings", 
    label: "Bookings", 
    icon: ClipboardList,
    description: "Manage all bookings"
  },
  { 
    value: "users", 
    label: "User Management", 
    icon: Users,
    description: "Manage users and accounts"
  },
  { 
    value: "floors", 
    label: "Floors", 
    icon: Layers,
    description: "Manage building floors"
  },
  { 
    value: "room-types", 
    label: "Room Types", 
    icon: BedDouble,
    description: "Configure room types"
  },
  { 
    value: "rooms", 
    label: "Rooms", 
    icon: DoorOpen,
    description: "Manage individual rooms"
  },
  { 
    value: "service-categories", 
    label: "Categories", 
    icon: Tags,
    description: "Service category management"
  },
  { 
    value: "services", 
    label: "Services", 
    icon: ConciergeBell,
    description: "Manage services"
  },
  { 
    value: "availability", 
    label: "Availability", 
    icon: CheckCircle2,
    description: "Check room availability"
  },
  { 
    value: "calendar", 
    label: "Calendar", 
    icon: CalendarDays,
    description: "Booking calendar"
  },
]
```

---

### **Custom Hook: useAdminData**

```typescript
/**
 * STEP 1: Define custom hook for data fetching
 * 
 * Purpose:
 * - Fetch bookings from database
 * - Fetch rooms from database
 * - Transform data to match TypeScript types
 * - Calculate statistics
 * - Manage loading state
 */
const useAdminData = (user: SupabaseUser | null) => {
  // STATE VARIABLES
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  // CLIENT SETUP
  const supabase = createClient()

  // EFFECT: Fetch data when user exists
  useEffect(() => {
    // Guard: Only run if user is logged in
    if (!user) return

    const fetchData = async () => {
      try {
        // ===== STEP 2: FETCH BOOKINGS =====
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })

        // Error handling
        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError)
          throw bookingsError
        }

        // ===== STEP 3: TRANSFORM BOOKING DATA =====
        // Convert database row format to TypeScript interface
        const convertedBookings = bookingsData.map((booking: any) => ({
          // Keep original ID
          id: booking.id,
          
          // ---- DATE CONVERSIONS ----
          // Convert ISO strings to Date objects
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at),
          checkInDate: new Date(booking.check_in_date),
          checkOutDate: new Date(booking.check_out_date),
          
          // Also map with different naming convention
          checkIn: new Date(booking.check_in_date),
          checkOut: new Date(booking.check_out_date),
          
          // ---- DIRECT FIELD MAPPING ----
          status: booking.status,                // "confirmed", "pending", etc.
          totalPrice: booking.total_price,       // Booking cost
          guestName: booking.guest_name,         // Customer name
          guestEmail: booking.guest_email,       // Customer email
          guestPhone: booking.guest_phone,       // Customer phone
          guestCount: booking.guest_count,       // Number of guests
          guests: booking.guest_count,           // Alternative naming
          bookingReference: booking.booking_reference,  // Reference ID
          paymentStatus: booking.payment_status, // Payment status
          paidAmount: booking.paid_amount,       // Amount paid
          
          // ---- RELATIONSHIPS ----
          roomId: booking.room_id,               // Foreign key to rooms
          roomTypeId: booking.room_type_id,      // Foreign key to room types
          floorId: booking.floor_id,             // Foreign key to floors
          
          // ---- COMPUTED FIELDS ----
          bookingType: booking.room_id ? 'room' : 'service', // Determine type
          
        })) as Booking[]

        // ===== STEP 4: FETCH ROOMS =====
        const roomsData = await getRooms()

        // ===== STEP 5: UPDATE STATE =====
        // Update component state with fetched data
        setBookings(convertedBookings)
        setRooms(roomsData)
        
      } catch (error) {
        console.error("Error fetching admin data:", error)
        // Continue anyway - show partial data if available
      } finally {
        // Mark loading complete regardless of success/failure
        setLoading(false)
      }
    }

    // Execute async function
    fetchData()
    
  }, [user, supabase]) // Re-run if user or supabase client changes

  // ===== STEP 6: CALCULATE STATISTICS =====
  // Memoized to only recalculate when bookings/rooms change
  const stats = useMemo(() => {
    // STAT 1: Total bookings count
    const totalBookings = bookings.length
    
    // STAT 2: Confirmed bookings count
    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed"
    ).length
    
    // STAT 3: Total revenue
    // Sum of booking prices excluding cancelled bookings
    const totalRevenue = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
    
    // STAT 4: Occupancy rate
    // Percentage of occupied rooms out of total rooms
    const occupancyRate = rooms.length > 0 
      ? Math.round(
          (rooms.filter((r) => r.status === "occupied").length / rooms.length) * 100
        ) 
      : 0
    
    return { totalBookings, confirmedBookings, totalRevenue, occupancyRate }
  }, [bookings, rooms]) // Only recalc when these change

  // ===== STEP 7: RETURN HOOK DATA =====
  return { 
    bookings,      // Array of Booking objects
    rooms,         // Array of Room objects
    loading,       // Boolean: is data loading?
    stats,         // Stats object with 4 metrics
  }
}
```

---

### **Main Component: AdminPage**

```typescript
export default function AdminPage() {
  // ===== STATE VARIABLES =====
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // ===== CLIENT SETUP =====
  const router = useRouter()
  const supabase = createClient()

  // ===== FETCH ADMIN DATA =====
  const { 
    bookings, 
    rooms, 
    loading: dataLoading, 
    stats 
  } = useAdminData(user)

  // ===== AUTHENTICATION CHECK: EFFECT #1 =====
  /**
   * Purpose: Verify user is authenticated and has admin role
   * 
   * Flow:
   * 1. Try to get current user immediately
   * 2. If user exists, check role
   * 3. If no user, wait for auth state change (with timeout)
   * 4. Grant access only if role = "admin"
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ---- ATTEMPT 1: GET CURRENT USER ----
        // This will succeed if user already has valid session
        const { 
          data: { user: currentUser } 
        } = await supabase.auth.getUser()

        // If we got a user immediately
        if (currentUser) {
          // Query database for user's role
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUser.id)
            .single()

          if (error) {
            console.error("Error fetching profile:", error)
            router.push("/")
            return
          }

          // Check if user is admin
          if (profile?.role !== "admin") {
            // Not admin: deny access
            router.push("/")
            return
          }

          // Is admin: grant access
          setUser(currentUser)
          setIsAuthorized(true)
          setAuthLoading(false)
          return
        }

        // ---- ATTEMPT 2: WAIT FOR AUTH STATE CHANGE ----
        // If no user found immediately, subscribe to auth changes

        let redirected = false
        
        // Set safety timeout
        // If no session found within 800ms, redirect
        const timeoutId = setTimeout(() => {
          if (!redirected) {
            redirected = true
            router.push("/")
          }
        }, 800)

        // Subscribe to auth state changes
        // This listens for user login/logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: string, session: any) => {
            // Extract user from session
            const sessionUser = session?.user ?? null
            
            if (!sessionUser) return

            // Prevent double redirect
            redirected = true
            clearTimeout(timeoutId)

            // Validate admin role
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", sessionUser.id)
              .single()

            if (error) {
              router.push("/")
              return
            }

            // Check role
            if (profile?.role !== "admin") {
              router.push("/")
              return
            }

            // Grant access
            setUser(sessionUser)
            setIsAuthorized(true)
            setAuthLoading(false)
          }
        )

        // ---- CLEANUP ----
        return () => {
          clearTimeout(timeoutId)
          subscription?.unsubscribe?.()
        }

      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/")
      }
    }

    checkAuth()
  }, [supabase, router])

  // ===== SIGN OUT HANDLER =====
  const handleSignOut = useCallback(async () => {
    try {
      // Call Supabase sign out
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("Sign out error:", error)
        return
      }

      // Clear local state
      setUser(null)
      setIsAuthorized(false)

      // Redirect to home
      router.push("/")
    } catch (error) {
      console.error("Unexpected error during sign out:", error)
    }
  }, [supabase, router])

  // ===== RENDER CONTENT FUNCTION =====
  /**
   * Switches between tab contents based on activeTab
   * 
   * Returns JSX for:
   * - Dashboard overview (4 stats + charts)
   * - Management components (CRUD operations)
   */
  const renderContent = () => {
    switch (activeTab) {
      
      case "dashboard":
        // ===== DASHBOARD TAB =====
        // Display overview with stats and charts
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* STATS ROW: 4 cards */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Total Bookings */}
              <StatsCard
                title="Total Bookings"
                value={stats.totalBookings}
                description="Lifetime bookings"
                icon={CalendarDays}
                trend={{ value: 12, isPositive: true }}
              />

              {/* Card 2: Confirmed Bookings */}
              <StatsCard
                title="Confirmed"
                value={stats.confirmedBookings}
                description="Active reservations"
                icon={CheckCircle2}
                trend={{ value: 8, isPositive: true }}
              />

              {/* Card 3: Total Revenue */}
              <StatsCard
                title="Revenue"
                value={`$${stats.totalRevenue.toLocaleString()}`}
                description="Total earnings"
                icon={CalendarDays}
                trend={{ value: 15, isPositive: true }}
              />

              {/* Card 4: Occupancy Rate */}
              <StatsCard
                title="Occupancy"
                value={`${stats.occupancyRate}%`}
                description="Current status"
                icon={CheckCircle2}
                trend={{ value: 2, isPositive: true }}
              />
            </section>

            {/* CHARTS ROW */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Revenue Chart (2 cols wide) */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={bookings} />
                </CardContent>
              </Card>

              {/* Room Status (1 col wide) */}
              <Card>
                <CardHeader>
                  <CardTitle>Room Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <RoomStatusOverview data={rooms} />
                </CardContent>
              </Card>
            </div>

            {/* RECENT BOOKINGS */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-auto">
                  <BookingList 
                    limit={5} 
                    bookings={bookings} 
                    rooms={rooms}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      
      case "bookings":
        return <BookingManagement />
      
      case "users":
        return <UserManagement />
      
      case "floors":
        return <FloorManagement />
      
      case "room-types":
        return <RoomTypeManagement />
      
      case "rooms":
        return <RoomManagement />
      
      case "service-categories":
        return <ServiceCategoryManagement />
      
      case "services":
        return <ServiceManagement />
      
      case "availability":
        return <RoomAvailabilityChecker />
      
      case "calendar":
        return <BookingCalendar />
      
      default:
        return null
    }
  }

  // ===== RENDER: LOADING STATE =====
  if (authLoading || (isAuthorized && dataLoading)) {
    return (
      <Loading 
        message="Initializing Admin Dashboard..." 
        size="lg" 
      />
    )
  }

  // ===== RENDER: NOT AUTHORIZED =====
  // Return null if not authorized (will redirect in useEffect)
  if (!isAuthorized) return null

  // ===== RENDER: MAIN UI =====
  return (
    <div className="min-h-screen bg-slate-50/80 flex font-sans">
      
      {/* ===== DESKTOP SIDEBAR (Fixed) ===== */}
      <aside className="hidden xl:block w-64 bg-white border-r fixed inset-y-0">
        <div className="flex flex-col h-full">
          
          {/* SIDEBAR HEADER */}
          <div className="p-6">
            <h1 className="text-2xl font-bold">
              Admin<span className="text-primary">Panel</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Management Center</p>
          </div>

          {/* SIDEBAR NAVIGATION */}
          <ScrollArea className="flex-1 px-4">
            <nav className="space-y-2 pb-4">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.value
                
                return (
                  <Button
                    key={item.value}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => {
                      setActiveTab(item.value)
                      setIsMobileMenuOpen(false)
                    }}
                    title={item.description}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="truncate">{item.label}</span>
                  </Button>
                )
              })}
            </nav>
          </ScrollArea>

          {/* SIDEBAR FOOTER: User Profile */}
          <div className="p-4 border-t">
            {/* User Avatar & Info */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {user?.email?.[0]?.toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="flex-1 xl:pl-64 flex flex-col">
        
        {/* ===== MOBILE HEADER ===== */}
        <header className="xl:hidden bg-white border-b p-4 flex justify-between items-center">
          <h1 className="text-lg font-bold">AdminPanel</h1>
          
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            
            {/* Mobile Menu Drawer */}
            <SheetContent side="left" className="p-0 w-64">
              <div className="flex flex-col h-full">
                {/* Mobile Sidebar Header */}
                <div className="p-6">
                  <h1 className="text-2xl font-bold">
                    Admin<span className="text-primary">Panel</span>
                  </h1>
                </div>

                {/* Mobile Navigation */}
                <ScrollArea className="flex-1 px-4">
                  <nav className="space-y-2 pb-4">
                    {MENU_ITEMS.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.value
                      
                      return (
                        <Button
                          key={item.value}
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                          onClick={() => {
                            setActiveTab(item.value)
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      )
                    })}
                  </nav>
                </ScrollArea>

                {/* Mobile Footer */}
                <div className="p-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-red-600"
                    onClick={() => {
                      handleSignOut()
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* ===== CONTENT CONTAINER ===== */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 overflow-auto">
          
          {/* TOP BAR: Title & Date */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">
                {MENU_ITEMS.find((i) => i.value === activeTab)?.label}
              </h2>
              <p className="text-slate-500 mt-1">
                {activeTab === "dashboard"
                  ? new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : `Manage your ${activeTab.replace(/-/g, " ")}`}
              </p>
            </div>
          </div>

          {/* ACTIVE TAB CONTENT: Animated */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
```

---

## 📊 Step-by-Step Execution

### **Execution Step 1: Page Mount**

```typescript
// When user navigates to /admin:

AdminPage component mounts
  ↓
State initialized:
├─ user = null
├─ isAuthorized = false
├─ authLoading = true
├─ activeTab = "dashboard"
└─ isMobileMenuOpen = false
  ↓
useEffect #1 triggered (auth check)
└─ Dependencies: [supabase, router]
```

### **Execution Step 2: Authentication Check**

```typescript
// In useEffect #1 (checkAuth function):

1. Call supabase.auth.getUser()
   └─ Try to get current logged-in user
   
2. If user found:
   └─ Query profile table for role
      ├─ role = "admin"? → setIsAuthorized(true)
      └─ role ≠ "admin"? → router.push("/")
   
3. If no user:
   └─ Subscribe to onAuthStateChange
      └─ Wait 800ms for session
         ├─ Session found? → Validate role (same as step 2)
         └─ Timeout? → router.push("/")

Result: isAuthorized state updated
```

### **Execution Step 3: Admin Data Loading**

```typescript
// When isAuthorized = true and user exists:

useAdminData hook executes (useEffect #2)
  ↓
1. Fetch bookings:
   └─ SELECT * FROM bookings ORDER BY created_at DESC
   └─ setBookings(converted data)
   
2. Fetch rooms:
   └─ Call getRooms() utility
   └─ setRooms(data)
   
3. Calculate stats (useMemo):
   ├─ totalBookings = bookings.length
   ├─ confirmedBookings = filter(status='confirmed').length
   ├─ totalRevenue = sum of totalPrice
   └─ occupancyRate = (occupied / total) * 100
   
4. Set loading = false
```

### **Execution Step 4: UI Renders**

```typescript
// Loading state check:

if (authLoading || (isAuthorized && dataLoading))
  └─ Show: <Loading message="Initializing..." />

if (!isAuthorized)
  └─ Return null (user will be redirected)

// If both checks pass:
  └─ Render full admin dashboard
     ├─ Desktop sidebar (hidden on mobile)
     ├─ Mobile header with menu
     └─ Main content area with active tab
```

### **Execution Step 5: Tab Content Renders**

```typescript
// renderContent() function executes:

switch (activeTab) {
  case "dashboard":
    └─ Render overview with:
       ├─ Stats cards (4)
       ├─ Revenue chart
       ├─ Room status
       └─ Recent bookings
  
  case "bookings":
  case "users":
  case etc.
    └─ Render tab-specific component
       └─ Each component handles its own data/UI
}
```

---

## 🎯 Key Functions & Their Purposes

```typescript
// ===== AUTHENTICATION =====
supabase.auth.getUser()
  Purpose: Get current logged-in user
  Returns: { data: { user: SupabaseUser | null } }
  Usage: Initial auth check

supabase.auth.onAuthStateChange(callback)
  Purpose: Listen for auth state changes
  Returns: subscription object
  Usage: Wait for user login if not immediate

supabase.auth.signOut()
  Purpose: Sign out user
  Usage: Handle sign out button click

// ===== DATA QUERIES =====
supabase.from("bookings").select("*")
  Purpose: Fetch all bookings
  Returns: Booking[] array

supabase.from("profiles").select("role").eq("id", user.id)
  Purpose: Get user role
  Returns: { role: string }

getRooms()
  Purpose: Fetch rooms with status
  Returns: Room[] array

// ===== STATE MANAGEMENT =====
setUser(user)              // Update logged-in user
setIsAuthorized(bool)      // Update authorization status
setActiveTab(value)        // Switch active tab
setBookings(array)         // Update bookings list
setRooms(array)            // Update rooms list
setLoading(bool)           // Update loading state

// ===== NAVIGATION =====
router.push("/")           // Redirect to home
router.push("/admin")      // Redirect to admin

// ===== UI UPDATES =====
setIsMobileMenuOpen(bool)  // Toggle mobile menu
renderContent()            // Return JSX for active tab
```

---

## ⚡ Performance Optimizations

```typescript
// 1. MEMOIZATION (useMemo)
const stats = useMemo(() => {
  // Only recalculate when bookings or rooms change
  return { totalBookings, confirmedBookings, totalRevenue, occupancyRate }
}, [bookings, rooms])

// 2. RESPONSIVE CLASSES
<aside className="hidden xl:block">
  {/* Hidden on mobile (<1280px), shown on desktop */}
</aside>

// 3. LAZY LOADING
<ScrollArea>
  {/* Only renders items in visible area */}
</ScrollArea>

// 4. ANIMATION WITH MOTION
<AnimatePresence mode="wait">
  <motion.div key={activeTab}>
    {/* Only 1 tab rendered at a time, animated transitions */}
  </motion.div>
</AnimatePresence>

// 5. CALLBACK MEMOIZATION
const handleSignOut = useCallback(async () => {
  // Function recreated only when dependencies change
}, [supabase, router])
```

---

**Code Implementation Guide**: ✅ Complete  
**Version**: 1.0  
**Last Updated**: 2024
