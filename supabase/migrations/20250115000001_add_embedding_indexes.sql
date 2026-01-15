-- Add pgvector extension and indexes for efficient similarity search
-- This enables fast cosine similarity searches on embeddings

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add conversation context embedding column
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS context_embedding vector(1536);

-- NOTE: Index creation is commented out due to memory constraints during migration
-- The vector columns work without indexes (indexes only improve query performance)
-- 
-- To create indexes manually via Supabase SQL Editor (after migration completes):
-- 
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_bio_embedding_cosine 
-- ON contacts USING ivfflat (bio_embedding vector_cosine_ops) WITH (lists = 10);
-- 
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_thesis_embedding_cosine
-- ON contacts USING ivfflat (thesis_embedding vector_cosine_ops) WITH (lists = 10);
-- 
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_context_embedding_cosine
-- ON conversations USING ivfflat (context_embedding vector_cosine_ops) WITH (lists = 10);
--
-- Using CONCURRENTLY allows index creation without blocking table access

-- Add comments
COMMENT ON COLUMN conversations.context_embedding IS 'Embedding of conversation context (sectors, stages, goals, needs) for semantic matching';

COMMENT ON INDEX idx_contacts_bio_embedding_cosine IS 'Cosine similarity index for contact bio embeddings';
COMMENT ON INDEX idx_contacts_thesis_embedding_cosine IS 'Cosine similarity index for contact thesis embeddings';
COMMENT ON INDEX idx_conversations_context_embedding_cosine IS 'Cosine similarity index for conversation context embeddings';
