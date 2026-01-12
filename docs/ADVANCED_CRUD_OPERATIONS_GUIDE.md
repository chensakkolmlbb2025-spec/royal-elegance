# Advanced CRUD Operations — Complete Technical Guide

## Overview

CRUD stands for **Create, Read, Update, Delete** — the four fundamental database operations. This guide covers every CRUD operation in the hotel booking system, from basic patterns to advanced transaction-safe implementations.

**File Locations:**
- Basic CRUD: `lib/supabase-service.ts` (942 lines)
- Advanced CRUD: `lib/booking-service.ts` (486 lines)
- Component Usage: `components/admin/*`, `app/bookings/*`

---

## Part 1: CRUD Operations Overview

### CRUD Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                   CRUD OPERATIONS MATRIX                    │
├──────────────┬─────────────────┬──────────────┬──────────────┤
│ Entity       │ Create (C)      │ Read (R)     │ Update (U)   │
├──────────────┼─────────────────┼──────────────┼──────────────┤
│ Floors       │ addFloor()      │ getFloors()  │ updateFloor()│
│ Room Types   │ addRoomType()   │ getRoomTypes()│updateRoomType()
│ Rooms        │ addRoom()       │ getRooms()   │ updateRoom() │
│ Services     │ addService()    │ getServices()│ updateService()
│ Categories   │ addServiceCat() │ getServiceCat()│updateServiceCat()
│ Bookings     │ addBooking()    │ getBookings()│ updateBooking()
│              │ (Complex!)      │ (RLS-aware) │ (Transaction!)
│ Check-in     │ (via Update)    │ (via Read)  │ checkInBooking()
│ Check-out    │ (via Update)    │ (via Read)  │ checkOutBooking()
│ Cancellation │ (via Update)    │ (via Read)  │ cancelBooking()
│ No-show      │ (via Update)    │ (via Read)  │ markBookingNoShow()
│ Cleanup      │ (System)        │ (System)    │ cleanupExpiredBookings()
├──────────────┼─────────────────┼──────────────┼──────────────┤
│ Delete (D)   │                 │              │              │
├──────────────┼─────────────────┼──────────────┼──────────────┤
│              │ deleteFloor()   │              │              │
│              │ deleteRoomType()│              │              │
│              │ deleteRoom()    │              │              │
│              │ deleteService() │ (Smart!)     │              │
│              │ deleteServiceCat()             │              │
│              │ deleteBooking() │              │              │
└──────────────┴─────────────────┴──────────────┴──────────────┘
```

---

## Part 2: CREATE Operations (C)

### 2.1 CREATE Patterns Explained

All CREATE operations follow this pattern:

```typescript
// Step 1: Accept data (omit auto-generated fields)
export const addEntity = async (
  entity: Omit<Entity, "id" | "createdAt">
): Promise<string> => {
  // Step 2: Get client (browser client if possible)
  const client = (typeof window !== 'undefined' ? createBrowserClient() : undefined) || supabase
  if (!client) throw new Error("Supabase client not initialized")

  // Step 3: Convert camelCase → snake_case
  const dbEntity = toSnakeCase(entity)

  // Step 4: Insert and return
  const { data, error } = await client
    .from("table_name")
    .insert([dbEntity])
    .select()
    .single()

  if (error) throw error
  
  // Step 5: Return ID (user needs this for next step)
  return data.id
}
```

**Key Principles:**
- Omit `id` (database generates UUID)
- Omit `createdAt` (database sets current timestamp)
- Return the generated ID for subsequent operations
- Throw errors (don't swallow them)

---

### 2.2 ADD FLOOR

```typescript
export const addFloor = async (
  floor: Pick<Floor, "name" | "number" | "description">
): Promise<Floor>
```

**Purpose**: Create a new building floor

**Input:**
```typescript
{
  name: "Premium Suite Floor",
  number: 3,
  description: "Luxury accommodations"
}
```

**Database Operation:**
```sql
INSERT INTO floors (name, floor_number, description)
VALUES ('Premium Suite Floor', 3, 'Luxury accommodations')
RETURNING *
```

**Output:**
```typescript
{
  id: "floor-uuid-123",
  name: "Premium Suite Floor",
  number: 3,
  description: "Luxury accommodations",
  createdAt: Date(2026-01-12T10:00:00Z)
}
```

**Use Case:**
```typescript
// Admin adds new floor to hotel
const newFloor = await addFloor({
  name: "Executive Level",
  number: 5,
  description: "VIP and executive rooms"
})
console.log(`Created Floor ID: ${newFloor.id}`)
```

**Best Practices:**
- Floor numbers should be unique (1, 2, 3, etc.)
- Use descriptive names ("Executive", "Standard", "Budget")
- Validate before inserting (no duplicate floor numbers)

---

### 2.3 ADD ROOM TYPE

```typescript
export const addRoomType = async (
  roomType: Omit<RoomType, "id" | "createdAt">
): Promise<string>
```

**Purpose**: Create a new room category (Deluxe Suite, Standard Room, etc.)

**Input:**
```typescript
{
  name: "Luxury Penthouse",
  slug: "luxury-penthouse",
  description: "Top-floor luxury suite with panoramic views",
  basePrice: 500,
  maxOccupancy: 6,
  bedType: "King + Queen",
  roomSize: 150,
  amenities: ["WiFi", "Jacuzzi", "Balcony", "Safe"],
  images: ["https://...", "https://..."]
}
```

**Database Operation:**
```sql
INSERT INTO room_types (
  name, slug, description, base_price, max_occupancy, 
  bed_type, room_size, amenities, images
)
VALUES (...)
RETURNING id
```

**Output:**
```typescript
"roomtype-uuid-456"  // Just the ID string
```

**Side Effects:**
```
✓ No automatic room creation (must create rooms separately)
✓ Slug auto-generated if not provided (name → slug conversion)
✓ Images stored as PostgreSQL JSONB array
✓ Amenities stored as string array
```

**Advanced Example:**
```typescript
// Admin creates new room type with full details
const roomTypeId = await addRoomType({
  name: "Ocean View Suite",
  slug: "ocean-view-suite",
  description: "Beachfront suite with direct ocean access",
  basePrice: 350,
  maxOccupancy: 4,
  bedType: "King",
  roomSize: 80,
  amenities: ["WiFi", "Ocean View", "Balcony", "Kitchenette", "Smart TV"],
  images: [
    "https://cdn.hotel.com/ocean-view-1.jpg",
    "https://cdn.hotel.com/ocean-view-2.jpg"
  ]
})

