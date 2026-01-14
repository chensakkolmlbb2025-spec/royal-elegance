# Migration Verification Checklist

## Pre-Migration

- [ ] Backup current database
- [ ] Review migration file: `database/p0-security-fixes-migration.sql`
- [ ] Ensure no other migrations running
- [ ] Have Supabase dashboard open

## Apply Migration

### In Supabase SQL Editor:

1. [ ] Copy entire content of `database/p0-security-fixes-migration.sql`
2. [ ] Open Supabase Dashboard > SQL Editor
3. [ ] Paste migration script
4. [ ] Click "Run"
5. [ ] Wait for completion (should see success message)

### Expected Output:
```
Query executed successfully (no results shown)
```

### If Error Occurs:
- Check error message against known issues below
- Review `docs/MIGRATION_FIX_NOTES.md`
- Do NOT try to re-run if partially applied

## Post-Migration Verification

Run each verification query in SQL Editor:

### 1. Verify Enum Was Added
```sql
SELECT enum_range(NULL::booking_status);
```
Expected: Should include `'reserved'` in the enum values

### 2. Verify New Tables Exist
```sql
SELECT COUNT(*) as table_count FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payments', 'refunds', 'payment_audit_log', 'booking_audit_log', 'security_logs', 'login_attempts', 'email_verification_tokens', 'password_reset_tokens');
```
Expected: `table_count = 8`

### 3. Verify Booking Columns Added
```sql
SELECT COUNT(*) as column_count FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('version', 'transaction_id', 'reservation_expires_at', 'cancellation_reason', 'cancelled_by', 'cancelled_at', 'actual_check_in', 'actual_check_out', 'checked_in_by', 'checked_out_by');
```
Expected: `column_count = 10`

### 4. Verify Profile Columns Added
```sql
SELECT COUNT(*) as column_count FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('email_verified', 'email_verified_at', 'account_locked', 'account_locked_until', 'failed_login_attempts', 'last_login_at', 'password_changed_at', 'metadata');
```
Expected: `column_count = 8`

### 5. Verify Functions Created
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('check_room_availability_atomic', 'cleanup_expired_reservations', 'count_failed_login_attempts');
```
Expected: 3 functions listed

### 6. Verify RLS Policies
```sql
SELECT COUNT(*) as policy_count FROM pg_policies 
WHERE tablename IN ('payments', 'refunds', 'payment_audit_log', 'booking_audit_log', 'security_logs');
```
Expected: `policy_count > 0`

### 7. Verify Indexes Created
```sql
SELECT COUNT(*) as index_count FROM pg_indexes 
WHERE tablename IN ('bookings', 'payments', 'refunds', 'payment_audit_log', 'booking_audit_log', 'security_logs', 'login_attempts', 'email_verification_tokens', 'password_reset_tokens')
AND schemaname = 'public';
```
Expected: `index_count > 0`

## Test Data

### Insert Test Payment
```sql
INSERT INTO payments (booking_id, amount, currency, status, method, idempotency_key)
VALUES ('550e8400-e29b-41d4-a716-446655440001'::uuid, 100.00, 'usd', 'pending', 'stripe', 'test-key-001');

SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;
```
Expected: Row inserted successfully

### Test Reservation Status
```sql
-- Check that 'reserved' status is valid
SELECT 'reserved'::booking_status;
```
Expected: No error

### Test Availability Function
```sql
SELECT check_room_availability_atomic(
  '550e8400-e29b-41d4-a716-446655440002'::uuid, 
  NOW(), 
  NOW() + INTERVAL '1 day'
);
```
Expected: JSON response with `{"available": true, "conflicts": []}`

## Known Issues & Fixes

| Issue | Status | Fix |
|-------|--------|-----|
| `ERROR: 22P02: invalid input value for enum booking_status: "reserved"` | ✅ Fixed | Migration now adds enum value first |
| Constraint errors on payments table | ✅ Fixed | Removed invalid CHECK constraints |
| Type casting errors in queries | ✅ Fixed | Added explicit `::text` and `::booking_status` casts |
| Index filter errors | ✅ Fixed | Used `status::text = 'reserved'` |

## Rollback Plan

If migration fails:

1. [ ] Do NOT attempt to re-run partial migration
2. [ ] Check Supabase Activity logs for what was applied
3. [ ] Run rollback script from `docs/MIGRATION_READY.md`
4. [ ] Contact support with error message

## Success Criteria

Migration is successful when:

- ✅ All 8 verification queries return expected counts
- ✅ No errors in Supabase Activity logs
- ✅ Can insert test payment record
- ✅ Can query new tables
- ✅ All functions exist and are callable
- ✅ RLS policies enabled on all new tables

## Next Steps After Migration

1. [ ] Update `lib/booking/booking-service.ts` to use new booking tables
2. [ ] Update `lib/payment/payment-service.ts` to use new payment tables
3. [ ] Test booking creation with race condition prevention
4. [ ] Test payment processing with idempotency
5. [ ] Run project tests: `npm test`
6. [ ] Build project: `npm run build`
7. [ ] Deploy to staging

## Support

If migration fails:

1. Check `docs/MIGRATION_FIX_NOTES.md` for common issues
2. Review error message against "Known Issues" table above
3. Check Supabase logs: Dashboard > Logs > Database
4. Run individual verification queries to identify problem area

## Documentation

- **Main guide:** `docs/P0_SECURITY_FIXES.md`
- **Migration notes:** `docs/MIGRATION_FIX_NOTES.md`
- **This checklist:** `docs/MIGRATION_READY.md`
- **Usage examples:** `docs/P0_SECURITY_FIXES.md` > Usage Examples

---

**Last Updated:** January 13, 2026
**Migration Version:** P0 Security Fixes
**Status:** ✅ Ready for Production
