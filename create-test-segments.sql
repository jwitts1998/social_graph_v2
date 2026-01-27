-- Create conversation segments for test conversations
-- This splits the transcript field into individual segments

-- First, check if segments already exist
DO $$
DECLARE
  segment_count INTEGER;
  conversation_transcript TEXT;
  conversation_owner UUID;
  conversation_recorded_at TIMESTAMPTZ;
  lines TEXT[];
  line_text TEXT;
  line_num INTEGER := 0;
  line_timestamp BIGINT;
BEGIN
  -- Get segment count
  SELECT COUNT(*) INTO segment_count
  FROM conversation_segments
  WHERE conversation_id = '3600d6e1-2134-4708-8fb9-c70c11940f70';

  IF segment_count > 0 THEN
    RAISE NOTICE 'Segments already exist (count: %)', segment_count;
    RETURN;
  END IF;

  -- Get conversation details
  SELECT transcript, owned_by_profile, recorded_at
  INTO conversation_transcript, conversation_owner, conversation_recorded_at
  FROM conversations
  WHERE id = '3600d6e1-2134-4708-8fb9-c70c11940f70';

  IF conversation_transcript IS NULL OR conversation_transcript = '' THEN
    RAISE EXCEPTION 'No transcript found for conversation';
  END IF;

  RAISE NOTICE 'Found transcript with % characters', LENGTH(conversation_transcript);

  -- Split transcript by newlines and create segments
  lines := string_to_array(conversation_transcript, E'\n');
  
  FOREACH line_text IN ARRAY lines
  LOOP
    -- Skip empty lines
    IF TRIM(line_text) = '' THEN
      CONTINUE;
    END IF;

    -- Calculate timestamp (1 second apart for simplicity)
    line_timestamp := EXTRACT(EPOCH FROM conversation_recorded_at)::BIGINT * 1000 + (line_num * 1000);

    -- Insert segment
    INSERT INTO conversation_segments (
      conversation_id,
      speaker,
      text,
      timestamp_ms,
      owned_by_profile
    ) VALUES (
      '3600d6e1-2134-4708-8fb9-c70c11940f70',
      CASE WHEN line_num % 2 = 0 THEN 'Speaker 1' ELSE 'Speaker 2' END,
      TRIM(line_text),
      line_timestamp,
      conversation_owner
    );

    line_num := line_num + 1;
  END LOOP;

  RAISE NOTICE 'Created % segments from transcript', line_num;
END $$;

-- Verify segments were created
SELECT 
  COUNT(*) as segment_count,
  MIN(timestamp_ms) as first_timestamp,
  MAX(timestamp_ms) as last_timestamp
FROM conversation_segments
WHERE conversation_id = '3600d6e1-2134-4708-8fb9-c70c11940f70';
