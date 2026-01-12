# Supabase Service Layer — Complete Comprehensive Guide

## Overview

`lib/supabase-service.ts` is the **central data access layer** for the entire hotel booking system. It abstracts all Supabase database operations, providing a clean API for React components to fetch, create, update, and delete data.

**File Location**: `/lib/supabase-service.ts`

**Purpose**: 
- Single source of truth for database operations
- Separation of concerns (database logic separate from UI)
- Type-safe queries with TypeScript
- Consistent error handling
- Data transformation (snake_case ↔ camelCase conversion)
- RLS (Row Level Security) aware

---

## Architecture & Design Patterns

### 1. Client Selection Strategy

Every function follows this pattern:

```typescript
const client = (typeof window !== 'undefined' ? createBrowserClient() : undefined) || supabase
if (!client) throw new Error("Supabase client not initialized")
```

**Why Two Clients?**

```
┌─────────────────────────────────────────────────────┐
│  Client-Side Component (React)                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ createBrowserClient() - Browser Client      │   │
│  │ ✓ Uses authenticated session (auth token)   │   │
│  │ ✓ RLS policies applied                      │   │
│  │ ✓ Secure: user can only access their data   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Server-Side (API Routes)                           │
│ ┌─────────────────────────────────────────────┐    │
│ │ supabase (service role) - Server Client     │    │
│ │ ✓ Runs with full privileges (bypasses RLS) │    │
│ │ ✓ Used for webhooks, admin operations      │    │
│ │ ✓ Only for trusted server code              │    │
│ └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Rule**: If code runs in the browser (components), use browser client. If code runs on server (API routes), use service role client.

### 2. Data Transformation Layers

The file implements a **bidirectional transformation** system:

#### Problem: Snake Case vs Camel Case Mismatch

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE bookings (
  booking_reference VARCHAR,
  check_in_date DATE,
  guest_name VARCHAR,
  room_id UUID,
  payment_status VARCHAR
)
```

**TypeScript Types**:
```typescript
interface Booking {
  bookingReference: string
  checkInDate: Date
  guestName: string
  roomId: string
  paymentStatus: string
}
```

#### Solution: Converter Functions

**1. convertTimestamps()** — Database → TypeScript

Transforms database output (snake_case) to application format (camelCase):

```typescript
convertTimestamps(databaseRow)

// Input (from database):
{
  booking_reference: 'REF123',
  check_in_date: '2026-01-15T00:00:00Z',
  guest_name: 'John Doe',
  room_id: 'abc-123',
  payment_status: 'pending',
  created_at: '2026-01-10T10:00:00Z'
}

// Output (to TypeScript):
{
  bookingReference: 'REF123',
  checkInDate: Date(2026-01-15),  // Timestamp converted to Date object
  guestName: 'John Doe',
  roomId: 'abc-123',
  paymentStatus: 'pending',
  createdAt: Date(2026-01-10)
}
```

**Key Transformations**:
```typescript
// Timestamps
created_at  →  createdAt + Date conversion
updated_at  →  updatedAt + Date conversion
check_in_date  →  checkInDate (and check_in for backward compatibility)
check_out_date  →  checkOutDate (and checkOut for backward compatibility)

// Foreign Keys
floor_id    →  floorId
room_type_id  →  roomTypeId
room_id     →  roomId
user_id     →  userId
category_id →  categoryId

// Descriptive Fields
guest_name  →  guestName
guest_email →  guestEmail
guest_phone →  guestPhone
guest_count →  guestCount (+ guests for backward compatibility)
room_price  →  roomPrice
services_price  →  servicesPrice
total_price →  totalPrice
payment_status  →  paymentStatus
booking_reference  →  bookingReference
payment_method  →  paymentMethod
paid_amount →  paidAmount

// Boolean Fields
is_available  →  available
is_active     →  active
is_default    →  isDefault

// Numeric Fields
floor_number  →  number
total_rooms   →  totalRooms
base_price    →  basePrice
max_occupancy →  maxOccupancy
bed_type      →  bedType
room_size     →  roomSize
room_number   →  roomNumber
sort_order    →  sortOrder

// URLs & Images
thumbnail_url →  thumbnailUrl
```

**2. toSnakeCase()** — TypeScript → Database

Transforms application format (camelCase) to database format (snake_case):

