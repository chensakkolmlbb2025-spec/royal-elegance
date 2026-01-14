# Bookings Page Debug Fix

## Issue Reported
User created 2 bookings but they don't show up in the "My Reservations" page.

## Root Cause Investigation

### Potential Issues Identified:

1. **Date Filtering Logic**
   - The `isCheckInDatePassed()` function compares dates and filters bookings
   - If check-in date is in the past, bookings won't show in "Upcoming" tab
   - Bookings might be miscategorized into wrong tabs

2. **Status Filtering**
   - Upcoming tab only shows bookings with status: `confirmed` or `pending`
   - If bookings were created with a different status, they won't appear
   - Verified: Bookings ARE created with status `'confirmed'` ✅

3. **Column Name Mapping**
   - Database uses: `check_in_date`, `check_out_date` (DATE type)
   - Code maps to: `checkIn`, `checkOut` (Date objects)
   - Mapping verified: ✅ Correct

4. **User ID Filter**
   - Query filters by `user_id = auth.uid()`
   - If user_id doesn't match, bookings won't be fetched
   - This is the most likely issue

## Changes Made

### 1. Added Debug Logging

**Location**: `/app/bookings/page.tsx` - `fetchBookings()` function

```typescript
// Debug: Log bookings data
console.log('[Bookings Debug] Total bookings fetched:', userBookings.length)
console.log('[Bookings Debug] Bookings:', userBookings.map(b => ({
  id: b.id,
  reference: b.bookingReference,
  status: b.status,
  checkIn: b.checkIn,
  checkOut: b.checkOut,
  createdAt: b.createdAt
})))
```

**Purpose**: See exactly what's being fetched from the database

### 2. Added Category Debug Logging

**Location**: `/app/bookings/page.tsx` - After filter functions

```typescript
// Debug: Log categorized bookings
console.log('[Bookings Debug] Categorized:', {
  total: bookings.length,
  upcoming: upcomingBookings.length,
  staying: stayingBookings.length,
  noShow: noShowBookings.length,
  history: historyBookings.length,
  cancelled: cancelledBookings.length
})
console.log('[Bookings Debug] Upcoming bookings:', upcomingBookings.map(b => ({
  ref: b.bookingReference,
  status: b.status,
  checkIn: b.checkIn,
  isCheckInPassed: isCheckInDatePassed(b)
})))
```

**Purpose**: See how bookings are being categorized

### 3. Added "All Bookings" Tab

**Location**: `/app/bookings/page.tsx` - Tabs section

**Before**:
```tsx
<Tabs defaultValue="upcoming">
  <TabsList>
    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
    <TabsTrigger value="staying">Staying</TabsTrigger>
    ...
  </TabsList>
```

**After**:
```tsx
<Tabs defaultValue="all">  {/* Changed default to "all" */}
  <TabsList>
    <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
    <TabsTrigger value="staying">Staying</TabsTrigger>
    ...
  </TabsList>
```

**Added Tab Content**:
```tsx
<TabsContent value="all" className="space-y-4">
  {bookings.length === 0 ? (
    <EmptyState 
      icon={Calendar} 
      title="No bookings found" 
      description="You haven't made any bookings yet."
      actionLabel="Browse Rooms"
      onAction={() => router.push("/rooms")}
    />
  ) : (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Debug View:</strong> Showing all {bookings.length} booking(s).
        </p>
      </div>
      {bookings.map(booking => (
        <BookingCard 
          key={booking.id} 
          booking={booking} 
          roomType={getRoomTypeForBooking(booking)}
          bookingServices={getServicesForBooking(booking)}
          isExpanded={expandedBookings.has(booking.id)}
          onToggle={() => toggleBookingDetails(booking.id)}
          onCancel={() => handleCancelBooking(booking.id)}
          onCheckIn={() => openActionDialog('check_in', booking)}
          onCheckOut={() => openActionDialog('check_out', booking)}
          onMarkNoShow={() => openActionDialog('no_show', booking)}
        />
      ))}
    </>
  )}
</TabsContent>
```

**Purpose**: 
- Shows ALL bookings regardless of status or date
- Helps identify if bookings exist but are miscategorized
- Default tab so users see this first

