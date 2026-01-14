-- ============================================================================
-- P0 Security Fixes - PART 2: SCHEMA ENHANCEMENTS
-- RUN PART 1 (ENUMS) FIRST, THEN RUN THIS
-- ============================================================================
-- This migration adds required columns and tables for security features
-- PREREQUISITE: p0-security-fixes-migration-part1-enums.sql must be run first
-- ============================================================================

-- ============================================================================
-- 1. BOOKING ENHANCEMENTS (Race Condition Prevention)
-- ============================================================================

-- Add version column for optimistic locking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add transaction_id for reservation system
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS transaction_id UUID;

-- Add reservation expiry for temporary holds
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;

-- Add cancellation tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add check-in/check-out tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS actual_check_in TIMESTAMPTZ;
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS actual_check_out TIMESTAMPTZ;
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id);
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES auth.users(id);

-- Add timestamps if they don't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for transaction lookups
CREATE INDEX IF NOT EXISTS idx_bookings_transaction_id 
ON bookings(transaction_id) WHERE transaction_id IS NOT NULL;

-- Create index for reservation cleanup - note: filter on status removed due to enum type casting not being IMMUTABLE
-- Use application-level filtering instead when querying
CREATE INDEX IF NOT EXISTS idx_bookings_reservation_expires 
ON bookings(reservation_expires_at) 
WHERE reservation_expires_at IS NOT NULL;

-- ============================================================================
-- 2. PAYMENTS TABLE (Idempotency & Refunds)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  method VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(64) UNIQUE NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  khqr_transaction_id VARCHAR(255),
  refunded_amount DECIMAL(12, 2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);

-- ============================================================================
-- 3. REFUNDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  initiated_by UUID REFERENCES auth.users(id),
  provider_refund_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT refunds_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON refunds(booking_id);

-- ============================================================================
-- 4. PAYMENT AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_payment_id ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_booking_id ON payment_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_action ON payment_audit_log(action);

-- ============================================================================
-- 5. BOOKING AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_audit_booking_id ON booking_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_audit_action ON booking_audit_log(action);

-- ============================================================================
-- 6. SECURITY LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  path TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
-- Ensure timestamp column exists if table pre-existed without it (idempotent)
ALTER TABLE security_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC);

-- ============================================================================
-- 7. LOGIN ATTEMPTS TABLE (for account lockout)
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
-- Ensure timestamp column exists if table pre-existed without it (idempotent)
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at DESC);

-- Function to count recent failed attempts
CREATE OR REPLACE FUNCTION count_failed_login_attempts(
  p_email VARCHAR,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM login_attempts
    WHERE email = p_email
    AND success = FALSE
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. EMAIL VERIFICATION TOKENS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);

-- ============================================================================
-- 9. PASSWORD RESET TOKENS
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

-- ============================================================================
-- 10. PROFILE ENHANCEMENTS
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================================================
-- 11. ATOMIC ROOM AVAILABILITY CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_room_availability_atomic(
  p_room_id UUID,
  p_check_in TIMESTAMPTZ,
  p_check_out TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_conflicts JSON;
  v_available BOOLEAN;
BEGIN
  -- Lock the room row to prevent concurrent modifications
  PERFORM 1 FROM rooms WHERE id = p_room_id FOR UPDATE;
  
  -- Check for conflicts
  SELECT json_agg(row_to_json(conflicts))
  INTO v_conflicts
  FROM (
    SELECT id, check_in_date, check_out_date, status
    FROM bookings
    WHERE room_id = p_room_id
    AND status IN ('pending'::booking_status, 'confirmed'::booking_status, 'checked_in'::booking_status, 'reserved'::booking_status)
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND check_in_date < p_check_out
    AND check_out_date > p_check_in
  ) conflicts;
  
  v_available := (v_conflicts IS NULL OR json_array_length(v_conflicts) = 0);
  
  RETURN json_build_object(
    'available', v_available,
    'conflicts', COALESCE(v_conflicts, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. CLEANUP EXPIRED RESERVATIONS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete reserved bookings that have expired
  -- Using explicit cast to text for safe comparison
  DELETE FROM bookings
  WHERE (status::text = 'reserved' OR status::text LIKE 'reserved')
  AND reservation_expires_at IS NOT NULL
  AND reservation_expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can manage payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Refunds policies
CREATE POLICY "Users can view their own refunds" ON refunds
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage refunds" ON refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Audit logs - admin only
CREATE POLICY "Admin can view payment audit logs" ON payment_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view booking audit logs" ON booking_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can view security logs" ON security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Email verification - users can only see their own
CREATE POLICY "Users can view own verification tokens" ON email_verification_tokens
  FOR SELECT USING (user_id = auth.uid());

-- Password reset - service role only (handled by server)
-- No user-facing policies needed

-- ============================================================================
-- 14. SCHEDULED CLEANUP (Create a cron job or call periodically)
-- ============================================================================

-- This can be called by a cron job or scheduled function
-- SELECT cleanup_expired_reservations();

-- ============================================================================
-- DONE - Migration complete!
-- ============================================================================

COMMENT ON TABLE payments IS 'Payment records with idempotency support';
COMMENT ON TABLE refunds IS 'Refund records for processed payments';
COMMENT ON TABLE payment_audit_log IS 'Audit trail for payment operations';
COMMENT ON TABLE booking_audit_log IS 'Audit trail for booking operations';
COMMENT ON TABLE security_logs IS 'Security event logs';
COMMENT ON TABLE login_attempts IS 'Login attempt tracking for account lockout';
COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens';
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens';