```typescript
toSnakeCase(typescriptObject)

// Input (from TypeScript):
{
  bookingReference: 'REF123',
  checkInDate: Date(2026-01-15),
  guestName: 'John Doe'
}

// Output (to database):
{
  booking_reference: 'REF123',
  check_in_date: '2026-01-15T00:00:00Z',
  guest_name: 'John Doe'
}
```

**Backward Compatibility Feature**:
```typescript
// Virtual bookingType field created on-the-fly
if (converted.room_id) {
  converted.bookingType = 'room'     // Has a room
} else {
  converted.bookingType = 'service'  // No room (service-only booking)
}

// Allows code to use:
if (booking.bookingType === 'room') { ... }
```

### 3. Error Handling Patterns

#### Pattern 1: Foreign Key Constraint Detection

When deleting a service, if other bookings reference it, PostgreSQL raises a foreign key constraint error. The service layer handles this gracefully:

```typescript
export const deleteService = async (id: string): Promise<void> => {
  try {
    await client.from("services").delete().eq("id", id)
  } catch (error) {
    // Detect FK/constraint errors robustly
    const errAny: any = error
    const isFK =
      errAny?.code === '23503' ||  // PostgreSQL FK error code
      errAny?.message?.includes('foreign key') ||
      errAny?.details?.includes('foreign key') ||
      errAny?.hint?.includes('foreign key')

    if (isFK) {
      // Instead of failing, mark service as unavailable (soft delete)
      console.warn(`Service ${id} has bookings, marking unavailable instead`)
      await updateService(id, { available: false })
      return
    }
    
    // If not FK error, rethrow
    throw error
  }
}
```

**Why This Matters:**
- **FK Constraint**: A service has booking_services records referencing it
- **Hard Delete**: Would fail with "violates foreign key constraint"
- **Soft Delete**: Mark `is_available = false` so it's hidden but data remains intact

#### Pattern 2: Booking Existence Validation

Before updating a booking, verify it exists and user has permission:

```typescript
export const updateBooking = async (id: string, booking: Partial<Booking>): Promise<Booking> => {
  // First check if booking exists
  const { data: existingBooking, error: checkError } = await client
    .from("bookings")
    .select("id, status, user_id")
    .eq("id", id)

  if (!existingBooking || existingBooking.length === 0) {
    throw new Error(`Booking ${id} does not exist`)
  }

  // Then update
  const { data, error } = await client
    .from("bookings")
    .update(updateData)
    .eq("id", id)
    .select()

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error(`Cannot update: booking not accessible (may violate RLS policy)`)
  }

  return convertTimestamps(data[0])
}
```

**Why This is Important:**
- **RLS**: If user is not owner and not admin/staff, the update silently fails
- **Better UX**: Explicit error message instead of silent failure
- **Debugging**: Helps distinguish between "booking doesn't exist" vs "no permission"

---

## Core Functions by Domain

### DOMAIN 1: FLOORS (Building Structure)

A hotel has multiple floors. Each floor contains rooms.

#### 1.1 Get All Floors
```typescript
export const getFloors = async (): Promise<Floor[]>
```

**Usage:**
```typescript
const floors = await getFloors()
floors.forEach(floor => {
  console.log(`Floor ${floor.number}: ${floor.name}`)
})
```

**Query**:
```sql
SELECT * FROM floors ORDER BY floor_number
```

**Returns**: Array of floors sorted by floor number (1st floor, 2nd floor, etc.)

#### 1.2 Add a New Floor
```typescript
export const addFloor = async (
  floor: Pick<Floor, "name" | "number" | "description">
): Promise<Floor>
```

**Usage**:
```typescript
const newFloor = await addFloor({
  name: "Premium Suite Floor",
  number: 3,
  description: "Luxury accommodations on floor 3"
})
console.log(newFloor.id)  // Auto-generated UUID
```

**What Happens**:
1. Convert camelCase to snake_case
2. INSERT into floors table
3. Database generates `id` and `created_at`
4. Return converted result

#### 1.3 Update a Floor
```typescript
export const updateFloor = async (
  id: string,
  floor: Partial<Floor>
): Promise<void>
```

**Usage**:
```typescript
await updateFloor(floorId, { description: "Updated description" })
```

#### 1.4 Delete a Floor
```typescript
export const deleteFloor = async (id: string): Promise<void>
```

