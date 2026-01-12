# Row Level Security (RLS) — Complete Guide

This document provides a comprehensive explanation of Row Level Security (RLS) policies in the Royal Elegance hotel booking system. It covers how RLS works, all policies by table, security considerations, testing, debugging, and best practices.

---

## What is Row Level Security?

**Row Level Security (RLS)** is a PostgreSQL feature that enforces data access control at the database level. Instead of trusting the application to hide sensitive data, RLS automatically filters rows based on policies defined in the database.

### Key Benefits
- **Atomic Security**: Data protection is enforced by the database, not the app.
- **Multi-tenant Ready**: Each user sees only data they're authorized to view.
- **Defense in Depth**: Prevents data exposure even if app code is compromised or buggy.
- **Role-based Control**: Different row visibility based on user role (admin, staff, user/guest).

### How It Works (Simple Model)
```
┌─────────────────────────────────────────────┐
│  Client tries to SELECT from bookings table │
└────────────────┬────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Is RLS enabled on bookings?    │
    │ YES                            │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────┐
    │ Check all SELECT policies:                 │
    │ - "Users read own bookings"                │
    │ - "Admin/Staff read all bookings"          │
    │ Does current user match ANY policy? YES    │
    └────────┬───────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────┐
    │ Filter rows: Only return rows that pass    │
    │ the policy's USING condition               │
    └────────────────────────────────────────────┘
```

---

## How RLS is Implemented in This Project

### Step 1: Enable RLS on a table
```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

Once enabled, **no one can access any rows** (not even admins) until policies are created.

### Step 2: Create policies
```sql
CREATE POLICY "Users read own bookings"
  ON bookings
  FOR SELECT
  USING (auth.uid() = user_id);
```

This policy says: "Anyone can SELECT from bookings IF the row's `user_id` matches the current user's ID."

### Step 3: Policies stack with OR logic
If you create multiple SELECT policies on the same table, a user can read a row if **ANY** of the policies allow it.

---

## RLS Concepts & Terminology

### Auth Context Functions
The schema defines helper functions to determine the current user's role **without RLS recursion**:

```sql
-- Get current user's role (cached, no recursion risk)
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

-- Shorthand checks
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

**Why `SECURITY DEFINER`?**
- It runs with the privileges of the function creator (superuser/service role).
- This prevents "RLS recursion" — trying to check another table's policies from inside a policy.
- It's safe because the function itself is vetted.

### Policy Statements
Each policy specifies an operation:
- `FOR SELECT` — filtering rows on read
- `FOR INSERT` — filtering rows that can be inserted (WITH CHECK)
- `FOR UPDATE` — filtering rows that can be updated (USING + WITH CHECK)
- `FOR DELETE` — filtering rows that can be deleted (USING)
- `FOR ALL` — shorthand for all operations

### USING vs WITH CHECK
- **USING** — applied to rows **being selected or modified**. "Which existing rows can you see/modify?"
- **WITH CHECK** — applied to rows **being inserted or updated**. "What values are allowed for new/modified rows?"

Example:
```sql
CREATE POLICY "Users update own profile except role"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)  -- Can only update their own row
  WITH CHECK (auth.uid() = id AND role = public.get_user_role());  -- Can't change their role
```

---

## Complete RLS Policies by Table

Below are all RLS policies defined in `database/database-ultimate-schema.sql`, organized by table.

### 1) PROFILES Table

Purpose: User account profiles linked to `auth.users`.

**Policies:**

#### a) "Allow profile creation on signup"
```sql
CREATE POLICY "Allow profile creation on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```
- **Who**: Anyone authenticated
- **What**: Can INSERT a new profile
- **Condition**: Only if the profile's `id` matches their own user ID
- **Use case**: Signup trigger or client-side signup flow

#### b) "Users can view own profile"
```sql
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```
- **Who**: Any authenticated user
- **What**: Can SELECT their own profile
- **Condition**: `id = auth.uid()`

#### c) "Users can update own profile"
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = public.get_user_role()  -- Prevent role escalation
  );
