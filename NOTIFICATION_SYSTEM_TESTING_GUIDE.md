# Notification System Testing Guide

This guide covers end-to-end testing of the pre-meeting notification system.

## Prerequisites

Before testing, ensure:

1. ✅ Database migrations have been run (`20250123000010_add_notification_preferences.sql`)
2. ✅ Firebase project is set up with credentials configured
3. ✅ Google Calendar is connected for test users
4. ✅ Environment variables are set:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## Test Scenarios

### 1. External Meeting Detection

**Goal**: Verify that meetings with external attendees are correctly identified.

**Steps**:
1. Create test calendar events in Google Calendar:
   - Event A: Meeting with attendees from same domain (e.g., @company.com)
   - Event B: Meeting with attendees from different domains (e.g., @partner.com)
   - Event C: Solo event (no attendees)
2. Run calendar sync for test user
3. Query `calendar_events` table
4. Verify:
   - Event A: `is_external_meeting = false`
   - Event B: `is_external_meeting = true`
   - Event C: `is_external_meeting = false`

**Expected Result**: External meetings are correctly flagged.

### 2. Notification Preferences UI

**Goal**: Verify notification settings can be configured.

**Steps**:
1. Navigate to `/settings`
2. Locate "Meeting Notifications" card
3. Test toggles:
   - Enable/disable meeting notifications
   - Change notification timing (5, 10, 15, 30, 60 minutes)
   - Toggle "Notify for all meetings" vs "External only"
4. Verify settings are saved to `user_preferences` table
5. Refresh page and confirm settings persist

**Expected Result**: All settings save correctly and persist.

### 3. Browser Notification Permission

**Goal**: Verify browser notification permission flow.

**Steps**:
1. In Settings, check "Browser Notifications" status
2. If not granted, click "Enable Browser Notifications"
3. Accept browser permission prompt
4. Verify status changes to "Enabled ✓"

**Expected Result**: Permission request works and status updates.

### 4. Upcoming Meetings UI

**Goal**: Verify the "Coming Up" meetings page displays correctly.

**Steps**:
1. Navigate to `/meetings`
2. Verify meetings are grouped:
   - "Coming up" (today)
   - "Tomorrow"
   - "This Week"
   - "Later"
3. Check meeting cards show:
   - Title, time, attendees
   - Location (if present)
   - Video call indicator (if present)
   - "External" badge (if applicable)
4. Click on a meeting card
5. Verify navigation to meeting prep page

**Expected Result**: Meetings display correctly with proper grouping and details.

### 5. Meeting Prep Page

**Goal**: Verify meeting preparation interface.

**Steps**:
1. Navigate to `/meetings/{event-id}`
2. Verify meeting details display:
   - Title, date, time
   - Time until meeting
   - Attendee list
   - Location/video call link
   - Description
3. Type notes in the "Pre-Meeting Notes" section
4. Click "Start now" button
5. Verify:
   - Conversation is created linked to event
   - Navigation to conversation page occurs

**Expected Result**: Meeting prep page displays all info and recording starts correctly.

### 6. Notification Scheduler (Manual Trigger)

**Goal**: Test the notification scheduling logic.

**Steps**:
1. Create a test event 15 minutes in the future with external attendees
2. Manually trigger the scheduler edge function:
   ```bash
   curl -X POST \
     "${SUPABASE_URL}/functions/v1/schedule-meeting-notifications" \
     -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
   ```
3. Check edge function logs for:
   - User processing count
   - Notification sent confirmation
4. Query `notification_log` table for new entry
5. Check browser for notification popup

**Expected Result**: Notification sent successfully and logged.

### 7. Notification Timing Accuracy

**Goal**: Verify notifications arrive at correct time.

**Steps**:
1. Set notification preference to 5 minutes
2. Create test event 5 minutes in future
3. Wait for notification to arrive
4. Verify timing is accurate (within 1-2 minute window)

**Expected Result**: Notification arrives within expected window.

### 8. External vs All Meetings Filter

**Goal**: Verify meeting type filtering works.

**Setup**: Create two test events 15 minutes in future:
- Event A: Internal meeting (same domain attendees)
- Event B: External meeting (different domain attendees)

**Test Case 1 - External Only (default)**:
1. Set preference: `notify_all_meetings = false`
2. Trigger scheduler
3. Verify: Only Event B triggers notification

**Test Case 2 - All Meetings**:
1. Set preference: `notify_all_meetings = true`
2. Trigger scheduler
3. Verify: Both events trigger notifications

**Expected Result**: Filter works correctly based on preference.

### 9. Duplicate Notification Prevention

**Goal**: Verify duplicate notifications are prevented.

**Steps**:
1. Create test event 15 minutes in future
2. Trigger scheduler manually (first time)
3. Verify notification sent and logged
4. Immediately trigger scheduler again (second time)
5. Verify second trigger does NOT send duplicate notification
6. Check `notification_log` has only one entry for event

**Expected Result**: No duplicate notifications sent.

### 10. Automatic Calendar Sync

**Goal**: Verify background calendar sync works.

