-- Fix RLS for conversations and conversation_segments tables
-- These were missing from the original disable_rls_for_mvp migration
-- This fixes the entity extraction pipeline

-- Disable RLS on conversations table
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on conversation_segments table  
ALTER TABLE conversation_segments DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE conversations IS 'RLS disabled for MVP - re-enable before production';
COMMENT ON TABLE conversation_segments IS 'RLS disabled for MVP - re-enable before production';
