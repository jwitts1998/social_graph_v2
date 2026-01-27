-- Populate Test Data for Matching System
-- This migration adds realistic test data to validate the matching pipeline
-- User Profile ID: 6aa9b704-375d-420b-9750-297c9dedfe74
-- Conversation ID: 0ff8bfc6-178a-4cb9-a1e9-9245933293e4

-- =============================================================================
-- PHASE 1: UPDATE EXISTING INVESTOR THESES
-- =============================================================================

-- 1. Keith Bender (Pear VC) - Early-stage FinTech focus
UPDATE theses SET
  sectors = ARRAY['FinTech', 'B2B SaaS', 'Enterprise Software'],
  stages = ARRAY['Seed', 'Series A'],
  geos = ARRAY['San Francisco', 'Palo Alto', 'Bay Area'],
  notes = 'Early-stage enterprise software and FinTech. Strong interest in payment infrastructure and lending platforms.'
WHERE contact_id = '1e1bddfe-28d0-4f1d-b8f8-25925a9dfe56';

UPDATE contacts SET
  check_size_min = 500000,
  check_size_max = 3000000
WHERE id = '1e1bddfe-28d0-4f1d-b8f8-25925a9dfe56';

-- 2. Patrick Klas (MGV.VC) - Growth-stage FinTech
UPDATE theses SET
  sectors = ARRAY['FinTech', 'InsurTech', 'Healthcare'],
  stages = ARRAY['Series A', 'Series B'],
  geos = ARRAY['United States', 'New York'],
  notes = 'Growth-stage FinTech focused on banking infrastructure and insurance technology.'
WHERE contact_id = '49b34e2c-6a9e-490e-a9f9-c44bf7dae5b1';

UPDATE contacts SET
  check_size_min = 2000000,
  check_size_max = 10000000
WHERE id = '49b34e2c-6a9e-490e-a9f9-c44bf7dae5b1';

-- 3. Pedro Sorrentino (Atman Capital) - Emerging markets FinTech
UPDATE theses SET
  sectors = ARRAY['FinTech', 'AI/ML', 'Blockchain'],
  stages = ARRAY['Pre-Seed', 'Seed', 'Series A'],
  geos = ARRAY['Global', 'Latin America', 'United States'],
  notes = 'Emerging markets focus with strong interest in payment processing and neo-banking platforms.'
WHERE contact_id = '4b5cdbe5-c6c7-4b97-a691-b50a7b4ca589';

UPDATE contacts SET
  check_size_min = 250000,
  check_size_max = 5000000
WHERE id = '4b5cdbe5-c6c7-4b97-a691-b50a7b4ca589';

-- 4. Han Shen (iFly.vc) - Asia-focused consumer FinTech
UPDATE theses SET
  sectors = ARRAY['FinTech', 'Marketplace', 'Consumer'],
  stages = ARRAY['Seed', 'Series A', 'Series B'],
  geos = ARRAY['Asia', 'China', 'Southeast Asia'],
  notes = 'Asia-focused investor with expertise in consumer FinTech and digital wallets.'
WHERE contact_id = '41c12c3e-3b54-443d-b7b8-42c340e78b35';

UPDATE contacts SET
  check_size_min = 1000000,
  check_size_max = 8000000
WHERE id = '41c12c3e-3b54-443d-b7b8-42c340e78b35';

-- 5. Ethan Austin (Outside VC) - Later-stage sustainable FinTech
UPDATE theses SET
  sectors = ARRAY['FinTech', 'Climate Tech', 'Real Estate Tech'],
  stages = ARRAY['Series A', 'Series B', 'Series C'],
  geos = ARRAY['United States', 'Europe'],
  notes = 'Later-stage investor focused on sustainable FinTech and proptech companies.'
WHERE contact_id = '7a460247-3e30-4141-88ee-fa1fb794457a';

UPDATE contacts SET
  check_size_min = 3000000,
  check_size_max = 15000000
WHERE id = '7a460247-3e30-4141-88ee-fa1fb794457a';

-- =============================================================================
-- PHASE 2: CREATE NEW TEST CONTACTS (INVESTORS)
-- =============================================================================

