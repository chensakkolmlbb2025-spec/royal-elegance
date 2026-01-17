# Admin Dashboard Quick Visual Reference

## 🚀 Quick Start Flow

```
START
  ↓
User opens /admin
  ↓
⏱ Auth Check (800ms timeout)
  ├─ Is user logged in?
  ├─ Is role = "admin"?
  └─ Pass? → Continue | Fail? → Redirect to /
  ↓
✓ AUTHORIZED
  ↓
⏱ Load Data (parallel)
  ├─ Fetch bookings
  ├─ Fetch rooms
  ├─ Calculate stats
  └─ Ready in ~300-400ms
  ↓
✓ DASHBOARD READY
  ↓
Render UI:
├─ Sidebar (10 tabs)
├─ Main content area
└─ Active tab content
  ↓
ADMIN INTERACTS
├─ Click tab → Switch content
├─ View/edit data
└─ Sign out
```

---

## 🎯 Component Breakdown

### **AdminPage** (Main Component)

```
AdminPage
├─ useEffect #1: Auth check
│  ├─ getUser() → Check if logged in
│  ├─ Query profile.role → Verify admin
│  ├─ onAuthStateChange → Subscribe to changes
│  └─ 800ms timeout → Redirect if no auth
│
├─ useEffect #2: (part of useAdminData hook)
│  ├─ fetchBookings() → Query database
│  ├─ transformData() → Map fields
│  ├─ getRooms() → Fetch room data
│  └─ Calculate stats with useMemo()
│
├─ State Variables:
│  ├─ user: User | null
│  ├─ isAuthorized: boolean
│  ├─ activeTab: string
│  ├─ isMobileMenuOpen: boolean
│  ├─ authLoading: boolean
│  └─ dataLoading: boolean
│
└─ Render:
   ├─ Desktop Sidebar (fixed)
   ├─ Mobile Header + Drawer
   ├─ Main Content Area
   └─ renderContent() → Active tab component
```

---

## 🗺️ Navigation Map

```
MENU ITEMS (10 Tabs):

1. Dashboard    → Overview stats & charts
2. Bookings     → BookingManagement component
3. Users        → UserManagement component
4. Floors       → FloorManagement component
5. Room Types   → RoomTypeManagement component
6. Rooms        → RoomManagement component
7. Categories   → ServiceCategoryManagement component
8. Services     → ServiceManagement component
9. Availability → RoomAvailabilityChecker component
10. Calendar    → BookingCalendar component
```

---

## 📱 Responsive Layout

```
DESKTOP (≥1280px):
┌──────────┬────────────────────────────────┐
│ Sidebar  │ Main Content Area              │
│ (fixed)  │                                │
│          │ - Header (title + description) │
│ 10 items │ - Tab content (animated)       │
│          │                                │
│ w-64     │ flex-1 max-w-7xl               │
└──────────┴────────────────────────────────┘

MOBILE (<1280px):
┌─────────────────────────────────────────┐
│ Header: Logo + Menu Button              │
├─────────────────────────────────────────┤
│ Sheet (Drawer):                         │
│  - 10 menu items                        │
│  - User profile                         │
│  - Sign out                             │
├─────────────────────────────────────────┤
│ Main Content Area (full width)          │
│ - Tab content                           │
│ - Animated transitions                  │
└─────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
USER VISITS /admin
  ↓
CHECK AUTH ①
  │
  ├─ Try: getUser()
  │  │
  │  ├─ User found? ✓
  │  │  └─ Query role
  │  │     ├─ role = admin? → setAuthorized(true) ✓
  │  │     └─ role ≠ admin? → router.push("/") ✗
  │  │
  │  └─ No user? ✗
  │     └─ Wait 800ms & subscribe
  │        │
  │        ├─ Session found?
  │        │  └─ Check role (same as above)
  │        │
  │        └─ Timeout?
  │           └─ router.push("/") ✗
  ↓
AUTHORIZATION CHECK ②
  │
  ├─ authLoading = true? → Show spinner
  ├─ isAuthorized = false? → Return null
  └─ Both false? → Render dashboard ✓
```

