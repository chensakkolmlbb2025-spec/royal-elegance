# 🏨 Ultimate Hotel Management Database - Schema Guide

## 📋 Overview

This is a **production-ready, enterprise-grade** database schema designed for a comprehensive hotel management system with **maximum security**, **scalability**, and **best practices**.

### ✨ Key Features

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Role-based access control** (Admin, Staff, User)
- ✅ **Comprehensive audit logging**
- ✅ **Automated triggers** for business logic
- ✅ **Dashboard views** for analytics
- ✅ **Payment tracking** (cash & online)
- ✅ **Multi-authentication** support (social, phone OTP)
- ✅ **Booking lifecycle** management
- ✅ **Stay history** tracking
- ✅ **Service management**
- ✅ **Room availability** scheduling

---

## 📊 Database Statistics

```
Total Tables: 18
Total Views: 5
Total Functions: 12
Total Triggers: 9
Total Policies: 50+
Lines of SQL: 1,200+
```

---

## 🎯 Scope Coverage

| Scope | Feature | Status |
|-------|---------|--------|
| **1** | User roles (Admin, Staff, User) | ✅ Complete |
| **2** | Login & Register (Social, Phone OTP) | ✅ Complete |
| **3** | Admin CRUD room types | ✅ Complete |
| **4** | Admin CRUD rooms | ✅ Complete |
| **5** | Admin CRUD floors | ✅ Complete |
| **6** | Admin CRUD services | ✅ Complete |
| **7** | Room type list with filters | ✅ Complete |
| **8** | Room type availability schedule | ✅ Complete |
| **9** | Cash & online payment | ✅ Complete |
| **10** | Admin/Staff review bookings | ✅ Complete |
| **11** | User booking & stay history | ✅ Complete |
| **12** | Check-in & check-out | ✅ Complete |
| **13** | Admin & Staff dashboards | ✅ Complete |

---

## 🗄️ Database Schema

### Core Tables

#### 1. **profiles** (User Management)
- User roles: `admin`, `staff`, `user`
- Email & phone verification
- OAuth provider tracking
- Security features (MFA, account locking)
- Login tracking

#### 2. **floors**
- Floor management
- Total room tracking
- Active/inactive status

#### 3. **room_types** (Scope 3, 7)
- Room categories (Standard, Deluxe, Suite, etc.)
- Pricing and occupancy
- Amenities (JSONB)
- Images and thumbnails
- Tags for filtering
- SEO-friendly slugs

#### 4. **room_type_availability** (Scope 8)
- Date-based availability scheduling
- Price overrides for special periods
- Non-overlapping date ranges (constraint)
- Holiday/maintenance blocking

#### 5. **rooms** (Scope 4)
- Individual room management
- Status tracking (available, occupied, maintenance, etc.)
- Housekeeping logs
- Maintenance scheduling

#### 6. **services** (Scope 6)
- Hotel services (spa, dining, transport, etc.)
- Category-based organization
- Booking requirements
- Duration tracking

#### 7. **bookings** (Scope 9, 10, 11, 12)
- Complete booking lifecycle
- Guest information
- Check-in/check-out tracking
- Payment status
- Staff review system
- Cancellation handling
- Special requests

#### 8. **booking_services**
- Junction table for bookings & services
- Quantity and pricing
- Service scheduling
- Status tracking

#### 9. **payment_transactions** (Scope 9)
- Payment tracking (cash & online)
- Gateway integration support
- Transaction references
- Receipt management

#### 10. **stay_history** (Scope 11)
- Completed stays archive
- Guest reviews and ratings
- Historical data for analytics

### Security Tables (Scope 2)

#### 11. **login_attempts**
- Failed login tracking
- IP address logging
- Security monitoring

#### 12. **user_sessions**
- Active session management
- Device tracking
- Session expiration

#### 13. **otp_verifications**
- Phone OTP management
- Rate limiting (max attempts)
- Expiration handling

### Analytics Tables (Scope 13)

#### 14. **room_occupancy_stats**
- Daily occupancy tracking
- Revenue statistics
- Dashboard metrics

#### 15. **activity_logs**
- Audit trail for all actions
- User activity tracking
- Entity change logging

---

## 🔒 Security Architecture

### Row Level Security (RLS)

**Every table has RLS enabled** with role-based policies:

#### Admin Permissions
- ✅ Full CRUD on all tables
- ✅ View all user data
- ✅ Manage roles and permissions
- ✅ Access audit logs
- ✅ View dashboard analytics

#### Staff Permissions
- ✅ View all bookings
- ✅ Update room status
- ✅ Check-in/check-out guests
- ✅ Process payments
- ✅ View dashboard analytics
- ❌ Cannot change user roles
- ❌ Cannot delete critical data

#### User Permissions
- ✅ Create own bookings
- ✅ View own bookings
- ✅ View own stay history
- ✅ Update own profile
- ✅ Cancel pending bookings
- ❌ Cannot view other users' data
- ❌ Cannot access admin features

#### Public (Anonymous)
- ✅ View available room types
- ✅ View available services
- ✅ Browse floors
- ❌ Cannot create bookings
- ❌ Cannot access user data