// Now create actual rooms of this type
await addRoom({
  roomNumber: "501",
  roomTypeId: roomTypeId,
  floorId: "floor-5-id",
  status: "available"
})
```

**Console Output (for debugging):**
```
[addRoomType] Sending to database: {
  name: "Ocean View Suite",
  slug: "ocean-view-suite",
  base_price: 350,
  ...
}
[addRoomType] Success, returned ID: roomtype-uuid-456
```

---

### 2.4 ADD ROOM

```typescript
export const addRoom = async (
  room: Omit<Room, "id" | "createdAt">
): Promise<string>
```

**Purpose**: Create a specific physical room instance

**Input:**
```typescript
{
  roomNumber: "501",           // Room label
  roomTypeId: "roomtype-id",   // Reference to room type
  floorId: "floor-id",         // Which floor
  status: "available"          // Initial status
}
```

**Database Operation:**
```sql
INSERT INTO rooms (room_number, room_type_id, floor_id, status)
VALUES ('501', 'roomtype-id', 'floor-id', 'available')
RETURNING id
```

**Output:**
```typescript
"room-uuid-789"  // Room ID
```

**Side Effects:**
- Room is immediately available for booking
- Status can be: available, occupied, maintenance, reserved
- Cannot reference non-existent floor or room type (FK constraint)

**Advanced Pattern:**
```typescript
// Admin bulk-creates 10 rooms on a floor
const floorId = "floor-3-id"
const roomTypeId = "luxury-suite-id"

const roomIds = []
for (let i = 1; i <= 10; i++) {
  const roomId = await addRoom({
    roomNumber: `3${String(i).padStart(2, '0')}`,  // 301, 302, ..., 310
    roomTypeId: roomTypeId,
    floorId: floorId,
    status: "available"
  })
  roomIds.push(roomId)
}

console.log(`Created 10 rooms: ${roomIds.join(', ')}`)
```

---

### 2.5 ADD SERVICE

```typescript
export const addService = async (
  service: Omit<Service, "id" | "createdAt">
): Promise<string>
```

**Purpose**: Create a new add-on service (Spa, Dining, etc.)

**Input:**
```typescript
{
  name: "Swedish Massage",
  slug: "swedish-massage",
  description: "60-minute full-body Swedish massage",
  price: 80,
  categoryId: "category-spa-id",
  available: true,
  maxCapacity: 2,
  images: ["https://..."]
}
```

**Database Operation:**
```sql
INSERT INTO services (
  name, slug, description, price, category_id, available, max_capacity
)
VALUES (...)
RETURNING id
```

**Output:**
```typescript
"service-uuid-101"
```

**Special Features:**
- Price is per service instance
- MaxCapacity limits concurrent bookings
- Available flag hides service from public
- Cannot reference non-existent category (FK constraint)

**Example with Category:**
```typescript
// Admin creates Spa service
const serviceId = await addService({
  name: "Aromatherapy Massage",
  slug: "aromatherapy-massage",
  description: "90-minute aromatherapy massage with essential oils",
  price: 120,
  categoryId: "cat-spa-id",  // Must exist first!
  available: true,
  maxCapacity: 1,  // Only one guest at a time
  images: ["https://cdn.hotel.com/spa-1.jpg"]
})
```

---

### 2.6 ADD SERVICE CATEGORY

```typescript
export const addServiceCategory = async (
  category: Omit<ServiceCategory, "id" | "createdAt" | "updatedAt">
): Promise<string>
```

**Purpose**: Create a service grouping (Spa, Dining, Activities, etc.)

**Input:**
```typescript
{
  name: "Wellness & Spa",
  slug: "wellness-spa",
  description: "Spa and wellness services",
  icon: "🧖",
  color: "purple",
  isDefault: false,
  sortOrder: 1
}
```

**Database Operation:**
```sql
INSERT INTO service_categories (
  name, slug, description, icon, color, is_default, sort_order
)
VALUES (...)
RETURNING id
```

**Output:**
```typescript
"category-spa-id"
```

**Design Notes:**
- Icon can be emoji or icon name
- Color used for UI styling
- sortOrder determines display order (lower = appears first)
- isDefault prevents accidental deletion

**Admin Pattern:**
```typescript
// Create categories in order
const categories = [
  { name: "Spa & Wellness", slug: "spa", icon: "🧖", color: "purple", sortOrder: 1 },
  { name: "Dining", slug: "dining", icon: "🍽️", color: "orange", sortOrder: 2 },
  { name: "Activities", slug: "activities", icon: "🎭", color: "blue", sortOrder: 3 },
  { name: "Transport", slug: "transport", icon: "🚗", color: "green", sortOrder: 4 }
]