```
- **Who**: Any authenticated user
- **What**: Can UPDATE their own profile
- **USING**: Can only see/modify their own row
- **WITH CHECK**: Can't change their role (enforced by comparing new role to their current role via function)
- **Security**: Prevents users from promoting themselves to admin

#### d) "Admin can view all profiles"
```sql
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());
```
- **Who**: Admin users
- **What**: Can SELECT any profile
- **Condition**: User has admin role

#### e) "Admin can update all profiles"
```sql
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());
```
- **Who**: Admin
- **What**: Can UPDATE any profile
- **Use case**: Admin changing a user's role, contact info, etc.

#### f) "Staff can view all profiles"
```sql
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can SELECT all profiles
- **Use case**: Staff checking guest info

---

### 2) FLOORS Table

**Policies:**

#### a) "Public read floors"
```sql
CREATE POLICY "Public read floors"
  ON floors FOR SELECT
  USING (TRUE);
```
- **Who**: Everyone (authenticated or not)
- **What**: Can read floor info
- **Condition**: Always TRUE (no restriction)

#### b) "Admin manage floors"
```sql
CREATE POLICY "Admin manage floors"
  ON floors FOR ALL
  USING (public.is_admin());
```
- **Who**: Admin only
- **What**: Can SELECT, INSERT, UPDATE, DELETE floors
- **Condition**: User is admin

---

### 3) ROOM_TYPES Table

**Policies:**

#### a) "Public read available room types"
```sql
CREATE POLICY "Public read available room types"
  ON room_types FOR SELECT
  USING (is_available = TRUE);
```
- **Who**: Everyone (no auth required)
- **What**: Can see room types marked as available
- **Use case**: Guest browsing the website

#### b) "Admin staff read all room types"
```sql
CREATE POLICY "Admin staff read all room types"
  ON room_types FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can see all room types (including unavailable/draft)

#### c) "Admin manage room types"
```sql
CREATE POLICY "Admin manage room types"
  ON room_types FOR ALL
  USING (public.is_admin());
```
- **Who**: Admin only
- **What**: Full CRUD on room types

---

### 4) ROOM_TYPE_AVAILABILITY Table

**Policies:**

#### a) "Public read room type availability"
```sql
CREATE POLICY "Public read room type availability"
  ON room_type_availability FOR SELECT
  USING (TRUE);
```
- **Who**: Everyone
- **What**: Can see availability schedules (helps determine if a room type is bookable on certain dates)

#### b) "Admin manage room type availability"
```sql
CREATE POLICY "Admin manage room type availability"
  ON room_type_availability FOR ALL
  USING (public.is_admin());
```
- **Who**: Admin only
- **What**: Full CRUD on availability overrides

---

### 5) ROOMS Table

**Policies:**

#### a) "Public read active rooms"
```sql
CREATE POLICY "Public read active rooms"
  ON rooms FOR SELECT
  USING (is_active = TRUE);
```
- **Who**: Everyone
- **What**: Can see active room listings

#### b) "Admin manage rooms"
```sql
CREATE POLICY "Admin manage rooms"
  ON rooms FOR ALL
  USING (public.is_admin());
```
- **Who**: Admin only
- **What**: Full CRUD

#### c) "Staff update room status"
```sql
CREATE POLICY "Staff update room status"
  ON rooms FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can UPDATE room records (e.g., mark as cleaning, maintenance)

---

### 6) SERVICES Table

**Policies:**

#### a) "Public read available services"
```sql
CREATE POLICY "Public read available services"
  ON services FOR SELECT
  USING (is_available = TRUE);
```
- **Who**: Everyone
- **What**: See available services

#### b) "Admin staff read all services"
```sql
CREATE POLICY "Admin staff read all services"
  ON services FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: See all services (including unavailable/drafts)

#### c) "Admin manage services"
```sql
CREATE POLICY "Admin manage services"
  ON services FOR ALL
  USING (public.is_admin());
