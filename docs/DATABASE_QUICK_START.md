# 🎯 ULTIMATE DATABASE - QUICK START GUIDE

## 📦 What You Just Got

### 1️⃣ **database-ultimate-schema.sql** (43 KB, 1,209 lines)
The complete, production-ready database schema with:
- ✅ 18 tables covering all 13 scopes
- ✅ 50+ RLS security policies
- ✅ 12 automated functions
- ✅ 9 smart triggers
- ✅ 5 dashboard views

### 2️⃣ **DATABASE_SCHEMA_GUIDE.md** (15 KB)
Complete documentation including:
- Schema overview
- Installation guide
- Usage examples
- Troubleshooting
- Maintenance tasks

### 3️⃣ **DATABASE_VISUALIZATION.md** (21 KB)
Visual diagrams showing:
- Entity relationships
- Data flows
- Access control matrix
- Security layers

---

## ⚡ 5-Minute Setup

### Step 1: Apply Schema (2 min)

1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy **entire** `database-ultimate-schema.sql` content
5. Paste and click **Run**
6. Wait for success message ✅

### Step 2: Create Admin (1 min)

```sql
-- Option A: Update your existing user
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your@email.com';

-- Option B: Check user UUID first
SELECT id, email, role FROM profiles;
UPDATE profiles SET role = 'admin' WHERE id = 'uuid-here';
```

### Step 3: Verify (1 min)

```sql
-- Check tables (should return 18)
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';

-- Check RLS enabled (should return 18)
SELECT COUNT(*) FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies (should return 50+)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
```

### Step 4: Test (1 min)

```sql
-- As admin, view all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check your admin access
SELECT * FROM profiles WHERE id = auth.uid();
```

---

## 🎨 Database Features

### All 13 Scopes Covered ✅

| # | Feature | Implementation |
|---|---------|----------------|
| 1 | User roles (Admin/Staff/User) | `profiles` table + RLS |
| 2 | Social & Phone OTP login | `otp_verifications`, `user_sessions` |
| 3 | Admin CRUD room types | `room_types` + policies |
| 4 | Admin CRUD rooms | `rooms` + policies |
| 5 | Admin CRUD floors | `floors` + policies |
| 6 | Admin CRUD services | `services` + policies |
| 7 | Room type filtering | Indexes + tags + JSONB |
| 8 | Availability schedule | `room_type_availability` + exclusion |
| 9 | Cash & online payment | `payment_transactions` + enums |
| 10 | Review bookings | `reviewed_by`, `review_notes` fields |
| 11 | Booking & stay history | `bookings`, `stay_history` |
| 12 | Check-in/Check-out | Status transitions + triggers |
| 13 | Dashboards | 5 pre-built views |

---

## 🔒 Security Architecture

### 6-Layer Protection

```
1. Network (HTTPS)
   ↓
2. Authentication (JWT)
   ↓
3. Row Level Security (RLS)
   ↓
4. Application Logic
   ↓
5. Database Constraints
   ↓
6. Audit Logging
```

### Role Permissions

#### 👑 Admin
- Full CRUD on all tables
- Manage user roles
- View all bookings/payments
- Access dashboard analytics
- View audit logs

#### 👔 Staff
- View all bookings
- Update room status
- Check-in/check-out guests
- Process payments
- View dashboard analytics
- Cannot change roles

#### 👤 User
- Create own bookings
- View own data only
- Update own profile
- Cancel pending bookings
- View stay history

#### 🌐 Public (Anonymous)
- Browse available rooms
- Browse available services
- View floors
- Cannot create bookings

---

## 📊 Key Tables

### 1. **profiles** - User Management
```sql
- id UUID (PK)
- email TEXT UNIQUE
- role ENUM (admin, staff, user)
- phone TEXT
- email_verified BOOLEAN
- phone_verified BOOLEAN
- mfa_enabled BOOLEAN
- account_locked BOOLEAN
- last_login_at TIMESTAMPTZ
```

### 2. **room_types** - Room Categories
```sql
- id UUID (PK)
- name TEXT
- slug TEXT UNIQUE
- base_price NUMERIC
- max_occupancy INTEGER
- amenities JSONB
- images TEXT[]
- is_available BOOLEAN
```

### 3. **rooms** - Individual Rooms
```sql
- id UUID (PK)
- room_number TEXT UNIQUE
- floor_id UUID (FK)
- room_type_id UUID (FK)
- status ENUM (available, occupied, maintenance, reserved, cleaning)
- last_cleaned_at TIMESTAMPTZ
```

