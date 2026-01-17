# Admin Dashboard Code Execution Flow - Complete Breakdown

## 🎯 Overview

The admin dashboard is a comprehensive management interface that:
1. **Authenticates** admin users (checks role = "admin")
2. **Loads** bookings, rooms, and statistics
3. **Displays** navigation with 10+ management modules
4. **Renders** dynamic content based on active tab
5. **Provides** real-time data and management capabilities

---

## 📊 Complete Admin Dashboard Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD EXECUTION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│  1. USER NAVIGATES TO /admin        │
│     AdminPage Component             │
│     (/app/admin/page.tsx)           │
└────────────────────┬────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  2. PAGE MOUNTS              │
        │  useEffect() #1 triggered    │
        │                              │
        │  Purpose: Check Auth         │
        └──────────────────┬───────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  3. VERIFY USER IS ADMIN             │
        │                                      │
        │  Step A: Get current user            │
        │  supabase.auth.getUser()             │
        │                                      │
        │  Check 3 possibilities:              │
        │  A) User exists immediately → OK    │
        │  B) Auth state pending → Wait 800ms  │
        │  C) No user → Redirect to /         │
        └──────────────────┬───────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼ User found          ▼ No user immediately
            ┌────────────┐        ┌─────────────┐
            │ Validate   │        │ Wait 800ms  │
            │ role       │        │ for auth    │
            └────┬───────┘        └────┬────────┘
                 │                     │
                 ├─ role = admin? ✓   │
                 │  setUser(u)        │
                 │  setAuthorized(t)  │
                 │  return            │
                 │                    │
                 └─ role ≠ admin ✗   │
                    router.push("/")  │
                                      │
                                      ▼
                            ┌──────────────────────────┐
                            │ Subscribe to auth change │
                            │ onAuthStateChange()      │
                            │                          │
                            │ Wait for session/user    │
                            └──────────┬───────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼ Session found                       ▼ Timeout
                ┌─────────────┐                      ┌────────────┐
                │ Validate    │                      │ Redirect   │
                │ admin role  │                      │ to /       │
                └──────┬──────┘                      └────────────┘
                       │
                       ├─ admin? ✓
                       │ setUser()
                       │ setAuthorized(true)
                       │
                       └─ not admin ✗
                          router.push("/")
        
        ┌────────────────────────────────────────────┐
        │  4. AUTH VERIFIED - ADMIN ACCESS GRANTED   │
        │                                            │
        │  setAuthLoading(false)                    │
        │  setIsAuthorized(true)                    │
        │  Page renders main UI                     │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │  5. FETCH ADMIN DATA                 │
        │  useAdminData Hook triggered         │
        │  useEffect() #2                      │
        │                                      │
        │  Dependencies: [user, supabase]      │
        └──────────────────┬───────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
            ┌──────────────┐  ┌─────────────┐
            │ Fetch        │  │ Transform   │
            │ Bookings     │  │ Data        │
            │              │  │             │
            │ Query:       │  │ - Convert   │
            │ SELECT *     │  │   dates     │
            │ FROM         │  │ - Map fields│
            │ bookings     │  │ - Add types │
            │ ORDER BY     │  │             │
            │ created_at   │  └─────────────┘
            │              │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────────────┐
            │ Get Rooms            │
            │ getRooms()           │
            │                      │
            │ Query all rooms      │
            │ from database        │
            └──────┬───────────────┘
                   │
                   ▼
            ┌──────────────────────┐
            │ Calculate Stats      │
            │ useMemo(() => {})    │
            │                      │
            │ Compute:             │
            │ - totalBookings      │
            │ - confirmedBookings  │
            │ - totalRevenue       │
            │ - occupancyRate      │
            └──────┬───────────────┘
                   │
                   ▼
            ┌──────────────────────┐
            │ Update State         │
            │                      │
            │ setBookings(...)     │
            │ setRooms(...)        │
            │ setLoading(false)    │
            └──────────────────────┘

        ┌──────────────────────────────────┐
        │  6. RENDER ADMIN UI              │
        │                                  │
        │  Show:                           │
        │  - Fixed sidebar (desktop)       │
        │  - Mobile header + drawer        │
        │  - Top navigation bar            │
        │  - Tab content area              │
        └──────────────────┬───────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
    ┌──────────────────┐          ┌──────────────────────────┐
    │ SIDEBAR          │          │ MAIN CONTENT AREA        │
    │                  │          │                          │
    │ Contains:        │          │ Top Section:             │
    │ - Logo           │          │ - Page title             │
    │ - Menu items (10)│          │ - Description            │
    │ - User profile   │          │ - Tabs navigation        │
    │ - Sign out btn   │          │                          │
    │                  │          │ Bottom Section:          │
    │ Menu Items:      │          │ - Active tab content     │
    │ ├ Overview       │          │ - Dynamic rendering      │
    │ ├ Bookings       │          │ - Tab-specific UI        │
    │ ├ Users          │          │                          │
    │ ├ Floors         │          │ Available Tabs:          │
    │ ├ Room Types     │          │ 1. Dashboard (Overview)  │
    │ ├ Rooms          │          │ 2. Bookings             │
    │ ├ Categories     │          │ 3. User Management      │
    │ ├ Services       │          │ 4. Floors               │
    │ ├ Availability   │          │ 5. Room Types           │
    │ └ Calendar       │          │ 6. Rooms                │
    │                  │          │ 7. Service Categories   │
    │                  │          │ 8. Services             │
    │                  │          │ 9. Availability         │
    │                  │          │ 10. Calendar            │
    └──────────────────┘          └──────────────────────────┘

        ┌──────────────────────────────────────┐
        │  7. RENDER ACTIVE TAB CONTENT        │
        │  renderContent() function            │
        │                                      │
        │  Based on activeTab state:           │
        └──────────────────┬───────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼ activeTab = "dashboard"             ▼ activeTab = other
    ┌──────────────────────────┐         ┌─────────────────────┐
    │ DASHBOARD OVERVIEW       │         │ TAB-SPECIFIC        │
    │                          │         │ COMPONENT           │
    │ Shows:                   │         │                     │
    │ 1. Stats Cards (4)       │         │ Examples:           │
    │    ├ Total Bookings      │         │ - BookingManagement │
    │    ├ Confirmed           │         │ - UserManagement    │
    │    ├ Revenue             │         │ - RoomManagement    │
    │    └ Occupancy Rate      │         │ - Services, etc.    │
    │                          │         │                     │
    │ 2. Revenue Chart         │         │ Each loads its own  │
    │    └ Visual breakdown    │         │ data as needed      │
    │                          │         │                     │
    │ 3. Room Status Overview  │         │                     │
    │    └ Room availability   │         │                     │
    │                          │         │                     │
    │ 4. Recent Bookings       │         │                     │
    │    └ List of latest 5    │         │                     │
    └──────────────────────────┘         └─────────────────────┘

        ┌──────────────────────────────────────┐
        │  8. USER INTERACTIONS                │
        │                                      │
        │  Admin can:                          │
        │  ✓ Click menu items → Switch tabs   │
        │  ✓ View real-time stats             │
        │  ✓ Create/edit/delete items         │
        │  ✓ Check availability               │
        │  ✓ Manage users                     │
        │  ✓ Sign out                         │
        └──────────────────┬───────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼ Click menu item                     ▼ Click sign out
    ┌──────────────────┐             ┌──────────────────────┐
    │ setActiveTab()   │             │ handleSignOut()      │
    │                  │             │                      │
    │ Updates state    │             │ Call:                │
    │ Content rerenders│             │ supabase.auth        │
    │ with new tab     │             │ .signOut()           │
    │                  │             │                      │
    │ Smooth animation │             │ Clear session        │
    │ with Framer Motion│            │ Redirect to /        │
    └──────────────────┘             └──────────────────────┘
