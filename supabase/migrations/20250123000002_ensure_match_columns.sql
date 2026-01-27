-- Ensure all required match_suggestions columns exist
-- This migration is idempotent and safe to run multiple times

ALTER TABLE match_suggestions 
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;

ALTER TABLE match_suggestions 
ADD COLUMN IF NOT EXISTS match_version TEXT DEFAULT 'v1.0';

ALTER TABLE match_suggestions 
ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- Add indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'match_suggestions' 
        AND indexname = 'idx_match_suggestions_match_version'
    ) THEN
        CREATE INDEX idx_match_suggestions_match_version 
        ON match_suggestions(match_version);
    END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN match_suggestions.score_breakdown IS 'Detailed breakdown of scoring components: {semantic, tagOverlap, roleMatch, geoMatch, relationship, nameMatch}';
COMMENT ON COLUMN match_suggestions.match_version IS 'Algorithm version that generated this match (e.g., v1.0, v1.1-transparency)';
COMMENT ON COLUMN match_suggestions.ai_explanation IS 'AI-generated explanation of why this introduction is valuable';
