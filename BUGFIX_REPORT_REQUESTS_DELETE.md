# Bug Fix Report: Unable to Delete Accepted Hangout Requests

## Issue Summary
When users tried to remove accepted hangout requests from the Requests tab, a success message appeared briefly, but the requests remained visible after reopening the tab. The deletion was failing silently.

## Root Cause Analysis

### 1. **RLS Policy Restriction**
The database Row Level Security (RLS) policy for `hangout_requests` table only allowed the **sender** to delete requests:

```sql
-- OLD POLICY (Restrictive)
CREATE POLICY "Users can delete their sent requests"
  ON hangout_requests FOR DELETE
  USING (auth.uid() = sender_id);
```

**Problem**: Users who **received** requests (receivers) could not delete accepted/rejected requests, even though the UI suggested they could via the "Clear All" button.

### 2. **Missing Error Detection**
The `deleteRequest` function in `lib/api/requests.ts` did not return the deletion result:

```typescript
// OLD CODE
export async function deleteRequest(requestId: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase.from("hangout_requests").delete().eq("id", requestId)
  if (error) throw error
}
```

**Problem**: When RLS blocked the deletion, Supabase returned success (no error) but with empty data. The function didn't check if anything was actually deleted.

### 3. **Optimistic UI Feedback**
The `confirmClearAll` function showed success regardless of actual deletion results:

```typescript
// OLD CODE
for (const request of nonPendingRequests) {
  await deleteRequest(request.id)  // Might fail silently
}

toast({
  title: "Requests cleared",
  description: `${nonPendingRequests.length} requests removed.`,  // Always shows this
})
```

**Problem**: The code assumed all deletions succeeded and showed a success message even when RLS blocked the operations.

## The Fix

### 1. **Updated RLS Policy** ✅
Created a new policy that allows both senders and receivers to delete requests:

```sql
-- NEW POLICY (Permissive)
CREATE POLICY "Users can delete their requests"
  ON hangout_requests FOR DELETE
  TO authenticated
  USING (
    auth.uid() = sender_id 
    OR (
      auth.uid() = receiver_id 
      AND status IN ('accepted', 'rejected')
    )
  );
```

**Benefits**:
- Senders can delete any request they sent (any status)
- Receivers can delete accepted/rejected requests they received
- Receivers cannot delete pending requests (preserves request integrity)

### 2. **Enhanced deleteRequest Function** ✅
Updated to return deletion results and add logging:

```typescript
// NEW CODE
export async function deleteRequest(requestId: string) {
  const supabase = createBrowserClient()
  
  console.log("[v0] deleteRequest: Attempting to delete request:", requestId)
  
  const { data, error } = await supabase
    .from("hangout_requests")
    .delete()
    .eq("id", requestId)
    .select()  // Returns deleted rows
  
  if (error) {
    console.error("[v0] deleteRequest: Error deleting request:", error)
    throw error
  }
  
  console.log("[v0] deleteRequest: Successfully deleted request:", data)
  return data  // Returns deleted rows or empty array if RLS blocked
}
```

**Benefits**:
- Returns the deleted data to verify success
- Adds comprehensive logging for debugging
- Allows callers to check if deletion actually happened

### 3. **Smart Error Handling in UI** ✅
Updated `confirmClearAll` to track success/failure counts:

```typescript
// NEW CODE
let successCount = 0
let failedCount = 0

for (const request of nonPendingRequests) {
  try {
    const result = await deleteRequest(request.id)
    if (result && result.length > 0) {
      successCount++
    } else {
      failedCount++  // RLS blocked or already deleted
    }
  } catch (error) {
    failedCount++
  }
}

// Show accurate feedback based on results
if (successCount > 0 && failedCount === 0) {
  toast({ title: "Requests cleared", description: `${successCount} removed.` })
} else if (successCount > 0 && failedCount > 0) {
  toast({ 
    title: "Partially cleared", 
    description: `${successCount} removed, ${failedCount} failed.`,
    variant: "destructive" 
  })
} else {
  toast({ 
    title: "Failed to clear requests", 
    description: "You may not have permission.",
    variant: "destructive" 
  })
}
```

**Benefits**:
- Accurate feedback to users
- Distinguishes between full success, partial success, and complete failure
- Provides helpful error messages

### 4. **Updated confirmDelete Function** ✅
Applied the same error checking to single request deletion:

```typescript
// NEW CODE
const result = await deleteRequest(requestToDelete)

if (result && result.length > 0) {
  toast({ title: "Request deleted", description: "Your request has been removed." })
  loadRequests()
} else {
  toast({ 
    title: "Failed to delete request", 
    description: "You may not have permission.",
    variant: "destructive" 
  })
}
```

## Files Changed

1. **lib/api/requests.ts** - Enhanced `deleteRequest` function
2. **components/tabs/requests-tab.tsx** - Updated `confirmClearAll` and `confirmDelete` functions
3. **scripts/fix_hangout_requests_delete_policy.sql** - New RLS policy migration

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Test deleting accepted received requests
- [ ] Test deleting rejected received requests
- [ ] Test deleting sent requests (any status)
- [ ] Verify pending received requests cannot be deleted by receiver
- [ ] Check console logs for proper error reporting
- [ ] Verify accurate toast messages for all scenarios

## Prevention Measures

To prevent similar issues in the future:

1. **Always return data from delete operations** - Use `.select()` after `.delete()` to verify success
2. **Check RLS policies match UI capabilities** - If UI allows an action, ensure RLS permits it
3. **Track operation results** - Count successes/failures instead of assuming success
4. **Add comprehensive logging** - Log all database operations for debugging
5. **Test with different user roles** - Test as both sender and receiver
6. **Show accurate feedback** - Never show success without verifying the operation succeeded

## Related Issues

This fix also improves:
- User trust in the application
- Debugging capabilities with enhanced logging
- Error message clarity
- Data consistency (users see accurate state)