**Usage**:
```typescript
await deleteFloor(floorId)
```

---

### DOMAIN 2: ROOM TYPES (Room Categories)

A room type is a category (e.g., "Deluxe Suite", "Standard Room"). Each room type has a base price, amenities, and occupancy rules.

#### 2.1 Get All Room Types
```typescript
export const getRoomTypes = async (): Promise<RoomType[]>
```

**Usage**:
```typescript
const types = await getRoomTypes()
// Result:
// [
//   { id: 'rt-1', name: 'Deluxe Suite', basePrice: 250, maxOccupancy: 4, bedType: 'King' },
//   { id: 'rt-2', name: 'Standard Room', basePrice: 120, maxOccupancy: 2, bedType: 'Queen' }
// ]
```

#### 2.2 Add a New Room Type
```typescript
export const addRoomType = async (
  roomType: Omit<RoomType, "id" | "createdAt">
): Promise<string>
```

**Usage**:
```typescript
const roomTypeId = await addRoomType({
  name: "Luxury Penthouse",
  description: "Top-floor luxury suite",
  basePrice: 500,
  maxOccupancy: 6,
  bedType: "King + Queen",
  viewType: "Ocean view",
  amenities: ["WiFi", "Jacuzzi", "Balcony"],
  imageUrl: "https://...",
  images: ["https://...", "https://..."]
})
```

**Returns**: The new room type's ID (string, UUID format)

#### 2.3 Update a Room Type
```typescript
export const updateRoomType = async (
  id: string,
  roomType: Partial<RoomType>
): Promise<void>
```

**Usage**:
```typescript
await updateRoomType(roomTypeId, {
  basePrice: 550,  // Price increase
  available: true
})
```

#### 2.4 Delete a Room Type
```typescript
export const deleteRoomType = async (id: string): Promise<void>
```

**Usage**:
```typescript
await deleteRoomType(roomTypeId)
```

---

### DOMAIN 3: ROOMS (Physical Instances)

Actual rooms in the hotel. Room 101, Room 102, etc. Each room has a type and current status.

#### 3.1 Get All Rooms
```typescript
export const getRooms = async (): Promise<Room[]>
```

**Query with Join**:
```sql
SELECT rooms.*, 
       floors.id, floors.floor_number, floors.name
FROM rooms
LEFT JOIN floors ON rooms.floor_id = floors.id
```

**Returns**: Rooms with floor details included

**Usage**:
```typescript
const rooms = await getRooms()
rooms.forEach(room => {
  console.log(`Room ${room.roomNumber} on Floor ${room.floor?.number}`)
  console.log(`Status: ${room.status}`)  // available, occupied, maintenance, reserved
})
```

#### 3.2 Get Rooms by Floor
```typescript
export const getRoomsByFloor = async (floorId: string): Promise<Room[]>
```

**Usage**:
```typescript
const floor3Rooms = await getRoomsByFloor(floorId)
```

**Query**:
```sql
SELECT * FROM rooms 
WHERE floor_id = $1
```

#### 3.3 Add a New Room
```typescript
export const addRoom = async (
  room: Omit<Room, "id" | "createdAt">
): Promise<string>
```

**Usage**:
```typescript
const newRoomId = await addRoom({
  roomNumber: "301",
  roomTypeId: "rt-1",
  floorId: "floor-3",
  status: "available",
  isActive: true
})
```

**Returns**: The new room's ID

#### 3.4 Update Room Status
```typescript
export const updateRoom = async (
  id: string,
  room: Partial<Room>
): Promise<void>
```

**Usage**:
```typescript
// Mark room for cleaning
await updateRoom(roomId, { status: "maintenance" })

// Room is available again
await updateRoom(roomId, { status: "available" })
```

**Room Status Values**:
```typescript
type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

// available: Can be booked
// occupied: Guest is staying
// maintenance: Being cleaned or repaired
// reserved: Booking confirmed, guest arriving soon
```

#### 3.5 Delete a Room
```typescript
export const deleteRoom = async (id: string): Promise<void>
```

---

### DOMAIN 4: SERVICES (Add-On Services)

Additional services guests can book: spa treatments, restaurant reservations, etc.

#### 4.1 Get All Services
```typescript
export const getServices = async (): Promise<Service[]>
```

