-- Add unique constraint on (external_event_id, owned_by_profile) for upsert functionality
-- This allows the same external event to exist for different users, but prevents duplicates for the same user

-- First, drop the constraint/index if it exists (in case of re-running)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_events_external_event_user_unique'
    ) THEN
        ALTER TABLE calendar_events 
        DROP CONSTRAINT calendar_events_external_event_user_unique;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'calendar_events_external_event_user_unique'
    ) THEN
        DROP INDEX calendar_events_external_event_user_unique;
    END IF;
END $$;

-- Add unique index on (external_event_id, owned_by_profile) where external_event_id is not null
-- Using a partial unique index to allow NULL values in external_event_id (for manually created events)
CREATE UNIQUE INDEX calendar_events_external_event_user_unique 
ON calendar_events(external_event_id, owned_by_profile) 
WHERE external_event_id IS NOT NULL;

COMMENT ON INDEX calendar_events_external_event_user_unique IS 
'Ensures each external calendar event (from Google Calendar) can only exist once per user, enabling upsert operations';
