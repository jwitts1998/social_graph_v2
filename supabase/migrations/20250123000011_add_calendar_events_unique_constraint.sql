-- Add unique constraint on (external_event_id, owned_by_profile) for upsert functionality
-- This allows the same external event to exist for different users, but prevents duplicates for the same user

-- First, clean up any existing constraints/indexes
DO $$ 
BEGIN
    -- Drop constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_events_external_event_user_unique'
    ) THEN
        ALTER TABLE calendar_events 
        DROP CONSTRAINT calendar_events_external_event_user_unique;
    END IF;
    
    -- Drop index if exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'calendar_events_external_event_user_unique'
    ) THEN
        DROP INDEX calendar_events_external_event_user_unique;
    END IF;
END $$;

-- Add unique constraint on (external_event_id, owned_by_profile)
-- This will work for Google Calendar events (which always have external_event_id)
-- For manually created events without external_event_id, they won't conflict
ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_external_event_user_unique 
UNIQUE (external_event_id, owned_by_profile);

COMMENT ON CONSTRAINT calendar_events_external_event_user_unique ON calendar_events IS 
'Ensures each external calendar event (from Google Calendar) can only exist once per user, enabling upsert operations';