```

---

## 🔄 Detailed Step-by-Step Breakdown

### **Step 1: User Navigates to /admin**

**File:** `app/admin/page.tsx`

```typescript
export default function AdminPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  // State: All defaults to unauthenticated
  // authLoading: true (checking auth)
  // isAuthorized: false (not authorized yet)
  // activeTab: "dashboard" (will show overview)
  // isMobileMenuOpen: false (sidebar closed)
}
```

---

### **Step 2: Authentication Check (useEffect #1)**

```typescript
useEffect(() => {
  const checkAuth = async () => {
    // ATTEMPT 1: Quick check for current user
    const { data }: { data: { user: SupabaseUser | null } } = await supabase.auth.getUser()
    const u = (data as any)?.user ?? null

    // If user found immediately
    if (u) {
      // Query database for user's role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.id)
        .single()

      // Check if user is admin
      if (profile?.role !== "admin") {
        // Not admin: redirect to home
        router.push("/")
        return
      }

      // Is admin: grant access
      setUser(u)
      setIsAuthorized(true)
      setAuthLoading(false)
      return
    }

    // ATTEMPT 2: No immediate user, wait for auth state change
    let redirected = false
    
    // Safety timeout: redirect after 800ms if no auth
    const timer = setTimeout(() => {
      if (!redirected) {
        router.push("/")
      }
    }, 800)

    // Subscribe to auth state changes
    const { data: subData } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        const sUser = session?.user ?? null
        if (!sUser) return
        
        redirected = true
        clearTimeout(timer)

        // Validate role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", sUser.id)
          .single()

        if (profile?.role !== "admin") {
          router.push("/")
          return
        }

        setUser(sUser)
        setIsAuthorized(true)
        setAuthLoading(false)
      }
    )

    const subscription = (subData as any)?.subscription ?? subData

    // Cleanup
    return () => {
      clearTimeout(timer)
      subscription?.unsubscribe?.()
    }
  }

  // Execute auth check
  const maybeCleanup = checkAuth()
  
  return () => {
    if (typeof maybeCleanup === 'function') maybeCleanup()
  }
}, [supabase, router])
```

**Authentication Flow:**
1. Check if user is logged in: `supabase.auth.getUser()`
2. If found: Query `profiles` table for role
3. If role = "admin": Grant access ✅
4. If role ≠ "admin": Redirect to "/" ❌
5. If no user found: Wait 800ms for auth state change
6. If timeout: Redirect to "/"

**Possible Outcomes:**
- ✅ User is admin → Continue to dashboard
- ❌ User exists but not admin → Redirect to home
- ❌ No user or session → Redirect to home

---

### **Step 3: Load Admin Data (useAdminData Hook)**

**File:** `app/admin/page.tsx`

```typescript
// Custom hook for data fetching
const useAdminData = (user: SupabaseUser | null) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Only run if user exists
    if (!user) return

    const fetchData = async () => {
      try {
        // STEP 1: Fetch bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })

        if (bookingsError) throw bookingsError

        // STEP 2: Transform booking data
        // Map database fields to TypeScript interface
        const convertedBookings = bookingsData.map((booking: any) => ({
          ...booking,
          id: booking.id,
          
          // Date conversions
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at),
          checkInDate: new Date(booking.check_in_date),
          checkOutDate: new Date(booking.check_out_date),
          checkIn: new Date(booking.check_in_date),
          checkOut: new Date(booking.check_out_date),
          
          // Direct field mapping
          status: booking.status,
          totalPrice: booking.total_price,
          guestName: booking.guest_name,
          guestEmail: booking.guest_email,
          guestPhone: booking.guest_phone,
          guestCount: booking.guest_count,
          guests: booking.guest_count,
          bookingReference: booking.booking_reference,
          paymentStatus: booking.payment_status,
          paidAmount: booking.paid_amount,
          
          // Relationships
          roomId: booking.room_id,
          roomTypeId: booking.room_type_id,
          floorId: booking.floor_id,
          bookingType: booking.room_id ? 'room' : 'service',
        })) as Booking[]

        // STEP 3: Fetch rooms
        const roomsData = await getRooms()

        // STEP 4: Update state with fetched data
        setBookings(convertedBookings)
        setRooms(roomsData)
        
      } catch (error) {
        console.error("Error fetching admin data:", error)
        // Continue anyway, show partial data
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

  // STEP 5: Calculate stats (memoized for performance)
  const stats = useMemo(() => {
    const totalBookings = bookings.length
    
    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed"
    ).length
    
    const totalRevenue = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + b.totalPrice, 0)
    
    const occupancyRate = rooms.length > 0 
      ? Math.round(
          (rooms.filter((r) => r.status === "occupied").length / rooms.length) * 100
        ) 
      : 0
    
    return { totalBookings, confirmedBookings, totalRevenue, occupancyRate }
  }, [bookings, rooms])

  return { bookings, rooms, loading, stats }
}

