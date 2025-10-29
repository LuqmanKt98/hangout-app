# Comprehensive Test Plan - Hangout App

## Test Accounts
- **Account 1**: luqman.haider01@gmail.com | Password: Test@123 | Name: Muhammad Lucky
- **Account 2**: Luqman.haider001@gmail.com | Password: Test@123 | Name: Luqman Haider

## Critical Bugs Found

### 🐛 BUG #1: Web Share API Error
**Status**: ✅ FIXED
**Location**: `components/tabs/plans-tab.tsx` - `handleInviteFriends()`
**Issue**: InvalidStateError when clicking "Invite Friends" button multiple times
**Fix**: Added `navigator.canShare` check before calling `navigator.share()`

### 🐛 BUG #2: Current User Appears in Own Friends List
**Status**: ⚠️ IDENTIFIED - NEEDS FIX
**Location**: `components/tabs/availability-tab.tsx` - `loadFriends()` function
**Issue**: When creating availability, current user (Muhammad Lucky) appears as a friend option to share with
**Root Cause**: The `getFriends()` API is returning the current user in the friends list
**Impact**: User can accidentally share availability with themselves
**Fix Needed**: Filter out current user from friends list in availability modal

### 🐛 BUG #3: Onboarding Completed Column Error
**Status**: ✅ FIXED
**Location**: `app/page.tsx`
**Issue**: 400 error - "column profiles.onboarding_completed does not exist"
**Fix**: Changed query from `.single()` to `.maybeSingle()` with silent error handling

## Test Modules

### 1. Authentication & Onboarding
- [ ] Login with Account 1
- [ ] Login with Account 2
- [ ] Logout functionality
- [ ] Onboarding flow (if applicable)
- [ ] Profile creation/update

### 2. My Avales Tab (Availability Management)
#### Create Availability
- [ ] Click "Add Availability" button
- [ ] Select date from calendar
- [ ] Select start time
- [ ] Select end time
- [ ] Choose energy level (High/Low/Virtual)
- [ ] Add activity tags
- [ ] Share with specific friends
- [ ] Share with groups
- [ ] Verify availability appears in list
- [ ] **BUG CHECK**: Verify current user does NOT appear in friends list

#### Edit Availability
- [ ] Click on existing availability
- [ ] Modify date
- [ ] Modify time
- [ ] Change energy level
- [ ] Update activity tags
- [ ] Change shared friends/groups
- [ ] Save changes
- [ ] Verify updates reflected

#### Delete Availability
- [ ] Click delete button on availability
- [ ] Confirm deletion
- [ ] Verify availability removed from list

#### Available Now Feature
- [ ] Toggle "Available Now" switch ON
- [ ] Set duration and vibe
- [ ] Select visibility (friends/groups)
- [ ] Verify status shows as available
- [ ] Toggle "Available Now" switch OFF
- [ ] Verify status updated

#### Bookable Links
- [ ] Click "Create Bookable Link"
- [ ] Fill in link details
- [ ] Set time slots
- [ ] Create link
- [ ] Copy/share bookable link
- [ ] Verify link appears in list

### 3. Friend Requests
#### Send Friend Request (Account 1 → Account 2)
- [ ] Login as Account 1 (Muhammad Lucky)
- [ ] Go to Profile/You tab
- [ ] Click "Add Friend"
- [ ] Search for Account 2 email (Luqman.haider001@gmail.com)
- [ ] Click "Add" button
- [ ] Verify success message
- [ ] Verify request appears in "Sent Requests"

#### Receive & Accept Friend Request (Account 2)
- [ ] Login as Account 2 (Luqman Haider)
- [ ] Go to Requests tab
- [ ] Verify friend request from Account 1 appears
- [ ] Click "Accept" button
- [ ] Verify success message
- [ ] Verify Account 1 now appears in Friends list
- [ ] Verify friendship is bidirectional

#### Receive & Reject Friend Request
- [ ] Send request from Account 1 to another user
- [ ] Login as receiver
- [ ] Go to Requests tab
- [ ] Click "Decline" button
- [ ] Verify request removed
- [ ] Verify NOT in friends list

