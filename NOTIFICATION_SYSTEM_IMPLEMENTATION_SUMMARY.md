# Pre-Meeting Notification System - Implementation Summary

## Overview

A comprehensive pre-meeting notification system has been implemented that syncs with Google Calendar, sends configurable push notifications (web + mobile) before external meetings, and provides a Granola-inspired UI for quick conversation recording.

## What Was Built

### ✅ 1. Database Schema Changes

**File**: `supabase/migrations/20250123000010_add_notification_preferences.sql`

Added to `user_preferences` table:
- `meeting_notification_enabled` - Enable/disable notifications
- `meeting_notification_minutes` - Time before meeting (5, 10, 15, 30, 60 minutes)
- `notify_all_meetings` - Notify for all vs external only
- `fcm_token` - Firebase Cloud Messaging token (mobile/web)
- `apns_token` - Apple Push Notification Service token (iOS)

Added to `calendar_events` table:
- `is_external_meeting` - Flag for meetings with external attendees

New `notification_log` table:
- Tracks sent notifications to prevent duplicates
- Records notification type (web/mobile)
- Tracks when notifications were opened

**Schema Updates**: `shared/schema.ts` - TypeScript types updated for new fields

### ✅ 2. External Meeting Detection

**Files**:
- `supabase/functions/_shared/meeting-classifier.ts` - Shared logic for detecting external meetings
- `supabase/functions/sync-google-calendar/index.ts` - Enhanced to mark external meetings

**Logic**:
- Compares attendee email domains with user's domain
- Different domain = external meeting
- Automatically flags meetings during calendar sync

### ✅ 3. Push Notification Infrastructure

**Files**:
- `supabase/functions/_shared/push-notifications.ts` - Firebase Cloud Messaging service
- `supabase/functions/register-device/index.ts` - Device registration endpoint

**Features**:
- Sends web push notifications (FCM)
- Sends mobile push notifications (iOS/Android)
- Platform-specific configuration (Android/iOS/Web)
- Token validation and management

**Setup Required**:
- Firebase project configuration
- Environment variables:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

### ✅ 4. Notification Scheduler

**Files**:
- `supabase/functions/schedule-meeting-notifications/index.ts` - Core scheduler logic
- `.github/workflows/notification-scheduler-cron.yml` - GitHub Actions cron job (every 5 minutes)

**Functionality**:
- Queries users with notifications enabled
- Finds meetings in notification window
- Filters by external/all meetings based on preference
- Checks for duplicate notifications
- Sends web and mobile notifications
- Logs notification delivery

### ✅ 5. Automatic Calendar Sync

**Files**:
- `supabase/functions/auto-sync-calendars/index.ts` - Background sync service
- `.github/workflows/calendar-sync-cron.yml` - GitHub Actions cron job (every 30 minutes)

**Functionality**:
- Syncs calendars for all connected users
- Handles token refresh automatically
- Processes users sequentially with rate limiting
- Logs sync results per user

### ✅ 6. Frontend - "Coming Up" UI

**Files**:
- `client/src/pages/UpcomingMeetings.tsx` - Main meetings page
- `client/src/pages/MeetingPrep.tsx` - Meeting preparation page
- `client/src/components/MeetingCard.tsx` - Meeting card component
- `client/src/components/AppSidebar.tsx` - Added "Meetings" link
- `client/src/App.tsx` - Added routes for `/meetings` and `/meetings/:id`

**Features**:
- Granola-inspired design with clean cards
- Meetings grouped by time: "Coming up", "Tomorrow", "This Week", "Later"
- Each card shows: title, time, attendees, location, video call link
- "External" badge for external meetings
- Tap to expand and see meeting prep interface
- Pre-meeting notes section
- Prominent "Start now" button to begin recording

### ✅ 7. Notification Preferences UI

**Files**:
- `client/src/pages/Settings.tsx` - Added notification preferences section
- `client/src/hooks/useNotificationPreferences.ts` - Preferences management hook

**Features**:
- Enable/disable meeting notifications toggle
- Select notification timing (5, 10, 15, 30, 60 minutes)
- Choose "all meetings" vs "external only" filter
- Browser notification permission status
- One-click permission request
- Real-time preference saving

### ✅ 8. Device Registration

**File**: `supabase/functions/register-device/index.ts`

**Endpoint**: `POST /functions/v1/register-device`

**Usage**:
```typescript
{
  "fcmToken": "your-fcm-token",
  "platform": "web" | "ios" | "android"
}
```

Stores device tokens for push notification delivery.

## Architecture Flow

```
User → Google Calendar → Calendar Sync (every 30 min)
  ↓
Calendar Events (with external flag)
  ↓
Notification Scheduler (every 5 min)
  ↓
Check: Time window + User preferences + External filter
  ↓
Send: Web Push (FCM) + Mobile Push (FCM/APNS)
  ↓
User receives notification → Click → Meeting Prep Page → Start Recording
```

## Next Steps - Setup Required

### 1. Run Database Migration

```bash
cd supabase
supabase db push
```

Or apply migration manually:
```bash
psql $DATABASE_URL -f supabase/migrations/20250123000010_add_notification_preferences.sql
```

### 2. Set Up Firebase