```
- **Who**: Admin
- **What**: Full CRUD

---

### 7) BOOKINGS Table (Most Important)

**Policies:**

#### a) "Users create own bookings"
```sql
CREATE POLICY "Users create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
- **Who**: Authenticated users
- **What**: Can INSERT a new booking
- **Condition**: Only if `user_id = auth.uid()` (booking is for themselves)
- **Security**: Prevents user from booking on behalf of someone else

#### b) "Users read own bookings"
```sql
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);
```
- **Who**: Authenticated users
- **What**: Can SELECT their own bookings
- **Use case**: "My Reservations" page

#### c) "Users update own pending bookings"
```sql
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
```
- **Who**: Authenticated users
- **What**: Can UPDATE their own bookings (limited)
- **USING**: Only if booking belongs to them AND status is 'pending'
- **WITH CHECK**: After update, booking must still be theirs AND status must be 'pending' or 'cancelled'
- **Security**: Users can only cancel their pending bookings, not modify confirmed or checked-in bookings

#### d) "Admin staff read all bookings"
```sql
CREATE POLICY "Admin staff read all bookings"
  ON bookings FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can SELECT all bookings
- **Use case**: Staff dashboard, admin reports

#### e) "Admin staff update bookings"
```sql
CREATE POLICY "Admin staff update bookings"
  ON bookings FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can UPDATE any booking
- **Use case**: Check-in, check-out, marking no-show, cancelling on behalf of guest

#### f) "Admin delete bookings"
```sql
CREATE POLICY "Admin delete bookings"
  ON bookings FOR DELETE
  USING (public.is_admin());
```
- **Who**: Admin only
- **What**: Can DELETE bookings
- **Use case**: Clean up test data or erroneous bookings

---

### 8) BOOKING_SERVICES Table

**Policies:**

#### a) "Users manage own booking services"
```sql
CREATE POLICY "Users manage own booking services"
  ON booking_services FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );
```
- **Who**: Authenticated users
- **What**: Full CRUD on services for their own bookings
- **Condition**: Service must be attached to a booking they own
- **Note**: Uses a subquery to join with `bookings` table

#### b) "Admin staff manage booking services"
```sql
CREATE POLICY "Admin staff manage booking services"
  ON booking_services FOR ALL
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Full CRUD on any booking services

---

### 9) PAYMENT_TRANSACTIONS Table

**Policies:**

#### a) "Users read own payment transactions"
```sql
CREATE POLICY "Users read own payment transactions"
  ON payment_transactions FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );
```
- **Who**: Authenticated users
- **What**: Can SELECT payment records for their bookings only

#### b) "Users create own payment transactions"
```sql
CREATE POLICY "Users create own payment transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );
```
- **Who**: Authenticated users
- **What**: Can INSERT payment records for their bookings

#### c) "Admin staff read all payment transactions"
```sql
CREATE POLICY "Admin staff read all payment transactions"
  ON payment_transactions FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can see all payment records

#### d) "Admin staff manage payment transactions"
```sql
CREATE POLICY "Admin staff manage payment transactions"
  ON payment_transactions FOR ALL
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Full CRUD on any payment records
- **Use case**: Refunds, manual adjustments

---

### 10) STAY_HISTORY Table

**Policies:**

#### a) "Users read own stay history"
```sql
CREATE POLICY "Users read own stay history"
  ON stay_history FOR SELECT
  USING (auth.uid() = user_id);
```
- **Who**: Authenticated users
- **What**: Can see their past stays

#### b) "Users update own stay review"
```sql
CREATE POLICY "Users update own stay review"
  ON stay_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
- **Who**: Authenticated users
- **What**: Can UPDATE their own stay (add/edit review and rating)

#### c) "Admin staff read all stay history"
```sql
CREATE POLICY "Admin staff read all stay history"
  ON stay_history FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: View guest history and feedback

#### d) "System insert stay history"
```sql
CREATE POLICY "System insert stay history"
  ON stay_history FOR INSERT
  WITH CHECK (TRUE);