**Steps**:
1. Manually trigger auto-sync edge function:
   ```bash
   curl -X POST \
     "${SUPABASE_URL}/functions/v1/auto-sync-calendars" \
     -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
   ```
2. Check logs for:
   - Users processed count
   - Sync success/failure status
3. Create new event in Google Calendar
4. Wait for next auto-sync (30 minutes) or trigger manually
5. Verify new event appears in `/meetings` page

**Expected Result**: Calendar syncs automatically for all connected users.

### 11. Token Refresh Handling

**Goal**: Verify expired Google OAuth tokens are refreshed.

**Steps**:
1. In database, set `google_token_expiry` to past date for test user
2. Trigger calendar sync
3. Check logs for "Token expired, refreshing..." message
4. Verify token refresh succeeds
5. Verify new `google_access_token` and `google_token_expiry` saved
6. Verify calendar events still sync correctly

**Expected Result**: Expired tokens refresh automatically.

### 12. Mobile Push Notification (If Implemented)

**Goal**: Verify FCM/APNS notifications work.

**Steps**:
1. Register test device using `/functions/v1/register-device`:
   ```json
   {
     "fcmToken": "test-fcm-token",
     "platform": "android"
   }
   ```
2. Verify token saved to `user_preferences.fcm_token`
3. Create test event 15 minutes in future
4. Trigger scheduler
5. Check Firebase Cloud Messaging console for delivery status
6. Verify notification received on mobile device

**Expected Result**: Mobile notifications delivered successfully.

### 13. Notification Click Action

**Goal**: Verify clicking notification navigates correctly.

**Steps**:
1. Wait for or trigger notification for upcoming meeting
2. Click on the notification
3. Verify:
   - Browser/app opens to meeting prep page (`/meetings/{event-id}`)
   - Meeting details are displayed

**Expected Result**: Notification click opens correct meeting page.

### 14. Cron Job Execution (GitHub Actions)

**Goal**: Verify scheduled cron jobs run automatically.

**Steps**:
1. Check `.github/workflows/notification-scheduler-cron.yml`
2. Verify cron schedule: `*/5 * * * *` (every 5 minutes)
3. Check `.github/workflows/calendar-sync-cron.yml`
4. Verify cron schedule: `*/30 * * * *` (every 30 minutes)
5. Monitor GitHub Actions runs:
   - Navigate to repository → Actions tab
   - Verify both workflows appear and run on schedule
6. Check workflow run logs for success/failure

**Expected Result**: Cron jobs execute on schedule without errors.

### 15. Edge Cases

**Test Case 1 - Timezone Handling**:
- Create event in different timezone
- Verify notification timing respects user's local timezone

**Test Case 2 - Cancelled Meeting**:
- Create event, wait for notification setup
- Cancel event in Google Calendar
- Trigger sync
- Verify event removed from database
- Verify no notification sent

**Test Case 3 - Rescheduled Meeting**:
- Create event at time T1
- Set up notification
- Reschedule to time T2
- Trigger sync
- Verify notification log cleared/updated
- Verify new notification sent at T2

**Test Case 4 - No Device Tokens**:
- User with notifications enabled but no FCM/APNS tokens
- Trigger scheduler
- Verify warning logged but no error
- Verify user can still see meetings in UI

**Test Case 5 - Permission Denied**:
- Block browser notifications
- Trigger notification
- Verify graceful handling (no crash)
- Verify user sees status in settings

## Load Testing

For production readiness:

1. **Scheduler Performance**:
   - Test with 100+ users with notifications enabled
   - Verify scheduler completes within 5 minute window
   - Monitor memory usage and API rate limits

2. **Sync Performance**:
   - Test with 100+ users with Google Calendar connected
   - Verify auto-sync completes within 30 minute window
   - Monitor Google Calendar API quota usage

## Monitoring & Observability

After deployment, monitor:

1. **Edge Function Logs**:
   - Check for errors in scheduler/sync functions
   - Monitor notification delivery success rate

2. **Database Queries**:
   - Check `notification_log` table growth
   - Set up log cleanup for entries older than 7 days

3. **User Feedback**:
   - Track notification open rate
   - Monitor Settings page usage for notification preferences

## Cleanup

After testing, clean up test data:

```sql
-- Remove test notification logs
DELETE FROM notification_log WHERE profile_id = 'test-user-id';

-- Remove test calendar events
DELETE FROM calendar_events WHERE owned_by_profile = 'test-user-id';

-- Reset test user preferences
UPDATE user_preferences 
SET meeting_notification_enabled = true,
    meeting_notification_minutes = 15,
    notify_all_meetings = false
WHERE profile_id = 'test-user-id';
```

## Success Criteria

All tests pass when:

✅ External meetings are correctly identified  
✅ Notification preferences save and persist  
✅ Browser notifications work  
✅ Meetings page displays correctly  
✅ Meeting prep page works  
✅ Notifications arrive at correct time  
✅ Meeting type filter works  
✅ No duplicate notifications  
✅ Calendar syncs automatically  
✅ Tokens refresh correctly  
✅ Mobile push works (if implemented)  
✅ Notification clicks navigate correctly  
✅ Cron jobs run on schedule  
✅ Edge cases handled gracefully