for (const cat of categories) {
  const id = await addServiceCategory(cat)
  console.log(`Created: ${cat.name} (${id})`)
}
```

---

### 2.7 ADD BOOKING (Core Business Operation)

```typescript
export const addBooking = async (
  booking: Omit<Booking, "id" | "createdAt">
): Promise<string>
```

**Purpose**: Create a new hotel reservation

**Input:**
```typescript
{
  userId: "user-uuid",           // Who's booking
  roomTypeId: "roomtype-id",     // What room type
  roomId: "room-id",             // Specific room instance
  checkInDate: new Date("2026-02-01"),
  checkOutDate: new Date("2026-02-05"),
  guestName: "John Doe",
  guestEmail: "john@example.com",
  guestPhone: "+1-555-1234",
  guestCount: 2,
  roomPrice: 1000,               // 4 nights × $250
  servicesPrice: 150,            // Add-on services total
  totalPrice: 1150,
  status: "pending",             // Awaiting payment
  paymentStatus: "pending",
  paymentMethod: "stripe",
  specialRequests: "Early check-in"
}
```

**Database Operation:**
```sql
INSERT INTO bookings (
  user_id, room_type_id, room_id,
  check_in_date, check_out_date,
  guest_name, guest_email, guest_phone, guest_count,
  room_price, services_price, total_price,
  status, payment_status, payment_method,
  special_requests
)
VALUES (...)
RETURNING id
```

**Output:**
```typescript
"booking-uuid-202"
```

**Auto-Generated Fields:**
```typescript
{
  id: "booking-uuid-202",
  bookingReference: "REF-ABC123XYZ",  // Unique reference code
  createdAt: Date(2026-01-12T...)
}
```

**Booking Status Flow:**
```
pending (awaiting payment)
  ↓
confirmed (payment received)
  ↓
checked_in (guest arrived)
  ↓
checked_out (guest left)
```

**Complex Real-World Example:**
```typescript
// Guest creates booking with multiple services
const bookingData = {
  userId: currentUser.id,
  roomTypeId: selectedRoomType.id,
  roomId: selectedRoom.id,
  checkInDate: new Date("2026-02-15"),
  checkOutDate: new Date("2026-02-18"),
  guestName: "Jane Smith",
  guestEmail: "jane@example.com",
  guestPhone: "+1-555-5678",
  guestCount: 2,
  
  // Calculate prices
  roomPrice: 300 * 3,              // $300/night × 3 nights = $900
  servicesPrice: 80 + 120 + 50,    // Massage $80 + Dinner $120 + Transfer $50 = $250
  totalPrice: 1150,
  
  status: "pending",
  paymentStatus: "pending",
  paymentMethod: "stripe",
  specialRequests: "Honeymoon suite, early check-in if possible"
}

const bookingId = await addBooking(bookingData)

// Now add booking services (separate records)
await addBookingServices(bookingId, [
  { serviceId: "service-massage-id", quantity: 1 },
  { serviceId: "service-dinner-id", quantity: 1 },
  { serviceId: "service-transfer-id", quantity: 1 }
])

// Redirect to payment
router.push(`/payment?bookingId=${bookingId}`)
```

---

### 2.8 ADD BOOKING SERVICES (Junction Table)

**Purpose**: Link services to a booking (many-to-many relationship)

**Advanced Pattern from `booking-service.ts`:**

```typescript
export async function addBookingServices(
  bookingId: string,
  services: Array<{ serviceId: string; quantity: number }>
): Promise<void> {
  const client = createClient()

  // Create junction table records
  const bookingServices = services.map(service => ({
    booking_id: bookingId,
    service_id: service.serviceId,
    quantity: service.quantity,
    // Price fetched from services table in trigger
  }))

  const { error } = await client
    .from("booking_services")
    .insert(bookingServices)

  if (error) throw error
}
```

**Database Structure:**
```
bookings (1) ──────────── (many) booking_services (many) ──────────── (1) services
  id                              booking_id
                                  service_id
                                  quantity
```

**Example:**
```typescript
// Booking includes: Spa massage + dinner
const bookingServices = [
  { serviceId: "spa-massage-id", quantity: 1 },
  { serviceId: "fine-dining-id", quantity: 2 }  // 2 people dining
]

await addBookingServices(bookingId, bookingServices)
```

---

## Part 3: READ Operations (R)

### 3.1 READ Patterns Explained

All READ operations follow this pattern:

```typescript
export const getEntities = async (): Promise<Entity[]> => {
  const client = (typeof window !== 'undefined' ? createBrowserClient() : undefined) || supabase
  if (!client) throw new Error("Supabase client not initialized")

  const { data, error } = await client
    .from("table_name")
    .select("...")        // Select specific columns
    .order("column")      // Optional: sorting
    .eq("field", value)   // Optional: filtering

  if (error) throw error
  return data.map(convertTimestamps) as Entity[]
}
```

**Key Features:**
- RLS-aware (browser client respects user permissions)
- Automatic data transformation (snake_case → camelCase)
- Optional filtering and sorting
- Throws errors explicitly

---

### 3.2 GET FLOORS

```typescript
export const getFloors = async (): Promise<Floor[]>
```

**Database Query:**
```sql
SELECT *
FROM floors
ORDER BY floor_number ASC
```

**Output:**
```typescript
[
  { id: "floor-1", name: "Ground Floor", number: 1, createdAt: Date(...) },
  { id: "floor-2", name: "Premium Suite Floor", number: 2, createdAt: Date(...) },
  { id: "floor-3", name: "Executive Level", number: 3, createdAt: Date(...) }
]
```

**Usage:**
```typescript
// Admin dashboard: populate floor dropdown
const floors = await getFloors()
const floorOptions = floors.map(f => ({ value: f.id, label: f.name }))
```

---

### 3.3 GET ROOM TYPES

```typescript
export const getRoomTypes = async (): Promise<RoomType[]>
```

**Database Query:**
```sql
SELECT *
FROM room_types
WHERE is_available = TRUE
```

**Output:**
```typescript
[
  {
    id: "deluxe-id",
    name: "Deluxe Suite",
    slug: "deluxe-suite",
    basePrice: 250,
    maxOccupancy: 4,
    amenities: ["WiFi", "Safe", "Balcony"],
    createdAt: Date(...)
  },
  // ... more room types
]
```

**Usage - Guest Browsing:**
```typescript
// Room listing page
const roomTypes = await getRoomTypes()

return roomTypes.map(type => (
  <RoomCard
    key={type.id}
    name={type.name}
    price={type.basePrice}
    maxGuests={type.maxOccupancy}
    amenities={type.amenities}
    images={type.images}
  />
))
```

---

### 3.4 GET ROOMS

```typescript
export const getRooms = async (): Promise<Room[]>
```

**Database Query with JOIN:**
```sql
SELECT rooms.*,
       floors.id, floors.floor_number, floors.name
