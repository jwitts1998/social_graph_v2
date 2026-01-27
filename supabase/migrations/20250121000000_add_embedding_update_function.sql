-- Create a PostgreSQL function to update conversation embeddings
-- This bypasses PostgREST schema cache issues

CREATE OR REPLACE FUNCTION update_conversation_embedding(
  p_conversation_id uuid,
  p_embedding vector(1536)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET context_embedding = p_embedding
  WHERE id = p_conversation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_conversation_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_embedding TO service_role;

COMMENT ON FUNCTION update_conversation_embedding IS 'Updates the context_embedding for a conversation, bypassing schema cache';
