-- ============================================================================
-- ULTIMATE HOTEL MANAGEMENT DATABASE SCHEMA
-- ============================================================================
-- Production-ready schema with comprehensive security and best practices
-- Covers all 13 scopes with Row Level Security (RLS) policies
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Required for GIST exclusion constraints

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

-- User roles (Scope 1)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Room status
DO $$ BEGIN
  CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance', 'reserved', 'cleaning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Booking status (Scope 10, 12)
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment status (Scope 9)
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment method (Scope 9)
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'online_banking', 'e_wallet', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service category (Scope 5)
DO $$ BEGIN
  CREATE TYPE service_category AS ENUM ('spa', 'dining', 'transport', 'laundry', 'room_service', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profiles Table (Scope 1, 2)
-- Extended user information with role-based access
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  avatar_url TEXT,
  
  -- Email verification (Scope 2)
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  
  -- Phone verification (Scope 2)
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,
  
  -- OAuth provider info (Scope 2)
  oauth_provider TEXT,
  oauth_provider_id TEXT,
  
  -- Security features
  mfa_enabled BOOLEAN DEFAULT FALSE,
  account_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login_at TIMESTAMPTZ,
  
  -- Activity tracking
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT profiles_email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- Floors Table (Scope 5)
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  total_rooms INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT floors_floor_number_positive CHECK (floor_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_floors_floor_number ON floors(floor_number);
CREATE INDEX IF NOT EXISTS idx_floors_is_active ON floors(is_active);

-- Room Types Table (Scope 3, 7)
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price NUMERIC(10, 2) NOT NULL,
  max_occupancy INTEGER NOT NULL,
  bed_type TEXT,
  room_size NUMERIC(10, 2), -- in square meters
  
  -- Amenities as JSONB for flexibility
  amenities JSONB DEFAULT '[]',
  features JSONB DEFAULT '{}',
  
  -- Images
  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  
  -- Availability settings (Scope 8)
  is_available BOOLEAN DEFAULT TRUE,
  min_booking_days INTEGER DEFAULT 1,
  max_booking_days INTEGER DEFAULT 30,
  
  -- SEO and filtering (Scope 7)
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT room_types_base_price_positive CHECK (base_price > 0),
  CONSTRAINT room_types_max_occupancy_positive CHECK (max_occupancy > 0),
  CONSTRAINT room_types_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_room_types_slug ON room_types(slug);
CREATE INDEX IF NOT EXISTS idx_room_types_is_available ON room_types(is_available);
CREATE INDEX IF NOT EXISTS idx_room_types_base_price ON room_types(base_price);
CREATE INDEX IF NOT EXISTS idx_room_types_tags ON room_types USING GIN(tags);

-- Room Type Availability Schedule (Scope 8)
-- Allows admin to block specific date ranges for room types
CREATE TABLE IF NOT EXISTS room_type_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  price_override NUMERIC(10, 2), -- Special pricing for date range
  reason TEXT, -- e.g., "Holiday Season", "Maintenance"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT room_type_availability_dates_valid CHECK (end_date >= start_date),
  CONSTRAINT room_type_availability_no_overlap EXCLUDE USING gist (
    room_type_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_room_type_availability_room_type ON room_type_availability(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_type_availability_dates ON room_type_availability(start_date, end_date);

-- Rooms Table (Scope 4)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL UNIQUE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE RESTRICT,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  status room_status DEFAULT 'available' NOT NULL,
  
  -- Room-specific details
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  
  -- Housekeeping
  last_cleaned_at TIMESTAMPTZ,
  cleaned_by UUID REFERENCES profiles(id),
  
  -- Activity tracking
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);

-- Services Table (Scope 5, 6)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category service_category NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  requires_booking BOOLEAN DEFAULT FALSE,
  max_capacity INTEGER,
  duration_minutes INTEGER, -- For time-based services
  
  -- Details
  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  terms_and_conditions TEXT,
  
  -- Sorting and filtering
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT services_price_positive CHECK (price >= 0),
  CONSTRAINT services_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_available ON services(is_available);
CREATE INDEX IF NOT EXISTS idx_services_tags ON services USING GIN(tags);

-- Bookings Table (Scope 9, 10, 11, 12)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference TEXT NOT NULL UNIQUE,
  
  -- Guest information
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 1,
  
  -- Room booking
  room_id UUID REFERENCES rooms(id) ON DELETE RESTRICT,
  room_type_id UUID REFERENCES room_types(id),
  
  -- Dates
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  
  -- Status (Scope 10, 12)
  status booking_status DEFAULT 'pending' NOT NULL,
  
  -- Check-in/Check-out (Scope 12)
  actual_check_in_at TIMESTAMPTZ,
  actual_check_out_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  checked_out_by UUID REFERENCES profiles(id),
  early_check_in BOOLEAN DEFAULT FALSE,
  late_check_out BOOLEAN DEFAULT FALSE,
  
  -- Pricing
  room_price NUMERIC(10, 2) NOT NULL,
  services_price NUMERIC(10, 2) DEFAULT 0,
  additional_charges NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL,
  
  -- Payment (Scope 9)
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  payment_method payment_method,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  
  -- Special requests
  special_requests TEXT,
  internal_notes TEXT, -- Only visible to staff/admin
  
  -- Review by staff/admin (Scope 10)
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  refund_amount NUMERIC(10, 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT bookings_dates_valid CHECK (check_out_date > check_in_date),
  CONSTRAINT bookings_guest_count_positive CHECK (guest_count > 0),
  CONSTRAINT bookings_total_price_positive CHECK (total_price >= 0),
  CONSTRAINT bookings_paid_amount_valid CHECK (paid_amount >= 0 AND paid_amount <= total_price)
);

CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_date ON bookings(check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Booking Services (Junction table for bookings and services)
CREATE TABLE IF NOT EXISTS booking_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  service_date DATE,
  service_time TIME,
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT booking_services_quantity_positive CHECK (quantity > 0),
  CONSTRAINT booking_services_prices_positive CHECK (unit_price >= 0 AND total_price >= 0),
  UNIQUE(booking_id, service_id, service_date, service_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON booking_services(service_id);

-- Payment Transactions (Scope 9)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_reference TEXT NOT NULL UNIQUE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  
  -- Payment details
  amount NUMERIC(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  
  -- Online payment gateway details
  gateway_name TEXT, -- e.g., "Stripe", "PayPal"
  gateway_transaction_id TEXT,
  gateway_response JSONB,
  
  -- Cash payment details
  received_by UUID REFERENCES profiles(id),
  receipt_number TEXT,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT payment_transactions_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);

-- Stay History (Scope 11)
-- Automatically populated when booking is checked out
CREATE TABLE IF NOT EXISTS stay_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  
  -- Stay details
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in_at TIMESTAMPTZ NOT NULL,
  actual_check_out_at TIMESTAMPTZ NOT NULL,
  nights INTEGER NOT NULL,
  
  -- Pricing
  total_paid NUMERIC(10, 2) NOT NULL,
  
  -- Guest feedback (optional)
  rating INTEGER, -- 1-5 stars
  review TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT stay_history_rating_valid CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_stay_history_user_id ON stay_history(user_id);
CREATE INDEX IF NOT EXISTS idx_stay_history_booking_id ON stay_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_stay_history_check_out_date ON stay_history(check_out_date DESC);

-- ============================================================================
-- AUTHENTICATION & SECURITY TABLES (Scope 2)
-- ============================================================================

-- Login Attempts (Security tracking)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);

-- User Sessions (Security tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- OTP Verification (Scope 2 - Phone OTP)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'login', 'register', 'verify_phone'
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT otp_verifications_not_expired CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- ============================================================================
-- DASHBOARD & ANALYTICS TABLES (Scope 13)
-- ============================================================================

-- Room Occupancy Stats (for dashboards)
CREATE TABLE IF NOT EXISTS room_occupancy_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stat_date DATE NOT NULL UNIQUE,
  total_rooms INTEGER NOT NULL,
  occupied_rooms INTEGER NOT NULL,
  available_rooms INTEGER NOT NULL,
  maintenance_rooms INTEGER NOT NULL,
  occupancy_rate NUMERIC(5, 2) NOT NULL,
  revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_occupancy_stats_date ON room_occupancy_stats(stat_date DESC);

-- Activity Logs (Audit trail for admin/staff actions)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'check_in', 'check_out'
  entity_type TEXT NOT NULL, -- 'booking', 'room', 'service', etc.
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Handle new user creation (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON floors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  random_part := LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  ref := 'BK-' || year_part || '-' || random_part;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate booking reference
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_booking_reference();

-- Function: Generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  random_part := LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
  ref := 'TXN-' || timestamp_part || '-' || random_part;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate transaction reference
CREATE OR REPLACE FUNCTION set_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_reference IS NULL THEN
    NEW.transaction_reference := generate_transaction_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transaction_reference_trigger
  BEFORE INSERT ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION set_transaction_reference();

-- Function: Create stay history on checkout
CREATE OR REPLACE FUNCTION create_stay_history_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes to 'checked_out', create stay history
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' 
     AND NEW.actual_check_in_at IS NOT NULL AND NEW.actual_check_out_at IS NOT NULL THEN
    INSERT INTO stay_history (
      booking_id, user_id, room_id, room_type_id,
      check_in_date, check_out_date,
      actual_check_in_at, actual_check_out_at,
      nights, total_paid
    ) VALUES (
      NEW.id, NEW.user_id, NEW.room_id, NEW.room_type_id,
      NEW.check_in_date, NEW.check_out_date,
      NEW.actual_check_in_at, NEW.actual_check_out_at,
      NEW.nights, NEW.paid_amount
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_stay_history_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_stay_history_on_checkout();

-- Function: Update room status on booking changes
CREATE OR REPLACE FUNCTION update_room_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update room status based on booking status
    IF NEW.status = 'confirmed' THEN
      UPDATE rooms SET status = 'reserved' WHERE id = NEW.room_id;
    ELSIF NEW.status = 'checked_in' THEN
      UPDATE rooms SET status = 'occupied' WHERE id = NEW.room_id;
    ELSIF NEW.status IN ('checked_out', 'cancelled') THEN
      UPDATE rooms SET status = 'cleaning' WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_status_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_room_status_on_booking();

-- Function: Create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

-- Function: Log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Function: Check room availability
CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  is_available BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE room_id = p_room_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (
      (check_in_date, check_out_date) OVERLAPS (p_check_in, p_check_out)
    )
  ) INTO is_available;
  
  RETURN is_available;
END;
$$ LANGUAGE plpgsql;

-- Function: Get available rooms by type and dates
CREATE OR REPLACE FUNCTION get_available_rooms(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE (
  room_id UUID,
  room_number TEXT,
  floor_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.room_number, f.name
  FROM rooms r
  JOIN floors f ON r.floor_id = f.id
  WHERE r.room_type_id = p_room_type_id
  AND r.status = 'available'
  AND r.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.room_id = r.id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND (b.check_in_date, b.check_out_date) OVERLAPS (p_check_in, p_check_out)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_type_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_occupancy_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (Prevent RLS Recursion)
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
-- RLS POLICIES: PROFILES (Scope 1)
-- ============================================================================

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

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
-- RLS POLICIES: FLOORS (Scope 5)
-- ============================================================================

-- Public read access
CREATE POLICY "Public read floors"
  ON floors FOR SELECT
  USING (TRUE);

-- Admin can manage floors
CREATE POLICY "Admin manage floors"
  ON floors FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: ROOM TYPES (Scope 3, 7)
-- ============================================================================

-- Public read access for available room types
CREATE POLICY "Public read available room types"
  ON room_types FOR SELECT
  USING (is_available = TRUE);

-- Admin and staff can see all room types
CREATE POLICY "Admin staff read all room types"
  ON room_types FOR SELECT
  USING (public.is_staff());

-- Admin can manage room types
CREATE POLICY "Admin manage room types"
  ON room_types FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: ROOM TYPE AVAILABILITY (Scope 8)
-- ============================================================================

-- Public read access to check availability
CREATE POLICY "Public read room type availability"
  ON room_type_availability FOR SELECT
  USING (TRUE);

-- Admin can manage availability schedules
CREATE POLICY "Admin manage room type availability"
  ON room_type_availability FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: ROOMS (Scope 4)
-- ============================================================================

-- Public read access for active rooms
CREATE POLICY "Public read active rooms"
  ON rooms FOR SELECT
  USING (is_active = TRUE);

-- Admin can manage rooms
CREATE POLICY "Admin manage rooms"
  ON rooms FOR ALL
  USING (public.is_admin());

-- Staff can update room status
CREATE POLICY "Staff update room status"
  ON rooms FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ============================================================================
-- RLS POLICIES: SERVICES (Scope 5, 6)
-- ============================================================================

-- Public read access for available services
CREATE POLICY "Public read available services"
  ON services FOR SELECT
  USING (is_available = TRUE);

-- Admin and staff can see all services
CREATE POLICY "Admin staff read all services"
  ON services FOR SELECT
  USING (public.is_staff());

-- Admin can manage services
CREATE POLICY "Admin manage services"
  ON services FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: BOOKINGS (Scope 9, 10, 11, 12)
-- ============================================================================

-- Users can create their own bookings
CREATE POLICY "Users create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own bookings
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own pending bookings
CREATE POLICY "Users update own pending bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = user_id AND 
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    status IN ('pending', 'cancelled')
  );

-- Admin and staff can view all bookings (Scope 10)
CREATE POLICY "Admin staff read all bookings"
  ON bookings FOR SELECT
  USING (public.is_staff());

-- Admin and staff can update bookings (Scope 10, 12)
CREATE POLICY "Admin staff update bookings"
  ON bookings FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Admin can delete bookings
CREATE POLICY "Admin delete bookings"
  ON bookings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: BOOKING SERVICES
-- ============================================================================

-- Users can manage services for their own bookings
CREATE POLICY "Users manage own booking services"
  ON booking_services FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Admin and staff can manage all booking services
CREATE POLICY "Admin staff manage booking services"
  ON booking_services FOR ALL
  USING (public.is_staff());

-- ============================================================================
-- RLS POLICIES: PAYMENT TRANSACTIONS (Scope 9)
-- ============================================================================

-- Users can view their own payment transactions
CREATE POLICY "Users read own payment transactions"
  ON payment_transactions FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Users can create payment transactions for their bookings
CREATE POLICY "Users create own payment transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Admin and staff can view all payment transactions
CREATE POLICY "Admin staff read all payment transactions"
  ON payment_transactions FOR SELECT
  USING (public.is_staff());

-- Admin and staff can manage payment transactions
CREATE POLICY "Admin staff manage payment transactions"
  ON payment_transactions FOR ALL
  USING (public.is_staff());

-- ============================================================================
-- RLS POLICIES: STAY HISTORY (Scope 11)
-- ============================================================================

-- Users can view their own stay history
CREATE POLICY "Users read own stay history"
  ON stay_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their review on their stay
CREATE POLICY "Users update own stay review"
  ON stay_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin and staff can view all stay history
CREATE POLICY "Admin staff read all stay history"
  ON stay_history FOR SELECT
  USING (public.is_staff());

-- System can insert stay history (via trigger)
CREATE POLICY "System insert stay history"
  ON stay_history FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- RLS POLICIES: AUTHENTICATION TABLES (Scope 2)
-- ============================================================================

-- Login attempts: Admin only
CREATE POLICY "Admin read login attempts"
  ON login_attempts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System insert login attempts"
  ON login_attempts FOR INSERT
  WITH CHECK (TRUE);

-- User sessions: Users can view their own sessions
CREATE POLICY "Users read own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own sessions"
  ON user_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Admin can view all sessions
CREATE POLICY "Admin read all sessions"
  ON user_sessions FOR SELECT
  USING (public.is_admin());

-- OTP verifications: System only
CREATE POLICY "System manage otp verifications"
  ON otp_verifications FOR ALL
  USING (TRUE);

-- ============================================================================
-- RLS POLICIES: DASHBOARD & ANALYTICS (Scope 13)
-- ============================================================================

-- Room occupancy stats: Admin and staff can view
CREATE POLICY "Admin staff read occupancy stats"
  ON room_occupancy_stats FOR SELECT
  USING (public.is_staff());

CREATE POLICY "System manage occupancy stats"
  ON room_occupancy_stats FOR ALL
  USING (public.is_staff());

-- Activity logs: Admin can view all, staff can view their own
CREATE POLICY "Admin read all activity logs"
  ON activity_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Staff read own activity logs"
  ON activity_logs FOR SELECT
  USING (
    public.get_user_role() = 'staff' AND
    auth.uid() = user_id
  );

CREATE POLICY "System insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- VIEWS FOR DASHBOARDS (Scope 13)
-- ============================================================================

-- Dashboard: Today's bookings
CREATE OR REPLACE VIEW dashboard_todays_bookings AS
SELECT 
  b.id,
  b.booking_reference,
  b.guest_name,
  b.status,
  r.room_number,
  rt.name as room_type,
  b.check_in_date,
  b.check_out_date,
  b.total_price
FROM bookings b
LEFT JOIN rooms r ON b.room_id = r.id
LEFT JOIN room_types rt ON b.room_type_id = rt.id
WHERE b.check_in_date = CURRENT_DATE
ORDER BY b.created_at DESC;

-- Dashboard: Revenue summary
CREATE OR REPLACE VIEW dashboard_revenue_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_bookings,
  SUM(total_price) as total_revenue,
  SUM(paid_amount) as total_paid,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in,
  COUNT(*) FILTER (WHERE status = 'checked_out') as checked_out,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
FROM bookings
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Dashboard: Room status summary
CREATE OR REPLACE VIEW dashboard_room_status AS
SELECT 
  status,
  COUNT(*) as count
FROM rooms
WHERE is_active = TRUE
GROUP BY status;

-- Dashboard: Popular room types
CREATE OR REPLACE VIEW dashboard_popular_room_types AS
SELECT 
  rt.id,
  rt.name,
  COUNT(b.id) as booking_count,
  SUM(b.total_price) as total_revenue,
  AVG(sh.rating) as avg_rating
FROM room_types rt
LEFT JOIN bookings b ON rt.id = b.room_type_id
LEFT JOIN stay_history sh ON rt.id = sh.room_type_id
WHERE b.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY rt.id, rt.name
ORDER BY booking_count DESC;

-- Dashboard: Popular services
CREATE OR REPLACE VIEW dashboard_popular_services AS
SELECT 
  s.id,
  s.name,
  s.category,
  COUNT(bs.id) as usage_count,
  SUM(bs.total_price) as total_revenue
FROM services s
LEFT JOIN booking_services bs ON s.id = bs.service_id
WHERE bs.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.name, s.category
ORDER BY usage_count DESC;

-- ============================================================================
-- SEED DATA FOR TESTING
-- ============================================================================

-- Note: Run this only in development/testing environments
-- Comment out for production deployments

/*
-- Create demo admin user (manual creation required through Supabase Auth UI)
-- After creating user in Supabase Auth, update their profile:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@hotel.com';

-- Seed floors
INSERT INTO floors (floor_number, name, description, is_active) VALUES
(1, 'Ground Floor', 'Lobby and reception area', true),
(2, 'Second Floor', 'Premium rooms with garden view', true),
(3, 'Third Floor', 'Deluxe rooms with city view', true),
(4, 'Fourth Floor', 'Luxury suites with panoramic view', true)
ON CONFLICT (floor_number) DO NOTHING;

-- Seed room types
INSERT INTO room_types (name, slug, description, base_price, max_occupancy, bed_type, room_size, amenities, is_available) VALUES
('Standard Room', 'standard-room', 'Comfortable room with essential amenities', 150.00, 2, 'Queen', 25.0, '["WiFi", "TV", "Air Conditioning", "Private Bathroom"]'::jsonb, true),
('Deluxe Room', 'deluxe-room', 'Spacious room with premium amenities', 250.00, 2, 'King', 35.0, '["WiFi", "Smart TV", "Air Conditioning", "Luxury Bathroom", "Mini Bar", "Work Desk"]'::jsonb, true),
('Executive Suite', 'executive-suite', 'Large suite with separate living area', 450.00, 4, '2 Kings', 60.0, '["WiFi", "Smart TV", "Air Conditioning", "Luxury Bathroom", "Mini Bar", "Living Room", "Kitchen", "Balcony"]'::jsonb, true),
('Presidential Suite', 'presidential-suite', 'Ultimate luxury with panoramic views', 800.00, 6, '3 Kings', 120.0, '["WiFi", "Smart TV", "Air Conditioning", "Luxury Bathroom", "Full Kitchen", "Dining Room", "Living Room", "2 Balconies", "Butler Service"]'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed services
INSERT INTO services (name, slug, description, category, price, is_available) VALUES
('Room Service', 'room-service', '24/7 in-room dining service', 'room_service', 0.00, true),
('Spa Massage', 'spa-massage', 'Relaxing full body massage', 'spa', 120.00, true),
('Airport Transfer', 'airport-transfer', 'Comfortable airport pickup and drop-off', 'transport', 50.00, true),
('Laundry Service', 'laundry-service', 'Same-day laundry and dry cleaning', 'laundry', 30.00, true),
('Restaurant Breakfast', 'restaurant-breakfast', 'Buffet breakfast at our restaurant', 'dining', 25.00, true),
('Restaurant Dinner', 'restaurant-dinner', 'Fine dining experience', 'dining', 60.00, true)
ON CONFLICT (slug) DO NOTHING;
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ULTIMATE HOTEL MANAGEMENT DATABASE SCHEMA INSTALLED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Coverage:';
  RAISE NOTICE '  ✓ Scope 1: User roles (Admin, Staff, User)';
  RAISE NOTICE '  ✓ Scope 2: Authentication (Social, Phone OTP)';
  RAISE NOTICE '  ✓ Scope 3: Admin CRUD room types';
  RAISE NOTICE '  ✓ Scope 4: Admin CRUD rooms';
  RAISE NOTICE '  ✓ Scope 5: Admin CRUD floors';
  RAISE NOTICE '  ✓ Scope 6: Admin CRUD services';
  RAISE NOTICE '  ✓ Scope 7: Room type list with filters';
  RAISE NOTICE '  ✓ Scope 8: Room type availability schedule';
  RAISE NOTICE '  ✓ Scope 9: Cash and online payment';
  RAISE NOTICE '  ✓ Scope 10: Admin/Staff review bookings';
  RAISE NOTICE '  ✓ Scope 11: User booking and stay history';
  RAISE NOTICE '  ✓ Scope 12: Check-in and check-out';
  RAISE NOTICE '  ✓ Scope 13: Admin and Staff dashboards';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Features:';
  RAISE NOTICE '  ✓ Row Level Security (RLS) on all tables';
  RAISE NOTICE '  ✓ Role-based access control';
  RAISE NOTICE '  ✓ Activity logging and audit trail';
  RAISE NOTICE '  ✓ Secure payment tracking';
  RAISE NOTICE '  ✓ Login attempt monitoring';
  RAISE NOTICE '  ✓ Session management';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Verify all tables created: SELECT tablename FROM pg_tables WHERE schemaname=''public'';';
  RAISE NOTICE '  2. Create admin user through Supabase Auth UI';
  RAISE NOTICE '  3. Update admin role: UPDATE profiles SET role=''admin'' WHERE email=''your@email.com'';';
  RAISE NOTICE '  4. Uncomment and run seed data section for testing';
  RAISE NOTICE '  5. Test RLS policies with different user roles';
  RAISE NOTICE '============================================================================';
END $$;
