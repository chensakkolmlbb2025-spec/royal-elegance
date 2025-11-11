-- Fix RLS policy for booking updates
-- Allow users to cancel confirmed bookings as well as pending ones

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users update own pending bookings" ON bookings;

-- Create a new policy that allows users to update their own bookings
-- from pending/confirmed to cancelled status
CREATE POLICY "Users update own bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = user_id AND 
    status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    status IN ('pending', 'confirmed', 'cancelled')
  );