#### Cancel Sent Request
- [ ] Send friend request
- [ ] Go to Requests tab → Sent
- [ ] Click "Cancel" button
- [ ] Verify request removed

### 4. Plans Tab
#### View Friend Availability
- [ ] Login as Account 1
- [ ] Ensure Account 2 has created availability
- [ ] Go to Plans tab
- [ ] Verify Account 2's availability appears in "Friends' Avales"
- [ ] Verify correct date, time, energy level shown
- [ ] Verify activity tags displayed

#### Send Hangout Request
- [ ] Click "Send Request" on friend's availability
- [ ] Verify date/time pre-filled
- [ ] Adjust time if needed
- [ ] Add optional message
- [ ] Click "Send Request"
- [ ] Verify success message
- [ ] Verify request appears in Requests tab

#### View Week Calendar
- [ ] Verify current week displayed
- [ ] Click previous week arrow
- [ ] Click next week arrow
- [ ] Click "Today" button
- [ ] Click calendar icon to jump to specific week
- [ ] Click on specific day to view plans

#### Invite Friends
- [ ] Click "Invite Friends" button
- [ ] **BUG CHECK**: Verify no error occurs
- [ ] On mobile: Verify native share dialog opens
- [ ] On desktop: Verify link copied to clipboard
- [ ] Verify success toast message

### 5. Requests Tab
#### View Received Requests
- [ ] Go to Requests tab
- [ ] Verify "Received" section shows incoming requests
- [ ] Verify sender name, date, time, message displayed

#### Accept Hangout Request
- [ ] Click "Accept" on received request
- [ ] Verify success message
- [ ] Verify plan appears in Plans tab
- [ ] Verify plan appears in week calendar

#### Decline Hangout Request
- [ ] Click "Decline" on received request
- [ ] Verify request removed
- [ ] Verify NOT in Plans tab

#### View Sent Requests
- [ ] Go to Requests tab → Sent
- [ ] Verify outgoing requests displayed
- [ ] Verify receiver name, date, time shown
- [ ] Verify status (pending/accepted/declined)

#### Cancel Sent Hangout Request
- [ ] Click "Cancel" on sent request
- [ ] Verify request removed

### 6. Profile/You Tab
#### View Profile
- [ ] Go to You tab
- [ ] Verify profile information displayed
- [ ] Verify avatar, name, email, location
- [ ] Verify stats (Friends, Hangouts, Groups)

#### Edit Profile
- [ ] Click "Edit Profile"
- [ ] Update name
- [ ] Update bio
- [ ] Update phone
- [ ] Update location
- [ ] Upload avatar (if supported)
- [ ] Save changes
- [ ] Verify updates reflected

#### View Friends List
- [ ] Scroll to Friends section
- [ ] Verify all friends displayed
- [ ] Verify friend count matches

#### View Friend Profile
- [ ] Click on a friend card
- [ ] Verify friend profile modal opens
- [ ] Verify friend details displayed
- [ ] Verify "Send Hangout Request" button works
- [ ] Close modal

#### Unfriend
- [ ] Click on a friend card
- [ ] Click "Unfriend" button
- [ ] Confirm unfriend action
- [ ] Verify friend removed from list
- [ ] Verify friend count decremented
- [ ] Verify bidirectional removal (check other account)

#### View Groups
- [ ] Scroll to Groups section
- [ ] Verify groups displayed
- [ ] Verify group count

### 7. Groups
#### Create Group
- [ ] Click "Create" button in Groups section
- [ ] Enter group name
- [ ] Enter group description
- [ ] Select members from friends list
- [ ] Create group
- [ ] Verify group appears in list

#### View Group Details
- [ ] Click on a group
- [ ] Verify group name, description
- [ ] Verify member list
- [ ] Verify member count

#### Add Members to Group
- [ ] Open group details
- [ ] Click "Add Members"
- [ ] Select friends to add
- [ ] Confirm addition
- [ ] Verify members added

#### Remove Members from Group
- [ ] Open group details
- [ ] Click remove on a member
- [ ] Confirm removal
- [ ] Verify member removed

