# RLS Policy Issue - Root Cause Found & Solution

## Issue Identified ✅
- **Problem**: "Booking not found" error when trying to cancel bookings with valid UUIDs
- **Root Cause**: Row Level Security (RLS) policy is too restrictive
- **Specific Issue**: Policy only allows updating bookings with `status = 'pending'`, but users need to cancel `'confirmed'` bookings too

## Current RLS Policy (Problematic)
```sql
CREATE POLICY "Users update own pending bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = user_id AND 
    status = 'pending'  -- ❌ TOO RESTRICTIVE
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    status IN ('pending', 'cancelled')
  );
```

## What's Happening
1. User books a room → Status becomes `'confirmed'`
2. User tries to cancel → Calls `updateBooking(id, { status: 'cancelled' })`
3. RLS policy blocks the update because `status != 'pending'`
4. Query returns 0 rows → "Booking not found" error
5. User sees confusing error message

## The Fix ✅
**File**: `fix-booking-rls-policy.sql`

```sql
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users update own pending bookings" ON bookings;

-- Create a new policy that allows users to update their own bookings
-- from pending/confirmed to cancelled status
CREATE POLICY "Users update own bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = user_id AND 
    status IN ('pending', 'confirmed')  -- ✅ ALLOWS BOTH STATUSES
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    status IN ('pending', 'confirmed', 'cancelled')  -- ✅ ALLOWS CANCELLATION
  );
```

## Why This Makes Sense
- ✅ **Pending bookings**: Should be cancellable (original functionality)
- ✅ **Confirmed bookings**: Should be cancellable (business logic)
- ❌ **Checked-in bookings**: Should NOT be cancellable (business rule)
- ❌ **Completed bookings**: Should NOT be cancellable (business rule)
- ❌ **Already cancelled**: No need to update (idempotent)

## Enhanced Error Message
Updated the error message to be more helpful:
```typescript
// OLD: "Booking not found: {id}"
// NEW: "Cannot update booking: This booking may not belong to your account, may not be in a status that allows updates, or may not exist. Please check booking status and try again."
```

## Next Steps
1. Apply the RLS policy fix to the database
2. Test booking cancellation functionality
3. Verify that confirmed bookings can now be cancelled
4. Ensure checked-in/completed bookings are still protected

## Status: Root Cause Identified ✅
The issue is NOT with the application code - it's with the database RLS policy being too restrictive. The fix is ready to apply.