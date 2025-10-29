# Fix Database Errors - Step by Step Guide

## Problem
You're seeing errors like:
- `Error fetching user memberships: {}`
- `Error loading pending requests: {}`
- `Error fetching profiles: {}`
- `Error fetching shares: {}`
- `Error fetching confirmed plans: {}`

## Root Cause
The errors are showing empty objects `{}` because the Supabase RLS (Row Level Security) policies are either:
1. Not set up correctly
2. Too restrictive
3. Missing entirely

## Solution

### Step 1: Check Current State
1. Open Supabase Dashboard: https://orqdrrijgrusqemboapg.supabase.co
2. Go to **SQL Editor**
3. Run the diagnostic script: `scripts/diagnose_rls.sql`
4. Check the results to see:
   - Which tables exist
   - If RLS is enabled
   - What policies are in place
   - If there's any data

### Step 2: Fix RLS Policies

**Option A: Fix RLS Policies (Recommended)**
1. In Supabase SQL Editor, copy and paste the entire contents of: `scripts/fix_rls_policies.sql`
2. Click **Run** (or press Ctrl+Enter)
3. This will:
   - Drop ALL existing policies (to avoid conflicts)
   - Create new, more permissive policies for authenticated users
   - Fix the profiles policy to allow all authenticated users to search for other users

**Option B: Temporarily Disable RLS (For Testing Only)**
1. If Option A gives errors, try: `scripts/disable_rls_for_testing.sql`
2. This will temporarily disable RLS to confirm it's the issue
3. ⚠️ **WARNING**: This makes your database insecure - only for local testing!
4. After confirming RLS is the issue, re-enable it and use Option A

### Step 3: Verify the Fix
1. Refresh your app at http://localhost:3000
2. Check the browser console (F12 → Console tab)
3. You should now see detailed error messages instead of empty objects `{}`
4. The errors should be resolved if the RLS policies were the issue

### Step 4: If Errors Persist
If you still see errors after fixing RLS policies, check the browser console for the actual error messages. The improved error logging will now show:
- `message`: The error message
- `code`: The error code
- `details`: Additional details
- `hint`: Suggestions for fixing the error

## What Changed in the Code

### Improved Error Logging
All API functions now log detailed error information:

**Before:**
```javascript
console.error("Error fetching user memberships:", membershipError)
// Output: Error fetching user memberships: {}
```

**After:**
```javascript
console.error("Error fetching user memberships:", {
  message: membershipError.message,
  code: membershipError.code,
  details: membershipError.details,
  hint: membershipError.hint
})
// Output: Error fetching user memberships: { message: "permission denied for table group_members", code: "42501", ... }
```

### Files Modified
1. `lib/api/groups.ts` - Improved error logging
2. `lib/api/friends.ts` - Improved error logging
3. `lib/api/plans.ts` - Improved error logging
4. `components/tabs/profile-tab.tsx` - Improved error logging
5. `components/tabs/plans-tab.tsx` - Improved error logging

### Files Created
1. `scripts/diagnose_rls.sql` - Diagnostic script to check RLS status
2. `scripts/fix_rls_policies.sql` - Script to fix RLS policies
3. `FIX_ERRORS_README.md` - This file

## Common Issues and Solutions

### Issue 1: "permission denied for table X"
**Solution:** Run `scripts/fix_rls_policies.sql` to fix RLS policies

### Issue 2: "relation 'public.X' does not exist"
**Solution:** Run `scripts/000_comprehensive_fresh_start.sql` to create all tables

### Issue 3: "null value in column 'X' violates not-null constraint"
**Solution:** Check that your profile is complete. Go to Profile tab and edit your profile.

### Issue 4: "JWT expired" or "Invalid Refresh Token"
**Solution:** Log out and log back in

## Testing the Fix

### Test 1: Profile Tab
1. Go to Profile tab
2. You should see your profile information
3. Friends count should load
4. Groups count should load

### Test 2: Add Friend
1. Click "Add Friend"
2. Search for a user by email
3. You should see search results

### Test 3: Plans Tab
1. Go to Plans tab
2. You should see confirmed plans (if any)
3. You should see friends' availability (if any)

## Need More Help?

If errors persist after following these steps:
1. Check the browser console (F12 → Console)
2. Copy the full error message (it will now show detailed information)
3. Check the Supabase logs in the Dashboard → Logs section
4. Verify your authentication status (you should be logged in)

## Quick Commands

### Check if logged in
Open browser console and run:
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
```

### Manually test a query
Open browser console and run:
```javascript
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()
const { data, error } = await supabase.from('profiles').select('*').limit(5)
console.log('Data:', data, 'Error:', error)
```

