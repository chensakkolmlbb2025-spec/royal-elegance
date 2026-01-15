# 📡 API Directory - Comprehensive Guide

## Overview

The `/app/api` directory contains all the **backend API routes** that power your hotel booking system. These are **server-side endpoints** that handle critical operations like creating bookings, processing payments, and managing room availability.

---

## 📁 Directory Structure

```
app/api/
├── bookings/              # Booking management endpoints
│   ├── availability/      # Check room availability
│   ├── create/           # Create new bookings
│   ├── cleanup/          # Automated cleanup (cron job)
│   └── mark-paid/        # Mark booking as paid
├── payments/             # Payment processing endpoints
│   ├── create-intent/    # Initialize Stripe payment
│   ├── mark-paid/        # Mark payment as complete
│   ├── debug/            # Payment testing & debugging
│   └── self-test/        # Payment system health check
├── health/               # System health monitoring
├── debug/                # Development & debugging tools
│   └── bookings/         # Debug current user's bookings
├── webhooks/             # External service callbacks
│   └── stripe/           # Stripe payment webhooks
└── seed-database/        # Initial data seeding
```

---

## 🎯 API Routes Explained

### 1. **Bookings: Availability Check** 📅
**File:** `app/api/bookings/availability/route.ts`

#### What It Does
Checks which rooms are available for your desired dates. It's the **first step** when users search for rooms.

#### How It Works - Step by Step

**Step 1: Request Format**
```
GET /api/bookings/availability?
    checkInDate=2026-01-20&
    checkOutDate=2026-01-25&
    roomTypeId=abc123&
    guestCount=2
```

**Step 2: What Gets Validated**
- ✅ Check-in date is valid
- ✅ Check-out date is valid
- ✅ Check-out is after check-in
- ✅ Guest count is 1-10
- ✅ Room type ID is valid UUID (if provided)

**Step 3: Database Query**
The API calls a special database function called `get_available_rooms()` that:
1. Looks at all bookings during your date range
2. Excludes rooms that are already booked
3. Filters by room type (if specified)
4. Checks room capacity matches guest count

**Step 4: Response Format**
```json
{
  "success": true,
  "rooms": [
    {
      "roomId": "uuid-123",
      "roomNumber": "301",
      "roomTypeId": "type-uuid",
      "roomTypeName": "Deluxe Room",
      "basePrice": 250,
      "maxOccupancy": 2,
      "floorNumber": 3
    }
  ],
  "count": 5,
  "params": {
    "checkInDate": "2026-01-20",
    "checkOutDate": "2026-01-25",
    "roomTypeId": "type-uuid",
    "guestCount": 2
  }
}
```

#### Error Scenarios
| Error | Status | Meaning |
|-------|--------|---------|
| Missing dates | 400 | You didn't provide check-in/check-out dates |
| Invalid date format | 400 | Date format is wrong (must be valid date) |
| Database error | 500 | System error, try again later |

#### Example Use Case
```typescript
// Frontend code calling this API
const response = await fetch(
  `/api/bookings/availability?` +
  `checkInDate=2026-01-20&` +
  `checkOutDate=2026-01-25&` +
  `guestCount=2`
);
const { rooms } = await response.json();
// Now display available rooms to user
```

---

### 2. **Bookings: Create Booking** ✏️
**File:** `app/api/bookings/create/route.ts`

#### What It Does
Creates a **brand new booking** and saves it to the database. This is the most important API - it's where the magic happens!

#### How It Works - Step by Step

**Step 1: Authentication Check**
```
The API checks: "Is the user logged in?"
If NO → Returns 401 Unauthorized
If YES → Continues with the booking
```

**Step 2: Request Format**
```json
{
  "roomId": "uuid-of-room",
  "roomTypeId": "uuid-of-room-type",
  "checkInDate": "2026-01-20T00:00:00Z",
  "checkOutDate": "2026-01-25T00:00:00Z",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+855123456789",
  "guestCount": 2,
  "roomPrice": 250,
  "servicesPrice": 50,
  "totalPrice": 300,
  "specialRequests": "Late checkout please",
  "paymentMethod": "credit_card",
  "services": [
    {
      "serviceId": "service-uuid",
      "quantity": 1,
      "unitPrice": 50,
      "serviceDate": "2026-01-21",
      "serviceTime": "10:00"
    }
  ]
}
```

