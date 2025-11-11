-- ============================================================================
-- ADD PROFILE CREATION TRIGGER
-- ============================================================================
-- This trigger automatically creates a profile when a new user signs up
-- Run this SQL in your Supabase SQL Editor:
-- https://app.supabase.com → Your Project → SQL Editor → New Query
-- ============================================================================

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

-- Verify trigger was created
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