**Option A: Firebase CLI**
```bash
npm install -g firebase-tools
firebase login
firebase init
```

**Option B: Firebase Console**
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable Cloud Messaging
4. Download service account credentials

**Set Environment Variables** (Supabase Dashboard → Settings → Edge Functions):
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Set Up Firebase MCP (Optional)

Follow Firebase MCP setup guide to manage Firebase through Cursor's MCP interface.

### 4. Configure GitHub Secrets

For cron jobs to work, add to GitHub repository secrets:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)

### 5. Deploy Edge Functions

```bash
supabase functions deploy schedule-meeting-notifications
supabase functions deploy auto-sync-calendars
supabase functions deploy register-device
supabase functions deploy sync-google-calendar # redeploy with external meeting detection
```

### 6. Enable GitHub Actions

In repository settings:
- Go to Actions → General
- Enable "Allow all actions and reusable workflows"
- Workflows will start running on schedule

## User Flow

### First-Time Setup
1. User connects Google Calendar in Settings
2. User enables meeting notifications
3. User selects notification timing (default: 15 minutes)
4. User grants browser notification permission
5. Calendar syncs automatically every 30 minutes

### Daily Usage
1. Scheduler runs every 5 minutes
2. User receives notification 15 minutes (or configured time) before external meeting
3. User clicks notification → Opens meeting prep page
4. User reviews meeting details and attendees
5. User writes pre-meeting notes
6. User clicks "Start now" → Begins recording conversation
7. Conversation is automatically linked to calendar event

### Meetings Page
- User can browse `/meetings` anytime to see upcoming meetings
- Meetings grouped by time for easy scanning
- Click any meeting to view details and prepare

## Testing

See `NOTIFICATION_SYSTEM_TESTING_GUIDE.md` for comprehensive testing instructions.

**Quick Test**:
1. Create a Google Calendar event 15 minutes in the future with external attendees
2. Manually trigger scheduler:
   ```bash
   curl -X POST "${SUPABASE_URL}/functions/v1/schedule-meeting-notifications" \
     -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
   ```
3. Check browser for notification
4. Click notification → Should open meeting prep page

## Monitoring

### Edge Function Logs
```bash
supabase functions logs schedule-meeting-notifications
supabase functions logs auto-sync-calendars
```

### Database Queries
```sql
-- Check recent notifications
SELECT * FROM notification_log 
ORDER BY sent_at DESC 
LIMIT 20;

-- Check external meetings
SELECT id, title, start_time, is_external_meeting 
FROM calendar_events 
WHERE is_external_meeting = true 
ORDER BY start_time;

-- Check user preferences
SELECT profile_id, meeting_notification_enabled, meeting_notification_minutes, notify_all_meetings 
FROM user_preferences;
```

## Known Limitations

1. **Cron Job Delays**: GitHub Actions cron jobs may have 5-10 minute delays during high load
2. **Browser Notifications**: Only work when browser tab is open (unless service worker is implemented)
3. **Time Zone**: Currently uses server/user's local timezone (ensure consistency)
4. **Token Refresh**: Google OAuth tokens expire; refresh logic handles this automatically

## Future Enhancements

- [ ] Service Worker for offline notification support
- [ ] SMS notifications via Twilio
- [ ] Slack integration for team notifications
- [ ] Meeting notes auto-save to database
- [ ] Calendar event creation from within app
- [ ] AI-suggested meeting prep (relevant contacts, context)
- [ ] Post-meeting follow-up reminders

## Support

For issues or questions:
1. Check logs in Supabase Dashboard
2. Review `NOTIFICATION_SYSTEM_TESTING_GUIDE.md`
3. Verify environment variables are set correctly
4. Test with manual curl commands first before relying on cron jobs

## Files Changed/Created

### Database
- ✅ `supabase/migrations/20250123000010_add_notification_preferences.sql`
- ✅ `shared/schema.ts`

### Backend (Edge Functions)
- ✅ `supabase/functions/_shared/meeting-classifier.ts`
- ✅ `supabase/functions/_shared/push-notifications.ts`
- ✅ `supabase/functions/sync-google-calendar/index.ts` (modified)
- ✅ `supabase/functions/schedule-meeting-notifications/index.ts`
- ✅ `supabase/functions/auto-sync-calendars/index.ts`
- ✅ `supabase/functions/register-device/index.ts`

### Frontend
- ✅ `client/src/pages/UpcomingMeetings.tsx`
- ✅ `client/src/pages/MeetingPrep.tsx`
- ✅ `client/src/pages/Settings.tsx` (modified)
- ✅ `client/src/components/MeetingCard.tsx`
- ✅ `client/src/components/AppSidebar.tsx` (modified)
- ✅ `client/src/hooks/useNotificationPreferences.ts`
- ✅ `client/src/App.tsx` (modified)

### CI/CD
- ✅ `.github/workflows/notification-scheduler-cron.yml`
- ✅ `.github/workflows/calendar-sync-cron.yml`

### Documentation
- ✅ `NOTIFICATION_SYSTEM_TESTING_GUIDE.md`
- ✅ `NOTIFICATION_SYSTEM_IMPLEMENTATION_SUMMARY.md`

---

**Implementation Complete** ✅

All planned features have been implemented. Follow the setup steps above to deploy and test the notification system.
