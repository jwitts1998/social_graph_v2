-- Add the missing confidence_scores column to match_suggestions
-- This column was defined in the Drizzle schema but never applied to the database.
-- The generate-matches Edge Function writes confidence_scores on upsert, and without
-- this column every upsert silently fails, causing 0 matches to be returned.

ALTER TABLE match_suggestions
ADD COLUMN IF NOT EXISTS confidence_scores JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN match_suggestions.confidence_scores IS 'Confidence scores (0-1) for each scoring component: {semantic, tagOverlap, roleMatch, geoMatch, relationship, overall}';
