-- ============================================================================
-- MATCHING UPGRADE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Phase 1B: Add rich context columns to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS target_person JSONB,
ADD COLUMN IF NOT EXISTS matching_intent JSONB,
ADD COLUMN IF NOT EXISTS goals_and_needs JSONB,
ADD COLUMN IF NOT EXISTS domains_and_topics JSONB;

COMMENT ON COLUMN conversations.target_person IS 'Rich context about the target person being discussed';
COMMENT ON COLUMN conversations.matching_intent IS 'What kind of contacts to find, constraints, preferences';
COMMENT ON COLUMN conversations.goals_and_needs IS 'Fundraising, hiring, customer/partner needs';
COMMENT ON COLUMN conversations.domains_and_topics IS 'Industries, keywords, geography, stage info';

-- Phase 2A: Enable pgvector extension for semantic similarity
CREATE EXTENSION IF NOT EXISTS vector;

-- Fix embedding columns if they exist with wrong type, or create them
DO $$ 
BEGIN
    -- Fix bio_embedding if it exists as wrong type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'bio_embedding'
        AND data_type != 'USER-DEFINED'
    ) THEN
        ALTER TABLE contacts DROP COLUMN bio_embedding;
        ALTER TABLE contacts ADD COLUMN bio_embedding vector(1536);
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'bio_embedding'
    ) THEN
        ALTER TABLE contacts ADD COLUMN bio_embedding vector(1536);
    END IF;
    
    -- Fix thesis_embedding if it exists as wrong type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'thesis_embedding'
        AND data_type != 'USER-DEFINED'
    ) THEN
        ALTER TABLE contacts DROP COLUMN thesis_embedding;
        ALTER TABLE contacts ADD COLUMN thesis_embedding vector(1536);
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'thesis_embedding'
    ) THEN
        ALTER TABLE contacts ADD COLUMN thesis_embedding vector(1536);
    END IF;
END $$;

COMMENT ON COLUMN contacts.bio_embedding IS 'OpenAI text-embedding-3-small vector of bio/about';
COMMENT ON COLUMN contacts.thesis_embedding IS 'OpenAI text-embedding-3-small vector of investor thesis';

-- Drop old indexes if they exist (in case they're broken)
DROP INDEX IF EXISTS contacts_bio_embedding_idx;
DROP INDEX IF EXISTS contacts_thesis_embedding_idx;

-- Note: ivfflat indexes will be created in a separate migration (20250115000001_add_embedding_indexes.sql)
-- This avoids memory issues during initial migration
-- Vector columns are ready for use even without indexes (indexes just improve query performance)

-- Phase 2B: Create contact_aliases table for fuzzy name matching
CREATE TABLE IF NOT EXISTS contact_aliases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contact_id VARCHAR NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  alias_type TEXT NOT NULL, -- 'nickname', 'former_name', 'alternate_spelling'
  alias_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on contact_aliases
ALTER TABLE contact_aliases ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can see aliases for contacts they own
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contact_aliases' 
        AND policyname = 'Users can view aliases for their contacts'
    ) THEN
        CREATE POLICY "Users can view aliases for their contacts" ON contact_aliases
          FOR SELECT USING (
            contact_id IN (SELECT id FROM contacts WHERE owned_by_profile = auth.uid())
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contact_aliases' 
        AND policyname = 'Users can insert aliases for their contacts'
    ) THEN
        CREATE POLICY "Users can insert aliases for their contacts" ON contact_aliases
          FOR INSERT WITH CHECK (
            contact_id IN (SELECT id FROM contacts WHERE owned_by_profile = auth.uid())
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contact_aliases' 
        AND policyname = 'Users can delete aliases for their contacts'
    ) THEN
        CREATE POLICY "Users can delete aliases for their contacts" ON contact_aliases
          FOR DELETE USING (
            contact_id IN (SELECT id FROM contacts WHERE owned_by_profile = auth.uid())
          );
    END IF;