### Security Features

1. **Account Protection**
   - Failed login attempt tracking
   - Automatic account locking
   - Password strength requirements

2. **Session Management**
   - Token-based authentication
   - Session expiration
   - Device tracking

3. **Audit Trail**
   - All admin/staff actions logged
   - IP address tracking
   - Timestamp recording

4. **Data Validation**
   - Check constraints on all tables
   - Foreign key relationships
   - Unique constraints
   - NOT NULL enforcement

---

## ⚙️ Automated Business Logic

### Triggers

1. **Auto-update timestamps** (`updated_at`)
   - Applied to: profiles, floors, room_types, rooms, services, bookings

2. **Generate booking reference**
   - Format: `BK-YYYY-XXXXX`
   - Automatically created on booking insert

3. **Generate transaction reference**
   - Format: `TXN-YYYYMMDDHHMISS-XXXX`
   - Automatically created on payment insert

4. **Create stay history**
   - Triggered when booking status = 'checked_out'
   - Archives completed stays

5. **Update room status**
   - Auto-updates room status based on booking changes
   - confirmed → reserved
   - checked_in → occupied
   - checked_out → cleaning

6. **Create user profile**
   - Automatically creates profile when user signs up
   - Syncs with Supabase Auth

### Functions

1. **check_room_availability(room_id, check_in, check_out)**
   - Returns: boolean
   - Checks if room is available for given dates

2. **get_available_rooms(room_type_id, check_in, check_out)**
   - Returns: table of available rooms
   - Used for booking search

3. **log_activity(user_id, action, entity_type, entity_id, details)**
   - Logs admin/staff actions
   - Creates audit trail

4. **generate_booking_reference()**
   - Creates unique booking reference
   - Format: BK-YYYY-XXXXX

5. **generate_transaction_reference()**
   - Creates unique transaction reference
   - Format: TXN-YYYYMMDDHHMISS-XXXX

---

## 📊 Dashboard Views (Scope 13)

### 1. **dashboard_todays_bookings**
Shows all bookings for today with room and guest details.

```sql
SELECT * FROM dashboard_todays_bookings;
```

### 2. **dashboard_revenue_summary**
Daily revenue breakdown with booking counts by status.

```sql
SELECT * FROM dashboard_revenue_summary 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

### 3. **dashboard_room_status**
Current count of rooms by status.

```sql
SELECT * FROM dashboard_room_status;
```

### 4. **dashboard_popular_room_types**
Most booked room types with revenue and ratings.

```sql
SELECT * FROM dashboard_popular_room_types LIMIT 10;
```

### 5. **dashboard_popular_services**
Most used services with revenue.

```sql
SELECT * FROM dashboard_popular_services LIMIT 10;
```

---

## 🚀 Installation Guide

### Step 1: Apply Schema

1. Go to [Supabase SQL Editor](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy and paste entire `database-ultimate-schema.sql`
5. Click **Run**
6. Wait for success message (should take 5-10 seconds)

### Step 2: Create Admin User

```sql
-- Option A: Create through Supabase Auth UI
-- Then update role:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@yourdomain.com';

-- Option B: Update existing user
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

### Step 3: Seed Test Data (Optional)

Uncomment the seed data section at the bottom of the SQL file and run it to populate test data.

### Step 4: Verify Installation

```sql
-- Check all tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Should return 18 tables

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Should return 18 tables

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Should return 50+ policies
```

---

## 📝 Usage Examples

### Create a Booking

```sql
-- As authenticated user
INSERT INTO bookings (
  user_id,
  guest_name,
  guest_email,
  guest_phone,
  guest_count,
  room_id,
  room_type_id,
  check_in_date,
  check_out_date,
  room_price,
  total_price,
  status
) VALUES (
  auth.uid(),
  'John Doe',
  'john@example.com',
  '+1234567890',
  2,
  'room-uuid',
  'room-type-uuid',
  '2025-12-01',
  '2025-12-05',
  250.00,
  1000.00,
  'pending'
);
```

### Check Room Availability

```sql
-- Check if specific room is available
SELECT check_room_availability(
  'room-uuid',
  '2025-12-01',
  '2025-12-05'
);

-- Get all available rooms of a type
SELECT * FROM get_available_rooms(
  'room-type-uuid',
  '2025-12-01',
  '2025-12-05'
);
```

### Process Payment

```sql
-- Create payment transaction
INSERT INTO payment_transactions (
  booking_id,
  amount,
  payment_method,
  payment_status,
  received_by
) VALUES (
  'booking-uuid',
  1000.00,
  'cash',
  'paid',
  auth.uid()
);

-- Update booking payment status
UPDATE bookings
SET 
  payment_status = 'paid',
  paid_amount = 1000.00
WHERE id = 'booking-uuid';
```

### Check-in Guest (Staff/Admin)

```sql
UPDATE bookings
SET 
  status = 'checked_in',
  actual_check_in_at = NOW(),
  checked_in_by = auth.uid()
WHERE id = 'booking-uuid';
```

### Check-out Guest (Staff/Admin)

