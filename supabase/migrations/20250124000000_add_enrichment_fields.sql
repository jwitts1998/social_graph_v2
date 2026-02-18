-- Add enrichment fields to contacts table for rich profile data
-- This migration adds structured fields for education, career history, personal interests, and enrichment metadata

-- Personal context fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS career_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personal_interests TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS portfolio_companies TEXT[] DEFAULT '{}';

-- Enrichment metadata tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS data_completeness_score INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN contacts.education IS 'JSONB array of education records: [{school: string, degree: string, field: string, year: number}]';
COMMENT ON COLUMN contacts.career_history IS 'JSONB array of work experience: [{company: string, role: string, years: string, description: string}]';
COMMENT ON COLUMN contacts.personal_interests IS 'Array of personal interests, hobbies, causes (e.g., ["rock climbing", "jazz", "Boston Celtics"])';
COMMENT ON COLUMN contacts.expertise_areas IS 'Array of specific domain expertise beyond broad sectors (e.g., ["marketplaces", "PLG", "growth"])';
COMMENT ON COLUMN contacts.portfolio_companies IS 'Array of portfolio company names for investors (e.g., ["Stripe", "Coinbase"])';
COMMENT ON COLUMN contacts.last_enriched_at IS 'Timestamp of last enrichment operation';
COMMENT ON COLUMN contacts.enrichment_source IS 'Source of enrichment data: "hunter", "proxycurl", "serper", "manual", or combination';
COMMENT ON COLUMN contacts.data_completeness_score IS 'Calculated score 0-100 representing profile completeness based on filled fields';

-- Create index on last_enriched_at for finding stale contacts
CREATE INDEX IF NOT EXISTS idx_contacts_last_enriched_at ON contacts(last_enriched_at);

-- Create index on data_completeness_score for quality tracking
CREATE INDEX IF NOT EXISTS idx_contacts_completeness_score ON contacts(data_completeness_score);