-- 1. Sarah Chen - Fintech Ventures (Perfect Series A FinTech match)
INSERT INTO contacts (
  owned_by_profile, name, company, title, email, 
  contact_type, is_investor, category, bio,
  relationship_strength, check_size_min, check_size_max,
  created_at, updated_at
) VALUES (
  '6aa9b704-375d-420b-9750-297c9dedfe74',
  'Sarah Chen',
  'Fintech Ventures',
  'Partner',
  'sarah@fintechventures.com',
  ARRAY['GP']::contact_type_enum[],
  true,
  'Venture Fund',
  '15 years in FinTech investing. Led investments in Stripe, Plaid, and Chime. Focused on payment infrastructure and embedded finance.',
  75,
  5000000,
  20000000,
  NOW(),
  NOW()
);

-- Insert thesis for Sarah Chen
INSERT INTO theses (
  contact_id, sectors, stages, geos, notes,
  created_at, updated_at
) 
SELECT 
  id,
  ARRAY['FinTech', 'Payment Processing', 'Embedded Finance'],
  ARRAY['Series A', 'Series B'],
  ARRAY['San Francisco', 'United States'],
  'Payment infrastructure and embedded finance specialist. Led rounds in Stripe, Plaid, Chime.',
  NOW(),
  NOW()
FROM contacts 
WHERE name = 'Sarah Chen' AND company = 'Fintech Ventures'
AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74';

-- 2. Marcus Rodriguez - Seedstage Capital (Seed/Early Series A)
INSERT INTO contacts (
  owned_by_profile, name, company, title, email, 
  contact_type, is_investor, category, bio,
  relationship_strength, check_size_min, check_size_max,
  created_at, updated_at
) VALUES (
  '6aa9b704-375d-420b-9750-297c9dedfe74',
  'Marcus Rodriguez',
  'Seedstage Capital',
  'Managing Director',
  'marcus@seedstagecap.com',
  ARRAY['GP']::contact_type_enum[],
  true,
  'Venture Fund',
  'Former engineering lead at Square. Now investing in early-stage FinTech infrastructure and developer tools.',
  60,
  500000,
  3000000,
  NOW(),
  NOW()
);

-- Insert thesis for Marcus Rodriguez
INSERT INTO theses (
  contact_id, sectors, stages, geos, notes,
  created_at, updated_at
) 
SELECT 
  id,
  ARRAY['FinTech', 'Developer Tools', 'API Infrastructure'],
  ARRAY['Pre-Seed', 'Seed'],
  ARRAY['Remote', 'United States', 'Global'],
  'Former Square engineer turned investor. Deep expertise in payment APIs and developer tools.',
  NOW(),
  NOW()
FROM contacts 
WHERE name = 'Marcus Rodriguez' AND company = 'Seedstage Capital'
AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74';

-- =============================================================================
-- PHASE 3: CREATE NEW TEST CONTACTS (ENGINEERS)
-- =============================================================================

-- 3. Alex Thompson - Staff Engineer (Perfect hiring match)
INSERT INTO contacts (
  owned_by_profile, name, company, title, email, 
  contact_type, is_investor, category, bio,
  relationship_strength, created_at, updated_at
) VALUES (
  '6aa9b704-375d-420b-9750-297c9dedfe74',
  'Alex Thompson',
  'Coinbase',
  'Staff Software Engineer - Payments',
  'alex@example.com',
  ARRAY['Startup']::contact_type_enum[],
  false,
  'Engineer',
  '10+ years building payment systems. Led Coinbase payment infrastructure. Expert in PCI compliance and fraud detection.',
  50,
  NOW(),
  NOW()
);

-- 4. Priya Patel - Engineering Manager (Perfect hiring match)
INSERT INTO contacts (
  owned_by_profile, name, company, title, email, 
  contact_type, is_investor, category, bio,
  relationship_strength, created_at, updated_at
) VALUES (
  '6aa9b704-375d-420b-9750-297c9dedfe74',
  'Priya Patel',
  'Plaid',
  'Engineering Manager - Banking APIs',
  'priya@example.com',
  ARRAY['Startup']::contact_type_enum[],
  false,
  'Engineer',
  'Engineering leader with experience scaling FinTech teams. Previously at Stripe and Robinhood. Passionate about open banking.',
  65,
  NOW(),
  NOW()
);

-- =============================================================================
-- PHASE 4: CREATE NEW TEST CONTACTS (PARTNERSHIPS)
-- =============================================================================

