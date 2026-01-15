-- Enable Realtime for conversation_segments table
ALTER TABLE conversation_segments REPLICA IDENTITY FULL;

-- Add table to realtime publication (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversation_segments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversation_segments;
    END IF;
END $$;