**Returns**: All available services with category info

#### 4.2 Add a Service
```typescript
export const addService = async (
  service: Omit<Service, "id" | "createdAt">
): Promise<string>
```

**Usage**:
```typescript
const serviceId = await addService({
  name: "Spa Massage",
  description: "60-minute Swedish massage",
  categoryId: "cat-spa",
  price: 80,
  durationMinutes: 60,
  available: true,
  maxCapacity: 2,
  imageUrl: "https://..."
})
```

#### 4.3 Update a Service
```typescript
export const updateService = async (
  id: string,
  service: Partial<Service>
): Promise<void>
```

#### 4.4 Delete a Service (With Smart Fallback)
```typescript
export const deleteService = async (id: string): Promise<void>
```

**Special Behavior**:
- If service has booking_services records (guests booked it):
  - Can't hard delete (foreign key constraint)
  - Instead: marks service as `available: false` (soft delete)
- If service has no references: hard delete succeeds

---

### DOMAIN 5: SERVICE CATEGORIES

Categories organize services (Spa, Dining, Activities, etc.)

#### 5.1 Get All Categories
```typescript
export const getServiceCategories = async (): Promise<ServiceCategory[]>
```

**Query**:
```sql
SELECT * FROM service_categories 
ORDER BY sort_order
```

#### 5.2 Add Category
```typescript
export const addServiceCategory = async (
  category: Omit<ServiceCategory, "id" | "createdAt" | "updatedAt">
): Promise<string>
```

#### 5.3 Update Category
```typescript
export const updateServiceCategory = async (
  id: string,
  category: Partial<ServiceCategory>
): Promise<void>
```

#### 5.4 Delete Category
```typescript
export const deleteServiceCategory = async (id: string): Promise<void>
```

---

### DOMAIN 6: BOOKINGS (Core Business Logic)

The most complex domain. Handles reservations, check-in/out, cancellations.

#### 6.1 Get All Bookings
```typescript
export const getBookings = async (): Promise<Booking[]>
```

**RLS-Aware**:
- Admin/staff: Sees all bookings
- Regular user: Sees only their own bookings

**Query**:
```sql
SELECT * FROM bookings
ORDER BY created_at DESC
-- RLS automatically filters based on user role
```

#### 6.2 Get Bookings by User
```typescript
export const getBookingsByUser = async (userId: string): Promise<Booking[]>
```

**Usage**:
```typescript
const myBookings = await getBookingsByUser(currentUserId)
```

#### 6.3 Get Bookings by Room
```typescript
export const getBookingsByRoom = async (roomId: string): Promise<Booking[]>
```

**Usage**:
```typescript
// Get all bookings (history) for a specific room
const room101Bookings = await getBookingsByRoom("room-101")
```

#### 6.4 Create a Booking
```typescript
export const addBooking = async (
  booking: Omit<Booking, "id" | "createdAt">
): Promise<string>
```

**Usage**:
```typescript
const bookingId = await addBooking({
  userId: currentUserId,
  roomTypeId: "rt-1",
  roomId: "room-101",
  checkInDate: new Date("2026-02-01"),
  checkOutDate: new Date("2026-02-05"),
  guestCount: 2,
  guestName: "John Doe",
  guestEmail: "john@example.com",
  guestPhone: "+1-555-1234",
  roomPrice: 1000,        // 4 nights × $250
  servicesPrice: 150,     // 2 services
  totalPrice: 1150,
  status: "pending",
  paymentStatus: "pending",
  paymentMethod: "stripe",
  specialRequests: "Early check-in if possible"
})
```

**Booking Status Lifecycle**:
```
pending
  ↓ (payment confirmed)
confirmed
  ↓ (guest arrives, staff checks in)
checked_in
  ↓ (guest leaves, staff checks out)
checked_out

Alternative Paths:
pending → cancelled (user cancels before payment)
confirmed → no_show (guest doesn't arrive by check-out date)
confirmed → cancelled (admin/guest cancels after confirmation)
```

#### 6.5 Update a Booking
```typescript
export const updateBooking = async (
  id: string,
  booking: Partial<Booking>
): Promise<Booking>
```

**Usage**:
```typescript
// Update status after payment
const updated = await updateBooking(bookingId, {
  paymentStatus: "paid",
  status: "confirmed"
})

// User adds special requests
await updateBooking(bookingId, {
  specialRequests: "Updated requests"
})
```

