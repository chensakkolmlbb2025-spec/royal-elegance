# Automatic Room Status Updates

## Overview
The system now automatically updates room statuses from "reserved" to "available" when:
1. **Check-out date has passed** - Bookings with expired check-out dates are marked as "no_show" and rooms are freed
2. **Guest marked as no-show** - Room status immediately updates to "available"
3. **Booking is cancelled** - Room status immediately updates to "available"

## Implementation Details

### Core Functions

#### 1. `updateRoomStatusToAvailable(roomId: string)`
Helper function that updates a room's status to "available".
- **Location**: `lib/supabase-service.ts`
- **Usage**: Called automatically by booking status update functions

#### 2. `checkOutBooking(id: string, staffId?: string)`
**Enhanced** to automatically free up the room when checking out.
- Updates booking status to "checked_out"
- Sets actual_check_out_at timestamp
- **Automatically updates room status to "available"**
- Logs activity

#### 3. `markBookingNoShow(id: string, staffId?: string)`
**Enhanced** to automatically free up the room when marking no-show.
- Updates booking status to "no_show"
- **Automatically updates room status to "available"**
- Logs activity

#### 4. `cancelBooking(id: string, userId?: string)`
**NEW** - Cancels a booking and frees up the room.
- Updates booking status to "cancelled"
- **Automatically updates room status to "available"**
- Logs activity

#### 5. `updateBooking(id: string, booking: Partial<Booking>)`
**Enhanced** to detect status changes.
- When status is updated to "cancelled" or "no_show"
- **Automatically updates room status to "available"**

#### 6. `cleanupExpiredBookings()`
**NEW** - Periodic cleanup function for expired bookings.
- Finds all bookings with check-out dates in the past
- Only processes bookings with status "pending" or "confirmed"
- Marks them as "no_show"
- **Automatically updates room status to "available"**
- Returns count of updated bookings
- Runs automatically every 5 minutes

### Automatic Cleanup System

#### Hook: `useBookingCleanup()`
**Location**: `hooks/use-booking-cleanup.ts`
- Runs cleanup immediately on mount
- Continues running every 5 minutes
- Handles errors gracefully with console logging

#### Provider: `BookingCleanupProvider`
**Location**: `components/system/booking-cleanup-provider.tsx`
- Wraps components that need automatic cleanup
- Currently integrated in:
  - Admin Dashboard (`app/admin/page.tsx`)
  - Staff Portal (`app/staff/page.tsx`)

## Usage Examples

### Manual Operations

```typescript
import { cancelBooking, markBookingNoShow, checkOutBooking } from "@/lib/supabase-service"

// Cancel a booking (room automatically becomes available)
await cancelBooking("booking-id", "user-id")

// Mark as no-show (room automatically becomes available)
await markBookingNoShow("booking-id", "staff-id")

// Check out (room automatically becomes available)
await checkOutBooking("booking-id", "staff-id")
```

### Automatic Cleanup

```typescript
import { cleanupExpiredBookings } from "@/lib/supabase-service"

// Manually trigger cleanup (usually runs automatically)
const updatedCount = await cleanupExpiredBookings()
console.log(`Cleaned up ${updatedCount} expired bookings`)
```

### Using the Provider

```tsx
import { BookingCleanupProvider } from "@/components/system/booking-cleanup-provider"

export default function Dashboard() {
  return (
    <BookingCleanupProvider>
      {/* Your dashboard content */}
    </BookingCleanupProvider>
  )
}
```

## Database Impact

### Automatic Updates
- **bookings table**: Status updated to "no_show" or "cancelled"
- **rooms table**: Status updated to "available"
- **activity_logs table**: Actions logged for audit trail

### Performance
- Cleanup runs every 5 minutes (300,000ms)
- Only processes bookings with past check-out dates
- Filters by status (pending/confirmed only)
- Minimal database load

## Error Handling

All functions include graceful error handling:
- Room status update failures are logged but don't block the main operation
- Activity log failures are logged but don't block the operation
- Cleanup errors are logged to console

## Testing Checklist

- [ ] Check-out a booking → Room status changes to "available"
- [ ] Mark booking as no-show → Room status changes to "available"
- [ ] Cancel a booking → Room status changes to "available"
- [ ] Create a booking with past check-out date → Wait 5 minutes → Status becomes "no_show" and room becomes "available"
- [ ] Verify activity logs are created for each action

## Future Enhancements

1. **Email notifications** when bookings are auto-cancelled
2. **Dashboard alerts** for auto-cancelled bookings
3. **Configurable cleanup interval** (currently hardcoded to 5 minutes)
4. **Cleanup summary reports** sent to admins daily
5. **Grace period** before auto-cancellation (e.g., 2 hours after check-out time)