FROM rooms
LEFT JOIN floors ON rooms.floor_id = floors.id
```

**Output:**
```typescript
[
  {
    id: "room-101",
    roomNumber: "101",
    roomTypeId: "deluxe-id",
    floorId: "floor-1",
    status: "available",
    floor: {
      id: "floor-1",
      floor_number: 1,
      name: "Ground Floor"
    }
  }
]
```

**Specialized Variants:**

```typescript
// Get rooms on specific floor
export const getRoomsByFloor = async (floorId: string): Promise<Room[]>
```

**Usage:**
```typescript
// Admin managing floor 3
const floor3Rooms = await getRoomsByFloor("floor-3-id")

floor3Rooms.forEach(room => {
  console.log(`Room ${room.roomNumber}: ${room.status}`)
})
```

---

### 3.5 GET SERVICES

```typescript
export const getServices = async (): Promise<Service[]>
```

**Database Query:**
```sql
SELECT *
FROM services
WHERE available = TRUE
ORDER BY name
```

**Output:**
```typescript
[
  {
    id: "service-massage-id",
    name: "Swedish Massage",
    price: 80,
    categoryId: "cat-spa-id",
    available: true,
    maxCapacity: 2
  }
]
```

**Usage:**
```typescript
// Services page
const services = await getServices()
const spaSvcs = services.filter(s => s.categoryId === spaCategoryId)

return spaSvcs.map(svc => (
  <ServiceCard key={svc.id} service={svc} />
))
```

---

### 3.6 GET SERVICE CATEGORIES

```typescript
export const getServiceCategories = async (): Promise<ServiceCategory[]>
```

**Database Query:**
```sql
SELECT *
FROM service_categories
ORDER BY sort_order ASC
```

**Output:**
```typescript
[
  { id: "cat-spa", name: "Spa & Wellness", icon: "🧖", color: "purple", sortOrder: 1 },
  { id: "cat-dining", name: "Dining", icon: "🍽️", color: "orange", sortOrder: 2 }
]
```

**Usage:**
```typescript
// Services catalog: group by category
const categories = await getServiceCategories()
const services = await getServices()

return categories.map(cat => (
  <ServiceGroup
    key={cat.id}
    category={cat}
    items={services.filter(s => s.categoryId === cat.id)}
  />
))
```

---

### 3.7 GET BOOKINGS (RLS-Aware)

```typescript
export const getBookings = async (): Promise<Booking[]>
```

**Database Query with RLS:**
```sql
SELECT *
FROM bookings
WHERE auth.uid() = user_id        -- RLS Policy applied!
   OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'staff')
ORDER BY created_at DESC
```

**What Happens:**
- **Regular User**: Sees only their own bookings
- **Staff/Admin**: Sees all bookings
- **Unauthenticated**: Sees nothing (RLS blocks)

**Output:**
```typescript
[
  {
    id: "booking-1",
    bookingReference: "REF-ABC123",
    userId: "user-id",
    guestName: "John Doe",
    checkInDate: Date(2026-02-01),
    checkOutDate: Date(2026-02-05),
    status: "confirmed",
    totalPrice: 1150
  }
]
```

**Specialized Variants:**

```typescript
// Get specific user's bookings
export const getBookingsByUser = async (userId: string): Promise<Booking[]>

// Get all bookings for a specific room
export const getBookingsByRoom = async (roomId: string): Promise<Booking[]>
```

**Usage Examples:**

```typescript
// User views their reservations
const myBookings = await getBookingsByUser(currentUser.id)

// Admin dashboard: all bookings
const allBookings = await getBookings()