**Smart Features**:
1. Validates booking exists before update
2. If status → 'cancelled' or 'no_show': Automatically frees room (updates room status to available)
3. Returns updated booking with all changes
4. RLS-aware: User can only update their own pending bookings

#### 6.6 Delete a Booking
```typescript
export const deleteBooking = async (id: string): Promise<void>
```

**Usage**: Admin only (hard delete)

---

### DOMAIN 7: BOOKING STATE TRANSITIONS (Advanced Operations)

These are specialized functions for specific booking transitions.

#### 7.1 Check-In a Guest
```typescript
export const checkInBooking = async (
  id: string,
  staffId?: string
): Promise<Booking>
```

**What It Does**:
1. Sets `status = "checked_in"`
2. Records `actual_check_in_at` timestamp
3. Records which staff member checked in guest (`checked_in_by`)
4. Logs the activity for audit trail

**Usage**:
```typescript
const checked = await checkInBooking(bookingId, staffUserId)
console.log(`Guest checked in at ${checked.actualCheckInAt}`)
```

**Database Updates**:
```sql
UPDATE bookings SET
  status = 'checked_in',
  actual_check_in_at = NOW(),
  checked_in_by = 'staff-id-123'
WHERE id = 'booking-id'

-- Also inserts into activity_logs:
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
VALUES ('staff-id-123', 'check_in', 'booking', 'booking-id', {...})
```

#### 7.2 Check-Out a Guest
```typescript
export const checkOutBooking = async (
  id: string,
  staffId?: string
): Promise<Booking>
```

**What It Does**:
1. Sets `status = "checked_out"`
2. Records `actual_check_out_at` timestamp
3. Records which staff member checked out guest
4. **Automatically frees the room** (sets room status to available)
5. Logs the activity

**Usage**:
```typescript
const checkedOut = await checkOutBooking(bookingId, staffUserId)
```

**Side Effects**:
```typescript
// After check-out:
room.status = 'available'  // Room can be booked again
// Activity logged for audit
```

#### 7.3 Mark as No-Show
```typescript
export const markBookingNoShow = async (
  id: string,
  staffId?: string
): Promise<Booking>
```

**When Used**:
- Guest had confirmed booking but didn't arrive by check-out date
- Staff marks it as no-show
- Room is freed for other bookings
- Activity is logged

**Usage**:
```typescript
await markBookingNoShow(bookingId, staffUserId)
// Result: booking.status = 'no_show'
//         room.status = 'available'
```

#### 7.4 Cancel a Booking
```typescript
export const cancelBooking = async (
  id: string,
  userId?: string
): Promise<Booking>
```

**Who Can Cancel**:
- User can cancel their own pending booking (via RLS policy)
- Admin can cancel any booking

**What It Does**:
1. Sets `status = "cancelled"`
2. Frees the room (if room_id exists)
3. Logs the cancellation

**Usage**:
```typescript
const cancelled = await cancelBooking(bookingId, currentUserId)
```

---

### DOMAIN 8: ROOM STATUS MANAGEMENT

#### 8.1 Internal Helper: Update Room to Available
```typescript
const updateRoomStatusToAvailable = async (roomId: string): Promise<void>
```

**Why This Exists**:
- Used internally by check-out, cancel, and no-show operations
- Ensures room is marked available when booking ends
- Called automatically (not exposed as public function)

**Example Flow**:
```typescript
// User cancels booking:
await cancelBooking(bookingId)
  ↓
// Internally calls:
updateRoomStatusToAvailable(roomId)
  ↓
// Room status updated in database:
room.status = 'available'
```

---

### DOMAIN 9: AUTOMATIC CLEANUP (Maintenance Operation)

#### 9.1 Clean Up Expired Bookings
```typescript
export const cleanupExpiredBookings = async (): Promise<number>
```

**Purpose**: Automated task to handle bookings past their check-out date

**Trigger**: Should be called periodically (e.g., every 5 minutes via server cron)

**What It Does**:
1. Finds all bookings where:
   - Status is `pending` or `confirmed` (not already completed)
   - Check-out date has passed
   - Room is assigned (room_id exists)
2. For each expired booking:
   - Updates status to `no_show`
   - Frees the room