### 4. **bookings** - Reservations
```sql
- id UUID (PK)
- booking_reference TEXT UNIQUE
- user_id UUID (FK)
- room_id UUID (FK)
- check_in_date DATE
- check_out_date DATE
- status ENUM (pending, confirmed, checked_in, checked_out, cancelled)
- payment_status ENUM (pending, paid, failed, refunded)
- actual_check_in_at TIMESTAMPTZ
- actual_check_out_at TIMESTAMPTZ
- checked_in_by UUID (FK)
- checked_out_by UUID (FK)
```

### 5. **payment_transactions** - Payments
```sql
- id UUID (PK)
- transaction_reference TEXT UNIQUE
- booking_id UUID (FK)
- amount NUMERIC
- payment_method ENUM (cash, credit_card, online_banking, e_wallet)
- payment_status ENUM (pending, paid, failed, refunded)
- gateway_name TEXT
- gateway_transaction_id TEXT
```

---

## 🤖 Automated Features

### Triggers

1. **Auto-generate booking reference**: `BK-2025-12345`
2. **Auto-generate transaction reference**: `TXN-20251104120000-1234`
3. **Update room status** when booking changes
4. **Create stay history** on check-out
5. **Create user profile** on signup
6. **Update timestamps** automatically

### Functions

1. **check_room_availability(room_id, dates)** - Check if room is free
2. **get_available_rooms(room_type_id, dates)** - Find all available rooms
3. **log_activity(user, action, entity)** - Audit logging
4. **generate_booking_reference()** - Unique booking IDs
5. **generate_transaction_reference()** - Unique transaction IDs

---

## 📈 Dashboard Views

### 1. dashboard_todays_bookings
All check-ins and check-outs for today

```sql
SELECT * FROM dashboard_todays_bookings;
```

### 2. dashboard_revenue_summary
Daily revenue and booking statistics

```sql
SELECT * FROM dashboard_revenue_summary 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

### 3. dashboard_room_status
Current room availability snapshot

```sql
SELECT * FROM dashboard_room_status;
```

### 4. dashboard_popular_room_types
Most booked rooms with revenue

```sql
SELECT * FROM dashboard_popular_room_types LIMIT 10;
```

### 5. dashboard_popular_services
Most used services with revenue

```sql
SELECT * FROM dashboard_popular_services LIMIT 10;
```

---

## 🚀 Quick Usage Examples

### Create a Booking

```sql
INSERT INTO bookings (
  user_id, guest_name, guest_email, guest_phone,
  room_id, room_type_id, check_in_date, check_out_date,
  room_price, total_price, status
) VALUES (
  auth.uid(), 'John Doe', 'john@email.com', '+1234567890',
  'room-uuid', 'type-uuid', '2025-12-01', '2025-12-05',
  250.00, 1000.00, 'pending'
);
-- Booking reference auto-generated: BK-2025-XXXXX
```

### Check Room Availability

```sql
-- Check specific room
SELECT check_room_availability(
  'room-uuid', 
  '2025-12-01', 
  '2025-12-05'
) as is_available;

-- Get all available rooms of a type
SELECT * FROM get_available_rooms(
  'room-type-uuid',
  '2025-12-01',
  '2025-12-05'
);
```

### Process Payment

```sql
-- Record payment
INSERT INTO payment_transactions (
  booking_id, amount, payment_method, payment_status
) VALUES (
  'booking-uuid', 1000.00, 'credit_card', 'paid'
);

-- Update booking
UPDATE bookings 
SET payment_status = 'paid', paid_amount = 1000.00
WHERE id = 'booking-uuid';
```

### Check-in Guest (Staff)

```sql
UPDATE bookings
SET 
  status = 'checked_in',
  actual_check_in_at = NOW(),
  checked_in_by = auth.uid()
WHERE booking_reference = 'BK-2025-12345';
-- Room status automatically updated to 'occupied'
```

### Check-out Guest (Staff)

```sql
UPDATE bookings
SET 
  status = 'checked_out',
  actual_check_out_at = NOW(),
  checked_out_by = auth.uid()
