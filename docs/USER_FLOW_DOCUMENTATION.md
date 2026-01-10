# Royal Elegance Hotel Booking System - Core User Flows

## Document Overview

**Project:** Royal Elegance Hotel Booking System  
**Version:** 2.0  
**Last Updated:** January 9, 2026  
**Author:** Development Team  

This document covers the 10 most critical user flows in the Royal Elegance hotel booking system.

---

## Table of Contents

1. [System Roles Overview](#system-roles-overview)
2. [Guest User Flows (Unauthenticated)](#guest-user-flows-unauthenticated)
   - Flow 1: User Registration
   - Flow 2: User Login
3. [Customer User Flows (Authenticated)](#customer-user-flows-authenticated)
   - Flow 3: Complete Booking Journey
   - Flow 4: Payment Processing
   - Flow 5: Booking Management
   - Flow 6: Profile Management
4. [Staff User Flows](#staff-user-flows)
   - Flow 7: Staff Check-In/Check-Out
5. [Admin User Flows](#admin-user-flows)
   - Flow 8: Admin Dashboard
   - Flow 9: Room Management
   - Flow 10: Service Management
6. [Universal Flow: Error Handling & Recovery](#universal-flow-error-handling--recovery)

---

## System Roles Overview

The Royal Elegance Hotel Booking System supports four distinct user roles, each with specific permissions and capabilities:

### 🌐 Guest (Unauthenticated)
**Access Level:** Public
- Browse public pages (landing, rooms, services)
- View room types and pricing
- **Cannot:** Make bookings, access profile
- **Must:** Register/login to proceed with reservations

### 👤 Customer (Authenticated User)
**Access Level:** Authenticated
- Full booking capabilities
- Profile and preferences management
- Booking history and modifications
- Payment processing
- **Role in Database:** `role = 'user'`

### 🛎️ Staff
**Access Level:** Limited Admin
- View today's check-ins/check-outs
- Update booking statuses (checked-in, completed)
- Process incidental charges
- Generate invoices
- **Role in Database:** `role = 'staff'`

### 👑 Admin
**Access Level:** Full Control
- Complete system access
- User, room, and service management
- Analytics and reporting
- Database operations
- System configuration
- **Role in Database:** `role = 'admin'`

---

# Guest User Flows (Unauthenticated)

> **Role:** Guest (Not logged in)  
> **Purpose:** Account creation and authentication  
> **Access:** Public pages only

---

## Flow 1: User Registration

**Purpose:** New user account creation with email verification

```
START → /auth/signup
  ↓
  Fill Registration Form
  ├─→ Full Name
  ├─→ Email Address
  ├─→ Password (strength validated)
  └─→ Confirm Password
      ↓
      Submit → Supabase Auth Creates User
      ↓
      Create Profile Record
      ↓
      Redirect to /auth/verify-email
      ↓
      Email Verification
      ├─→ Click link in email
      ├─→ Auto-polling for status
      └─→ Resend option (60s cooldown)
          ↓
          Verification Complete
          ↓
          Redirect to /home
```

**Components:** `components/auth/signup-form.tsx`, `components/auth/password-strength-meter.tsx`, `components/auth/verify-email.tsx`

**Security:** Password strength validation, email verification required, RLS policies

---

## Flow 2: User Login

**Purpose:** Authenticate existing users via email/password or OAuth

```
START → /auth/login
  ↓
  [Login Options]
  ├─→ Email/Password
  │   ↓
  │   Enter Credentials
  │   ↓
  │   authClient.signIn()
  │   ↓
  │   Verify Session
  │   ↓
  │   Redirect to /home
  │
  └─→ Google OAuth
      ↓
      Click "Continue with Google"
      ↓
      Google OAuth Flow
      ↓
      Create/Update Profile
      ↓
      Redirect to /home
```

**Components:** `components/auth/login-form.tsx`, `components/auth/demo-credentials.tsx`

**Features:** Email + OAuth login, demo accounts available, session verification

---

# Customer User Flows (Authenticated)

> **Role:** Customer (Authenticated user)  
> **Purpose:** Core booking and account management  
> **Database Role:** `role = 'user'`

---

## Flow 3: Complete Booking Journey

**Purpose:** End-to-end room booking with payment

```
START → /rooms
  ↓
  Browse & Select Room Type
  ↓
  Click "Book Now"
  ↓
  [Step 1: Dates & Guests]
  ├─→ Select check-in/check-out dates
  ├─→ Set guest count
  └─→ View availability calendar
      ↓
      [Step 2: Room Selection]
      ├─→ View available rooms
      └─→ Select preferred room
          ↓
          [Step 3: Additional Services]
          ├─→ Add spa, dining, etc.
          └─→ View running total
              ↓
              [Step 4: Review & Payment]
              ├─→ Review summary (room, dates, services, total)
              ├─→ Add special requests
              └─→ Enter payment details (Stripe)
                  ↓
                  Process Payment
                  ↓
                  Create Booking Record
                  ↓
                  Insert Booking Services
                  ↓
                  SUCCESS → /booking-confirmation/[id]
```

**Components:** `components/booking/unified-booking-form.tsx`, `components/booking/availability-calendar.tsx`, `components/payment/stripe-payment-element.tsx`

**Database:** Inserts into `bookings` and `booking_services` tables

**Business Logic:** Availability check, night calculation, price totaling, double-booking prevention

---

## Flow 4: Payment Processing

**Purpose:** Secure payment via Stripe with 3D Secure support

```
START → Payment Step
  ↓
  Create Payment Intent
  ├─→ POST /api/payments/create-intent
  ├─→ Stripe creates PaymentIntent
  └─→ Return clientSecret
      ↓
      Load Stripe Elements
      ↓
      Enter Card Details
      ├─→ Card number
      ├─→ Expiry & CVC
      └─→ Billing postal code
          ↓
          Submit Payment
          ↓
          stripe.confirmPayment()
          ↓
          3D Secure (if required)
          ↓
          [Success]
          ├─→ Update booking: status='confirmed'
          ├─→ Insert payment record
          └─→ Redirect to confirmation
          
          [Failure]
          ├─→ Show error message
          ├─→ Allow retry
          └─→ Keep booking='pending'
```

**Components:** `components/payment/stripe-payment-element.tsx`

**API:** `/api/payments/create-intent/route.ts`

**Security:** PCI DSS compliant via Stripe Elements, no card data on server, SCA compliance

---

## Flow 5: Booking Management

**Purpose:** View and manage customer bookings

```
START → /bookings
  ↓
  Load User Bookings
  ↓
  [Filter Options]
  ├─→ Upcoming
  ├─→ Past
  ├─→ Cancelled
  └─→ All
      ↓
      Select Booking
      ↓
      View Details
      ↓
      [Actions]
      ├─→ View Confirmation
      ├─→ Download Invoice
      ├─→ Modify Booking
      │   ├─→ Change dates
      │   ├─→ Add/remove services
      │   └─→ Update guests
      │
      └─→ Cancel Booking
          ├─→ Confirm cancellation
          ├─→ Check policy
          ├─→ Calculate refund
          └─→ Process refund via Stripe
```

**Features:** Status badges (Pending, Confirmed, Checked-In, Completed, Cancelled), modification within policy window, automatic refunds

---

## Flow 6: Profile Management

**Purpose:** Update user profile and preferences

```
START → /profile
  ↓
  [Profile Sections]
  ├─→ Avatar Upload
  │   ├─→ Select image
  │   ├─→ Upload to Supabase Storage
  │   └─→ Update profile.avatar_url
  │
  ├─→ Personal Information
  │   ├─→ Full Name
  │   ├─→ Phone Number
  │   └─→ Address
  │
  └─→ Actions
      ├─→ Save Changes
      └─→ Change Password
```

**Components:** `app/profile/page.tsx`, avatar upload with preview

**Storage:** Supabase Storage bucket `avatars` with RLS policies

---

# Staff User Flows

> **Role:** Staff (Hotel employees)  
> **Purpose:** Day-to-day operations and guest services  
> **Database Role:** `role = 'staff'`

---

## Flow 7: Staff Check-In/Check-Out

**Purpose:** Process guest arrivals and departures

```
START → /staff (Staff Dashboard)
  ↓
  [Today's Operations]
  ├─→ Arrivals List (check-ins scheduled today)
  └─→ Departures List (check-outs scheduled today)

[CHECK-IN PROCESS]
  ↓
  Select Guest from Arrivals
  ↓
  View Booking Details
  ├─→ Guest name
  ├─→ Room assignment
  ├─→ Booking dates
  ├─→ Payment status
  └─→ Special requests
      ↓
      Verify Information
      ├─→ Check payment status = 'paid'
      ├─→ Verify ID/documentation
      └─→ Collect signatures
          ↓
          Click "Complete Check-In"
          ↓
          System Actions
          ├─→ Update booking.status = 'checked_in'
          ├─→ Record check-in timestamp
          ├─→ Assign digital room key
          └─→ Generate welcome packet
              ↓
              Provide Guest Information
              ├─→ Room key
              ├─→ WiFi credentials
              ├─→ Breakfast times
              └─→ Hotel amenities guide

[CHECK-OUT PROCESS]
  ↓
  Select Guest from Departures
  ↓
  Review Stay Details
  ├─→ Original booking
  ├─→ Incidental charges
  └─→ Room condition notes
      ↓
      Process Additional Charges (if any)
      ├─→ Mini-bar
      ├─→ Room service
      ├─→ Damages
      └─→ Late checkout fees
          ↓
          Generate Final Invoice
          ↓
          Collect Room Keys
          ↓
          Click "Complete Check-Out"
          ↓
          System Actions
          ├─→ Update booking.status = 'completed'
          ├─→ Record check-out timestamp
          ├─→ Trigger housekeeping notification
          └─→ Send receipt email
              ↓
              Update Room Status
              └─→ rooms.status = 'cleaning'
```

**Key Features:**
- Real-time today's schedule view
- Quick status updates
- Incidental charge processing
- Invoice generation
- Housekeeping workflow triggers

**Access Control:**
- Staff can only update booking statuses
- Cannot modify prices or booking dates
- Cannot access admin functions

**Related Components:**
- Staff dashboard view
- Booking status management
- Invoice generator

---

# Admin User Flows

> **Role:** Admin (System administrators)  
> **Purpose:** Complete system management and oversight  
> **Database Role:** `role = 'admin'`

---

## Flow 8: Admin Dashboard

**Purpose:** Central admin control panel with analytics

```
START → /admin
  ↓
  [Role Check: admin only]
  ↓
  Load Dashboard
  ↓
  [Sections]
  ├─→ Quick Stats
  │   ├─→ Total Bookings
  │   ├─→ Revenue (Today/Week/Month)
  │   ├─→ Occupancy Rate
  │   └─→ Active Users
  │
  ├─→ Recent Bookings Table
  ├─→ Room Status Overview
  ├─→ Revenue Chart
  └─→ Quick Actions
      ├─→ Seed Database
      ├─→ Manage Users
      ├─→ Manage Rooms
      └─→ View Calendar
```

**Components:** `app/admin/page.tsx`, `components/dashboard/stats-card.tsx`, `components/dashboard/revenue-chart.tsx`

**Access Control:** Role-based, redirects non-admin users

---

## Flow 9: Room Management (Admin)

**Purpose:** Complete room hierarchy management

```
START → /admin (Rooms Tab)
  ↓
  [Floor Management]
  ├─→ Create/Edit/Delete Floors
  └─→ Floor properties (number, name, description)
  
  ↓
  [Room Type Management]
  ├─→ Create/Edit/Delete Room Types
  ├─→ Properties
  │   ├─→ Name, description, price
  │   ├─→ Max occupancy, amenities
  │   └─→ Image gallery upload
  └─→ Auto-generate slug
  
  ↓
  [Room Management]
  ├─→ Create/Edit/Delete Rooms
  ├─→ Properties
  │   ├─→ Room number
  │   ├─→ Assign floor & type
  │   ├─→ Status (available/maintenance/cleaning)
  │   └─→ Notes
  └─→ Bulk operations support
```

**Components:** `components/admin/floor-management.tsx`, `components/admin/room-type-management.tsx`, `components/admin/room-management.tsx`

**Features:** Image upload, carousel management, status color-coding, foreign key relationships

---

## Flow 10: Service Management (Admin)

**Purpose:** Manage service categories and offerings

```
START → /admin (Services Tab)
  ↓
  [Service Category Management]
  ├─→ Create/Edit/Delete Categories
  ├─→ Properties
  │   ├─→ Name, description
  │   ├─→ Icon selection
  │   ├─→ Color picker
  │   └─→ Auto-generate slug
  └─→ Default categories protected
  
  ↓
  [Service Management]
  ├─→ Create/Edit/Delete Services
  ├─→ Properties
  │   ├─→ Name, description, price
  │   ├─→ Select category
  │   ├─→ Duration, availability
  │   └─→ Image gallery
  └─→ Group by category
```

**Components:** `components/admin/service-category-management.tsx`, `components/admin/service-management.tsx`

**Features:** Color picker, icon library, image management, slug validation

---

# Universal Flow: Error Handling & Recovery

> **Applies to:** All user roles  
> **Purpose:** Graceful error handling and recovery across the system

---

## Flow 11: Error Handling & Recovery

**Purpose:** Graceful error handling across critical flows

### Payment Failures
```
Payment Error
  ↓
  [Type]
  ├─→ Card Declined → Retry with different card
  ├─→ Insufficient Funds → Show payment plan option
  ├─→ 3D Secure Failed → Retry authentication
  └─→ Network Error → Auto-retry + manual option
      ↓
      [Recovery]
      ├─→ Email payment link
      ├─→ Hold room 24hrs
      └─→ Admin notification
```

### Authentication Errors
```
Auth Error
  ↓
  [Type]
  ├─→ Invalid Credentials → Offer password reset
  ├─→ Email Not Verified → Auto-resend verification
  ├─→ Session Expired → Re-login with state preservation
  └─→ Account Locked → Contact support
```

### Booking Conflicts
```
Conflict Detected
  ↓
  [Type]
  ├─→ Double Booking → Auto-reassign room
  ├─→ Room Unavailable → Show alternatives
  └─→ Modification Conflict → Optimistic locking
```

**Strategy:** User-friendly messages, automatic retries, state preservation, admin notifications

---

## Conclusion

This user flow documentation organizes the 10+ core flows by user role, making it easy to understand what each user type can do in the Royal Elegance Hotel Booking System.

### Flow Distribution by Role

#### 🌐 Guest Flows (2)
1. User Registration
2. User Login (Email + OAuth)

#### 👤 Customer Flows (4)
3. Complete Booking Journey
4. Payment Processing
5. Booking Management
6. Profile Management

#### 🛎️ Staff Flows (1)
7. Check-In/Check-Out Operations

#### 👑 Admin Flows (3)
8. Admin Dashboard & Analytics
9. Room Management (Floors, Types, Rooms)
10. Service Management (Categories, Services)

#### 🔄 Universal (1)
11. Error Handling & Recovery (All roles)

### Key Design Principles

1. **Clear Role Separation** - Each role has distinct permissions and workflows
2. **Progressive Access** - Guest → Customer → Staff → Admin hierarchy
3. **Error Recovery** - Every flow has fallback and recovery mechanisms
4. **Security First** - Role-based access control enforced at every level
5. **User-Friendly** - Intuitive flows with helpful feedback

### Role Transition Paths

```
Guest
  ↓ (Register/Login)
Customer
  ↓ (Admin promotion)
Staff
  ↓ (Admin promotion)
Admin
```

**Note:** Role changes can only be performed by existing admins through the User Management interface.

### Technical Stack Summary

- **Authentication:** Supabase Auth with RLS policies
- **Payments:** Stripe with 3D Secure compliance
- **Framework:** Next.js 14+ App Router
- **Database:** PostgreSQL via Supabase
- **Storage:** Supabase Storage (avatars, images)
- **UI:** React, Tailwind CSS, shadcn/ui components

---

**Document Version:** 2.0  
**Last Updated:** January 9, 2026  
**For detailed flows, see:** Full documentation archive
