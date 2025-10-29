# Troubleshooting 500 Errors

## Current Errors

You're seeing **500 Internal Server Errors** on these tables:
- ✅ `hangout_requests` - 500 error
- ✅ `availability_shares` - 500 error  
- ✅ `availability` - 500 error
- ✅ `group_members` - 500 error + CORS error

## Root Cause

500 errors from Supabase usually mean:
1. **Missing RLS policies** - The table has RLS enabled but no policies allow access
2. **Conflicting RLS policies** - Multiple policies that contradict each other
3. **Invalid foreign key references** - Data references non-existent records
4. **Schema issues** - Missing columns or wrong data types

## Solution - Step by Step

### Step 1: Add Missing RLS Policies

Run this script in Supabase SQL Editor:

**`scripts/add_missing_rls_policies.sql`**

This will:
- ✅ Enable RLS on all problematic tables
- ✅ Drop any conflicting policies
- ✅ Create fresh, working policies
- ✅ Fix the group_members recursion issue

### Step 2: Verify the Fix

After running the script:
1. Refresh your app at http://localhost:3000
2. Check the browser console (F12 → Console)
3. The 500 errors should be gone

### Step 3: If Errors Persist

If you still see 500 errors, run the diagnostic script:

**`scripts/check_and_fix_tables.sql`**

This will show:
- Which tables exist
- What columns they have
- What foreign keys exist
- If there are any orphaned records (invalid references)

## Understanding the Errors

### Error 1: hangout_requests - 500
```
orqdrrijgrusqemboapg.supabase.co/rest/v1/hangout_requests?select=*...
Failed to load resource: the server responded with a status of 500
```

**Cause**: Missing or conflicting RLS policies on `hangout_requests` table

**Fix**: The script creates policies that allow users to view requests they sent or received

### Error 2: availability_shares - 500
```
orqdrrijgrusqemboapg.supabase.co/rest/v1/availability_shares?select=availability_id...
Failed to load resource: the server responded with a status of 500
```

**Cause**: Missing RLS policies on `availability_shares` table

**Fix**: The script creates policies that allow users to view shares for their availability or shares shared with them

### Error 3: availability - 500
```
orqdrrijgrusqemboapg.supabase.co/rest/v1/availability?select=*...
Failed to load resource: the server responded with a status of 500
```

**Cause**: Conflicting SELECT policies (had two separate policies for SELECT)

**Fix**: The script combines them into one policy with OR logic

### Error 4: group_members - 500 + CORS
```
Access to fetch at 'https://orqdrrijgrusqemboapg.supabase.co/rest/v1/group_members...'
has been blocked by CORS policy
```

**Cause**: The RLS policy has a recursion issue (policy references the same table it's protecting)

**Fix**: The script uses a simplified subquery approach to avoid recursion

## What's Working ✅

Good news! These are working:
- ✅ User authentication
- ✅ Profile loading
- ✅ Friends loading (1 friend found)
- ✅ Friend requests loading (1 request found)
- ✅ Friendships table queries

## Quick Test Commands

### Test 1: Check if RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('hangout_requests', 'availability', 'availability_shares', 'group_members');
```

### Test 2: Check existing policies
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hangout_requests', 'availability', 'availability_shares', 'group_members')
ORDER BY tablename, policyname;
```

### Test 3: Test a query manually
In browser console:
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()

// Test availability query
const { data, error } = await supabase
  .from('availability')
  .select('*')
  .eq('user_id', '6bd9d929-064f-489c-937e-882e8e25439f')

console.log('Data:', data, 'Error:', error)
```

## Expected Result

After running `scripts/add_missing_rls_policies.sql`, you should see:
- ✅ No 500 errors in browser console
- ✅ No CORS errors
- ✅ Plans tab loads without errors
- ✅ Availability tab loads without errors
- ✅ Groups load without errors

## Alternative: Temporary Disable RLS

If you want to quickly test if RLS is the issue:

```sql
-- TEMPORARY - NOT FOR PRODUCTION
ALTER TABLE hangout_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
```

If this fixes the errors, you know RLS policies are the issue. Then re-enable RLS and use the proper fix script.

## Need More Help?

If errors persist:
1. Run `scripts/check_and_fix_tables.sql` to see detailed diagnostics
2. Check Supabase Dashboard → Logs for detailed error messages
3. Copy the full error from the Logs section
4. Check if there are any data integrity issues (orphaned records)