```
- **Who**: Trigger/system functions (bypass auth.uid() check)
- **What**: Can INSERT stay records
- **Condition**: Always TRUE
- **Use case**: Trigger `create_stay_history_on_checkout()` populates this when booking is checked out

---

### 11) LOGIN_ATTEMPTS Table

**Policies:**

#### a) "Admin read login attempts"
```sql
CREATE POLICY "Admin read login attempts"
  ON login_attempts FOR SELECT
  USING (public.is_admin());
```
- **Who**: Admin
- **What**: Can view login attempt logs (security auditing)

#### b) "System insert login attempts"
```sql
CREATE POLICY "System insert login attempts"
  ON login_attempts FOR INSERT
  WITH CHECK (TRUE);
```
- **Who**: Server-side functions
- **What**: Can insert login records
- **Condition**: Always TRUE (app code writes on every login attempt)

---

### 12) USER_SESSIONS Table

**Policies:**

#### a) "Users read own sessions"
```sql
CREATE POLICY "Users read own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);
```
- **Who**: Authenticated users
- **What**: Can view their own active sessions (devices logged in)

#### b) "Users manage own sessions"
```sql
CREATE POLICY "Users manage own sessions"
  ON user_sessions FOR ALL
  USING (auth.uid() = user_id);
```
- **Who**: Authenticated users
- **What**: Can DELETE their own sessions (logout from device)

#### c) "Admin read all sessions"
```sql
CREATE POLICY "Admin read all sessions"
  ON user_sessions FOR SELECT
  USING (public.is_admin());
```
- **Who**: Admin
- **What**: View all active sessions for security auditing

---

### 13) OTP_VERIFICATIONS Table

**Policies:**

#### a) "System manage otp verifications"
```sql
CREATE POLICY "System manage otp verifications"
  ON otp_verifications FOR ALL
  WITH CHECK (TRUE);
```
- **Who**: Server/app code
- **What**: Full CRUD on OTP records
- **Condition**: Always TRUE
- **Note**: No row visibility needed; managed entirely by app

---

### 14) ROOM_OCCUPANCY_STATS Table

**Policies:**

#### a) "Admin staff read occupancy stats"
```sql
CREATE POLICY "Admin staff read occupancy stats"
  ON room_occupancy_stats FOR SELECT
  USING (public.is_staff());
```
- **Who**: Staff or admin
- **What**: Can view dashboard stats

#### b) "System manage occupancy stats"
```sql
CREATE POLICY "System manage occupancy stats"
  ON room_occupancy_stats FOR ALL
  USING (public.is_staff());
```
- **Who**: App code / triggers
- **What**: Can insert/update daily stats
- **Note**: Generated by cron jobs or scheduled functions

---

### 15) ACTIVITY_LOGS Table

**Policies:**

#### a) "Admin read all activity logs"
```sql
CREATE POLICY "Admin read all activity logs"
  ON activity_logs FOR SELECT
  USING (public.is_admin());
```
- **Who**: Admin
- **What**: View complete audit trail

#### b) "Staff read own activity logs"
```sql
CREATE POLICY "Staff read own activity logs"
  ON activity_logs FOR SELECT
  USING (
    public.get_user_role() = 'staff' AND
    auth.uid() = user_id
  );
```
- **Who**: Staff (non-admin)
- **What**: Can view only logs from their own actions

#### c) "System insert activity logs"
```sql
CREATE POLICY "System insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (TRUE);
```
- **Who**: Server/app code
- **What**: Can insert audit records
- **Condition**: Always TRUE

---

## RLS Policy Evaluation & Precedence

### How Multiple Policies Are Evaluated

When a user tries to access a table with multiple policies:

1. **SELECT**: User can see a row if **ANY** SELECT policy permits it (OR logic)
2. **INSERT**: New row must pass **ANY** INSERT policy (OR logic)
3. **UPDATE**: Must have a policy with both USING and WITH CHECK that permit the change
4. **DELETE**: Row must pass a DELETE policy with USING condition

### Example: Three SELECT Policies on Bookings
```sql
-- Policy 1: Users see own bookings
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Staff see all bookings
CREATE POLICY "Admin staff read all bookings"
  ON bookings FOR SELECT
  USING (public.is_staff());