**Step 3: Validation Process**
The API checks EVERY field:

| Field | Validation |
|-------|-----------|
| roomId | Must be valid UUID |
| checkInDate | Must be valid date |
| checkOutDate | Must be valid date |
| guestName | 2-100 characters |
| guestEmail | Valid email format |
| guestPhone | 6-20 characters |
| guestCount | 1-10 people |
| totalPrice | Must be positive number |
| services | Each service has valid ID, quantity, price |

**Step 4: Database Lock (Bulletproof Protection)**
```
The API uses database-level LOCKING to prevent:
❌ Two people booking the same room simultaneously
❌ Overbooking (more guests than room capacity)
❌ Booking dates that overlap with existing bookings
```

**Step 5: Database Operations**
```
1. Lock the room to prevent others from booking
2. Check if room is actually available
3. Create the booking record
4. Create service items (if any)
5. Unlock the room
```

**Step 6: Success Response**
```json
{
  "success": true,
  "booking": {
    "id": "booking-uuid",
    "bookingReference": "REF-2026-0001",
    "userId": "user-uuid",
    "roomId": "room-uuid",
    "status": "confirmed",
    "checkInDate": "2026-01-20",
    "checkOutDate": "2026-01-25",
    "guestName": "John Doe",
    "totalPrice": 300,
    "paymentStatus": "pending",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

#### Error Scenarios
| Error | Status | Meaning |
|-------|--------|---------|
| Not logged in | 401 | User must sign in first |
| Missing fields | 400 | Some required fields are missing |
| Invalid data | 400 | Data format is wrong |
| Room not available | 409 | Room is already booked for those dates |
| Room locked too long | 500 | Database lock timeout (rare) |

#### Why "Bulletproof"?
This API is called **"bulletproof"** because:
1. ✅ Uses database-level transactions
2. ✅ Locks rows to prevent race conditions
3. ✅ Validates all data before saving
4. ✅ Handles concurrent requests safely
5. ✅ Automatic rollback if anything fails

---

### 3. **Bookings: Mark as Paid** 💰
**File:** `app/api/bookings/mark-paid/route.ts`

#### What It Does
Updates a booking's payment status from **"pending"** to **"paid"** after Stripe confirms payment.

#### How It Works - Step by Step

**Step 1: Security Token Verification**
```
The API receives a short-lived token (expires in 5 minutes):
- Token contains: bookingId + expiration time
- Token is HMAC-signed for security
- Prevents unauthorized payment marking
```

**Step 2: Request Format**
```json
{
  "bookingId": "booking-uuid",
  "bookingReference": "REF-2026-0001",
  "paidAmount": 30000,           // Amount in cents ($300)
  "paymentMethod": "credit_card",
  "markPaidToken": "eyJib..."    // From Stripe payment
}
```

**Step 3: Validation Process**
```
1. Verify token signature (HMAC check)
2. Check token hasn't expired
3. Verify booking exists
4. Verify booking hasn't already been paid
```

**Step 4: Database Update**
```sql
UPDATE bookings 
SET 
  payment_status = 'paid',
  paid_amount = 30000,
  payment_method = 'credit_card',
  updated_at = NOW()