END $$;

-- Create index for fast alias lookups
CREATE INDEX IF NOT EXISTS contact_aliases_contact_id_idx ON contact_aliases(contact_id);
CREATE INDEX IF NOT EXISTS contact_aliases_value_idx ON contact_aliases(alias_value);

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy name matching
CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx ON contacts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_company_trgm_idx ON contacts USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contact_aliases_value_trgm_idx ON contact_aliases USING gin (alias_value gin_trgm_ops);

-- Phase 2C: Create match_feedback table for learning
CREATE TABLE IF NOT EXISTS match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES match_suggestions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL, -- 'thumbs_up', 'thumbs_down', 'saved', 'intro_sent'
  feedback_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on match_feedback
ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see and create their own feedback
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'match_feedback' 
        AND policyname = 'Users can view their own feedback'
    ) THEN
        CREATE POLICY "Users can view their own feedback" ON match_feedback
          FOR SELECT USING (profile_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'match_feedback' 
        AND policyname = 'Users can insert their own feedback'
    ) THEN
        CREATE POLICY "Users can insert their own feedback" ON match_feedback
          FOR INSERT WITH CHECK (profile_id = auth.uid());
    END IF;
END $$;

-- Create indexes for feedback analysis
CREATE INDEX IF NOT EXISTS match_feedback_suggestion_id_idx ON match_feedback(suggestion_id);
CREATE INDEX IF NOT EXISTS match_feedback_profile_id_idx ON match_feedback(profile_id);
CREATE INDEX IF NOT EXISTS match_feedback_feedback_idx ON match_feedback(feedback);

-- Add relationship_strength column if not exists (for scoring)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS relationship_strength INTEGER DEFAULT 50;

COMMENT ON COLUMN contacts.relationship_strength IS 'Relationship strength 0-100 for scoring matches';

-- Add ai_explanation column to match_suggestions for AI-generated intro explanations
ALTER TABLE match_suggestions
ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

COMMENT ON COLUMN match_suggestions.ai_explanation IS 'AI-generated explanation of why this introduction is valuable';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to compute cosine similarity between two vectors
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float8
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 1 - (a <=> b);
$$;

-- Function to find similar contacts by embedding
CREATE OR REPLACE FUNCTION find_similar_contacts(
  query_embedding vector(1536),
  match_threshold float8 DEFAULT 0.5,
  match_count int DEFAULT 10,
  owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  contact_id varchar,
  contact_name text,
  similarity float8
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    c.id as contact_id,
    c.name as contact_name,
    1 - (c.bio_embedding <=> query_embedding) as similarity
  FROM contacts c
  WHERE 
    c.bio_embedding IS NOT NULL
    AND (owner_id IS NULL OR c.owned_by_profile = owner_id)
    AND 1 - (c.bio_embedding <=> query_embedding) > match_threshold
  ORDER BY c.bio_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function for fuzzy name search using pg_trgm
CREATE OR REPLACE FUNCTION fuzzy_name_search(
  search_query text,
  similarity_threshold float8 DEFAULT 0.3,
  owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  contact_id varchar,
  contact_name text,
  similarity float8
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    c.id as contact_id,
    c.name as contact_name,
    similarity(c.name, search_query) as similarity
  FROM contacts c
  WHERE 
    (owner_id IS NULL OR c.owned_by_profile = owner_id)
    AND similarity(c.name, search_query) > similarity_threshold
  UNION
  SELECT 
    c.id as contact_id,
    c.name as contact_name,
    similarity(ca.alias_value, search_query) as similarity
  FROM contacts c
  JOIN contact_aliases ca ON c.id = ca.contact_id
  WHERE 
    (owner_id IS NULL OR c.owned_by_profile = owner_id)
    AND similarity(ca.alias_value, search_query) > similarity_threshold
  ORDER BY similarity DESC;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON contact_aliases TO authenticated;
GRANT SELECT, INSERT ON match_feedback TO authenticated;