3. Returns count of cleaned up bookings

**Usage**:
```typescript
// In a cron job or scheduled function:
const cleanedCount = await cleanupExpiredBookings()
console.log(`Cleaned up ${cleanedCount} expired bookings`)
```

**Database Query**:
```sql
SELECT id, room_id, check_out_date
FROM bookings
WHERE status IN ('pending', 'confirmed')
  AND check_out_date < NOW()
  AND room_id IS NOT NULL
```

**Why This is Important**:
- Without this, bookings past check-out remain "confirmed"
- Rooms stay "reserved" even though guest is gone
- Cleanup frees rooms for new bookings
- Typical implementation: Next.js API route called by external cron service

---

## RLS (Row Level Security) Integration

### How RLS Affects the Service Layer

```typescript
// Example: Staff tries to view all bookings
const allBookings = await getBookings()

// Database query:
SELECT * FROM bookings ORDER BY created_at DESC

// RLS Policy Applied:
// - If user is admin/staff: Returns ALL bookings
// - If user is regular guest: Returns only THEIR bookings
// - If user not authenticated: Returns nothing
```

### RLS Policies Related to Service Layer

**Bookings Table**:
```sql
-- Users see only their own bookings
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id)

-- Admins see all
CREATE POLICY "Admin staff read all bookings"
  ON bookings FOR SELECT
  USING (public.is_staff())

-- Users can create bookings for themselves only
CREATE POLICY "Users create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id)
```

### Why Browser Client is Important

```typescript
const client = (typeof window !== 'undefined' 
  ? createBrowserClient()  // Browser: Has user's JWT token
  : undefined)
```

**With Browser Client**:
```
User Login
  ↓
JWT token stored in browser cookies
  ↓
Browser client includes token in requests
  ↓
Supabase recognizes user
  ↓
RLS policies evaluate: "Is auth.uid() = user_id?"
  ↓
Only matching rows returned
```

---

## Advanced Patterns & Techniques

### Pattern 1: Cascading Updates

When a booking is checked out, multiple things happen automatically:

```typescript
export const checkOutBooking = async (id: string, staffId?: string): Promise<Booking> => {
  // 1. Update booking status
  const booking = await updateBooking(...)
  
  // 2. Cascade: Free the room
  if (booking.roomId) {
    await updateRoomStatusToAvailable(booking.roomId)
  }
  
  // 3. Side effect: Log activity
  await client.from("activity_logs").insert({...})
  
  return booking
}
```

**Why Cascades Matter**:
- Maintains data consistency
- No orphaned "reserved" rooms
- Audit trail complete

### Pattern 2: Soft Delete with Foreign Keys

When deleting a service that has bookings referencing it:

```typescript
try {
  await deleteService(id)  // Hard delete attempt
} catch (error) {
  if (isFK) {
    await updateService(id, { available: false })  // Soft delete
    return
  }
  throw error  // Unexpected error
}
```

**Benefits**:
- Service stays in database (historical data)
- Service hidden from UI (`available: false`)
- Existing booking_services records remain valid
- Can restore service later if needed

### Pattern 3: Dual Timestamp Handling

Both actual and planned times tracked:

```typescript
interface Booking {
  checkInDate: Date           // Planned check-in
  actualCheckInAt: Date       // When guest actually checked in
  
  checkOutDate: Date          // Planned check-out
  actualCheckOutAt: Date      // When guest actually checked out
}
```

**Use Cases**:
- Guest arrives early → actualCheckInAt < checkInDate
- Guest leaves late → actualCheckOutAt > checkOutDate
- No-show → actualCheckInAt = null, actualCheckOutAt = null

---

## Common Usage Examples

### Use Case 1: Guest Creates a Booking

```typescript
// 1. Get available room types
const roomTypes = await getRoomTypes()

// 2. Filter to available types
const available = roomTypes.filter(rt => rt.available === true)

// 3. Create booking
const bookingId = await addBooking({
  userId: currentUser.id,
  roomTypeId: selectedRoomType.id,
  checkInDate: new Date("2026-02-01"),
  checkOutDate: new Date("2026-02-05"),
  guestCount: 2,
  guestName: selectedRoomType.name,
  totalPrice: 1000,
  status: "pending",
  paymentStatus: "pending"
})

// 4. Redirect to payment
router.push(`/payment?bookingId=${bookingId}`)
```