---

## 📊 Data Loading Flow

```
USE ADMIN DATA HOOK
  ├─ Dependencies: [user, supabase]
  │
  ├─ If user exists:
  │  ├─ FETCH BOOKINGS
  │  │  ├─ SELECT * FROM bookings
  │  │  ├─ ORDER BY created_at DESC
  │  │  └─ Transform dates & fields
  │  │
  │  ├─ FETCH ROOMS
  │  │  └─ Call getRooms()
  │  │
  │  ├─ CALCULATE STATS (useMemo)
  │  │  ├─ totalBookings = bookings.length
  │  │  ├─ confirmedBookings = filter(status='confirmed').length
  │  │  ├─ totalRevenue = sum(totalPrice where status≠'cancelled')
  │  │  └─ occupancyRate = (occupied / total) * 100
  │  │
  │  └─ UPDATE STATE
  │     ├─ setBookings(converted)
  │     ├─ setRooms(data)
  │     └─ setLoading(false)
  │
  └─ Return { bookings, rooms, loading, stats }
```

---

## 🎨 Dashboard Overview Content

```
STATS ROW (4 Cards):
┌──────────┬──────────┬──────────┬──────────┐
│ Bookings │Confirmed │ Revenue  │Occupancy│
│   245    │   189    │ $45.2K   │   87%   │
│          │          │          │         │
│  +12%    │   +8%    │  +15%    │  +2%    │
└──────────┴──────────┴──────────┴──────────┘

CHARTS ROW (2 Items):
┌────────────────────────────┬──────────────┐
│ Revenue Chart              │ Room Status  │
│ (Line graph)               │ (Pie chart)  │
│                            │              │
│ Over time visualization    │ Occupied: 87%│
│ of revenue trends          │ Vacant: 13%  │
└────────────────────────────┴──────────────┘

RECENT BOOKINGS (List):
┌────────────────────────────────────────────┐
│ Ref  │ Guest │ Status │ Price │ Date       │
├────────────────────────────────────────────┤
│ BK1  │ John  │ Checked│ $200  │ 2024-01-15 │
│ BK2  │ Jane  │ Confirm│ $350  │ 2024-01-16 │
│ ...  │ ...   │ ...    │ ...   │ ...        │
└────────────────────────────────────────────┘
```

---

## 🔄 User Interactions

```
SIDEBAR MENU CLICK:
User clicks item
  ↓
setActiveTab(item.value)
  ↓
Component re-renders
  ↓
renderContent() switches case
  ↓
Component returns new tab JSX
  ↓
Framer Motion animates:
├─ Exit: opacity 0, y -10
├─ Enter: opacity 1, y 0
└─ Duration: 0.3s

TAB-SPECIFIC BEHAVIOR:
├─ If "dashboard" → Show overview
└─ Else → Show tab component
   ├─ BookingManagement
   ├─ UserManagement
   ├─ RoomManagement
   ├─ ServiceManagement
   └─ etc.
```

---

## 🚪 Sign Out Flow

```
User clicks "Sign Out"
  ↓
handleSignOut() triggered
  ↓
supabase.auth.signOut()
  ├─ Clear session cookies
  ├─ Clear auth token
  └─ Destroy session
  ↓
router.push("/")
  ↓
User redirected to home page
```

---

## ⚡ Performance Optimization

```
MEMOIZATION:
├─ stats calculation
│  └─ Recalc only when bookings/rooms change
│
└─ Tab content
   └─ Each tab component optimizes its own renders

LAZY LOADING:
├─ Sidebar hidden on mobile (xl:hidden)
├─ Menu shown in drawer when needed
└─ Content area adjusts with pl-64 offset

DATA LOADING:
├─ Parallel fetch (bookings & rooms)
├─ Transform while other query runs
└─ Stats calc while UI renders
```