-- 5. David Kim - FinTech Founder (Partnership match)
INSERT INTO contacts (
  owned_by_profile, name, company, title, email, 
  contact_type, is_investor, category, bio,
  relationship_strength, created_at, updated_at
) VALUES (
  '6aa9b704-375d-420b-9750-297c9dedfe74',
  'David Kim',
  'PayFlow',
  'CEO & Co-founder',
  'david@payflow.com',
  ARRAY['Startup']::contact_type_enum[],
  false,
  'Founder/Startup',
  'Building next-gen B2B payment infrastructure. Series A stage ($8M raised). Looking for strategic partnerships with lending platforms.',
  55,
  NOW(),
  NOW()
);

-- 6. Jennifer Wu - VP of Partnerships (Partnership match)
INSERT INTO contacts (
  owned_by_profile, name, company, title, email, 
  contact_type, is_investor, category, bio,
  relationship_strength, created_at, updated_at
) VALUES (
  '6aa9b704-375d-420b-9750-297c9dedfe74',
  'Jennifer Wu',
  'LendTech Solutions',
  'VP of Partnerships',
  'jennifer@lendtech.com',
  ARRAY['Startup']::contact_type_enum[],
  false,
  'Founder/Startup',
  'Leading partnerships at a Series B lending platform. Seeking API integrations with payment processors and neo-banks.',
  70,
  NOW(),
  NOW()
);

-- =============================================================================
-- PHASE 5: ENHANCE CONVERSATION TRANSCRIPT
-- =============================================================================

-- Clear existing segments
DELETE FROM conversation_segments 
WHERE conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4';

-- Insert realistic, detailed transcript segments
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text, created_at) VALUES
('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 0, 'Jackson', 
 'Alright, so I wanted to give you an update on our fundraising progress. We''re building a B2B payment infrastructure platform, kind of like Stripe but focused specifically on the lending vertical.', 
 NOW()),

('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 5000, 'Jackson', 
 'We''ve already got some traction - about $2M in ARR, growing 20% month-over-month. Now we''re looking to raise our Series A round, probably in the $5 to $8 million range.', 
 NOW()),

('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 10000, 'Jackson', 
 'The ideal investors for us would be folks who really understand FinTech infrastructure, especially payment processing and lending platforms. We''re based in San Francisco but open to investors anywhere.', 
 NOW()),

('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 15000, 'Jackson', 
 'On the hiring side, we desperately need a strong engineering leader - someone who''s built payment systems at scale before. Thinking Staff Engineer or Engineering Manager level, ideally from companies like Stripe, Plaid, or Coinbase.', 
 NOW()),

('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 20000, 'Jackson', 
 'We''re also exploring partnerships with other FinTech companies. Specifically looking for lending platforms that would benefit from our payment infrastructure, or payment processors who want to expand into lending.', 
 NOW()),

('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 25000, 'Jackson', 
 'If you know anyone in your network who fits these profiles - Series A investors focused on FinTech, experienced payment engineers, or founders building in the lending space - I''d love an intro.', 
 NOW()),

('0ff8bfc6-178a-4cb9-a1e9-9245933293e4', 30000, 'Jackson', 
 'The company is called PaymentCore, and we''re really at an inflection point where the right connections could make a huge difference. Any help would be amazing.', 
 NOW());

-- =============================================================================
-- PHASE 6: CLEAR STALE MATCHING DATA
-- =============================================================================

-- Clear existing entities for fresh extraction
DELETE FROM conversation_entities 
WHERE conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4';

-- Clear existing match suggestions for fresh generation
DELETE FROM match_suggestions 
WHERE conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4';

-- =============================================================================
-- VERIFICATION QUERIES (for manual validation)
-- =============================================================================

-- Uncomment to verify data was inserted correctly:

-- SELECT c.name, c.company, c.title, t.sectors, t.stages, t.geos
-- FROM contacts c
-- LEFT JOIN theses t ON c.id = t.contact_id
-- WHERE c.owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'
-- AND c.is_investor = true
-- ORDER BY c.name;

-- SELECT conversation_id, timestamp_ms, LEFT(text, 80) as preview
-- FROM conversation_segments
-- WHERE conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4'
-- ORDER BY timestamp_ms;

COMMENT ON TABLE contacts IS 'Test data populated: 6 new contacts added + 5 existing investors updated with theses';
COMMENT ON TABLE conversation_segments IS 'Test conversation enhanced with detailed multi-scenario transcript';