-- Policy 3: No policy for public
```

**Result:**
- A guest user sees only their own bookings (Policy 1 matches)
- A staff user sees all bookings (Policy 2 matches)
- A non-authenticated user sees nothing (no policy matches)

---

## Common RLS Pitfalls & Solutions

### Pitfall 1: Subquery in Policy Causes Recursion
**Problem:**
```sql
-- WRONG: Tries to read from bookings table, which itself has RLS
CREATE POLICY "Users manage booking services"
  ON booking_services FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()  -- ❌ Recursion!
    )
  );
```

**Solution:** Use `SECURITY DEFINER` functions or defer logic to app code.

```sql
-- RIGHT: App code checks authorization
-- SELECT id FROM booking_services WHERE booking_id IN (user's booking IDs)
```

### Pitfall 2: Role Escalation
**Problem:**
```sql
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```
User can change their own role to 'admin'!

**Solution:** Enforce role immutability:
```sql
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = public.get_user_role()  -- Role must stay the same
  );
```

### Pitfall 3: Forgetting WITH CHECK on INSERT
**Problem:**
```sql
CREATE POLICY "Users create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
User can INSERT booking for someone else's `user_id` if they forge the request.

**Solution:** Always validate that the inserted data matches the user:
```sql
CREATE POLICY "Users create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);  -- ✓ Good
```

### Pitfall 4: NOT Using Policies Correctly for Multi-tenancy
**Problem:** You have public data (room types) and private data (bookings) in the same database.
```sql
-- WRONG: No policies = data leaks
-- RIGHT: Policies by table
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read room types"
  ON room_types FOR SELECT USING (is_available = TRUE);
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT USING (auth.uid() = user_id);
```

---

## Testing RLS Policies

### Test Setup
Use Supabase Studio or your database CLI to test as different users.

### Test 1: Verify User Can't Read Other User's Data
```sql
-- Logged in as user_id = 'user-1'
SELECT * FROM bookings;  -- Should only see rows where user_id = 'user-1'

-- Try to manually peek at another user's booking
SELECT * FROM bookings WHERE user_id = 'user-2';  -- Should return 0 rows (policy blocks)
```

### Test 2: Verify Admin Can Read All Data
```sql
-- As admin (role = 'admin')
SELECT * FROM bookings;  -- Should see ALL bookings
```

### Test 3: Verify Insert Policies
```sql
-- Logged in as user-1
INSERT INTO bookings (user_id, ...) VALUES ('user-1', ...);  -- ✓ Success

INSERT INTO bookings (user_id, ...) VALUES ('user-2', ...);  -- ✗ Permission denied
```

### Test 4: Verify Role Immutability
```sql
-- Logged in as regular user
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();  -- ✗ Should fail

-- Same user trying to update other fields
UPDATE profiles SET full_name = 'New Name' WHERE id = auth.uid();  -- ✓ Success
```

---

## Debugging RLS Issues

### Common Error: "new row violates row-level security policy"
**Cause:** The `WITH CHECK` condition failed on INSERT or UPDATE.

**Debug steps:**
1. Check the exact policy:
```sql
SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'bookings';
```
2. Manually test the condition:
```sql
SELECT auth.uid();  -- What is the current user?
SELECT user_id FROM bookings LIMIT 1;  -- What's in the table?
```
3. Verify the policy logic is correct.

### Common Error: "permission denied for table X"
**Cause:** No policy exists for the operation, or RLS is enabled with no policies.

**Debug steps:**
1. Check RLS status:
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'bookings';
```
2. List all policies:
```sql
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'bookings';
```
3. If policies exist, verify your user's role:
```sql
SELECT public.get_user_role();
SELECT public.is_admin();
SELECT public.is_staff();
```

### Common Error: Infinite Recursion / Stack Overflow
**Cause:** Policy uses a subquery that triggers another policy on the same table.

**Solution:** Use `SECURITY DEFINER` functions instead of inline logic.

---

## Best Practices

### 1) Always Enable RLS
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```
After enabling, **create at least one policy** or users get "permission denied" errors.

