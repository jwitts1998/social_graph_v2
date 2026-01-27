-- Add notification preferences to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS meeting_notification_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS meeting_notification_minutes INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS notify_all_meetings BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS apns_token TEXT;

-- Create index for finding users with FCM tokens
CREATE INDEX IF NOT EXISTS idx_user_prefs_fcm_token 
ON user_preferences(profile_id) 
WHERE fcm_token IS NOT NULL;

-- Add external meeting flag to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS is_external_meeting BOOLEAN NOT NULL DEFAULT false;

-- Create index for querying external meetings
CREATE INDEX IF NOT EXISTS idx_calendar_events_external 
ON calendar_events(owned_by_profile, is_external_meeting, start_time) 
WHERE is_external_meeting = true;

-- Create notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id VARCHAR NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'web' or 'mobile'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for notification log
CREATE INDEX IF NOT EXISTS idx_notification_log_profile_event 
ON notification_log(profile_id, event_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at 
ON notification_log(sent_at);

-- Add comment for clarity
COMMENT ON TABLE notification_log IS 'Tracks sent notifications to prevent duplicates and measure engagement';
COMMENT ON COLUMN notification_log.notification_type IS 'Type of notification: web (browser) or mobile (FCM/APNS)';
