-- ============================================================================
-- CREATE DEMO USERS - Manual Setup Guide
-- ============================================================================
-- Since we can't create users via script without service role key,
-- follow these steps to create demo users manually
-- ============================================================================

-- STEP 1: Create Users in Supabase Auth Dashboard
-- ============================================================================
-- Go to: https://app.supabase.com → Your Project → Authentication → Users
-- Click "Add User" and create these 3 users:

/*
User 1 - Admin:
  Email: admin@hotel.com
  Password: Admin123!@#
  Auto Confirm: YES

User 2 - Staff:
  Email: staff@hotel.com
  Password: Staff123!@#
  Auto Confirm: YES

User 3 - Regular User:
  Email: user@hotel.com
  Password: User123!@#
  Auto Confirm: YES
*/

-- ============================================================================
-- STEP 2: Update User Roles (Run this SQL in Supabase SQL Editor)
-- ============================================================================

-- Set admin role
UPDATE profiles 
SET 
  role = 'admin',
  full_name = 'Admin User',
  phone = '+1234567890',
  email_verified = true
WHERE email = 'admin@hotel.com';

-- Set staff role
UPDATE profiles 
SET 
  role = 'staff',
  full_name = 'Staff Member',
  phone = '+1234567891',
  email_verified = true
WHERE email = 'staff@hotel.com';

-- Set user role (already default, but for completeness)
UPDATE profiles 
SET 
  role = 'user',
  full_name = 'Regular User',
  phone = '+1234567892',
  email_verified = true
WHERE email = 'user@hotel.com';

-- ============================================================================
-- STEP 3: Verify Roles (Run this to confirm)
-- ============================================================================

SELECT 
  email,
  role,
  full_name,
  phone,
  email_verified,
  created_at
FROM profiles
WHERE email IN ('admin@hotel.com', 'staff@hotel.com', 'user@hotel.com')
ORDER BY 
  CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'staff' THEN 2 
    ELSE 3 
  END;

-- Expected output:
-- ┌───────────────────┬────────┬──────────────┬──────────────┬────────────────┬────────────────┐
-- │ email             │ role   │ full_name    │ phone        │ email_verified │ created_at     │
-- ├───────────────────┼────────┼──────────────┼──────────────┼────────────────┼────────────────┤
-- │ admin@hotel.com   │ admin  │ Admin User   │ +1234567890  │ true           │ 2025-11-04 ... │
-- │ staff@hotel.com   │ staff  │ Staff Member │ +1234567891  │ true           │ 2025-11-04 ... │
-- │ user@hotel.com    │ user   │ Regular User │ +1234567892  │ true           │ 2025-11-04 ... │
-- └───────────────────┴────────┴──────────────┴──────────────┴────────────────┴────────────────┘

-- ============================================================================
-- STEP 4: Test Login
-- ============================================================================
-- Go to: http://localhost:3000/login
-- Try logging in with each account to verify

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- You now have 3 demo users with different roles:
-- 
-- 1. ADMIN (admin@hotel.com / Admin123!@#)
--    - Full CRUD on all tables
--    - Can manage all bookings, rooms, services
--    - Access to admin dashboard
--    - Can view all reports
--
-- 2. STAFF (staff@hotel.com / Staff123!@#)  
--    - Can view all bookings
--    - Can check-in/check-out guests
--    - Can update room status
--    - Can process payments
--    - Access to staff dashboard
--
-- 3. USER (user@hotel.com / User123!@#)
--    - Can browse rooms and services
--    - Can create own bookings
--    - Can view own booking history
--    - Cannot access admin/staff areas
-- ============================================================================
