-- ============================================================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================================================
-- Problem: Policies query the same table they're protecting
-- Solution: Use security definer functions to break the recursion
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin manage floors" ON floors;
DROP POLICY IF EXISTS "Admin staff read all room types" ON room_types;
DROP POLICY IF EXISTS "Admin manage room types" ON room_types;
DROP POLICY IF EXISTS "Admin manage room type availability" ON room_type_availability;
DROP POLICY IF EXISTS "Admin manage rooms" ON rooms;
DROP POLICY IF EXISTS "Staff update room status" ON rooms;
DROP POLICY IF EXISTS "Admin staff read all services" ON services;
DROP POLICY IF EXISTS "Admin manage services" ON services;
DROP POLICY IF EXISTS "Admin staff read all bookings" ON bookings;
DROP POLICY IF EXISTS "Admin staff update bookings" ON bookings;
DROP POLICY IF EXISTS "Admin delete bookings" ON bookings;
DROP POLICY IF EXISTS "Admin staff manage booking services" ON booking_services;
DROP POLICY IF EXISTS "Admin staff read all payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admin staff manage payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admin staff read all stay history" ON stay_history;
DROP POLICY IF EXISTS "Admin read login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Admin read all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admin staff read occupancy stats" ON room_occupancy_stats;
DROP POLICY IF EXISTS "System manage occupancy stats" ON room_occupancy_stats;
DROP POLICY IF EXISTS "Admin read all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Staff read own activity logs" ON activity_logs;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (No Recursion)
-- ============================================================================
-- Note: Using public schema instead of auth schema due to Supabase permissions

-- Function to get current user's role (cached, no recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role user_role;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() = 'admin';
END;
$$;

-- Function to check if user is staff or admin
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() IN ('admin', 'staff');
END;
$$;

-- ============================================================================
-- FIXED RLS POLICIES: PROFILES
-- ============================================================================

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = public.get_user_role() -- Use function instead of subquery
  );

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- Admin can update any profile
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- Staff can view all profiles
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_staff());

-- ============================================================================
-- FIXED RLS POLICIES: FLOORS
-- ============================================================================

CREATE POLICY "Admin manage floors"
  ON floors FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: ROOM TYPES
-- ============================================================================

CREATE POLICY "Admin staff read all room types"
  ON room_types FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin manage room types"
  ON room_types FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: ROOM TYPE AVAILABILITY
-- ============================================================================

CREATE POLICY "Admin manage room type availability"
  ON room_type_availability FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: ROOMS
-- ============================================================================

CREATE POLICY "Admin manage rooms"
  ON rooms FOR ALL
  USING (public.is_admin());

CREATE POLICY "Staff update room status"
  ON rooms FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ============================================================================
-- FIXED RLS POLICIES: SERVICES
-- ============================================================================

CREATE POLICY "Admin staff read all services"
  ON services FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin manage services"
  ON services FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: BOOKINGS
-- ============================================================================

CREATE POLICY "Admin staff read all bookings"
  ON bookings FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin staff update bookings"
  ON bookings FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Admin delete bookings"
  ON bookings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: BOOKING SERVICES
-- ============================================================================

CREATE POLICY "Admin staff manage booking services"
  ON booking_services FOR ALL
  USING (public.is_staff());

-- ============================================================================
-- FIXED RLS POLICIES: PAYMENT TRANSACTIONS
-- ============================================================================

CREATE POLICY "Admin staff read all payment transactions"
  ON payment_transactions FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin staff manage payment transactions"
  ON payment_transactions FOR ALL
  USING (public.is_staff());

-- ============================================================================
-- FIXED RLS POLICIES: STAY HISTORY
-- ============================================================================

CREATE POLICY "Admin staff read all stay history"
  ON stay_history FOR SELECT
  USING (public.is_staff());

-- ============================================================================
-- FIXED RLS POLICIES: LOGIN ATTEMPTS
-- ============================================================================

CREATE POLICY "Admin read login attempts"
  ON login_attempts FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: USER SESSIONS
-- ============================================================================

CREATE POLICY "Admin read all sessions"
  ON user_sessions FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- FIXED RLS POLICIES: ROOM OCCUPANCY STATS
-- ============================================================================

CREATE POLICY "Admin staff read occupancy stats"
  ON room_occupancy_stats FOR SELECT
  USING (public.is_staff());

CREATE POLICY "System manage occupancy stats"
  ON room_occupancy_stats FOR ALL
  USING (public.is_staff());

-- ============================================================================
-- FIXED RLS POLICIES: ACTIVITY LOGS
-- ============================================================================

CREATE POLICY "Admin read all activity logs"
  ON activity_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Staff read own activity logs"
  ON activity_logs FOR SELECT
  USING (
    public.get_user_role() = 'staff' AND
    auth.uid() = user_id
  );

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'RLS POLICY FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Fixed infinite recursion by using SECURITY DEFINER functions';
  RAISE NOTICE '';
  RAISE NOTICE 'New helper functions:';
  RAISE NOTICE '  ✓ public.get_user_role() - Get current user role';
  RAISE NOTICE '  ✓ public.is_admin() - Check if user is admin';
  RAISE NOTICE '  ✓ public.is_staff() - Check if user is staff or admin';
  RAISE NOTICE '';
  RAISE NOTICE 'All policies updated to use functions instead of subqueries';
  RAISE NOTICE '============================================================================';
END $$;