### 2) Create Policies for Every Operation
```sql
-- For SELECT
CREATE POLICY "..." FOR SELECT USING (...);

-- For INSERT
CREATE POLICY "..." FOR INSERT WITH CHECK (...);

-- For UPDATE
CREATE POLICY "..." FOR UPDATE USING (...) WITH CHECK (...);

-- For DELETE
CREATE POLICY "..." FOR DELETE USING (...);
```

### 3) Use SECURITY DEFINER Functions for Role Checks
```sql
-- ✓ GOOD: No recursion risk
WHERE public.is_admin()

-- ✗ BAD: May cause recursion
WHERE (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
```

### 4) Separate Public and Private Data
```sql
-- Public (everyone can read)
CREATE POLICY "Public read" ON room_types FOR SELECT USING (TRUE);

-- Private (owner only)
CREATE POLICY "Owner read" ON bookings FOR SELECT USING (auth.uid() = user_id);

-- Admin-only
CREATE POLICY "Admin manage" ON floors FOR ALL USING (public.is_admin());
```

### 5) Test Role-Based Access
Always test your policies as:
- Unauthenticated (NULL auth.uid())
- Regular user
- Staff member
- Admin

### 6) Document Policy Intent
```sql
-- This policy allows guests to see bookings during check-in flow
-- Staff members manage the check-in process
CREATE POLICY "Staff can check-in guests"
  ON bookings FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
```

### 7) Avoid Overly Complex Conditions
If a policy's USING/WITH CHECK is very complex, consider moving logic to the application or a helper function.

---

## Performance Considerations

### Index Optimization
RLS policies benefit from indexes on frequently-checked columns:
```sql
-- Frequently checked in policies:
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
```

### Policy Stacking
More policies = more evaluation. Keep policies focused.

### Subquery Impact
Subqueries in policies add overhead:
```sql
-- Okay for small tables
USING (booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()))

-- Better: join at app level if possible
```

---

## Security Audit Checklist

Before deploying to production:

- [ ] RLS is enabled on all sensitive tables
- [ ] Public tables (room_types, services) allow public SELECT
- [ ] Private data (bookings, payment_transactions) restricted to owner + admin/staff
- [ ] INSERT policies validate `auth.uid()` or role
- [ ] UPDATE policies prevent privilege escalation (e.g., role immutability)
- [ ] DELETE policies exist and are admin-only where appropriate
- [ ] No subqueries in policies that risk recursion
- [ ] Helper functions (get_user_role, is_admin) are SECURITY DEFINER
- [ ] Tested as unauthenticated, user, staff, and admin
- [ ] Activity logs capture sensitive operations
- [ ] No SELECT *, force column selection where sensitive

---

## Troubleshooting Template

If a user reports "I can't see my data" or "Permission denied":

1. **Check RLS is enabled:**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'table_name';
```

2. **List policies:**
```sql
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'table_name';
```

3. **Check user's auth:**
```sql
SELECT auth.uid();
SELECT public.get_user_role();
```

4. **Manually test the policy condition:**
```sql
-- Example for bookings "Users read own bookings" policy:
-- Policy condition: auth.uid() = user_id
SELECT * FROM bookings WHERE user_id = 'current-user-id';  -- Should have rows
```

5. **Check for conflicting policies:**
If UPDATE has both USING and WITH CHECK, both must be satisfied.

---

## Final Notes

- RLS is **database-level security**, not application-level.
- It's the **last line of defense** — combine with app-level validation.
- Always test policies thoroughly before production.
- Monitor audit logs for unexpected access patterns.
- Document your policy design for team maintenance.

For questions or issues, refer to this guide or the [Supabase RLS documentation](https://supabase.com/docs/guides/auth/row-level-security).
