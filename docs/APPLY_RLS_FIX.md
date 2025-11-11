# Apply RLS Recursion Fix

## Problem
Infinite recursion detected in PostgreSQL RLS policies when accessing pages that check user roles (like `/rooms`). This happens because policies on the `profiles` table query the `profiles` table itself, creating a cycle.

## Solution
Replace subquery-based policies with SECURITY DEFINER functions that bypass RLS checks.

## Steps to Apply Fix

### Option 1: Apply Complete Fix (Recommended)
1. Go to your Supabase Dashboard → SQL Editor
2. Open the file `fix-rls-recursion.sql`
3. Copy and paste the entire contents
4. Click **Run**
5. This will:
   - Drop all old recursive policies
   - Create the three security definer functions
   - Recreate all policies using the new functions

### Option 2: Deploy Fresh Schema (For New Deployments)
If you're setting up a new database:
1. Go to your Supabase Dashboard → SQL Editor
2. Open the file `database-ultimate-schema.sql`
3. Copy and paste the entire contents (includes the fix)
4. Click **Run**

### Option 3: Manual Application (Advanced)
If you prefer to understand what's being changed:

**Step 1: Create the Helper Functions**
```sql
-- Function to get current user's role without triggering RLS
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

-- Function to check if current user is admin
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

-- Function to check if current user is staff or admin
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
```

**Note:** Functions are in the `public` schema, not `auth` schema, due to Supabase permission restrictions.

**Step 2: Update Each Policy**
For each table, drop the old policy and create a new one. Example for profiles:

```sql
-- Old (causes recursion):
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- New (no recursion):
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());
```

## Verification

After applying the fix:

1. **Test the /rooms page:**
   ```
   Navigate to http://localhost:3000/rooms
   ```
   Should load without "infinite recursion" error.

2. **Test role-based access:**
   - Login as admin → should see all rooms
   - Login as staff → should see all rooms
   - Login as user → should see only active rooms

3. **Check database logs:**
   Go to Supabase Dashboard → Logs → look for any RLS errors

## What Changed

### Before (Recursive):
```sql
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```
**Problem:** When checking policy, PostgreSQL queries profiles table → triggers profiles SELECT policy → queries profiles table again → infinite loop

### After (Non-Recursive):
```sql
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());
```
**Solution:** `public.is_admin()` is SECURITY DEFINER, so it runs with elevated privileges and bypasses RLS checks → no recursion

## Technical Details

- **SECURITY DEFINER:** Function executes with privileges of the function owner (superuser), not the caller
- **STABLE:** Tells PostgreSQL the function doesn't modify database and returns same result for same inputs within a single query (optimization)
- **public schema:** Functions are in `public` schema (not `auth`) due to Supabase permission restrictions on the `auth` schema

## Rollback (If Needed)

If something goes wrong, you can rollback by:
1. Dropping the new policies
2. Dropping the auth functions
3. Re-running the old schema

But this should NOT be needed if you follow the steps correctly.

## Files Modified

- `fix-rls-recursion.sql` - Standalone fix script (apply this to existing database)
- `database-ultimate-schema.sql` - Complete schema with fix included (use for fresh deployments)

Both files now use function-based policies instead of subquery-based policies.
