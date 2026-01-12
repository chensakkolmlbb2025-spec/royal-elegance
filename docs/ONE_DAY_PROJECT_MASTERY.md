# 🚀 One-Day Project Mastery Roadmap
## Royal Elegance Hotel Booking System - Complete Understanding Guide

> **Goal**: Full comprehension of the entire project architecture, features, and codebase in 8 hours

---

## 📋 Table of Contents
1. [Hour 1: Project Foundation & Architecture](#hour-1-project-foundation--architecture-800---900-am)
2. [Hour 2: Database Schema & Data Flow](#hour-2-database-schema--data-flow-900---1000-am)
3. [Hour 3: Authentication & User Management](#hour-3-authentication--user-management-1000---1100-am)
4. [Hour 4: Core Features - Booking System](#hour-4-core-features---booking-system-1100-am---1200-pm)
5. [Hour 5: UI Components & Design System](#hour-5-ui-components--design-system-100---200-pm)
6. [Hour 6: Payment & Services](#hour-6-payment--services-200---300-pm)
7. [Hour 7: Admin & Staff Dashboards](#hour-7-admin--staff-dashboards-300---400-pm)
8. [Hour 8: Integration & Deployment](#hour-8-integration--deployment-400---500-pm)

---

## Hour 1: Project Foundation & Architecture (8:00 - 9:00 AM)

### 🎯 Objective
Understand the project structure, tech stack, and how everything connects.

### 📚 Study Materials

#### 1.1 Read Project Overview (10 minutes)
**Files to read:**
- `README.md` - Project description
- `package.json` - Dependencies and scripts
- `docs/PROJECT_PRESENTATION.md` - Feature overview

**Key Questions to Answer:**
- What problem does this project solve?
- Who are the target users? (Guests, Staff, Admin)
- What are the main features?

#### 1.2 Technology Stack Analysis (15 minutes)
**Core Technologies:**
```
Frontend:
├── Next.js 16.1.1 (App Router + Turbopack)
├── React 18.3.1
├── TypeScript
├── Tailwind CSS
└── Framer Motion (animations)

Backend:
├── Supabase (PostgreSQL database)
├── Supabase Auth (authentication)
└── Supabase Realtime (live updates)

Payment:
├── Stripe (payment processing)
└── KHQR (local payment method)

UI Libraries:
├── Radix UI (accessible components)
├── shadcn/ui (component library)
└── Lucide React (icons)
```

**Action Items:**
1. Open `tsconfig.json` - understand TypeScript configuration
2. Open `tailwind.config.ts` - see design system tokens
3. Open `next.config.mjs` - understand Next.js setup

#### 1.3 Project Structure Deep Dive (20 minutes)
**Study this folder structure:**

```
ite_hotel/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Page routes
│   │   ├── page.tsx             # Landing page
│   │   ├── home/                # Home page
│   │   ├── rooms/               # Room listing & details
│   │   ├── services/            # Services catalog
│   │   ├── bookings/            # User reservations
│   │   ├── profile/             # User profile
│   │   ├── payment/             # Payment processing
│   │   ├── booking-confirmation/# Confirmation page
│   │   ├── admin/               # Admin dashboard
│   │   ├── staff/               # Staff portal
│   │   └── auth/                # Login/signup
│   ├── api/                     # API routes
│   │   ├── payments/            # Payment endpoints
│   │   └── webhooks/            # Stripe webhooks
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   ├── layout/                  # Layout components (navbar, footer)
│   ├── booking/                 # Booking-related components
│   ├── payment/                 # Payment components
│   ├── admin/                   # Admin-specific components
│   ├── dashboard/               # Dashboard widgets
│   ├── landing/                 # Landing page sections
│   ├── rooms/                   # Room components
│   └── user/                    # User-facing components
│
├── lib/                         # Core logic
│   ├── supabase/               # Supabase clients
│   ├── supabase-service.ts     # Database operations
│   ├── types.ts                # TypeScript types
│   ├── auth-context.tsx        # Authentication context
│   └── stripe.ts               # Stripe configuration
│
├── database/                    # Database scripts
│   ├── database-ultimate-schema.sql  # Full schema
│   ├── seed-*.sql              # Seed data scripts
│   └── fix-*.sql               # Migration scripts
│
├── hooks/                       # Custom React hooks
├── utils/                       # Utility functions
├── styles/                      # Additional styles
├── public/                      # Static assets
└── docs/                        # Documentation
```

**Action Items:**
1. Navigate through each folder in VS Code
2. Note the naming conventions (kebab-case for files, PascalCase for components)
3. Understand the separation of concerns

#### 1.4 Data Flow Overview (15 minutes)
**Draw this mental model:**

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │
       │ 1. User Action (Click, Submit)
       ▼
┌──────────────────┐
│   React Page     │
│   (app/*/page)   │
└──────┬───────────┘
       │
       │ 2. Call Service Function
       ▼
┌──────────────────────┐
│ supabase-service.ts  │
│ (lib/)               │
└──────┬───────────────┘
       │
       │ 3. Database Query
       ▼
┌──────────────────┐
│    Supabase      │
│   PostgreSQL     │
└──────┬───────────┘
       │
       │ 4. Return Data
       ▼
┌──────────────────┐
│   React State    │
│   (useState)     │
└──────┬───────────┘
       │
       │ 5. Re-render UI
       ▼
┌──────────────────┐
│   User Sees      │
│   Updated Page   │
└──────────────────┘
```

**Quiz Yourself:**
- Where are the page routes defined?
- Where is the database logic?
- Where are reusable components?
- Where are TypeScript types defined?

---

## Hour 2: Database Schema & Data Flow (9:00 - 10:00 AM)

### 🎯 Objective
Master the database structure and understand how data flows through the application.

### 📚 Study Materials

#### 2.1 Database Schema Study (25 minutes)
**Open:** `database/database-ultimate-schema.sql`

**Core Tables to Understand:**

```sql
1. profiles (Users)
   ├── id (UUID, links to auth.users)
   ├── email, full_name, phone
   ├── role (guest, staff, admin)
   ├── avatar_url
   └── created_at, updated_at

2. room_types (Room Categories)
   ├── id, name, slug
   ├── description, base_price
   ├── max_occupancy, size_sqm
   ├── bed_type, view_type
   ├── amenities (JSON array)
   └── image_url, images (array)

3. rooms (Actual Rooms)
   ├── id, room_number, floor
   ├── room_type_id (FK → room_types)
   ├── status (available, occupied, maintenance, reserved)
   └── last_cleaned, created_at

4. bookings (Reservations)
   ├── id, booking_reference
   ├── user_id (FK → profiles)
   ├── room_id (FK → rooms)
   ├── room_type_id (FK → room_types)
   ├── check_in_date, check_out_date
   ├── guest_count, guest_name, guest_email, guest_phone
   ├── status (pending, confirmed, cancelled, checked_in, checked_out, no_show)
   ├── total_price, room_price, services_price
   ├── payment_status, payment_method
   └── special_requests, internal_notes

5. service_categories
   ├── id, name, slug, icon
   ├── description, sort_order
   └── created_at

6. services
   ├── id, name, description
   ├── category_id (FK → service_categories)
   ├── price, duration_minutes
   ├── available, max_capacity
   └── image_url

7. booking_services (Many-to-Many)
   ├── booking_id (FK → bookings)
   ├── service_id (FK → services)
   └── quantity, price

8. activity_logs (Audit Trail)
   ├── id, user_id, action
   ├── entity_type, entity_id
   ├── details (JSON)
   └── created_at
```

**Action Items:**
1. Sketch the ER diagram on paper
2. Identify all foreign key relationships
3. Note the enums (room status, booking status, user roles)

#### 2.2 Row Level Security (RLS) Policies (15 minutes)
**Concept**: Supabase uses PostgreSQL RLS to secure data access

**Key Policies:**
```sql
bookings table:
- Users can view their own bookings
- Staff/Admin can view all bookings
- Only authenticated users can create bookings
- Only owner, staff, or admin can update

profiles table:
- Users can view their own profile
- Staff/Admin can view all profiles
- Users can update their own profile

rooms table:
- Everyone can view available rooms
- Only staff/admin can modify
```

**Action Items:**
1. Read the RLS policies in the schema file
2. Understand how authentication affects data access
3. Note which operations require which roles

#### 2.3 Database Operations Study (20 minutes)
**Open:** `lib/supabase-service.ts`

**Key Functions to Understand:**

```typescript
// Room Operations
getRoomTypes() → RoomType[]
getRooms() → Room[]
getRoomById(id) → Room
updateRoomStatus(roomId, status) → void

// Booking Operations
createBooking(data) → Booking
getBookings() → Booking[]
getBookingsByUser(userId) → Booking[]
updateBooking(id, data) → Booking
checkInBooking(id, staffId) → Booking
checkOutBooking(id, staffId) → Booking
cancelBooking(id, userId) → Booking
markBookingNoShow(id, staffId) → Booking

// Service Operations
getServices() → Service[]
getServiceCategories() → ServiceCategory[]

// User Operations
getProfile(userId) → Profile
updateProfile(userId, data) → Profile
```

**Study Pattern:**
```typescript
// Typical function structure:
export async function getFunctionName(params) {
  const supabase = createClient()  // 1. Create client
  
  const { data, error } = await supabase  // 2. Query database
    .from('table_name')
    .select('columns')
    .eq('column', value)
    
  if (error) throw error  // 3. Error handling
  
  return transformData(data)  // 4. Transform & return
}
```

**Quiz Yourself:**
- How do you create a booking?
- How do you check in a guest?
- How do room status updates work?
- What happens when a booking is cancelled?

---

## Hour 3: Authentication & User Management (10:00 - 11:00 AM)

### 🎯 Objective
Understand the authentication flow and user role management.

### 📚 Study Materials

#### 3.1 Authentication Architecture (20 minutes)
**Core Files:**
- `lib/auth-context.tsx` - Auth state management
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client
- `app/auth/login/page.tsx` - Login page
- `app/auth/signup/page.tsx` - Signup page

**Authentication Flow:**
```
1. User Signup
   └→ POST to Supabase Auth
   └→ Email verification sent
   └→ Profile created via trigger
   └→ Default role: "guest"

2. User Login
   └→ POST credentials to Supabase
   └→ Session stored in cookies
   └→ JWT token issued
   └→ User redirected to home

3. Auth State Management
   └→ AuthProvider wraps app
   └→ useAuth() hook available everywhere
   └→ Auth state synced globally
   └→ Protected routes check auth
```

**User Roles:**
```typescript
type UserRole = 'guest' | 'staff' | 'admin'

// Role Permissions:
guest:
  - Browse rooms & services
  - Create bookings
  - View own bookings
  - Manage profile

staff:
  - All guest permissions
  - View all bookings
  - Check-in/check-out guests
  - Mark no-shows
  - View dashboard

admin:
  - All staff permissions
  - Manage rooms
  - Manage services
  - View analytics
  - Manage bookings
  - Access admin dashboard
```

#### 3.2 Protected Routes Pattern (15 minutes)
**Study this pattern from pages:**

```typescript
// Example: app/admin/page.tsx
export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')  // Not logged in
        return
      }

      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/')  // Not authorized
        return
      }

      setUser(user)  // Authorized!
    }

    checkAuth()
  }, [])

  if (!user) return <Loading />

  return <ActualPage />
}
```

**Action Items:**
1. Trace the auth flow in login page
2. Find all protected routes
3. Understand role-based redirects

#### 3.3 Profile Management (15 minutes)
**Study:**
- `app/profile/page.tsx` - Profile UI
- `components/user/profile-form.tsx` - Profile editing
- `database/add-profile-trigger.sql` - Auto-create profile

**Profile Features:**
- Avatar upload (Supabase Storage)
- Personal info editing
- Phone number
- Auto-created on signup

**Action Items:**
1. Understand how avatar upload works
2. See how profile updates are saved
3. Check the database trigger for auto-creation

#### 3.4 Hands-On Exercise (10 minutes)
**Test the auth flow:**
1. Start dev server: `npm run dev`
2. Go to `/auth/signup` - create test account
3. Check email for verification
4. Login at `/auth/login`
5. Check `/profile` to see your data
6. Try accessing `/admin` (should redirect)
7. Check browser DevTools → Application → Cookies (see auth token)

---

## Hour 4: Core Features - Booking System (11:00 AM - 12:00 PM)

### 🎯 Objective
Master the booking flow from room selection to confirmation.

### 📚 Study Materials

#### 4.1 Room Browsing Flow (15 minutes)
**Pages:** `app/rooms/page.tsx`

**Flow Diagram:**
```
User visits /rooms
    ↓
Page fetches:
  - getRoomTypes() → All room categories
  - getRooms() → All room instances
  - getServices() → Available services
    ↓
Display room cards with filters
    ↓
User selects room type
    ↓
Shows UnifiedBookingForm
```

**Key Components:**
- `components/user/room-card.tsx` - Room display card
- `components/rooms/room-filters.tsx` - Filter controls
- `components/booking/unified-booking-form.tsx` - Main booking form

**Features:**
- Filter by room type, guests, dates
- Real-time availability checking
- Price calculation
- Image galleries

#### 4.2 Booking Creation Process (25 minutes)
**Component:** `components/booking/unified-booking-form.tsx`

**Booking Flow:**
```
1. User fills form:
   - Check-in/check-out dates
   - Guest count
   - Guest information
   - Special requests
   - Optional services

2. Frontend validation:
   - Date validation (check-in < check-out)
   - Guest count ≤ max occupancy
   - Required fields

3. Price calculation:
   room_price = base_price × nights
   services_price = Σ(service.price × quantity)
   total_price = room_price + services_price

4. Create booking:
   await createBooking({
     user_id,
     room_id,
     room_type_id,
     check_in_date,
     check_out_date,
     guest_count,
     guest_name,
     guest_email,
     guest_phone,
     total_price,
     room_price,
     services_price,
     special_requests,
     status: 'pending',
     payment_status: 'pending'
   })

5. Create booking_services records:
   for each selected service:
     insert into booking_services

6. Update room status:
   room.status = 'reserved'

7. Redirect to payment:
   router.push('/payment?bookingId=...')
```

**Action Items:**
1. Read the entire UnifiedBookingForm component
2. Trace the price calculation logic
3. Understand form validation
4. See how services are linked to bookings

#### 4.3 Booking Status Lifecycle (10 minutes)
**Status Flow:**
```
pending
  ↓ (payment confirmed)
confirmed
  ↓ (staff checks in guest)
checked_in
  ↓ (staff checks out guest OR auto-cleanup)
checked_out

Alternative paths:
pending → cancelled (user cancels)
confirmed → no_show (guest doesn't arrive)
```

**Automatic Status Updates:**
- `hooks/use-booking-cleanup.ts` - Runs every 5 minutes
- Checks for expired bookings (check-out date passed)
- Marks as `no_show` and frees room
- Updates room status to `available`

#### 4.4 My Reservations Page (10 minutes)
**Page:** `app/bookings/page.tsx`

**Features:**
- 5 tabs: Upcoming, Staying, No Show, History, Cancelled
- Booking cards with all details
- Quick actions:
  - Check-in (if staff/admin)
  - Check-out
  - Cancel
  - Mark no-show
- Real-time updates via Supabase subscription
- Booking reference QR codes
- Guest information display

**Action Items:**
1. Study the tab filtering logic
2. Understand the booking card component
3. See how real-time updates work

---

## Hour 5: UI Components & Design System (1:00 - 2:00 PM)

### 🎯 Objective
Understand the component architecture and design patterns.

### 📚 Study Materials

#### 5.1 Design System Tokens (10 minutes)
**File:** `tailwind.config.ts`

**Design Tokens:**
```typescript
colors: {
  primary: '#d4af37',      // Gold
  accent: '#c9a961',       // Light gold
  background: '#fafafa',   // Off-white
  foreground: '#0a0a0a',   // Near black
}

fontFamily: {
  sans: ['Inter', ...],    // Body text
  display: ['Orbitron', ...] // Headings
}

animations: {
  'fade-in': 'fadeIn 0.3s ease-in',
  'slide-up': 'slideUp 0.4s ease-out',
  'spin': 'spin 1s linear infinite',
}
```

**Custom CSS Classes:**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.gradient-gold {
  background: linear-gradient(135deg, #d4af37 0%, #c9a961 100%);
}
```

#### 5.2 Component Library Structure (15 minutes)
**shadcn/ui Components** (`components/ui/`)

```
Base Components:
├── button.tsx          - Buttons with variants
├── card.tsx           - Container cards
├── input.tsx          - Form inputs
├── label.tsx          - Form labels
├── select.tsx         - Dropdowns
├── tabs.tsx           - Tab navigation
├── dialog.tsx         - Modals
├── badge.tsx          - Status badges
├── separator.tsx      - Divider lines
├── toast.tsx          - Notifications
└── loading.tsx        - Loading states

Patterns:
- Variant-based styling
- Accessible by default (Radix UI)
- TypeScript props
- Composable components
```

**Example Component Study:**
```typescript
// components/ui/button.tsx
interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
}

// Usage:
<Button variant="outline" size="sm">Click Me</Button>
```

#### 5.3 Layout Components (15 minutes)
**Premium Navbar** (`components/layout/premium-navbar.tsx`)

**Features:**
- Sticky header with backdrop blur
- Responsive mobile menu
- Auth state awareness
- Role-based navigation
- Search functionality
- User avatar dropdown

**Premium Footer** (`components/layout/premium-footer.tsx`)

**Features:**
- Multi-column layout
- Social links
- Newsletter signup
- Copyright info

**Loading States** (`components/ui/loading.tsx`)

**Modes:**
- `variant="content"` - Partial loading (navbar/footer visible)
- `variant="fullpage"` - Full page loading
- Customizable message and size

#### 5.4 Animation Patterns (10 minutes)
**Framer Motion Usage:**

```typescript
// Fade in on scroll
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>

// Stagger children
<motion.div variants={containerVariants}>
  {items.map(item => (
    <motion.div variants={itemVariants} key={item.id}>
      {item.content}
    </motion.div>
  ))}
</motion.div>

// Hover effects
<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  Card
</motion.div>
```

**Action Items:**
1. Find 3 examples of animations in the codebase
2. Identify which components use Framer Motion
3. Understand the animation timing

#### 5.5 Hands-On Exercise (10 minutes)
**Component Exploration:**
1. Open the rooms page in browser
2. Inspect navbar with DevTools
3. Trigger mobile menu
4. Test search functionality
5. Hover over room cards (see animations)
6. Open a dialog/modal
7. Trigger a toast notification

---

## Hour 6: Payment & Services (2:00 - 3:00 PM)

### 🎯 Objective
Understand payment processing and service booking.

### 📚 Study Materials

#### 6.1 Payment Architecture (20 minutes)
**Files:**
- `lib/stripe.ts` - Stripe configuration
- `app/api/payments/create-intent/route.ts` - Payment API
- `app/payment/page.tsx` - Payment page
- `components/payment/stripe-payment-element.tsx` - Payment form

**Payment Flow:**
```
1. User creates booking
   └→ bookingId generated
   └→ payment_status: 'pending'

2. Redirect to /payment?bookingId=xxx

3. Payment page loads:
   └→ Fetch booking details
   └→ Create Stripe Payment Intent
      └→ POST /api/payments/create-intent
      └→ Returns clientSecret

4. Stripe Elements renders:
   └→ Card input
   └→ Billing details
   └→ KHQR option (local payment)

5. User submits payment:
   └→ Stripe processes payment
   └→ Webhook called on success
      └→ POST /api/webhooks/stripe
      └→ Update booking.payment_status = 'paid'
      └→ Update booking.status = 'confirmed'

6. Redirect to /booking-confirmation
```

**Stripe Integration:**
```typescript
// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalPrice * 100, // Convert to cents
  currency: 'usd',
  metadata: {
    bookingId: booking.id,
    userId: booking.user_id
  }
})

// Webhook handling
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)

if (event.type === 'payment_intent.succeeded') {
  // Update booking status
  await updateBooking(bookingId, {
    payment_status: 'paid',
    status: 'confirmed'
  })
}
```

#### 6.2 KHQR Payment (10 minutes)
**Local Payment Method for Cambodia**

**Files:**
- `components/payment/khqr-payment.tsx`
- `public/khqr-code.png` - QR code image

**Flow:**
```
1. User selects KHQR payment
2. QR code displayed
3. User scans with banking app
4. Manual confirmation by admin
   (or automated webhook if configured)
```

#### 6.3 Services System (20 minutes)
**Architecture:**
```
service_categories (Spa, Dining, Activities, etc.)
    ↓
services (Individual services)
    ↓
booking_services (Link to bookings)
```

**Service Booking Flow:**
```
1. Browse services: /services
   └→ Category filters
   └→ Service cards with details

2. Select service
   └→ Click "Book Now"
   └→ If not logged in: redirect to login
   └→ If logged in: go to /services/[id]/book

3. Service booking form:
   └→ Select date & time
   └→ Number of people
   └→ Special requests

4. Add to room booking:
   └→ Can attach to existing booking
   └→ Or create standalone service booking

5. Payment
   └→ Same payment flow as room booking
```

**Components:**
- `components/user/service-card.tsx` - Service display
- `components/user/service-booking-form.tsx` - Booking form
- `app/services/page.tsx` - Service catalog

#### 6.4 Hands-On Exercise (10 minutes)
**Test Payment Flow:**
1. Create a test booking (use test card)
2. Go through payment page
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Check booking status updated
6. View confirmation page

**Test Service Booking:**
1. Browse `/services`
2. Filter by category
3. Select a service
4. Try to book (requires login)

---

## Hour 7: Admin & Staff Dashboards (3:00 - 4:00 PM)

### 🎯 Objective
Understand the management interfaces and admin capabilities.

### 📚 Study Materials

#### 7.1 Admin Dashboard Architecture (20 minutes)
**Page:** `app/admin/page.tsx`

**Features:**
```
Menu Items:
├── Dashboard (Analytics)
├── Bookings Management
├── Rooms Management
├── Services Management
└── User Management

Dashboard Widgets:
├── Statistics Cards
│   ├── Total Bookings
│   ├── Active Guests
│   ├── Revenue
│   └── Occupancy Rate
├── Recent Activity
├── Upcoming Check-ins
└── Revenue Chart
```

**Key Components:**
- `components/admin/booking-management.tsx` - Comprehensive booking admin
- `components/admin/room-management.tsx` - Room CRUD
- `components/admin/service-management.tsx` - Service CRUD
- `components/admin/user-management.tsx` - User admin

**Admin Capabilities:**
```typescript
Booking Management:
- View all bookings (any status)
- Search by guest, reference, room
- Filter by status, date range
- Check-in guests
- Check-out guests
- Cancel bookings
- Mark no-show
- View full booking details
- Real-time updates

Room Management:
- Create new rooms
- Edit room details
- Change room status
- Assign room types
- View room history

Service Management:
- Create new services
- Edit service details
- Set availability
- Manage pricing
- Categorize services

User Management:
- View all users
- Change user roles
- View user bookings
- Disable accounts
```

#### 7.2 Staff Portal (15 minutes)
**Page:** `app/staff/page.tsx`

**Features:**
```
Staff Dashboard:
├── Quick Stats
│   ├── Today's Arrivals
│   ├── Pending Bookings
│   ├── Occupied Rooms
│   └── Rooms Needing Cleaning
│
├── Quick Actions
│   ├── New Booking
│   ├── Check-In
│   ├── Check-Out
│   └── Scan Pass (QR)
│
├── All Bookings Tab
│   └→ Same as admin booking management
│
└── Calendar View
    └→ Visual booking calendar
```

**Quick Actions:**
```typescript
Check-In Dialog:
- Select booking from list
- Confirm guest details
- Update status to 'checked_in'
- Update room status to 'occupied'

Check-Out Dialog:
- Select checked-in booking
- Process check-out
- Update status to 'checked_out'
- Update room status to 'available'

Scan Pass:
- Enter booking reference
- Auto-check-in if valid
- Show guest information
```

#### 7.3 Real-Time Features (15 minutes)
**Supabase Realtime Subscriptions:**

```typescript
// Listen for booking changes
useEffect(() => {
  const channel = supabase
    .channel('bookings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'bookings'
      },
      (payload) => {
        console.log('Booking changed:', payload)
        // Refresh booking list
        fetchBookings()
      }
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [])
```

**Real-Time Use Cases:**
- Admin sees new bookings instantly
- Staff sees check-ins/check-outs live
- Room status updates propagate immediately
- Activity logs update in real-time

#### 7.4 Activity Logging (10 minutes)
**Audit Trail System:**

```typescript
// Every important action is logged
activity_logs table:
{
  user_id: 'who did it',
  action: 'what happened',
  entity_type: 'bookings',
  entity_id: 'booking-id-123',
  details: { old_status: 'pending', new_status: 'confirmed' },
  created_at: timestamp
}

// Examples:
- User created booking
- Staff checked in guest
- Admin cancelled booking
- User updated profile
- Room status changed
```

**View Activity:**
- Admin dashboard shows recent activity
- Each booking shows its history
- Users can see their own actions

---

## Hour 8: Integration & Deployment (4:00 - 5:00 PM)

### 🎯 Objective
Understand deployment, environment setup, and production considerations.

### 📚 Study Materials

#### 8.1 Environment Configuration (15 minutes)
**Files:**
- `.env.local` - Local environment variables
- `lib/supabase/client.ts` - Client config
- `lib/stripe.ts` - Stripe config

**Required Environment Variables:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Server-side only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Setup Checklist:**
```
✓ Create Supabase project
✓ Run database schema SQL
✓ Enable email auth in Supabase
✓ Create Stripe account
✓ Get Stripe test keys
✓ Set up environment variables
✓ Run database seed scripts
```

#### 8.2 Database Setup & Seeding (15 minutes)
**Step-by-step:**

```bash
# 1. Create Supabase project at supabase.com

# 2. Run main schema
# Copy contents of database/database-ultimate-schema.sql
# Paste in Supabase SQL Editor → Run

# 3. Add profile creation trigger
# Run: database/add-profile-trigger.sql

# 4. Seed room floors
# Run: database/seed-floors.sql

# 5. Seed services
# Run: database/seed-services.sql

# 6. Create demo users (optional)
# Run: database/create-demo-users.sql
```

**Database Migrations:**
- `database/fix-rls-recursion.sql` - Fix RLS policies
- `database/fix-booking-rls-policy.sql` - Update booking policies
- Run these if you encounter permission issues

#### 8.3 Deployment to Vercel (15 minutes)
**Deployment Process:**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Build locally first
npm run build

# 3. Deploy
vercel

# 4. Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
# Add all variables from .env.local

# 5. Redeploy
vercel --prod
```

**Vercel Configuration:**
```json
// next.config.mjs
{
  experimental: {
    turbo: true
  },
  images: {
    domains: ['your-supabase-project.supabase.co']
  }
}
```

**Production Checklist:**
```
✓ All environment variables set
✓ Supabase production project
✓ Stripe production keys
✓ Email templates configured
✓ Stripe webhooks configured
✓ Custom domain (optional)
✓ SSL certificate (automatic with Vercel)
```

#### 8.4 Testing Strategy (10 minutes)
**Manual Testing Checklist:**

```
User Flow Tests:
✓ Sign up new account
✓ Verify email
✓ Login
✓ Browse rooms
✓ Create booking
✓ Add services
✓ Complete payment
✓ View confirmation
✓ Check My Bookings
✓ Update profile
✓ Logout

Staff Flow Tests:
✓ Staff login
✓ View dashboard
✓ Check-in guest
✓ Check-out guest
✓ Scan booking reference
✓ View all bookings

Admin Flow Tests:
✓ Admin login
✓ View analytics
✓ Manage bookings
✓ Create/edit rooms
✓ Manage services
✓ View activity logs
```

#### 8.5 Performance Optimization (5 minutes)
**Current Optimizations:**

```typescript
// 1. Image optimization
import Image from 'next/image'
<Image
  src={imageUrl}
  alt="Room"
  width={800}
  height={600}
  loading="lazy"
/>

// 2. Code splitting (automatic with Next.js)
const HeavyComponent = dynamic(() => import('./HeavyComponent'))

// 3. Partial content loading
// Navbar/footer stay visible while content loads

// 4. Database query optimization
// Select only needed columns
.select('id, name, price')

// 5. Caching
// Next.js automatic caching
```

#### 8.6 Final Project Review (10 minutes)
**Complete Architecture Diagram:**

```
┌─────────────────────────────────────────────┐
│          Client Browser (React)              │
│  ┌────────┐  ┌────────┐  ┌──────────┐      │
│  │ Pages  │  │ Comps  │  │  Hooks   │      │
│  └───┬────┘  └───┬────┘  └────┬─────┘      │
│      └───────────┼─────────────┘            │
│                  ▼                            │
│         ┌─────────────────┐                  │
│         │ Supabase Client │                  │
│         └────────┬────────┘                  │
└──────────────────┼──────────────────────────┘
                   │ HTTP/WebSocket
                   ▼
┌──────────────────────────────────────────────┐
│           Supabase (Backend)                 │
│  ┌──────────┐  ┌──────────┐  ┌────────┐    │
│  │   Auth   │  │ Database │  │ Storage│    │
│  │ (JWT)    │  │(Postgres)│  │ (S3)   │    │
│  └──────────┘  └──────────┘  └────────┘    │
│  ┌──────────┐  ┌──────────┐                 │
│  │ Realtime │  │    RLS   │                 │
│  │(WebSocket│  │ Policies │                 │
│  └──────────┘  └──────────┘                 │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│         External Services                    │
│  ┌──────────┐  ┌──────────┐                 │
│  │  Stripe  │  │   KHQR   │                 │
│  │ (Payment)│  │ (Payment)│                 │
│  └──────────┘  └──────────┘                 │
└──────────────────────────────────────────────┘
```

---

## 🎓 Final Assessment Quiz

### Test Your Understanding:

1. **Architecture**: Explain the data flow from user clicking "Book Now" to booking confirmation
2. **Database**: What happens to a room when a booking is checked out?
3. **Authentication**: How does role-based access control work?
4. **Payments**: Describe the Stripe payment intent lifecycle
5. **Real-time**: How do staff members see new bookings instantly?
6. **State Management**: Where is authentication state stored?
7. **API**: Which operations use server-side vs client-side Supabase?
8. **Security**: How does RLS prevent unauthorized data access?
9. **UI/UX**: How does partial content loading improve user experience?
10. **Deployment**: What environment variables are required for production?

---

## 📚 Additional Resources

### Documentation Links:
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

### Project-Specific Docs:
- `docs/DATABASE_SCHEMA_GUIDE.md` - Detailed schema documentation
- `docs/AUTH_SYSTEM_COMPLETE.md` - Authentication guide
- `docs/PREMIUM_DESIGN_GUIDE.md` - Design system
- `docs/REAL_PAYMENT_READY.md` - Payment integration

---

## ✅ Completion Checklist

After 8 hours, you should be able to:

- [ ] Explain the entire project architecture from memory
- [ ] Navigate the codebase confidently
- [ ] Understand every database table and relationship
- [ ] Trace user flows from start to finish
- [ ] Modify features without breaking things
- [ ] Debug issues using DevTools
- [ ] Deploy changes to production
- [ ] Answer technical questions about the system
- [ ] Onboard new team members
- [ ] Contribute new features independently

---

## 🚀 Next Steps

### After Day 1:

**Week 1:**
- Build a new feature (e.g., room reviews)
- Add unit tests
- Improve performance
- Enhance UI/UX

**Week 2:**
- Add advanced analytics
- Implement email notifications
- Add admin reports
- Mobile app optimization

**Long-term:**
- Multi-language support
- Advanced booking rules
- Integration with property management systems
- Machine learning for pricing optimization

---

**Congratulations! You now have comprehensive understanding of the Royal Elegance Hotel Booking System!** 🎉

Last Updated: January 11, 2026
Version: 1.0