// Room history: see who booked room 101
const room101Bookings = await getBookingsByRoom("room-101")
```

---

### 3.8 Advanced Query Patterns from `booking-service.ts`

```typescript
export async function checkRoomAvailability(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<AvailabilityResult>
```

**Database Query:**
```sql
SELECT EXISTS (
  SELECT 1
  FROM bookings
  WHERE room_id = $1
    AND status IN ('confirmed', 'checked_in')
    AND check_in_date < $3
    AND check_out_date > $2
) as is_available

UNION ALL

SELECT booking_reference, check_in_date, check_out_date
FROM bookings
WHERE room_id = $1
  AND check_in_date < $3
  AND check_out_date > $2
  AND status IN ('confirmed', 'checked_in')
```

**Output:**
```typescript
{
  isAvailable: true,
  conflictingBookings: [
    {
      id: "booking-1",
      booking_reference: "REF-001",
      check_in_date: "2026-02-01",
      check_out_date: "2026-02-05",
      status: "confirmed"
    }
  ]
}
```

**Purpose**: Check if a room can be booked for specific dates

**Complex Logic:**
```
Room availability depends on:
- Other bookings' check-in/check-out dates
- Booking status (only confirmed/checked_in block availability)
- Pending bookings don't block (not confirmed yet)
- Date overlap calculation (check_in_date < other_checkout AND check_out_date > other_checkin)
```

---

## Part 4: UPDATE Operations (U)

### 4.1 UPDATE Patterns Explained

All UPDATE operations follow this pattern:

```typescript
export const updateEntity = async (
  id: string,
  entity: Partial<Entity>
): Promise<Entity | void> => {
  const client = (typeof window !== 'undefined' ? createBrowserClient() : undefined) || supabase
  if (!client) throw new Error("Supabase client not initialized")

  // Convert to snake_case
  const dbEntity = toSnakeCase(entity)

  const { data, error } = await client
    .from("table_name")
    .update(dbEntity)
    .eq("id", id)
    .select()  // Fetch updated record

  if (error) throw error
  return convertTimestamps(data[0]) as Entity
}
```

**Key Features:**
- Partial updates (only change specified fields)
- Returns updated record
- RLS-aware (can't update records you don't have permission for)
- Throws explicit errors

---

### 4.2 UPDATE FLOOR

```typescript
export const updateFloor = async (
  id: string,
  floor: Partial<Floor>
): Promise<void>
```

**Database Operation:**
```sql
UPDATE floors
SET name = $2, description = $3, ...
WHERE id = $1
```

**Usage:**
```typescript
// Admin edits floor details
await updateFloor(floorId, {
  description: "Newly renovated premium floor",
  isActive: true
})
```

---

### 4.3 UPDATE ROOM TYPE

```typescript
export const updateRoomType = async (
  id: string,
  roomType: Partial<RoomType>
): Promise<void>
```

**Common Updates:**

```typescript
// Price adjustment
await updateRoomType(roomTypeId, { basePrice: 300 })

// Add amenities
await updateRoomType(roomTypeId, {
  amenities: ["WiFi", "Safe", "Balcony", "Jacuzzi"]
})

// Mark as unavailable for bookings
await updateRoomType(roomTypeId, { available: false })
```

---

### 4.4 UPDATE ROOM

```typescript
export const updateRoom = async (
  id: string,
  room: Partial<Room>
): Promise<void>
```

**Room Status Transitions:**

```
available → reserved (booking confirmed)
available → occupied (guest checked in)
occupied → maintenance (after checkout, for cleaning)
maintenance → available (cleaning complete)
```

**Usage Examples:**

```typescript
// Mark room for cleaning
await updateRoom(roomId, { status: "maintenance" })

// Room back online after maintenance
await updateRoom(roomId, { status: "available" })

// Update room features
await updateRoom(roomId, {
  specialFeatures: ["Jacuzzi", "Ocean View", "Private Balcony"]
})
```

**Real-World Scenario:**
```typescript
// After guest checks out
async function handleCheckout(roomId: string) {
  // Mark room for cleaning
  await updateRoom(roomId, { status: "maintenance" })

  // Schedule cleaning staff via email
  sendEmail({
    to: "housekeeping@hotel.com",
    subject: `Clean Room ${roomNumber}`,
    body: "Room needs cleaning after guest checkout"
  })

  // 2 hours later, staff marks room available
  setTimeout(async () => {
    await updateRoom(roomId, { status: "available" })
  }, 2 * 60 * 60 * 1000)
}
```

---

### 4.5 UPDATE SERVICE

```typescript
export const updateService = async (
  id: string,
  service: Partial<Service>
): Promise<void>
```

**Common Updates:**

```typescript
// Price adjustment
await updateService(serviceId, { price: 99 })

// Temporarily disable service
await updateService(serviceId, { available: false })

// Re-enable after maintenance
await updateService(serviceId, { available: true })

// Update description
await updateService(serviceId, {
  description: "Updated to 90 minutes with premium oils"
})
```

---

### 4.6 UPDATE SERVICE CATEGORY

```typescript
export const updateServiceCategory = async (
  id: string,
  category: Partial<ServiceCategory>
): Promise<void>
```

**Usage:**
```typescript
// Admin reorders categories
await updateServiceCategory(catId, { sortOrder: 2 })
```

---

### 4.7 UPDATE BOOKING (Complex Transaction)

```typescript
export const updateBooking = async (
  id: string,
  booking: Partial<Booking>
): Promise<Booking>
```

**What Makes This Complex:**

1. **Validation**: Booking must exist and user must have permission
2. **Cascading Updates**: Status change may trigger room updates
3. **Idempotency**: Operation must be safe to retry
4. **RLS Enforcement**: User can only update their own pending bookings

**Database Operation with Checks:**

```sql
-- 1. Verify booking exists
SELECT id, status, user_id FROM bookings WHERE id = $1

-- 2. Verify user permission (RLS policy)
WHERE auth.uid() = user_id OR role IN ('admin', 'staff')

-- 3. Update booking
UPDATE bookings
SET payment_status = $2, status = $3, updated_at = NOW()
WHERE id = $1

-- 4. Fetch updated record
SELECT * FROM bookings WHERE id = $1
```

**Code Pattern:**

```typescript
export const updateBooking = async (
  id: string,
  booking: Partial<Booking>
): Promise<Booking> => {
  const client = (typeof window !== 'undefined' ? createBrowserClient() : undefined) || supabase

  // STEP 1: Verify booking exists
  const { data: existingBooking, error: checkError } = await client
    .from("bookings")
    .select("id, status, user_id")
    .eq("id", id)

  if (!existingBooking || existingBooking.length === 0) {
    throw new Error(`Booking ${id} does not exist`)
  }

  // STEP 2: Prepare update data
  const dbBooking = toSnakeCase(booking)

  // STEP 3: Update in database
  const { data, error } = await client
    .from("bookings")
    .update(dbBooking)
    .eq("id", id)
    .select()

  if (error) throw new Error(`Database error: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error(`Cannot update: Permission denied or booking not accessible`)
  }

  // STEP 4: Cascade updates (status changes)
  const updatedBooking = data[0]
  
  // If booking cancelled → free room
  if (booking.status === 'cancelled' && updatedBooking.room_id) {
    await updateRoomStatusToAvailable(updatedBooking.room_id)
  }

  // If marked no-show → free room
  if (booking.status === 'no_show' && updatedBooking.room_id) {
    await updateRoomStatusToAvailable(updatedBooking.room_id)
  }

  return convertTimestamps(updatedBooking) as Booking
}
```

**Usage Examples:**

```typescript
// Guest updates special requests
await updateBooking(bookingId, {
  specialRequests: "Need high floor, away from elevator"
})

// Payment received → confirm booking
await updateBooking(bookingId, {
  paymentStatus: "paid",
  status: "confirmed"
})

// User cancels (only works if status = pending)
try {
  await updateBooking(bookingId, { status: "cancelled" })
} catch (e) {
  alert("Cannot cancel confirmed bookings")
}
```

---

### 4.8 CHECK-IN BOOKING

```typescript
export const checkInBooking = async (
  id: string,
  staffId?: string
): Promise<Booking>
```

**What Happens:**

```sql
UPDATE bookings
SET
  status = 'checked_in',
  actual_check_in_at = NOW(),
  checked_in_by = $2
WHERE id = $1
RETURNING *

-- Also insert activity log
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
VALUES ($2, 'check_in', 'booking', $1, {...})
```

**Process Flow:**

```
Guest arrives
  ↓
Staff scans booking QR code or enters reference
  ↓
checkInBooking() called
  ↓
Booking status: confirmed → checked_in
Recording actual arrival time
  ↓
Room status updated to: occupied
  ↓
Activity logged for audit trail
```

**Usage:**

```typescript
// Staff checks in guest
const checked = await checkInBooking(bookingId, currentStaffId)

console.log(`Guest ${checked.guestName} checked in at ${checked.actualCheckInAt}`)
```

**UI Integration:**

```typescript
<Button onClick={async () => {
  try {
    const booking = await checkInBooking(bookingId, staffUserId)
    alert(`${booking.guestName} checked in successfully!`)
    refreshBookingList()
  } catch (e) {
    alert(`Check-in failed: ${e.message}`)
  }
}}>
  Check In Guest
</Button>
```

---

### 4.9 CHECK-OUT BOOKING

```typescript
export const checkOutBooking = async (
  id: string,
  staffId?: string
): Promise<Booking>
```

**What Happens:**

```sql
UPDATE bookings
SET
  status = 'checked_out',
  actual_check_out_at = NOW(),
  checked_out_by = $2
WHERE id = $1
RETURNING *

-- Cascade: Free room
UPDATE rooms
SET status = 'available'
WHERE id = (SELECT room_id FROM bookings WHERE id = $1)

-- Log activity
INSERT INTO activity_logs (...)
```

**Complex Workflow:**

```
Guest leaves
  ↓
Staff marks checkout
  ↓
checkOutBooking() called
  ↓
Booking status: checked_in → checked_out
Recording actual departure time
  ↓
Room status: occupied → available
  ↓
Room available for next guest
  ↓
Activity logged
  ↓
Housekeeping scheduled to clean room
```

**Usage:**

```typescript
// Staff checks out guest
const checkedOut = await checkOutBooking(bookingId, staffUserId)

console.log(`Room ${checkedOut.roomNumber} is now available`)
```

---

### 4.10 MARK AS NO-SHOW

```typescript
export const markBookingNoShow = async (
  id: string,
  staffId?: string
): Promise<Booking>
```

**When Used:**
- Booking check-out date passed
- Guest never arrived
- Room was wasted

**What Happens:**

```sql
UPDATE bookings
SET status = 'no_show'
WHERE id = $1

UPDATE rooms
SET status = 'available'
WHERE id = (SELECT room_id FROM bookings WHERE id = $1)
```

**Usage:**

```typescript
// After check-out time, guest didn't show up
await markBookingNoShow(bookingId, staffId)

// Now investigate why:
// - Did guest cancel without notifying?
// - Did guest forget?
// - Did guest oversleep?
// Track for future cancellation policies
```

---

### 4.11 CANCEL BOOKING

```typescript
export const cancelBooking = async (
  id: string,
  userId?: string
): Promise<Booking>
```

**Who Can Cancel:**
- **User**: Only their own pending bookings
- **Admin**: Any booking
- **Staff**: Any booking

**RLS Policy:**
```sql
CREATE POLICY "Users update own pending bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = user_id AND status = 'pending'
  )
```

**What Happens:**

```sql
UPDATE bookings
SET status = 'cancelled', cancelled_at = NOW()
WHERE id = $1

UPDATE rooms
SET status = 'available'
WHERE id = (SELECT room_id FROM bookings WHERE id = $1)

INSERT INTO activity_logs (...)
```

**Usage:**

```typescript
// User cancels their pending booking
try {
  const cancelled = await cancelBooking(bookingId, userId)
  alert("Booking cancelled successfully")
} catch (e) {
  // User can only cancel if status = pending
  alert("This booking cannot be cancelled (already confirmed)")
}
```

---

## Part 5: DELETE Operations (D)

### 5.1 DELETE Patterns Explained

```typescript
export const deleteEntity = async (id: string): Promise<void> => {
  const client = (typeof window !== 'undefined' ? createBrowserClient() : undefined) || supabase
  if (!client) throw new Error("Supabase client not initialized")

  const { error } = await client
    .from("table_name")
    .delete()
    .eq("id", id)

  if (error) throw error
}
```

**Key Considerations:**
- Hard delete vs soft delete
- Foreign key constraints
- Audit trail (should we keep records?)
- Permanent data loss

---

### 5.2 DELETE FLOOR

```typescript
export const deleteFloor = async (id: string): Promise<void>
```

**Constraints:**
- Cannot delete if rooms exist on floor (FK constraint)

**Error Handling:**
```typescript
try {
  await deleteFloor(floorId)
} catch (e) {
  if (e.message.includes('violates foreign key')) {
    alert("Cannot delete floor with rooms. Delete rooms first.")
  }
}
```

---

### 5.3 DELETE ROOM TYPE

```typescript
export const deleteRoomType = async (id: string): Promise<void>
```

**Constraints:**
- Cannot delete if rooms of this type exist

---

### 5.4 DELETE ROOM

```typescript
export const deleteRoom = async (id: string): Promise<void>
```

**Constraints:**
- Cannot delete if active bookings reference it

---

### 5.5 DELETE SERVICE (Smart Delete)

```typescript
export const deleteService = async (id: string): Promise<void>
```

**Special Behavior — Soft Delete with Fallback:**

```typescript
try {
  // Try hard delete
  await client.from("services").delete().eq("id", id)
} catch (error) {
  // Detect FK constraint error
  const isFK = 
    error?.code === '23503' ||
    error?.message?.includes('foreign key')

  if (isFK) {
    // Service has booking_services referencing it
    // Instead of failing, mark unavailable
    console.warn(`Service has bookings, marking unavailable...`)
    
    try {
      await updateService(id, { available: false })
      return  // Success via soft delete
    } catch (updateErr) {
      throw error  // Throw original error if soft delete fails
    }
  }

  throw error  // Rethrow unexpected errors
}
```

**Why This Matters:**

```
Without Soft Delete:
- Admin tries to delete massage service
- Error: "violates foreign key"
- Massage bookings exist for this service
- Admin must cancel all bookings first
- Complicated workflow

With Smart Soft Delete:
- Admin tries to delete massage service
- Error caught: FK constraint detected
- Service marked as available: false
- Service hidden from public
- Historical bookings remain intact
- Admin happy!
```

**Usage:**

```typescript
// Delete service with built-in fallback
await deleteService(serviceId)  // Hard delete OR soft delete

// Service now unavailable but not really deleted
const service = await getService(serviceId)
console.log(service.available)  // false
```

---

### 5.6 DELETE SERVICE CATEGORY

```typescript
export const deleteServiceCategory = async (id: string): Promise<void>
```

**Constraints:**
- Cannot delete if services reference it
- Cannot delete if `isDefault = true`

---

### 5.7 DELETE BOOKING

```typescript
export const deleteBooking = async (id: string): Promise<void>
```

**Typically Admin Only**

**Should You Delete Bookings?**

```
❌ Hard delete (not recommended):
- Loses audit trail
- Cannot see booking history
- Cannot investigate past issues
- Tax/regulatory problems

✓ Soft delete (recommended):
- Mark status as 'cancelled'
- Keep record for auditing
- Can restore if needed
```

**Best Practice:**

```typescript
// Instead of deleting:
await deleteBooking(bookingId)

// Use cancellation instead:
await cancelBooking(bookingId, adminId)
// Status: cancelled, but record kept
// Activity logged: "Admin cancelled booking XYZ"
```

---

## Part 6: Advanced CRUD Patterns

### 6.1 Transactions (Atomicity)

From `booking-service.ts`:

```typescript
/**
 * Create booking with all related records in single transaction
 */
export async function createCompleteBooking(request: BookingRequest): Promise<BookingResult> {
  const client = createClient()

  try {
    // Step 1: Validate dates
    if (request.checkOutDate <= request.checkInDate) {
      return { success: false, errorCode: 'INVALID_DATES' }
    }

    // Step 2: Verify room exists
    const { data: room } = await client
      .from("rooms")
      .select("id, status")
      .eq("id", request.roomId)
      .single()

    if (!room) {
      return { success: false, errorCode: 'ROOM_NOT_FOUND' }
    }

    // Step 3: Check availability
    const { data: conflicts } = await client
      .from("bookings")
      .select("*")
      .eq("room_id", request.roomId)
      .in("status", ["confirmed", "checked_in"])
      .lt("check_out_date", request.checkOutDate)
      .gt("check_in_date", request.checkInDate)

    if (conflicts && conflicts.length > 0) {
      return { success: false, errorCode: 'ROOM_NOT_AVAILABLE' }
    }

    // Step 4: Create booking (DB generates reference)
    const { data: booking, error: bookingError } = await client
      .from("bookings")
      .insert([{
        user_id: request.userId,
        room_id: request.roomId,
        check_in_date: request.checkInDate,
        check_out_date: request.checkOutDate,
        guest_name: request.guestName,
        total_price: request.totalPrice,
        status: "pending",
        payment_status: "pending"
      }])
      .select()
      .single()

    if (bookingError) throw bookingError

    // Step 5: Update room status to reserved
    const { error: roomError } = await client
      .from("rooms")
      .update({ status: "reserved" })
      .eq("id", request.roomId)

    if (roomError) {
      // Rollback booking if room update fails
      await client.from("bookings").delete().eq("id", booking.id)
      throw roomError
    }

    // All steps succeeded!
    return {
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference
    }

  } catch (error) {
    return { success: false, errorCode: 'UNKNOWN_ERROR' }
  }
}
```

**Key Insights:**
- Validate before committing
- Rollback on failure
- Return structured result (not just throw)
- Multiple dependent operations

---

### 6.2 Batch Operations

```typescript
// Create multiple rooms at once
async function bulkCreateRooms(roomData: Room[]): Promise<string[]> {
  const ids = []
  
  for (const room of roomData) {
    try {
      const id = await addRoom(room)
      ids.push(id)
    } catch (e) {
      console.error(`Failed to create room ${room.roomNumber}:`, e)
    }
  }

  return ids
}

// Usage
const newRoomIds = await bulkCreateRooms([
  { roomNumber: "401", roomTypeId: "id1", floorId: "f1", status: "available" },
  { roomNumber: "402", roomTypeId: "id1", floorId: "f1", status: "available" },
  { roomNumber: "403", roomTypeId: "id1", floorId: "f1", status: "available" }
])
```

---

### 6.3 Error Recovery

```typescript
// Try-catch patterns for CRUD
async function safeCreateRoom(room: Room) {
  try {
    return await addRoom(room)
  } catch (error) {
    // Handle specific errors
    if (error.message.includes('violates unique constraint')) {
      throw new Error(`Room ${room.roomNumber} already exists`)
    }
    if (error.message.includes('foreign key')) {
      throw new Error(`Floor or room type not found`)
    }
    // Generic fallback
    throw new Error(`Failed to create room: ${error.message}`)
  }
}
```

---

### 6.4 Pagination Pattern

```typescript
// Get bookings in chunks (for large datasets)
async function getBookingsPageByPage(pageSize: number = 50): Promise<Booking[][]> {
  const client = createClient()
  const pages: Booking[][] = []

  let page = 0
  while (true) {
    const { data } = await client
      .from("bookings")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!data || data.length === 0) break

    pages.push(data.map(convertTimestamps))
    page++
  }

  return pages
}

// Usage
const allPages = await getBookingsPageByPage(100)
allPages.forEach((page, idx) => {
  console.log(`Page ${idx}: ${page.length} bookings`)
})
```

---

### 6.5 Caching Pattern

```typescript
// Cache room types for 5 minutes
let cachedRoomTypes: RoomType[] | null = null
let cacheExpiry: Date | null = null

export async function getRoomTypesCached(): Promise<RoomType[]> {
  const now = new Date()

  // Return cached if still valid
  if (cachedRoomTypes && cacheExpiry && now < cacheExpiry) {
    return cachedRoomTypes
  }

  // Fetch fresh data
  cachedRoomTypes = await getRoomTypes()
  cacheExpiry = new Date(now.getTime() + 5 * 60 * 1000)  // +5 minutes

  return cachedRoomTypes
}

// Manual cache invalidation
export function invalidateRoomTypeCache() {
  cachedRoomTypes = null
  cacheExpiry = null
}

// Usage
await addRoomType(newType)
invalidateRoomTypeCache()  // Fresh data next fetch
```

---

## Part 7: Complete CRUD Workflow Example

### Real-World Scenario: Complete Hotel Booking System

```typescript
/**
 * Complete workflow: Guest books room, pays, checks in, checks out
 */

// ============================================================
// STEP 1: SETUP (Admin)
// ============================================================

// Create floors
const floor1 = await addFloor({
  name: "Ground Floor",
  number: 1,
  description: "Lobby and ground level"
})

const floor2 = await addFloor({
  name: "Premium Suite Floor",
  number: 2,
  description: "Luxury accommodations"
})

// Create room types
const deluxe = await addRoomType({
  name: "Deluxe Suite",
  slug: "deluxe-suite",
  basePrice: 250,
  maxOccupancy: 4,
  bedType: "King",
  amenities: ["WiFi", "Safe", "Balcony"]
})

// Create rooms
const room201 = await addRoom({
  roomNumber: "201",
  roomTypeId: deluxe,
  floorId: floor2.id,
  status: "available"
})

// Create service categories
const spaCategory = await addServiceCategory({
  name: "Spa & Wellness",
  slug: "spa",
  icon: "🧖",
  color: "purple",
  sortOrder: 1,
  isDefault: false
})

// Create services
const massage = await addService({
  name: "Swedish Massage",
  slug: "swedish-massage",
  description: "60-minute full-body massage",
  price: 80,
  categoryId: spaCategory,
  available: true,
  maxCapacity: 2
})

// ============================================================
// STEP 2: GUEST BROWSES (User)
// ============================================================

// Get available room types
const roomTypes = await getRoomTypes()
console.log(`Found ${roomTypes.length} room types`)

// Get available services
const services = await getServices()
console.log(`Found ${services.length} services`)

// ============================================================
// STEP 3: GUEST CREATES BOOKING (User)
// ============================================================

const bookingId = await addBooking({
  userId: currentUser.id,
  roomTypeId: deluxe,
  roomId: room201,
  checkInDate: new Date("2026-02-15"),
  checkOutDate: new Date("2026-02-18"),
  guestName: "John Doe",
  guestEmail: "john@hotel.com",
  guestPhone: "+1-555-1234",
  guestCount: 2,
  roomPrice: 750,      // 3 nights × $250
  servicesPrice: 80,   // 1 massage
  totalPrice: 830,
  status: "pending",
  paymentStatus: "pending",
  specialRequests: "High floor, away from elevator"
})

// Add services to booking
await addBookingServices(bookingId, [
  { serviceId: massage, quantity: 1 }
])

// ============================================================
// STEP 4: PAYMENT PROCESSED (Payment System)
// ============================================================

// Stripe webhook confirms payment
await updateBooking(bookingId, {
  paymentStatus: "paid",
  status: "confirmed",
  paidAmount: 830
})

// ============================================================
// STEP 5: GUEST CHECKS IN (Staff)
// ============================================================

const checkedIn = await checkInBooking(bookingId, staffUserId)
console.log(`${checkedIn.guestName} checked in at ${checkedIn.actualCheckInAt}`)

// Verify room status updated
const room = await getRooms()
const ourRoom = room.find(r => r.id === room201)
console.log(`Room status: ${ourRoom?.status}`)  // Should be "occupied"

// ============================================================
// STEP 6: GUEST STAYS (Timeline)
// ============================================================

// Timeline:
// - Feb 15: Check-in
// - Feb 15 evening: Massage service @ 7 PM
// - Feb 16-17: Guest in room
// - Feb 18: Guest leaves

// ============================================================
// STEP 7: GUEST CHECKS OUT (Staff)
// ============================================================

const checkedOut = await checkOutBooking(bookingId, staffUserId)
console.log(`${checkedOut.guestName} checked out at ${checkedOut.actualCheckOutAt}`)

// Verify room is available again
const rooms = await getRooms()
const ourRoom2 = rooms.find(r => r.id === room201)
console.log(`Room status: ${ourRoom2?.status}`)  // Should be "available"

// ============================================================
// STEP 8: REPORT & ANALYTICS (Admin)
// ============================================================

// Get all bookings for February
const allBookings = await getBookings()
const februaryBookings = allBookings.filter(b => {
  const checkIn = new Date(b.checkInDate)
  return checkIn.getMonth() === 1  // February
})

console.log(`Total bookings: ${februaryBookings.length}`)
console.log(`Total revenue: $${februaryBookings.reduce((sum, b) => sum + b.totalPrice, 0)}`)
```

---

## Summary Table

| Operation | Function | Returns | Notes |
|-----------|----------|---------|-------|
| **Create** | `add*()` | `string` (ID) | Database generates ID & timestamps |
| **Read** | `get*()` | `Entity[]` or `Entity` | RLS-aware, supports filtering |
| **Update** | `update*()` | `Entity` or `void` | Partial updates, cascading operations |
| **Delete** | `delete*()` | `void` | Hard delete, but services use soft delete |

---

**Last Updated**: January 12, 2026  
**Complexity**: Advanced  
**Covers**: All 9 CRUD domains with transaction patterns, error handling, and real-world workflows