### Use Case 2: Staff Checks In a Guest

```typescript
// 1. Find guest's booking
const bookings = await getBookings()  // RLS: sees all (staff)
const guestBooking = bookings.find(b => b.bookingReference === reference)

// 2. Check in guest
const updated = await checkInBooking(guestBooking.id, staffUserId)

// 3. Show confirmation
alert(`${updated.guestName} checked in at ${updated.actualCheckInAt}`)
```

### Use Case 3: Admin Cleans Up Expired Bookings

```typescript
// In scheduled task (runs every 5 minutes)
const cleanedCount = await cleanupExpiredBookings()

if (cleanedCount > 0) {
  console.log(`Freed ${cleanedCount} rooms from expired bookings`)
}
```

### Use Case 4: Delete Service With Booking References

```typescript
try {
  await deleteService(serviceId)
  console.log("Service deleted")
} catch (error) {
  if (error.message.includes("foreign key")) {
    // Service has bookings, marked unavailable instead
    console.log("Service hidden (has existing bookings)")
  }
}
```

---

## Error Scenarios & Solutions

### Scenario 1: Permission Denied on Update

**Error**:
```
Cannot update booking: This booking may not belong to your account...
```

**Causes**:
- User trying to update another user's booking
- User is not admin/staff
- RLS policy blocked the update

**Solution**:
```typescript
try {
  await updateBooking(bookingId, { status: "confirmed" })
} catch (e) {
  if (e.message.includes("Cannot update")) {
    // Show user-friendly error
    alert("You don't have permission to modify this booking")
  }
}
```

### Scenario 2: Booking Not Found

**Error**:
```
Booking with ID xxx does not exist in database
```

**Causes**:
- ID is incorrect
- Booking was deleted
- Typo in ID

**Solution**:
```typescript
try {
  await updateBooking(bookingId, data)
} catch (e) {
  if (e.message.includes("does not exist")) {
    // Validate ID is correct
    console.error("Invalid booking ID:", bookingId)
  }
}
```

### Scenario 3: Foreign Key Constraint on Delete

**Error**:
```
violates foreign key constraint
```

**Causes**:
- Service has booking_services referencing it
- Room has bookings referencing it

**Solution**:
- For services: Function automatically soft-deletes
- For rooms: Must reassign bookings first

---

## Performance Considerations

### 1. Select Only Needed Columns

Instead of `select("*")`, be specific:

```typescript
// ❌ Slow: Fetches entire row
const { data } = await client.from("bookings").select("*")

// ✓ Fast: Fetches only needed fields
const { data } = await client
  .from("bookings")
  .select("id, guest_name, check_in_date, status")
```

### 2. Pagination for Large Datasets

```typescript
// Fetch in batches instead of all at once
const { data } = await client
  .from("bookings")
  .select("*")
  .range(0, 99)  // First 100 rows
```

### 3. Filter at Database Level

```typescript
// ❌ Slow: Fetch all, filter in JS
const allBookings = await getBookings()
const pending = allBookings.filter(b => b.status === "pending")

// ✓ Fast: Filter in database
const { data } = await client
  .from("bookings")
  .select("*")
  .eq("status", "pending")
```

### 4. Indexing Strategy

Database has indexes on:
- `bookings.user_id` — for querying user's bookings
- `bookings.status` — for filtering by status
- `bookings.check_out_date` — for cleanup queries
- `rooms.floor_id` — for querying floor's rooms

---

## Testing the Service Layer

### Manual Testing

```typescript
// In browser console while app is running:

// Test getFloors
const floors = await getFloors()
console.log(floors)

// Test getRoomTypes
const types = await getRoomTypes()
console.log(types)

// Test addFloor
const newFloor = await addFloor({
  name: "Test Floor",
  number: 99,
  description: "Test"
})
console.log(newFloor)

// Clean up
await deleteFloor(newFloor.id)
```

### Unit Testing

```typescript
import { getRoomTypes, addRoomType } from '@/lib/supabase-service'

describe('Room Types', () => {
  test('getRoomTypes returns array', async () => {
    const types = await getRoomTypes()
    expect(Array.isArray(types)).toBe(true)
  })

  test('addRoomType creates and returns ID', async () => {
    const id = await addRoomType({
      name: "Test Room",
      basePrice: 100,
      maxOccupancy: 2
    })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})
```

