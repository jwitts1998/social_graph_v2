-- Disable RLS for MVP development
-- WARNING: Re-enable RLS before production launch!

-- Disable RLS on contacts table
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- Disable RLS on conversations table (needed for entity extraction)
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on conversation_segments table (needed for entity extraction)
ALTER TABLE conversation_segments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on conversation_entities table  
ALTER TABLE conversation_entities DISABLE ROW LEVEL SECURITY;

-- Disable RLS on theses table
ALTER TABLE theses DISABLE ROW LEVEL SECURITY;

-- Disable RLS on match_suggestions table
ALTER TABLE match_suggestions DISABLE ROW LEVEL SECURITY;

-- Add comment to remember to re-enable
COMMENT ON TABLE contacts IS 'RLS disabled for MVP - re-enable before production';
COMMENT ON TABLE conversations IS 'RLS disabled for MVP - re-enable before production';
COMMENT ON TABLE conversation_segments IS 'RLS disabled for MVP - re-enable before production';
COMMENT ON TABLE conversation_entities IS 'RLS disabled for MVP - re-enable before production';
COMMENT ON TABLE theses IS 'RLS disabled for MVP - re-enable before production';
COMMENT ON TABLE match_suggestions IS 'RLS disabled for MVP - re-enable before production';
