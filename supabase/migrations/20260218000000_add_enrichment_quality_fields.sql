-- Add enrichment quality tracking fields to contacts table
-- These support per-field confidence, thesis provenance, and user-verified field protection

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS enrichment_confidence JSONB;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS thesis_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS verified_fields TEXT[] DEFAULT ARRAY[]::TEXT[];