WHERE id = 'booking-uuid'
```

**Step 5: Success Response**
```json
{
  "success": true,
  "booking": {
    "id": "booking-uuid",
    "paymentStatus": "paid",
    "paidAmount": 30000,
    "paymentMethod": "credit_card"
  }
}
```

#### Security Features
- 🔐 Token expires in 5 minutes
- 🔐 HMAC signature prevents tampering
- 🔐 Booking ID must match token
- 🔐 Works with Stripe webhooks too

#### Error Scenarios
| Error | Status | Meaning |
|-------|--------|---------|
| No token or booking ID | 400 | Missing required information |
| Invalid token | 403 | Token is fake or tampered |
| Token expired | 403 | Token older than 5 minutes |
| Booking not found | 404 | Booking doesn't exist |
| Server misconfigured | 500 | Missing Stripe secret key |

---

### 4. **Payments: Create Intent** 🎫
**File:** `app/api/payments/create-intent/route.ts`

#### What It Does
Starts the Stripe payment process by creating a **PaymentIntent** - a temporary payment order that Stripe monitors.

#### How It Works - Step by Step

**Step 1: Request Format**
```json
{
  "bookingId": "booking-uuid",
  "amount": 30000,              // Amount in cents ($300)
  "currency": "usd",
  "customer_email": "john@example.com",
  "metadata": {
    "roomNumber": "301",
    "hotelName": "Royal Elegance"
  }
}
```

**Step 2: Stripe API Call**
```
POST to Stripe API with:
- Amount in cents
- Currency
- Customer email
- Booking ID for tracking
```

**Step 3: Idempotency Key (Prevents Duplicates)**
```
The API uses: booking:REF-2026-0001
This ensures:
- If request fails and retries, same PaymentIntent is returned
- No duplicate charges
- Safe to retry
```

**Step 4: Response Format**
```json
{
  "clientSecret": "pi_123_secret_xyz",  // For Stripe.js on frontend
  "markPaidToken": "eyJib..."           // For marking as paid
}
```

**Step 5: What Happens Next**
```
1. Frontend receives clientSecret
2. User enters card details in Stripe form
3. Stripe handles payment securely (PCI compliant)
4. Frontend gets confirmation
5. Frontend calls mark-paid API with token
6. Backend updates booking status
```

#### Stripe Configuration
```env
STRIPE_SECRET_KEY=sk_test_xxxxx        # Your Stripe secret key
MARK_PAID_SECRET=your_secret_here      # Signing secret for tokens
```

#### Error Scenarios
| Error | Status | Meaning |
|-------|--------|---------|
| Stripe not configured | 500 | Missing API key |
| Invalid amount | 400 | Amount must be > 0 |
| Invalid booking | 400 | Booking doesn't exist |
| Stripe API error | 500 | Stripe service unavailable |

#### Example Flow
```
1. User clicks "Pay Now"
2. Frontend calls create-intent
3. Gets clientSecret from response
4. Shows Stripe payment form
5. User enters card
6. Form submits to Stripe
7. User sees confirmation
8. Frontend calls mark-paid with token
9. Booking status changes to "paid"
```

---

### 5. **Bookings: Cleanup (Auto No-Show)** 🧹
**File:** `app/api/bookings/cleanup/route.ts`

#### What It Does
**Automatically marks bookings as "No Show"** when the check-in date passes and they haven't been checked in.

This runs as a **cron job** (automated task) once per day.

#### How It Works - Step by Step

**Step 1: Security Check**
```
Verify the request comes from:
- Vercel Cron (your hosting)
- Or has correct CRON_SECRET header
```

**Step 2: Database Function Call**
```
Calls: cleanup_expired_bookings()

This function:
1. Finds all bookings with status "confirmed" or "pending"
2. Where check-in date is BEFORE today
3. Marks them as "no_show"
4. Records what was cleaned up
```

**Step 3: Response Format**
```json
{
  "success": true,
  "cleanedCount": 5,           // 5 bookings marked no-show
  "freedRooms": 5,             // 5 rooms are now available
  "details": [
    {
      "bookingId": "uuid-1",
      "bookingRef": "REF-001",
      "checkinDate": "2026-01-10"
    }
  ],
  "timestamp": "2026-01-15T00:05:00Z"
}
```

#### Configuration (Vercel Crons)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/bookings/cleanup",
    "schedule": "0 0 * * *"  // Daily at midnight
  }]
}
```

#### Why This Is Important
```
Without cleanup:
❌ Rooms stay "booked" forever
❌ No-show guests not tracked
❌ Bad inventory data

With cleanup:
✅ Rooms become available
✅ No-shows automatically recorded
✅ Accurate inventory counts
✅ Business analytics work correctly
```

#### Error Scenarios
| Error | Status | Meaning |
|-------|--------|---------|
| Invalid secret | 401 | Cron request not authenticated |
| Database error | 500 | Couldn't update bookings |
| No changes needed | 200 | No expired bookings found |