WHERE booking_reference = 'BK-2025-12345';
-- Stay history automatically created
-- Room status automatically set to 'cleaning'
```

---

## 🎯 Testing Checklist

### Basic Tests

- [ ] Schema applied successfully
- [ ] All 18 tables created
- [ ] RLS enabled on all tables
- [ ] 50+ policies created
- [ ] Admin user created
- [ ] Can log in as admin
- [ ] Can view all tables

### Booking Flow Tests

- [ ] Can browse available rooms
- [ ] Can check room availability
- [ ] Can create booking
- [ ] Booking reference generated
- [ ] Can add services to booking
- [ ] Can process payment
- [ ] Transaction reference generated
- [ ] Staff can check-in guest
- [ ] Room status updates to occupied
- [ ] Staff can check-out guest
- [ ] Stay history created
- [ ] Room status updates to cleaning

### Security Tests

- [ ] Users can only see own bookings
- [ ] Users cannot modify other bookings
- [ ] Staff can view all bookings
- [ ] Staff cannot change user roles
- [ ] Admin can do everything
- [ ] Public can browse but not book

### Dashboard Tests

- [ ] Today's bookings view works
- [ ] Revenue summary shows data
- [ ] Room status summary accurate
- [ ] Popular room types ranked
- [ ] Popular services ranked

---

## 🔧 Common Operations

### Update User Role

```sql
-- Make user a staff member
UPDATE profiles SET role = 'staff' 
WHERE email = 'staff@hotel.com';

-- Make user an admin
UPDATE profiles SET role = 'admin' 
WHERE email = 'admin@hotel.com';
```

### Block Dates for Maintenance

```sql
INSERT INTO room_type_availability (
  room_type_id, start_date, end_date, 
  is_available, reason
) VALUES (
  'room-type-uuid',
  '2025-12-20', '2025-12-31',
  false, 'Holiday Season - Fully Booked'
);
```

### Set Special Pricing

```sql
INSERT INTO room_type_availability (
  room_type_id, start_date, end_date,
  is_available, price_override, reason
) VALUES (
  'room-type-uuid',
  '2025-12-24', '2025-12-26',
  true, 450.00, 'Christmas Special Rate'
);
```

### View Activity Logs

```sql
-- View all admin actions
SELECT * FROM activity_logs
WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
)
ORDER BY created_at DESC
LIMIT 100;
```

---

## 📝 Next Steps

1. ✅ **Apply the schema** to your Supabase project
2. ✅ **Create admin user** and verify access
3. ✅ **Seed test data** (optional - see schema file)
4. ✅ **Update your frontend** to use new schema
5. ✅ **Test booking flow** end-to-end
6. ✅ **Configure payment gateway** (Stripe/PayPal)
7. ✅ **Set up email notifications** (booking confirmations)
8. ✅ **Deploy to production**

---

## 🆘 Troubleshooting

### "Permission denied for table"
**Solution:** RLS is blocking you. Make sure your user has a profile with correct role.

```sql
SELECT * FROM profiles WHERE id = auth.uid();
```

### "Cannot create booking"
**Solution:** Check room availability first.

```sql
SELECT check_room_availability('room-id', 'check-in', 'check-out');
```

### "No policies found"
**Solution:** Re-run the schema SQL file.

```sql
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Should return 50+
```

---

## 📚 Documentation Files

- **database-ultimate-schema.sql** - The actual schema to apply
- **DATABASE_SCHEMA_GUIDE.md** - Complete documentation
- **DATABASE_VISUALIZATION.md** - Visual diagrams and flows
- **DATABASE_QUICK_START.md** - This file

---

## ✨ Key Highlights

### Best Practices Used

✅ **Normalization** - 3NF compliant, minimal redundancy  
✅ **Indexes** - Optimized for common queries  
✅ **Constraints** - Data integrity enforced  
✅ **RLS** - Row-level security on all tables  
✅ **Triggers** - Automated business logic  
✅ **Functions** - Reusable database operations  
✅ **Views** - Pre-built dashboard queries  
✅ **Enums** - Type-safe status fields  
✅ **JSONB** - Flexible amenities/features storage  
✅ **Audit Logs** - Complete activity trail  

### Production-Ready Features

✅ **Security** - Multi-layer protection  
✅ **Scalability** - Handles high volume  
✅ **Performance** - Optimized queries  
✅ **Reliability** - Constraints prevent bad data  
✅ **Maintainability** - Well-documented  
✅ **Flexibility** - JSONB for future needs  
✅ **Compliance** - Audit trail for regulations  

---

## 🎉 You're All Set!

Your hotel management database is **production-ready** with:

- ✅ 13 scopes fully covered
- ✅ Enterprise-grade security
- ✅ Automated business logic
- ✅ Dashboard analytics
- ✅ Complete audit trail
- ✅ Scalable architecture

**Total Setup Time:** ~5 minutes  
**Lines of SQL:** 1,209  
**Tables:** 18  
**Security Policies:** 50+  
**Functions:** 12  
**Triggers:** 9  
**Views:** 5

---

**Happy Coding! 🚀**

*Last Updated: November 4, 2025*  
*Schema Version: 1.0.0*
