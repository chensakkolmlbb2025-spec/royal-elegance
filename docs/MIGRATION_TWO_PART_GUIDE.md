# P0 Security Fixes - Two-Part Migration Guide

## ⚠️ IMPORTANT: Run in TWO separate steps

Due to PostgreSQL's requirement that enum values be committed before use, this migration has been split into two parts.

---

## 🎯 Migration Steps

### Step 1: Add Enum Values
**File:** `p0-security-fixes-migration-part1-enums.sql`

1. Open Supabase SQL Editor
2. Copy and paste the contents of `p0-security-fixes-migration-part1-enums.sql`
3. Run the query
4. **Wait for it to complete successfully** ✅

This adds:
- `'reserved'` to `booking_status` enum
- `'super_admin'` to `user_role` enum

---

### Step 2: Add Schema Changes
**File:** `p0-security-fixes-migration-part2-schema.sql`

1. In Supabase SQL Editor (in the same or new tab)
2. Copy and paste the contents of `p0-security-fixes-migration-part2-schema.sql`
3. Run the query
4. **Wait for it to complete successfully** ✅

This adds:
- 8 new tables (payments, refunds, audit logs, security logs, tokens)
- 18 new columns to existing tables
- 3 new functions
- 15+ indexes
- 10+ RLS policies

---

## ✅ Verification

After running both parts, verify the migration:

```sql
-- Check enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'booking_status'::regtype ORDER BY enumsortorder;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder;

-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'refunds', 'payment_audit_log', 'booking_audit_log', 'security_logs', 'login_attempts', 'email_verification_tokens', 'password_reset_tokens');

-- Check new columns on bookings
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('version', 'transaction_id', 'reservation_expires_at', 'created_at', 'updated_at');
```

---

## 🔄 Idempotency

Both migrations are **idempotent** and safe to run multiple times:
- Enum values: Only added if they don't exist
- Tables: Created with `IF NOT EXISTS`
- Columns: Added with `IF NOT EXISTS`
- Indexes: Created with `IF NOT EXISTS`
- Policies: Can be re-created safely

---

## 📝 What Changed

### Part 1 (Enums):
- Added `reserved` status for temporary booking holds
- Added `super_admin` role for enhanced security policies

### Part 2 (Schema):
- **Bookings**: Version control, transaction IDs, reservation expiry, timestamps
- **Payments**: Idempotency keys, refund tracking, multiple payment methods
- **Refunds**: Full refund management system
- **Audit Logs**: Payment and booking audit trails
- **Security**: Login attempts, security event logs
- **Tokens**: Email verification and password reset tokens
- **Profiles**: Email verification, account locking, login tracking
- **Functions**: Atomic availability checks, expired reservation cleanup

---

## 🚨 Troubleshooting

If you get an error:
1. Note the exact error message
2. Check which part failed (Part 1 or Part 2)
3. The migrations are idempotent, so you can re-run after fixing any issues

Common issues:
- **Enum already exists**: Safe to ignore, migration will skip it
- **Table already exists**: Safe to ignore, migration will use existing table
- **Column already exists**: Safe to ignore, migration will skip it

---

## 📊 Success Criteria

After successful migration:
- ✅ Zero SQL errors
- ✅ All new tables created
- ✅ All new columns added
- ✅ All RLS policies active
- ✅ Functions created and working

Run the verification queries above to confirm! 🎉