## How to Debug

### Step 1: Check Browser Console
1. Open the bookings page (`/bookings`)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for logs starting with `[Bookings Debug]`

### Step 2: Check What's Displayed
1. The "All" tab is now the default tab
2. It shows total count in the tab label: `All (X)`
3. If count is 0, bookings aren't being fetched from database
4. If count > 0, bookings exist but might be miscategorized

### Step 3: Verify Booking Data
Look at the console logs to check:
- `Total bookings fetched`: Should match number of bookings created
- `Bookings array`: Check each booking's:
  - `status`: Should be `'confirmed'`
  - `checkIn`: Should be a valid date
  - `checkOut`: Should be a valid date
  - `createdAt`: Should be recent

### Step 4: Check Categorization
- `Categorized object`: Shows count for each tab
- If `total > 0` but `upcoming = 0`, check the categorization logic
- Common issue: `checkIn` date is in the past, so booking goes to "No Show"

## Possible Issues and Solutions

### Issue 1: Bookings Not Fetched (total = 0)

**Check**:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM bookings WHERE user_id = '[your-user-id]';
```

**Solutions**:
- Verify user is logged in correctly
- Check if bookings were created under different user
- Verify RLS policies on bookings table

### Issue 2: Bookings Exist But Not in Upcoming (total > 0, upcoming = 0)

**Check Console Logs**:
```javascript
[Bookings Debug] Upcoming bookings: [
  {
    ref: "BK-123",
    status: "confirmed",
    checkIn: "2026-01-13T00:00:00.000Z",
    isCheckInPassed: true  // ← This is the issue!
  }
]
```

**Solutions**:
- If `isCheckInPassed: true` and check-in date is today or past:
  - Booking will be in "No Show" tab instead
  - This is correct behavior
- If `isCheckInPassed: false` but booking still not showing:
  - Check status is `'confirmed'` or `'pending'`
  - Verify check-in date is valid

### Issue 3: Bookings Show in Wrong Tab

**Date Comparison Logic**:
```typescript
const isCheckInDatePassed = (booking: Booking) => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)  // Reset to start of day
  const checkIn = new Date(booking.checkIn)
  checkIn.setHours(0, 0, 0, 0)
  return checkIn <= now  // True if check-in is today or earlier
}
```

**Behavior**:
- If you book for today or past dates → Shows in "No Show"
- If you book for future dates → Shows in "Upcoming"

**Solution**: Book with check-in date in the future

## Testing Checklist

- [ ] Open `/bookings` page
- [ ] Check browser console for `[Bookings Debug]` logs
- [ ] Click "All" tab - should show all bookings
- [ ] Verify booking count matches expected
- [ ] Check if bookings appear in correct tab based on dates
- [ ] Verify booking details (reference, status, dates)

## Files Modified

1. `/app/bookings/page.tsx`
   - Added debug logging
   - Added "All" tab
   - Made "All" the default tab
   - Added debug info banner

## Next Steps

1. **Test the page**: Check console logs and "All" tab
2. **If bookings show in "All" tab**:
   - They exist, just miscategorized
   - Check dates and status
   - May need to adjust date filtering logic

3. **If bookings don't show at all**:
   - Check database directly
   - Verify user_id matches
   - Check RLS policies

4. **If dates are the issue**:
   - Consider showing "today" bookings in "Upcoming" instead of "No Show"
   - Adjust `isCheckInDatePassed()` to use `<` instead of `<=`

## Recommendation

After debugging, if the issue is date-based categorization, we can adjust the logic:

```typescript
// Option 1: Include today's bookings in "Upcoming"
const isCheckInDatePassed = (booking: Booking) => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const checkIn = new Date(booking.checkIn)
  checkIn.setHours(0, 0, 0, 0)
  return checkIn < now  // Changed from <= to <
}

// Option 2: Create separate "Today" tab
const todayBookings = bookings.filter(b => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const checkIn = new Date(b.checkIn)
  checkIn.setHours(0, 0, 0, 0)
  return checkIn.getTime() === now.getTime() && b.status === 'confirmed'
})
```

Let me know what the console shows and we can fix it!