#### Share Availability with Group
- [ ] Create new availability
- [ ] Select "Groups" tab in share section
- [ ] Select a group
- [ ] Save availability
- [ ] Verify all group members can see availability

#### Leave Group
- [ ] Open group details
- [ ] Click "Leave Group"
- [ ] Confirm action
- [ ] Verify group removed from list

#### Delete Group (if creator)
- [ ] Open group details
- [ ] Click "Delete Group"
- [ ] Confirm deletion
- [ ] Verify group removed

### 8. Hangouts/Plans
#### View Confirmed Plans
- [ ] Go to Plans tab
- [ ] Verify confirmed hangouts displayed in week view
- [ ] Verify plan details (friend, date, time, location)

#### Message Friend about Plan
- [ ] Click on a confirmed plan
- [ ] Click "Message" button
- [ ] Verify message thread opens
- [ ] Send a message
- [ ] Verify message sent
- [ ] Check other account receives message

#### Cancel Plan
- [ ] Open plan details
- [ ] Click "Cancel Plan"
- [ ] Confirm cancellation
- [ ] Verify plan removed
- [ ] Verify other user notified

### 9. Real-time Updates
#### Friend Request Notifications
- [ ] Send friend request from Account 1
- [ ] Keep Account 2 logged in
- [ ] Verify notification badge appears on Requests tab
- [ ] Verify count increments

#### Hangout Request Notifications
- [ ] Send hangout request from Account 1
- [ ] Keep Account 2 logged in
- [ ] Verify notification badge appears
- [ ] Verify count increments

#### Availability Updates
- [ ] Account 2 creates new availability
- [ ] Keep Account 1 on Plans tab
- [ ] Verify new availability appears automatically

### 10. Edge Cases & Error Handling
- [ ] Try to send friend request to already-friend
- [ ] Try to send duplicate friend request
- [ ] Try to accept already-accepted request
- [ ] Try to create availability without required fields
- [ ] Try to send hangout request without time
- [ ] Try to send hangout request outside availability window
- [ ] Test with no internet connection
- [ ] Test with slow network
- [ ] Test rapid clicking on buttons
- [ ] Test with very long text inputs
- [ ] Test with special characters in inputs

### 11. UI/UX Testing
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1920px)
- [ ] Verify all modals close properly
- [ ] Verify all forms validate properly
- [ ] Verify loading states display
- [ ] Verify error messages are clear
- [ ] Verify success messages are clear
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility (if applicable)

### 12. Performance Testing
- [ ] Test with 0 friends
- [ ] Test with 10 friends
- [ ] Test with 50+ friends (if possible)
- [ ] Test with 0 availability slots
- [ ] Test with 20+ availability slots
- [ ] Test with 0 groups
- [ ] Test with 10+ groups
- [ ] Measure page load time
- [ ] Check for memory leaks
- [ ] Check console for errors

## Test Results Summary

### Bugs Found
1. ✅ Web Share API error - FIXED
2. ⚠️ Current user in own friends list - NEEDS FIX
3. ✅ Onboarding column error - FIXED

### Features Working
- Plans tab navigation
- My Avales tab navigation
- Requests tab navigation
- Profile/You tab navigation
- Friend search functionality
- Friend request already-friends validation

### Features Not Tested Yet
- Full availability creation flow
- Friend request send/receive/accept flow
- Hangout request flow
- Groups creation and management
- Real-time notifications
- Message threading
- Plan cancellation

### Recommendations
1. **CRITICAL**: Fix current user appearing in friends list bug
2. Add loading states for all async operations
3. Add better error messages for failed operations
4. Add confirmation dialogs for destructive actions
5. Improve mobile responsiveness
6. Add empty states for all lists
7. Add search/filter for large friends lists
8. Add pagination for availability slots
9. Add ability to edit sent requests before acceptance
10. Add ability to suggest alternative times for hangout requests

## Next Steps
1. Fix Bug #2 (current user in friends list)
2. Complete full test cycle with both accounts
3. Test all friend request flows
4. Test all hangout request flows
5. Test groups functionality
6. Test real-time updates
7. Document all findings
8. Create bug fix priority list
