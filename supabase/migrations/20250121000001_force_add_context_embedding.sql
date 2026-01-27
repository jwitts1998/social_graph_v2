-- Force add context_embedding column if it doesn't exist
-- This ensures the column is present regardless of previous migration state

DO $$ 
BEGIN
  -- Enable pgvector extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS vector;
  
  -- Add context_embedding column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name = 'context_embedding'
  ) THEN
    ALTER TABLE conversations 
    ADD COLUMN context_embedding vector(1536);
    
    RAISE NOTICE 'Added context_embedding column to conversations table';
  ELSE
    RAISE NOTICE 'context_embedding column already exists';
  END IF;
END $$;

-- Verify the column was added
DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name = 'context_embedding'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE 'VERIFIED: context_embedding column exists';
  ELSE
    RAISE EXCEPTION 'FAILED: context_embedding column was not created';
  END IF;
END $$;

COMMENT ON COLUMN conversations.context_embedding IS 'Embedding of conversation context (sectors, stages, goals, needs) for semantic matching';