```sql
-- This will automatically create stay history via trigger
UPDATE bookings
SET 
  status = 'checked_out',
  actual_check_out_at = NOW(),
  checked_out_by = auth.uid()
WHERE id = 'booking-uuid';
```

### Block Room Type Dates (Admin)

```sql
-- Block room type for maintenance
INSERT INTO room_type_availability (
  room_type_id,
  start_date,
  end_date,
  is_available,
  reason
) VALUES (
  'room-type-uuid',
  '2025-12-20',
  '2025-12-31',
  false,
  'Holiday Season - Fully Booked'
);
```

---

## 🎨 Database Design Principles

### 1. **Normalization**
- Third Normal Form (3NF)
- Eliminates data redundancy
- Maintains data integrity

### 2. **Denormalization (Strategic)**
- `nights` calculated field in bookings
- Improves query performance
- Reduces JOIN complexity

### 3. **Indexing Strategy**
- Primary keys on all tables
- Foreign key indexes
- Query-optimized indexes
- GIN indexes for JSONB and arrays

### 4. **Data Types**
- UUID for primary keys (security)
- TIMESTAMPTZ for all timestamps
- NUMERIC for money (no floating point errors)
- JSONB for flexible data (amenities, features)
- Arrays for tags and images
- Enums for status fields

### 5. **Constraints**
- Foreign key relationships
- Check constraints for validation
- Unique constraints
- NOT NULL where required
- Exclusion constraints (date ranges)

### 6. **Security First**
- RLS on all tables
- Role-based policies
- No direct data access
- Audit logging
- Secure by default

---

## 🔧 Maintenance

### Regular Tasks

1. **Clean expired OTPs**
   ```sql
   DELETE FROM otp_verifications 
   WHERE expires_at < NOW() - INTERVAL '1 day';
   ```

2. **Archive old login attempts**
   ```sql
   DELETE FROM login_attempts 
   WHERE attempted_at < NOW() - INTERVAL '90 days';
   ```

3. **Update occupancy stats**
   ```sql
   INSERT INTO room_occupancy_stats (
     stat_date, total_rooms, occupied_rooms, 
     available_rooms, maintenance_rooms, occupancy_rate, revenue
   )
   SELECT 
     CURRENT_DATE,
     COUNT(*),
     COUNT(*) FILTER (WHERE status = 'occupied'),
     COUNT(*) FILTER (WHERE status = 'available'),
     COUNT(*) FILTER (WHERE status = 'maintenance'),
     (COUNT(*) FILTER (WHERE status = 'occupied')::NUMERIC / COUNT(*) * 100),
     COALESCE((SELECT SUM(total_price) FROM bookings 
              WHERE check_in_date = CURRENT_DATE AND status = 'checked_in'), 0)
   FROM rooms
   WHERE is_active = true
   ON CONFLICT (stat_date) DO UPDATE 
   SET occupied_rooms = EXCLUDED.occupied_rooms,
       available_rooms = EXCLUDED.available_rooms,
       maintenance_rooms = EXCLUDED.maintenance_rooms,
       occupancy_rate = EXCLUDED.occupancy_rate,
       revenue = EXCLUDED.revenue;
   ```

---

## 📈 Performance Optimization

### Indexes
- ✅ All foreign keys indexed
- ✅ Frequently queried columns indexed
- ✅ Date range queries optimized
- ✅ Text search ready (GIN indexes)

### Query Optimization Tips

1. **Use views for complex queries**
   - Pre-defined dashboard views
   - Reduce query complexity
   - Consistent results

2. **Leverage JSONB indexes**
   ```sql
   CREATE INDEX idx_room_types_amenities 
   ON room_types USING GIN(amenities);
   ```

3. **Use CTEs for readability**
   ```sql
   WITH available_rooms AS (
     SELECT * FROM get_available_rooms(...)
   )
   SELECT * FROM available_rooms;
   ```

---

## 🔄 Migration Path

If you have existing data:

1. **Backup current database**
2. **Review schema differences**
3. **Create migration script**
4. **Test in staging environment**
5. **Apply to production**

---

## 🐛 Troubleshooting

### Issue: RLS blocks all queries

**Solution:**
```sql
-- Check if user has profile
SELECT * FROM profiles WHERE id = auth.uid();

-- If no profile, create one
INSERT INTO profiles (id, email, role)
VALUES (auth.uid(), 'user@email.com', 'user');
```

### Issue: Can't create bookings

**Solution:**
```sql
-- Check room availability
SELECT check_room_availability('room-id', 'check-in', 'check-out');

-- Check user role
SELECT role FROM profiles WHERE id = auth.uid();
```

### Issue: Policies not working

**Solution:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

---

## 📚 Additional Resources

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)

---

## ✅ Checklist

- [ ] Schema installed successfully
- [ ] Admin user created
- [ ] RLS policies verified
- [ ] Test bookings created
- [ ] Dashboard views working
- [ ] Payment flow tested
- [ ] Check-in/check-out tested
- [ ] Activity logs capturing
- [ ] All triggers functioning

---

**Schema Version:** 1.0.0  
**Last Updated:** November 4, 2025  
**Compatibility:** Supabase / PostgreSQL 14+
