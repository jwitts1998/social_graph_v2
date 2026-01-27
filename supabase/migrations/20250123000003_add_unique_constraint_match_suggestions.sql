-- Add unique constraint to match_suggestions for upsert functionality
-- This ensures each contact can only have one match per conversation

-- Drop existing constraint if it exists (idempotent)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_suggestions_conversation_contact_unique'
    ) THEN
        ALTER TABLE match_suggestions 
        DROP CONSTRAINT match_suggestions_conversation_contact_unique;
    END IF;
END $$;

-- Remove duplicate matches, keeping only the most recent one for each (conversation_id, contact_id) pair
DELETE FROM match_suggestions
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY conversation_id, contact_id 
                   ORDER BY created_at DESC
               ) as row_num
        FROM match_suggestions
    ) t
    WHERE row_num > 1
);

-- Add unique constraint on (conversation_id, contact_id)
ALTER TABLE match_suggestions 
ADD CONSTRAINT match_suggestions_conversation_contact_unique 
UNIQUE (conversation_id, contact_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT match_suggestions_conversation_contact_unique 
ON match_suggestions 
IS 'Ensures each contact can only have one match suggestion per conversation. Used for upsert operations when regenerating matches.';
