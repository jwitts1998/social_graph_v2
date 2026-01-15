-- Add transparency fields to match_suggestions table
-- This migration adds detailed scoring information for better explainability

-- Add score breakdown field (stores individual component scores)
ALTER TABLE match_suggestions 
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;

-- Add confidence scores field (stores confidence for each scoring factor)
ALTER TABLE match_suggestions 
ADD COLUMN IF NOT EXISTS confidence_scores JSONB DEFAULT '{}'::jsonb;

-- Add match version field (tracks which algorithm version generated the match)
ALTER TABLE match_suggestions 
ADD COLUMN IF NOT EXISTS match_version TEXT DEFAULT 'v1.0';

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_match_suggestions_match_version 
ON match_suggestions(match_version);

-- Comment on new columns
COMMENT ON COLUMN match_suggestions.score_breakdown IS 'Detailed breakdown of scoring components: {semantic, tagOverlap, roleMatch, geoMatch, relationship, nameMatch}';
COMMENT ON COLUMN match_suggestions.confidence_scores IS 'Confidence scores (0-1) for each component: {semantic, tagOverlap, roleMatch, geoMatch, relationship, overall}';
COMMENT ON COLUMN match_suggestions.match_version IS 'Algorithm version that generated this match (e.g., v1.0, v2.0-embeddings)';
