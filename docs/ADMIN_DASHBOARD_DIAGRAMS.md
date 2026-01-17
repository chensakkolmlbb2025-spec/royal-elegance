# Admin Dashboard ASCII Diagrams & Flowcharts

## 📊 Complete Admin Dashboard Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                     ADMIN DASHBOARD ARCHITECTURE                          ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                   │
│                        Navigates to:                                   │
│                        https://app.com/admin                           │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXTJS SERVER COMPONENT                             │
│               /app/admin/page.tsx (AdminPage)                          │
│                                                                         │
│ Renders: Layout structure + sidebar + main content                     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
    ┌─────────────────────┐      ┌──────────────────────┐
    │   AUTH CHECK        │      │   DATA FETCHING      │
    │   (useEffect #1)    │      │ (useAdminData hook)  │
    │                     │      │                      │
    │ 1. getUser()        │      │ 1. Fetch bookings    │
    │ 2. Check role       │      │ 2. Fetch rooms       │
    │ 3. Verify admin     │      │ 3. Transform data    │
    │ 4. Grant access     │      │ 4. Calculate stats   │
    │    or redirect      │      │                      │
    │                     │      │                      │
    │ Duration: 200-800ms │      │ Duration: 300-400ms  │
    └─────────────────────┘      └──────────────────────┘
                │                             │
                ├─ User admin?               │
                │  └─ Yes → setAuth(true)    │
                │     No → redirect to /     │
                │                             │
                └────────────────┬────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   UI RENDERS             │
                    │   (Main dashboard)       │
                    │                          │
                    │ ✓ Auth verified         │
                    │ ✓ Data loaded           │
                    │ ✓ Stats calculated      │
                    │ ✓ Components ready      │
                    └──────────────────────────┘
```

---

## 🔐 Authentication Flow Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                   ADMIN AUTHENTICATION SEQUENCE                            ║
╚════════════════════════════════════════════════════════════════════════════╝

                    USER VISITS /admin
                          │
                          ▼
            ┌──────────────────────────────┐
            │  useEffect #1 TRIGGERS       │
            │  (check auth on mount)       │
            └──────────────┬───────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
        ┌──────────────────┐  ┌──────────────────────┐
        │ QUICK CHECK:     │  │ WAIT FOR SESSION:    │
        │ getUser()        │  │ onAuthStateChange()  │
        │                  │  │                      │
        │ Response:        │  │ Timeout: 800ms       │
        │ - Immediate      │  │                      │
        │ - Fast           │  │ Response:            │
        │                  │  │ - Delayed            │
        │                  │  │ - Waits for session  │
        └────────┬─────────┘  └──────┬───────────────┘
                 │                   │
        ┌────────┴──────┬────────────┴─────┐
        │               │                  │
        ▼               ▼                  ▼
    USER FOUND     NO USER             TIMEOUT
        │          IMMEDIATELY          TRIGGER
        │               │                  │
        ▼               ▼                  ▼
    QUERY          SUBSCRIBE           REDIRECT
    PROFILES       TO AUTH             TO /
    TABLE          CHANGES
        │               │
        ├─ ROLE      ┌──┴──┐
        │ CHECK      │     │
        │            ▼     ▼
        │        SESSION FOUND    TIMEOUT
        │        FROM SUPABASE    (800ms+)
        │            │                │
        │            ├─ QUERY        REDIRECT
        │            │ PROFILES      TO /
        │            │               │
        │            ├─ ROLE         ├─ Authorization
        │            │ CHECK         │  failed
        │            │               │
        │    ┌───────┼───────┐       │
        │    │               │       │
        ▼    ▼               ▼       ▼
    ┌────────────┐   ┌───────────────────┐
    │ ROLE CHECK │   │ NOT AUTHORIZED    │
    └────┬───────┘   │                   │
         │           │ Set:              │
    ┌────┴────┐      │ - user = null     │
    │          │      │ - isAuth = false  │
    ▼          ▼      │                   │
  ADMIN    NOT ADMIN  │ Action:           │
   │          │       │ router.push("/")  │
   │          │       │                   │
   ▼          ▼       └───────────────────┘
SET:     REDIRECT
setUser  TO /
setAuth
(true)

   ▼
┌─────────────────────┐
│ AUTHORIZED          │
│ Dashboard renders   │
│ Data loads          │
│ Admin can interact  │
└─────────────────────┘
```

---

## 📈 Data Fetching Flow

```
╔════════════════════════════════════════════════════════════════════════════╗
║              ADMIN DATA FETCHING & TRANSFORMATION                         ║
╚════════════════════════════════════════════════════════════════════════════╝

                    USER LOGGED IN
                         │
                         ▼
            ┌──────────────────────────┐
            │ useAdminData Hook Called  │
            │ with user parameter      │
            └──────────────┬───────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
        ┌──────────────────┐  ┌────────────────┐
        │ FETCH BOOKINGS   │  │ Wait for user  │
        │                  │  │ to be set      │
        │ Query:           │  │                │
        │ SELECT * FROM    │  │ Dependencies:  │
        │ bookings ORDER   │  │ [user]         │
        │ BY created_at    │  │                │
        │ DESC             │  │ If no user →   │
        │                  │  │ Skip fetch     │
        │ Status: Loading  │  │                │
        └────────┬─────────┘  └────────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ DATA TRANSFORMATION  │
        │                      │
        │ Convert DB format    │
        │ to TypeScript types: │
        │                      │
        │ - created_at         │
        │   → new Date(...)    │
        │ - check_in_date      │
        │   → checkInDate      │
        │ - guest_name         │
        │   → guestName        │
        │ - total_price        │
        │   → totalPrice       │
        │ - status             │
        │   → status (as-is)   │
        │                      │
        │ Result: Booking[]    │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ FETCH ROOMS          │
        │                      │
        │ Call: getRooms()     │
        │                      │
        │ Returns: Room[]      │
        │                      │
        │ Parallel to bookings │
        └────────┬─────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    Bookings          Rooms
    Loaded            Loaded
        │                 │
        └────────┬────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ CALCULATE STATS          │
        │ (useMemo - memoized)     │
        │                          │
        │ Input: bookings, rooms   │
        │                          │
        │ Calculate:               │
        │ ├─ totalBookings         │
        │ │  = bookings.length     │
        │ │                        │
        │ ├─ confirmedBookings     │
        │ │  = bookings.filter(    │
        │ │    status='confirmed'  │
        │ │  ).length              │
        │ │                        │
        │ ├─ totalRevenue          │
        │ │  = sum(totalPrice)     │
        │ │    where status ≠      │
        │ │    'cancelled'         │
        │ │                        │
        │ └─ occupancyRate         │
        │    = (occupied/total)*100│
        │                          │
        │ Only recalc when:        │
        │ bookings or rooms change │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ UPDATE STATE     │
        │                  │
        │ setBookings(...) │
        │ setRooms(...)    │
        │ setLoading(false)│
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ RETURN HOOK DATA │
        │                  │
        │ {                │
        │   bookings: [...] │
        │   rooms: [...]   │
        │   loading: false │
        │   stats: {       │
        │     total, conf  │
        │     revenue, occ │
        │   }              │
        │ }                │
        └──────────────────┘
```

---

## 🎨 UI Rendering Flow

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        UI RENDERING SEQUENCE                              ║
╚════════════════════════════════════════════════════════════════════════════╝

                   AUTHORIZATION OK
                   DATA LOADED
                         │
                         ▼
            ┌─────────────────────────┐
            │ RENDER LAYOUT           │
            │ Main Container:         │
            │ <div className="flex">  │
            └──────────────┬──────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
    ┌──────────────────┐    ┌─────────────────────────┐
    │ SIDEBAR          │    │ MAIN CONTENT            │
    │ (Desktop)        │    │ <main className=...>    │
    │                  │    │                         │
    │ hidden xl:block  │    │ Mobile visible          │
    │ (invisible <xl)  │    │ xl:pl-64 (offset)       │
    │                  │    │                         │
    │ ✓ Logo/Title     │    │ ┌─────────────────────┐ │
    │ ✓ Nav items (10) │    │ │ MOBILE HEADER       │ │
    │ ✓ User profile   │    │ │ (visible <xl)       │ │
    │ ✓ Sign out       │    │ │                     │ │
    │                  │    │ │ ✓ Logo              │ │
    │ w-64, fixed      │    │ │ ✓ Menu button       │ │
    │ inset-y-0        │    │ │                     │ │
    │                  │    │ └─────────────────────┘ │
    └──────────────────┘    │                         │
                            │ ┌─────────────────────┐ │
                            │ │ CONTENT AREA        │ │
                            │ │                     │ │
                            │ │ ┌─────────────────┐ │ │
                            │ │ │ TOP BAR         │ │ │
                            │ │ │ Title + Date    │ │ │
                            │ │ │ (from menu item)│ │ │
                            │ │ └─────────────────┘ │ │
                            │ │                     │ │
                            │ │ ┌─────────────────┐ │ │
                            │ │ │ TAB CONTENT     │ │ │
                            │ │ │                 │ │ │
                            │ │ │ Active Content: │ │ │
                            │ │ │ (renderContent) │ │ │
                            │ │ │                 │ │ │
                            │ │ │ Case dashboard: │ │ │
                            │ │ │ - Stats (4 cards)│ │ │
                            │ │ │ - Charts (2)    │ │ │
                            │ │ │ - Recent (1)    │ │ │
                            │ │ │                 │ │ │
                            │ │ │ Case other:     │ │ │
                            │ │ │ - Component     │ │ │
                            │ │ │   renders its   │ │ │
                            │ │ │   own content   │ │ │
                            │ │ └─────────────────┘ │ │
                            │ └─────────────────────┘ │
                            └─────────────────────────┘

MOBILE SHEET (DRAWER):
┌─────────────────────┐
│ SHEET CONTENT       │
│ (when open)         │
│                     │
│ ✓ Logo/Title        │
│ ✓ Nav items (10)    │
│ ✓ User profile      │
│ ✓ Sign out          │
│                     │
│ Width: w-64         │
│ Side: left          │
│                     │
│ Closes when:        │
│ - Item clicked      │
│ - Close button      │
│ - Outside click     │
└─────────────────────┘
```

---

## 🔀 Tab Navigation & Animation

```
╔════════════════════════════════════════════════════════════════════════════╗
║                   TAB SWITCHING & ANIMATION FLOW                          ║
╚════════════════════════════════════════════════════════════════════════════╝

                   ADMIN CLICKS MENU ITEM
                          │
                          ▼
            ┌──────────────────────────┐
            │ Button.onClick() fired   │
            │                          │
            │ setActiveTab(item.value) │
            │ (update state)           │
            │                          │
            │ if mobile:               │
            │ setIsMobileMenuOpen(...) │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │ COMPONENT RE-RENDERS     │
            │ with new activeTab value │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │ renderContent() executes     │
            │ switch(activeTab) { ... }    │
            │                              │
            │ Returns JSX for new tab      │
            └──────────────┬───────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
    IF "dashboard"              IF Other Tab
        │                           │
        ▼                           ▼
    ┌─────────────────┐    ┌──────────────────┐
    │ Return:         │    │ Return:          │
    │ ├─ Stats (4)    │    │ <BookingMgmt/>   │
    │ ├─ Charts (2)   │    │ <UserMgmt/>      │
    │ └─ Recent (1)   │    │ <RoomMgmt/>      │
    │                 │    │ etc.             │
    │ With animation: │    │                  │
    │ - Enter fade-in │    │ Each component   │
    │ - Exit fade-out │    │ loads its own    │
    │                 │    │ data             │
    └──────┬──────────┘    └────────┬─────────┘
           │                        │
           └────────────┬───────────┘
                        │
                        ▼
            ┌──────────────────────────────┐
            │ FRAMER MOTION ANIMATION      │
            │                              │
            │ <AnimatePresence mode="wait">│
            │   <motion.div key={activeTab}│
            │     initial={{               │
            │       opacity: 0,            │
            │       y: 10                  │
            │     }}                       │
            │     animate={{               │
            │       opacity: 1,            │
            │       y: 0                   │
            │     }}                       │
            │     exit={{                  │
            │       opacity: 0,            │
            │       y: -10                 │
            │     }}                       │
            │     transition={{            │
            │       duration: 0.3          │
            │     }}                       │
            │   >                          │
            │     {renderContent()}        │
            │   </motion.div>              │
            │ </AnimatePresence>           │
            └──────────────┬───────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
            OLD TAB             NEW TAB
            EXITING             ENTERING
                │                     │
                ├─ Fade out      ├─ Fade in
                ├─ Slide down    ├─ Slide up
                ├─ 300ms         ├─ 300ms
                │                     │
                └──────────────────────┘
                        │
                        ▼
            ┌──────────────────────────┐
            │ ANIMATION COMPLETE       │
            │                          │
            │ New tab now visible      │
            │ Old tab removed from DOM │
            │ User sees smooth         │
            │ transition               │
            └──────────────────────────┘
```

---

## 🔐 Sign Out Flow

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        SIGN OUT SEQUENCE                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

                   USER CLICKS "SIGN OUT"
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Button.onClick triggered    │
            │ handleSignOut() called       │
            └──────────────┬──────────────┘
                           │
                           ▼
            ┌─────────────────────────────┐
            │ TRY BLOCK                   │
            │                             │
            │ supabase.auth.signOut()     │
            └──────────────┬──────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
        ┌─────────────────┐   ┌──────────────────┐
        │ SUCCESS         │   │ ERROR            │
        │                 │   │                  │
        │ ✓ Session       │   │ ✗ Sign out failed│
        │ cleared         │   │                  │
        │ ✓ Auth token    │   │ console.error()  │
        │ cleared         │   │                  │
        │ ✓ Cookies       │   │ Return early     │
        │ deleted         │   │                  │
        │                 │   │                  │
        └────────┬────────┘   └──────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ CLEAR STATE      │
        │                  │
        │ setUser(null)    │
        │ setIsAuth(false) │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ REDIRECT         │
        │                  │
        │ router.push("/") │
        │ (go to home page)│
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ HOME PAGE        │
        │ DISPLAYED        │
        │                  │
        │ User now signed  │
        │ out and logged   │
        │ out from admin   │
        └──────────────────┘
```

---

## 📱 Responsive Layout Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    RESPONSIVE LAYOUT BREAKDOWN                            ║
╚════════════════════════════════════════════════════════════════════════════╝

DESKTOP (≥ 1280px / xl breakpoint):
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│ ┌─────────┬────────────────────────────────────────────────┐  │
│ │ SIDEBAR │ MAIN CONTENT AREA                             │  │
│ │         │                                                │  │
│ │ FIXED   │ ┌───────────────────────────────────────────┐ │  │
│ │ w-64    │ │ TOP BAR (title, description)             │ │  │
│ │ xl:block│ └───────────────────────────────────────────┘ │  │
│ │         │                                                │  │
│ │ Logo    │ ┌───────────────────────────────────────────┐ │  │
│ │ Menu(10)│ │ TAB CONTENT (animated)                    │ │  │
│ │ Profile │ │                                            │  │
│ │ Signout │ │ Grid responsive:                          │  │
│ │         │ │ ├─ md:grid-cols-2                         │  │
│ │ inset-y │ │ └─ lg:grid-cols-4                         │  │
│ │         │ │                                            │  │
│ │ w-64    │ │                                            │  │
│ │ pl-64   │ │                                            │  │
│ └─────────┴────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

TABLET (768px - 1279px / md breakpoint):
┌────────────────────────────────────┐
│ HEADER (visible, xl:hidden)         │
│ ┌────────────────────────────────┐ │
│ │ Logo │ Menu Button (Sheet menu)│ │
│ └────────────────────────────────┘ │
│                                    │
│ MAIN CONTENT (full width)          │
│ ┌────────────────────────────────┐ │
│ │ Top bar (title, desc)          │ │
│ ├────────────────────────────────┤ │
│ │ Tab content                    │ │
│ │ Grid: md:grid-cols-2           │ │
│ │                                │ │
│ │ Stats: 2 per row               │ │
│ │                                │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘

MOBILE (< 768px):
┌──────────────────────┐
│ HEADER               │
│ ┌──────────────────┐ │
│ │Logo    Menu [☰] │ │
│ └──────────────────┘ │
├──────────────────────┤
│ SHEET (Drawer)       │
│ (when open)          │
│ ┌──────────────────┐ │
│ │ Logo             │ │
│ │ Menu items       │ │
│ │ Profile          │ │
│ │ Sign out         │ │
│ └──────────────────┘ │
│                      │
│ MAIN CONTENT         │
│ (full width)         │
│ ┌──────────────────┐ │
│ │ Title & desc     │ │
│ ├──────────────────┤ │
│ │ Tab content      │ │
│ │                  │ │
│ │ Grid: 1 col      │ │
│ │                  │ │
│ │ Stats: full w    │ │
│ │ Charts: stacked  │ │
│ └──────────────────┘ │
└──────────────────────┘

BREAKPOINTS:
├─ Mobile:  < 768px   (hidden xl:block, Sheet visible)
├─ Tablet:  768-1023px (md:grid-cols-2, partial sidebar)
├─ Large:  1024-1279px (lg:grid-cols-4, still no sidebar)
└─ Desktop: ≥1280px   (xl:block, fixed sidebar, offset content)

VISIBILITY CLASSES:
├─ hidden xl:block    → Sidebar (only ≥xl)
├─ xl:hidden          → Mobile header & menu (only <xl)
├─ xl:pl-64           → Content offset (only ≥xl)
├─ md:grid-cols-2     → 2 columns (≥768px)
└─ lg:grid-cols-4     → 4 columns (≥1024px)
```

---

## 🔄 State Management Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    STATE MANAGEMENT HIERARCHY                             ║
╚════════════════════════════════════════════════════════════════════════════╝

AdminPage Component
│
├─── AUTH STATE
│    ├─ user: SupabaseUser | null
│    │  └─ Tracks logged-in user
│    │
│    ├─ isAuthorized: boolean
│    │  └─ Is user admin?
│    │
│    └─ authLoading: boolean
│       └─ Auth check in progress?
│
├─── NAVIGATION STATE
│    ├─ activeTab: string ("dashboard" | "bookings" | etc.)
│    │  └─ Which menu item selected?
│    │
│    └─ isMobileMenuOpen: boolean
│       └─ Is mobile drawer open?
│
└─── ADMIN DATA (from useAdminData hook)
     │
     ├─ bookings: Booking[]
     │  └─ All fetched bookings
     │
     ├─ rooms: Room[]
     │  └─ All fetched rooms
     │
     ├─ loading: boolean
     │  └─ Data fetch in progress?
     │
     └─ stats (useMemo): {
        ├─ totalBookings: number
        ├─ confirmedBookings: number
        ├─ totalRevenue: number
        └─ occupancyRate: number
     }

STATE UPDATES:
├─ setUser()              → When user logs in
├─ setIsAuthorized()      → When auth verified
├─ setActiveTab()         → When menu clicked
├─ setIsMobileMenuOpen()  → When menu toggled
├─ setBookings()          → When data fetched
├─ setRooms()             → When rooms fetched
└─ setLoading()           → When data load done
```

---

## ⏱️ Timeline Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║              ADMIN DASHBOARD LOADING TIMELINE                             ║
╚════════════════════════════════════════════════════════════════════════════╝

TIME    EVENT                               DURATION
────────────────────────────────────────────────────
0ms     Page loads                          
        ├─ HTML parsed                      ~50ms
        ├─ React component mounts           ~10ms
        └─ State initialized                ~10ms
                                            ─────
        Cumulative: ~70ms

70ms    Auth check starts
        └─ useEffect #1 triggered           
                                            
100ms   supabase.auth.getUser() call        ~150ms
                                            (network call)
                                            ─────

250ms   Auth verified
        ├─ User found: ✓
        ├─ Role checked: admin ✓
        ├─ State updated:
        │  ├─ setUser()
        │  ├─ setIsAuthorized(true)
        │  └─ setAuthLoading(false)
        └─ Component re-renders             ~50ms
                                            ─────

300ms   Data fetch starts
        ├─ useAdminData hook triggered      
        ├─ useEffect #2 runs                
        │
        ├─ Parallel fetch:
        │  ├─ supabase.from("bookings")
        │  │  .select("*")                  ~100ms
        │  │
        │  └─ getRooms()                    ~100ms
                                            ─────

400ms   Data transform & stats
        ├─ Convert booking dates            ~30ms
        ├─ Calculate stats (useMemo)        ~20ms
        └─ State updates:
           ├─ setBookings()
           ├─ setRooms()
           └─ setLoading(false)             ~20ms
                                            ─────

450ms   UI renders
        ├─ Component render pass            ~30ms
        ├─ Children components mount        ~20ms
        └─ Animation starts                 
                                            ─────

500ms   DASHBOARD VISIBLE ✓
        │
        └─ Ready for user interaction


KEY METRICS:
├─ Auth to authorization: 200-800ms
├─ Data fetch (parallel): 100-150ms
├─ Data transform: 50-70ms
├─ Total load time: 400-500ms
└─ Target: < 1000ms (under 1 second)

OPTIMIZATION OPPORTUNITIES:
├─ Parallel fetch (bookings + rooms)
├─ Data transform during fetch
├─ useMemo for stats calculation
├─ Lazy load tab components
└─ Prefetch data on menu hover
```

---

## 🎯 Component Interaction Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║              ADMIN DASHBOARD COMPONENT INTERACTIONS                       ║
╚════════════════════════════════════════════════════════════════════════════╝

AdminPage (main container)
│
├─ useAdminData hook
│  ├─ Fetch bookings
│  ├─ Fetch rooms
│  └─ Calculate stats
│
├─ SidebarContent (desktop)
│  ├─ MENU_ITEMS map
│  │  └─ Button onClick → setActiveTab
│  │
│  ├─ User profile display
│  │  └─ Shows user email
│  │
│  └─ Sign out button
│     └─ handleSignOut
│
├─ Mobile Header (< xl)
│  ├─ Logo display
│  └─ Menu trigger → Sheet
│
├─ Sheet (mobile drawer)
│  ├─ Mobile sidebar content
│  ├─ Menu items
│  └─ Close on item click
│
└─ Main Content Area
   ├─ Top bar
   │  ├─ Tab title
   │  └─ Current date
   │
   └─ Tab Content (animated)
      ├─ If activeTab = "dashboard"
      │  ├─ StatsCard (4x)
      │  │  └─ Receives: stats data
      │  ├─ RevenueChart
      │  │  └─ Receives: bookings
      │  ├─ RoomStatusOverview
      │  │  └─ Receives: rooms
      │  └─ BookingList
      │     └─ Receives: bookings, rooms
      │
      └─ Else
         ├─ BookingManagement
         ├─ UserManagement
         ├─ RoomManagement
         ├─ FloorManagement
         ├─ RoomTypeManagement
         ├─ ServiceCategoryManagement
         ├─ ServiceManagement
         ├─ RoomAvailabilityChecker
         └─ BookingCalendar
            (each component loads its own data)


DATA FLOW:
└─ useAdminData hook provides:
   ├─ bookings → Passed to tab components
   ├─ rooms → Passed to tab components
   └─ stats → Displayed in dashboard overview


STATE CHANGES:
└─ User interactions:
   ├─ Click menu → setActiveTab()
   ├─ Click sign out → handleSignOut()
   ├─ Click mobile menu → setIsMobileMenuOpen()
   └─ Tab components handle their own CRUD
```

---

**ASCII Diagrams**: ✅ Complete  
**Version**: 1.0  
**Total Diagrams**: 10+  
**Last Updated**: 2024