---

### 6. **Health Check** 💚
**File:** `app/api/health/route.ts`

#### What It Does
Provides a simple **"Is the system working?"** check for monitoring services.

#### How It Works
```
GET /api/health

Response:
{
  "timestamp": "2026-01-15T10:30:00Z",
  "status": "ok",
  "message": "Minimal health check - Supabase checks omitted in build-safe mode"
}
```

#### Why It's Needed
```
1. Monitoring services check this every minute
2. If it fails, alert the developer
3. Helps detect if server is down
4. Used by deployment pipelines
```

#### Status Codes
| Code | Meaning |
|------|---------|
| 200 | System is healthy ✅ |
| 500 | System error ❌ |

---

### 7. **Debug: User Bookings** 🔍
**File:** `app/api/debug/bookings/route.ts`

#### What It Does
Shows **all bookings for the current logged-in user** - useful for debugging and development.

#### How It Works
```
GET /api/debug/bookings

Returns:
{
  "success": true,
  "userId": "user-uuid",
  "userEmail": "john@example.com",
  "bookingsCount": 3,
  "bookings": [
    {
      "id": "booking-uuid",
      "booking_reference": "REF-2026-0001",
      "status": "confirmed",
      "payment_status": "paid",
      "total_price": 300,
      "check_in_date": "2026-01-20",
      "check_out_date": "2026-01-25"
    }
  ]
}
```

#### Use Cases
```
1. Testing: Verify booking was created
2. Debugging: Check booking status
3. Development: Test payment flow
4. QA: Validate user sees correct data
```

---

### 8. **Seed Database** 🌱
**File:** `app/api/seed-database/route.ts`

#### What It Does
Fills the database with **sample data** (room types, rooms, services) for testing.

#### How It Works - Step by Step

**Step 1: Security Check**
```
Optional: Verify secret header to prevent unauthorized seeding
Header: x-seed-secret: your-secret-key
```

**Step 2: Check If Already Seeded**
```
If database already has room types:
- Return error: "Database already seeded"
- Prevents duplicate data
```

**Step 3: Create Sample Data**
```
1. 4 room types:
   - Deluxe Room ($250)
   - Executive Suite ($450)
   - Presidential Suite ($850)
   - Garden View ($180)

2. 20 rooms across floors 1-5

3. 5 services:
   - Airport Transfer
   - Spa Treatment
   - Breakfast
   - Laundry
   - Room Upgrade
```

**Step 4: Response**
```json
{
  "success": true,
  "message": "Database seeded successfully",
  "created": {
    "roomTypes": 4,
    "rooms": 20,
    "services": 5,
    "floors": 5
  }
}
```

#### Usage in Development
```bash
# Call from development environment
curl -X POST http://localhost:3000/api/seed-database \
  -H "x-seed-secret: your-secret-key"
```

#### Important Notes
⚠️ Only works if database is empty
⚠️ Don't call in production accidentally
⚠️ Use SEED_SECRET to prevent misuse

---

### 9. **Stripe Webhooks** 🪝
**File:** `app/api/webhooks/stripe/route.ts`

#### What It Does
Receives **automatic notifications from Stripe** when payments succeed or fail.

#### How It Works - Step by Step

**Step 1: Stripe Event**
```
User completes payment on Stripe form
↓
Stripe server calls: POST /api/webhooks/stripe
↓
Sends event data to your API
```

**Step 2: Webhook Signature Verification**
```
Stripe signs every webhook with your secret:
- Verify signature to ensure it's really from Stripe
- Not from a hacker pretending to be Stripe
```

**Step 3: Event Processing**
```
Different Stripe events:
- payment_intent.succeeded → Mark booking as paid
- payment_intent.payment_failed → Show error to user
- charge.refunded → Refund booking
- etc.
```

**Step 4: Update Database**
```
Based on event type:
{
  "payment_intent.succeeded": {
    → UPDATE bookings SET payment_status = 'paid'
  },
  "payment_intent.payment_failed": {
    → UPDATE bookings SET payment_status = 'failed'
  }
}
```

