-- Track user corrections to enriched data for feedback loop analysis
CREATE TABLE IF NOT EXISTS enrichment_corrections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id VARCHAR NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  enrichment_source TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_corrections_contact ON enrichment_corrections(contact_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_corrections_field ON enrichment_corrections(field_name);