---

## Debugging Tips

### Enable Console Logging

Many functions have `console.log` statements for debugging:

```typescript
console.log("[addRoomType] Sending to database:", JSON.stringify(dbRoomType, null, 2))
console.log("[addRoomType] Success, returned ID:", data.id)
```

Look in browser DevTools → Console to see these logs.

### Check Network Requests

1. Open DevTools → Network tab
2. Filter for XHR requests (Supabase calls)
3. View request/response bodies
4. See exact SQL being executed

### Common Issues

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| "Supabase client not initialized" | Client selector failed | Check if window is defined |
| Data not updating | RLS policy blocking | Check user role and policy conditions |
| Type conversion errors | camelCase/snake_case mismatch | Verify convertTimestamps is applied |
| Empty results | Wrong filter condition | Test query directly in Supabase Studio |
| Soft delete instead of hard delete | Foreign key exists | This is expected behavior |

---

## Migration & Backward Compatibility

### Backward Compatibility Features

```typescript
// Old code used 'check_in' and 'check_out'
// New code uses 'checkInDate' and 'checkOutDate'
// Both supported for transition period:

if (converted.check_in) {
  converted.checkInDate = new Date(converted.check_in)
  converted.checkIn = new Date(converted.check_in)  // Keep old name too
  delete converted.check_in
}

// Similarly for other fields:
converted.guests = converted.guestCount  // Both names work
```

### Migration Path

Old code continues working:
```typescript
// Old code (still works)
booking.guests  // Still available
booking.checkIn

// New code (recommended)
booking.guestCount
booking.checkInDate
```

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│              React Components (UI Layer)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Room Page   │  │ Booking Form │  │ Admin Panel  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│         └─────────────────┼──────────────────┘           │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  lib/supabase-service.ts (This File)  │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ Helper Functions:                │ │
        │  │ - convertTimestamps()            │ │
        │  │ - toSnakeCase()                  │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ Domain Functions:                │ │
        │  │ - getFloors(), addFloor(), ...   │ │
        │  │ - getRoomTypes(), ...            │ │
        │  │ - getRooms(), ...                │ │
        │  │ - getServices(), ...             │ │
        │  │ - getBookings(), addBooking()    │ │
        │  │ - checkInBooking(), ...          │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        └────────────┬────────────────┬─────────┘
                     │                │
                     ▼                ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Browser Client   │  │ Server Client    │
        │ (with JWT auth)  │  │ (service role)   │
        │ Respects RLS     │  │ Bypasses RLS     │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
                 └──────────┬──────────┘
                            │
                            ▼
                ┌──────────────────────────┐
                │  Supabase Platform       │
                │  (PostgreSQL Database)   │
                │  - RLS Policies          │
                │  - Triggers              │
                │  - Functions             │
                │  - Storage               │
                └──────────────────────────┘
```

---

## Final Summary

### What `supabase-service.ts` Does

1. **Abstracts Database Access**: Components call simple functions instead of writing SQL
2. **Handles Data Transformation**: Converts snake_case ↔ camelCase automatically
3. **Enforces RLS**: Uses browser client to respect Row Level Security policies
4. **Implements Business Logic**: Check-ins, check-outs, cleanup tasks
5. **Provides Error Handling**: Smart fallbacks for foreign key constraints
6. **Maintains Type Safety**: All functions are TypeScript typed
7. **Logs Activities**: Records who did what and when
8. **Cascades Updates**: Ensures related data stays in sync

### When to Use This File

✅ **Use these functions:**
- Any time you need to fetch/create/update/delete data
- In React components, hooks, and API routes
- For business logic like check-ins and cancellations

❌ **Don't:**
- Write raw Supabase queries in components (use these functions instead)
- Bypass this layer to access database directly
- Duplicate query logic across components

### Key Takeaway

`lib/supabase-service.ts` is the **bridge between your React app and the database**. It's your single source of truth for all database operations, making the codebase cleaner, safer, and easier to maintain.

---

**Last Updated**: January 12, 2026  
**File Size**: 942 lines  
**Export Functions**: 40+  
**Supported Domains**: 9 (Floors, Room Types, Rooms, Services, Categories, Bookings, State Transitions, Room Status, Cleanup)