---

## 🎯 Tab Components at a Glance

| Tab | Component | Purpose |
|-----|-----------|---------|
| Dashboard | Overview | Stats, charts, recent bookings |
| Bookings | BookingManagement | View/edit/create/delete bookings |
| Users | UserManagement | Manage user accounts and roles |
| Floors | FloorManagement | Add/edit/delete floor levels |
| Room Types | RoomTypeManagement | Configure room type categories |
| Rooms | RoomManagement | Manage individual rooms |
| Categories | ServiceCategoryManagement | Service category management |
| Services | ServiceManagement | Create/manage services |
| Availability | RoomAvailabilityChecker | Check room availability |
| Calendar | BookingCalendar | Visual booking calendar |

---

## 🔍 Troubleshooting Quick Guide

```
ISSUE: Admin page shows loading forever
FIX: Check auth token in browser storage

ISSUE: Redirected to home immediately
FIX: Verify user role = 'admin' in profiles table

ISSUE: Data not loading
FIX: Check Supabase connection and RLS policies

ISSUE: Mobile menu not closing
FIX: Check setIsMobileMenuOpen(false) in click handler

ISSUE: Tab doesn't animate
FIX: Verify Framer Motion is installed and imported

ISSUE: Stats showing 0
FIX: Check bookings/rooms data is populating
```

---

## 📞 Key Functions

```typescript
// Authentication
supabase.auth.getUser()           // Get current user
supabase.auth.onAuthStateChange() // Subscribe to auth changes
supabase.auth.signOut()           // Sign out user

// Data Fetching
supabase.from("bookings").select() // Fetch bookings
getRooms()                        // Custom function for rooms
supabase.from("profiles").select() // Query user roles

// State Updates
setUser()                         // Update logged-in user
setIsAuthorized()                // Update authorization status
setActiveTab()                   // Switch active tab
setBookings()                    // Update bookings list
setRooms()                       // Update rooms list
setLoading()                     // Update loading state

// Navigation
router.push("/")                 // Redirect to home
router.push("/admin")            // Redirect to admin

// UI Updates
setIsMobileMenuOpen()            // Toggle mobile menu
renderContent()                  // Switch tab content
```

---

## 🎬 Animation Details

```
TAB TRANSITION ANIMATION:
├─ Library: Framer Motion
├─ Component: AnimatePresence + motion.div
│
├─ INITIAL (when entering):
│  ├─ opacity: 0
│  └─ y: 10
│
├─ ANIMATE (when active):
│  ├─ opacity: 1
│  └─ y: 0
│
├─ EXIT (when leaving):
│  ├─ opacity: 0
│  └─ y: -10
│
└─ Duration: 0.3s ease-in-out
```

---

## 📈 State Management Pattern

```
CLIENT-SIDE STATE:
AdminPage.tsx
├─ user: User | null
├─ isAuthorized: boolean
├─ activeTab: string
├─ isMobileMenuOpen: boolean
├─ authLoading: boolean
└─ dataLoading: boolean

CUSTOM HOOK STATE:
useAdminData()
├─ bookings: Booking[]
├─ rooms: Room[]
└─ loading: boolean

COMPUTED STATE (useMemo):
stats
├─ totalBookings: number
├─ confirmedBookings: number
├─ totalRevenue: number
└─ occupancyRate: number
```

---

## 🔗 Related Files

```
Primary:
/app/admin/page.tsx              → Main admin page component
/components/admin/*              → All admin sub-components

Utilities:
/utils/admin.ts                  → Admin helper functions
/lib/supabase.ts                 → Supabase client

Services:
/app/api/admin/*                 → Admin API routes

Types:
/types/index.ts                  → Admin type definitions
```

---

**Quick Reference**: ✅ Complete  
**Version**: 1.0  
**Last Updated**: 2024