#### Configuration
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx    # From Stripe dashboard
```

#### Webhook Event Flow
```
User completes payment
    ↓
Stripe confirms payment
    ↓
Stripe sends webhook to /api/webhooks/stripe
    ↓
API verifies signature
    ↓
API updates booking status
    ↓
Booking marked as paid (even if user closes tab!)
```

#### Why Webhooks Are Important
```
Without webhooks:
❌ If user closes browser, payment not recorded
❌ Manual intervention needed
❌ Lost bookings

With webhooks:
✅ Automatic status updates
✅ Works even if user closes tab
✅ Reliable payment tracking
✅ No manual work needed
```

---

### 10. **Payments: Debug & Self-Test** 🧪
**File:** `app/api/payments/debug/route.ts` & `app/api/payments/self-test/route.ts`

#### What They Do
**Debug API**: Show payment configuration details
**Self-Test API**: Test Stripe connection with real API

#### Usage in Development
```bash
# Check payment configuration
GET /api/payments/debug

# Test Stripe connection
POST /api/payments/self-test
```

#### Response Example
```json
{
  "stripe": {
    "configured": true,
    "secretKeyExists": true,
    "environment": "test",
    "webhookConfigured": true
  },
  "status": "ready"
}
```

---

## 🔒 Security Best Practices in APIs

### 1. **Authentication**
```typescript
// Every booking/payment API checks:
const { user } = await supabase.auth.getUser()
if (!user) return Unauthorized
```

### 2. **Input Validation**
```typescript
// All inputs validated with Zod schema
const validationResult = schema.safeParse(body)
if (!validationResult.success) return BadRequest
```

### 3. **Database Transactions**
```typescript
// Bookings use atomic transactions (all or nothing)
- Lock rows to prevent race conditions
- Rollback automatically on error
- Ensures data consistency
```

### 4. **Token-Based Security**
```typescript
// Payment tokens are:
- HMAC-signed (can't forge)
- Short-lived (5 minutes)
- Contain booking ID
- Time-safe comparison
```

### 5. **Environment Secrets**
```env
# Never hardcode secrets!
STRIPE_SECRET_KEY=sk_test_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sbp_xxxxx
CRON_SECRET=abc123
SEED_SECRET=xyz789
```

---

## 📊 API Usage Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                                │
└─────────────────────────────────────────────────────────────────┘

1. BROWSE ROOMS
   User selects dates → Frontend calls:
   GET /api/bookings/availability
   ↓ Returns available rooms

2. BOOK ROOM
   User confirms booking → Frontend calls:
   POST /api/bookings/create
   ↓ Returns booking ID and reference

3. PAY FOR BOOKING
   User clicks "Pay Now" → Frontend calls:
   POST /api/payments/create-intent
   ↓ Returns Stripe clientSecret

4. ENTER CARD
   User fills card form → Stripe handles securely
   ↓ Payment confirmed by Stripe

5. MARK AS PAID
   Frontend calls:
   POST /api/bookings/mark-paid
   ↓ Booking status changes to "paid"

6. CONFIRMATION
   User sees: "Payment successful!"
   ✅ Booking complete

7. DAILY CLEANUP (Cron Job)
   Every night:
   POST /api/bookings/cleanup
   ↓ Marks no-show bookings automatically
```

---

## 🚀 Common API Calls Examples

### Example 1: Check Room Availability
```typescript
// Frontend JavaScript
const response = await fetch(
  `/api/bookings/availability?` +
  `checkInDate=2026-01-20&` +
  `checkOutDate=2026-01-25&` +
  `guestCount=2`
);
const { rooms } = await response.json();
console.log(`Found ${rooms.length} available rooms`);
```

### Example 2: Create a Booking
```typescript
const response = await fetch('/api/bookings/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomId: '123-uuid',
    roomTypeId: 'type-uuid',
    checkInDate: '2026-01-20',
    checkOutDate: '2026-01-25',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+855123456789',
    guestCount: 2,
    roomPrice: 250,
    servicesPrice: 0,
    totalPrice: 250
  })
});
const { booking } = await response.json();
console.log(`Booking created: ${booking.bookingReference}`);
```

### Example 3: Initialize Payment
```typescript
const response = await fetch('/api/payments/create-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookingId: booking.id,
    amount: 25000,        // $250 in cents
    currency: 'usd',
    customer_email: 'john@example.com'
  })
});
const { clientSecret, markPaidToken } = await response.json();
console.log('Ready to process payment');
```

### Example 4: Mark Booking as Paid
```typescript
const response = await fetch('/api/bookings/mark-paid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookingId: booking.id,
    paidAmount: 25000,
    paymentMethod: 'credit_card',
    markPaidToken: token_from_stripe
  })
});
const result = await response.json();
console.log('Payment recorded:', result.success);
```

---

## 🐛 Troubleshooting Common Issues

### "Room not available"
```
Possible causes:
1. Room is already booked for those dates
2. Check-out date is before check-in date
3. Room capacity too small for guest count
4. Room type doesn't exist

Solution:
- Try different dates
- Check guest count
- Choose different room type
```

### "Payment failed"
```
Possible causes:
1. Stripe API key not configured
2. Network error
3. Invalid card
4. Insufficient funds

Solution:
- Check STRIPE_SECRET_KEY is set
- Check internet connection
- Try different card
- Contact Stripe support
```

### "Booking not found"
```
Possible causes:
1. Booking was deleted
2. Wrong booking ID
3. User accessing different account's booking

Solution:
- Check booking ID is correct
- Verify you're logged in as correct user
- Check booking exists in database
```

### "Timeout error"
```
Possible causes:
1. Database is slow
2. Room is locked (someone else booking)
3. Network is slow

Solution:
- Wait a moment and retry
- Try a different room
- Check internet speed
```

---

## 📈 API Monitoring

### Metrics to Monitor
```
1. Response Time
   - Target: < 200ms
   - Warning: > 500ms
   - Error: > 2000ms

2. Success Rate
   - Target: > 99.5%
   - Warning: 95-99%
   - Error: < 95%

3. Error Rate
   - 4xx errors: Client mistakes
   - 5xx errors: Server problems
```

### Health Check
```bash
# Monitor health every 60 seconds
curl https://yourhotel.com/api/health

# Should always return:
HTTP 200 OK
{ "status": "ok" }
```

---

## 🎓 Summary Table

| API | Method | Purpose | Auth Required |
|-----|--------|---------|---|
| /api/bookings/availability | GET | Check available rooms | No |
| /api/bookings/create | POST | Create new booking | Yes |
| /api/bookings/mark-paid | POST | Mark booking paid | Optional |
| /api/bookings/cleanup | POST | Auto no-show marking | Secret |
| /api/payments/create-intent | POST | Start Stripe payment | No |
| /api/payments/debug | GET | Check payment config | No |
| /api/payments/self-test | POST | Test Stripe connection | Secret |
| /api/health | GET | System health check | No |
| /api/debug/bookings | GET | List user's bookings | Yes |
| /api/webhooks/stripe | POST | Stripe callbacks | Signature |
| /api/seed-database | POST | Initialize sample data | Secret |

---

## 🔗 Related Documentation

- **Database Guide**: See `DATABASE_SCHEMA_GUIDE.md` for table structures
- **Authentication**: See `AUTH_SYSTEM_COMPLETE.md` for auth flows
- **Payment System**: See `PAYMENT_INTEGRATION_GUIDE.md` for payment details
- **Booking System**: See `BULLETPROOF_BOOKING_FIX.md` for transaction safety

---

## 💡 Key Takeaways

✅ **APIs are request handlers** - They receive data and return responses
✅ **Every API validates input** - Prevents bad data from reaching database
✅ **Security layers protect data** - Authentication, validation, encryption
✅ **Error handling is important** - Clear messages help debugging
✅ **Transactions ensure consistency** - All-or-nothing operations
✅ **Webhooks enable automation** - Instant updates without polling
✅ **Monitoring catches problems** - Health checks detect issues early
✅ **Environment secrets stay secret** - Never hardcode sensitive keys

---

**Last Updated:** January 15, 2026
**API Version:** 1.0.0
**Framework:** Next.js 16.1.1
**Runtime:** Node.js (Vercel Serverless)