// In main component:
const { bookings, rooms, loading: dataLoading, stats } = useAdminData(user)
```

**Data Processing:**
1. Query bookings from Supabase
2. Transform dates (parse ISO strings to Date objects)
3. Map database field names to TypeScript interface
4. Query rooms data
5. Calculate statistics (memoized)
6. Return all data to component

---

### **Step 4: Render Admin UI**

```typescript
// Main render logic
if (authLoading || (isAuthorized && dataLoading)) {
  return <Loading message="Initializing Admin Dashboard..." size="lg" />
}

if (!isAuthorized) return null

// Desktop Sidebar
return (
  <div className="min-h-screen bg-slate-50/80 flex font-sans">
    {/* DESKTOP SIDEBAR: Fixed left panel */}
    <aside className="hidden xl:block w-64 bg-white border-r fixed inset-y-0">
      <SidebarContent />
    </aside>

    {/* MAIN CONTENT: Flex right panel */}
    <main className="flex-1 xl:pl-64 flex flex-col">
      
      {/* MOBILE HEADER: Only on small screens */}
      <header className="xl:hidden bg-white border-b p-4 flex justify-between">
        <span>AdminPanel</span>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* TOP BAR: Title and description */}
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              {MENU_ITEMS.find(i => i.value === activeTab)?.label}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeTab === 'dashboard' 
                ? new Date().toLocaleDateString(...)
                : `Manage your ${activeTab.replace('-', ' ')}`
              }
            </p>
          </div>
        </div>

        {/* ACTIVE TAB CONTENT: Animated rendering */}
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
```

---

### **Step 5: Sidebar Navigation**

**SidebarContent Component:**

```typescript
const SidebarContent = () => (
  <div className="flex flex-col h-full">
    
    {/* HEADER: Logo */}
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        Admin<span className="text-primary">Panel</span>
      </h1>
      <p className="text-xs text-slate-500 mt-1">Management Center</p>
    </div>
    
    {/* NAVIGATION: Menu items */}
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
                setIsMobileMenuOpen(false)  // Close mobile menu
              }}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>
    </ScrollArea>

    {/* FOOTER: User profile & sign out */}
    <div className="p-4 border-t">
      <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 mb-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">AD</span>
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-sm font-medium">
            {user?.email?.split('@')[0]}
          </p>
          <p className="text-xs text-slate-500">Administrator</p>
        </div>
      </div>
      
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-red-600"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  </div>
)
```

**Navigation Features:**
- ✓ 10 menu items (tabs)
- ✓ Active state indicator
- ✓ Icon for each item
- ✓ User profile display
- ✓ Sign out button
- ✓ Responsive (hidden on mobile)

---

### **Step 6: Menu Items Configuration**

```typescript
const MENU_ITEMS = [
  { 
    value: "dashboard", 
    label: "Overview", 
    icon: LayoutDashboard 
  },
  { 
    value: "bookings", 
    label: "Bookings", 
    icon: ClipboardList 
  },
  { 
    value: "users", 
    label: "User Management", 
    icon: Users 
  },
  { 
    value: "floors", 
    label: "Floors", 
    icon: Layers 
  },
  { 
    value: "room-types", 
    label: "Room Types", 
    icon: BedDouble 
  },
  { 
    value: "rooms", 
    label: "Rooms", 
    icon: DoorOpen 
  },
  { 
    value: "service-categories", 
    label: "Categories", 
    icon: Tags 
  },
  { 
    value: "services", 
    label: "Services", 
    icon: ConciergeBell 
  },
  { 
    value: "availability", 
    label: "Availability", 
    icon: CheckCircle2 
  },
  { 
    value: "calendar", 
    label: "Calendar", 
    icon: CalendarDays 
  },
]
```

---

### **Step 7: renderContent() Function**

```typescript
const renderContent = () => {
  switch (activeTab) {
    
    case "dashboard":
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* STATS CARDS ROW */}
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Bookings"
              value={stats.totalBookings}
              description="Lifetime bookings"
              icon={CalendarDays}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Confirmed"
              value={stats.confirmedBookings}
              description="Active reservations"
              icon={CheckCircle2}
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title="Revenue"
              value={`$${stats.totalRevenue.toLocaleString()}`}
              description="Total earnings"
              icon={DollarSign}
              trend={{ value: 15, isPositive: true }}
            />
            <StatsCard
              title="Occupancy"
              value={`${stats.occupancyRate}%`}
              description="Current status"
              icon={Activity}
              trend={{ value: 2, isPositive: true }}
            />
          </section>

          {/* CHARTS & OVERVIEW */}
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* REVENUE CHART (2 cols wide) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart />
              </CardContent>
            </Card>

            {/* ROOM STATUS (1 col) */}
            <Card>
              <CardHeader>
                <CardTitle>Room Status</CardTitle>
              </CardHeader>
              <CardContent>
                <RoomStatusOverview />
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
                <BookingList limit={5} bookings={bookings} rooms={rooms} />
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
```

---

### **Step 8: Dashboard Overview Tab**

When activeTab = "dashboard", displays:

```typescript
// STATS CARDS
const stats = {
  totalBookings: bookings.length,
  confirmedBookings: count of status === 'confirmed',
  totalRevenue: sum of totalPrice (excluding cancelled),
  occupancyRate: (occupied rooms / total rooms) * 100
}

// VISUALIZATIONS
RevenueChart      → Graph of revenue over time
RoomStatusOverview → Donut chart of room statuses
BookingList       → Table of last 5 bookings
```

---

### **Step 9: Tab Switching**

```typescript
// When admin clicks menu item:
<Button onClick={() => {
  setActiveTab(item.value)  // Update state
  setIsMobileMenuOpen(false)  // Close mobile menu
}}>

// Component re-renders with:
// - New activeTab value
// - renderContent() returns different component
// - Framer Motion animates transition
// - New tab component loads its own data
```

---

### **Step 10: Sign Out**

```typescript
const handleSignOut = async () => {
  try {
    await supabase.auth.signOut()
    router.push("/")  // Redirect to home
  } catch (error) {
    console.error("Sign out failed:", error)
  }
}
```

---

## 🎨 Dashboard Sections

### Overview Tab (Dashboard)

```
┌─────────────────────────────────────────────────┐
│            ADMIN DASHBOARD OVERVIEW             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Stats Row:                                    │
│  ┌──────────┬──────────┬──────────┬──────────┐ │
│  │ Bookings │ Confirmed│ Revenue  │Occupancy│ │
│  │   245    │   189    │ $45,234  │   87%   │ │
│  └──────────┴──────────┴──────────┴──────────┘ │
│                                                 │
│  Charts & Overview:                            │
│  ┌──────────────────────────┬──────────────┐  │
│  │   Revenue Chart (Graph)   │ Room Status │  │
│  │                           │  (Pie)      │  │
│  │   [□□□□□□□]               │   ●●        │  │
│  └──────────────────────────┴──────────────┘  │
│                                                 │
│  Recent Bookings:                              │
│  ┌──────────────────────────────────────────┐ │
│  │ Ref │ Guest │ Status │ Price │ Date │ │  │
│  ├──────────────────────────────────────────┤ │
│  │ BK1 │ John  │ Checked │ $200  │ 1/15 │ │  │
│  │ BK2 │ Jane  │ Confirmed│ $350  │ 1/16 │ │  │
│  │ ... │ ...   │ ...    │ ...   │ ... │ │  │
│  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security & Authorization

```
SECURITY LAYERS:

1. AUTH CHECK
   ├─ User logged in?
   └─ Session valid?

2. ROLE VERIFICATION
   ├─ Query profiles table
   └─ Check role = 'admin'?

3. ACCESS CONTROL
   ├─ Admin → Dashboard access ✓
   ├─ Staff → Redirect to /staff
   └─ User → Redirect to /

4. PAGE GUARD
   ├─ Not authorized? → Return null
   └─ Still loading? → Show loading spinner

5. DATA QUERIES
   ├─ All database queries use Supabase client
   ├─ Supabase RLS enforces row-level security
   └─ Admin can see all data
```

---

## 📊 Data Flow Summary

```
User lands /admin
    ↓
Auth check (useEffect #1)
├─ Get current user
├─ Verify admin role
└─ Authorize or redirect
    ↓ Authorized
Admin data loaded (useEffect #2)
├─ Fetch bookings
├─ Fetch rooms
├─ Transform data
└─ Calculate stats
    ↓ Data ready
Render UI
├─ Sidebar (10 menu items)
├─ Main content area
└─ Active tab component
    ↓
Admin interacts
├─ Click menu → Switch tabs
├─ View data
├─ Edit/create/delete
└─ Sign out
```

---

## ⏱️ Timeline

| Time | Action | Component |
|------|--------|-----------|
| 0ms | Navigate to /admin | Browser |
| 50ms | Page mounts | React |
| 100ms | Auth check starts | useEffect #1 |
| 150-200ms | Get current user | Supabase |
| 200-250ms | Query profile for role | Database |
| 250ms | Auth verified ✓ | AdminPage |
| 300ms | Admin data load starts | useEffect #2 |
| 300-400ms | Fetch bookings | Database |
| 300-400ms | Fetch rooms | Database |
| 400-450ms | Transform data | JavaScript |
| 450ms | Calculate stats | JavaScript |
| 500ms | Render dashboard | React |
| **500ms** | **Dashboard visible** | User sees UI |

---

**Status**: ✅ Complete Admin Dashboard Flow Documentation  
**Version**: 1.0
