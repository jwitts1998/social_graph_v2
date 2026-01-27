-- ============================================================================
-- MATCHING SYSTEM TEST DATASET
-- ============================================================================
-- This script creates comprehensive test data for validating the matching system
-- Run this in Supabase SQL Editor after logging in as a test user
--
-- Prerequisites:
-- 1. User account created and logged in
-- 2. Run: SELECT auth.uid(); -- to get your user ID
-- 3. Replace '6aa9b704-375d-420b-9750-297c9dedfe74' with the actual UUID
-- ============================================================================

-- IMPORTANT: Replace 6aa9b704-375d-420b-9750-297c9dedfe74 with your actual user ID throughout this file
-- Get your user ID by running: SELECT auth.uid();
-- Then use Find & Replace (Cmd+F or Ctrl+F) to replace all instances of:
--   '6aa9b704-375d-420b-9750-297c9dedfe74' 
-- with your actual UUID like:
--   '6aa9b704-375d-420b-9750-297c9dedfe74'

-- ============================================================================
-- TEST CONTACTS (10 diverse profiles)
-- ============================================================================

-- Contact 1: Biotech Investor (High Match for biotech fundraising)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, check_size_min, check_size_max,
  investor_notes, relationship_strength, owned_by_profile
) VALUES (
  'Sarah Chen',
  'Sarah',
  'Chen',
  'Partner',
  'BioVentures Capital',
  'Early-stage biotech investor with 15 years of experience in therapeutics and drug discovery. Strong focus on AI-powered drug discovery platforms and precision medicine. Invested in 30+ biotech startups including several successful exits. Former scientist at Genentech with deep understanding of drug development pipeline. Looking for exceptional founding teams with novel therapeutic approaches.',
  ARRAY['GP']::contact_type_enum[],
  true,
  500000,
  2000000,
  'Prefers pre-seed and seed stage. Must have strong scientific advisory board. Likes AI/ML applications in drug discovery.',
  75,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 2: SaaS Investor (Medium Match for enterprise software)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, check_size_min, check_size_max,
  investor_notes, relationship_strength, owned_by_profile
) VALUES (
  'Michael Rodriguez',
  'Michael',
  'Rodriguez',
  'Managing Partner',
  'Cloud Capital Partners',
  'B2B SaaS specialist with focus on enterprise software. 20 years in venture capital. Typical investments at Series A and B stages with check sizes $3-10M. Looking for companies with strong ARR growth (>100% YoY), proven product-market fit, and scalable go-to-market strategy. Portfolio includes 15+ enterprise SaaS companies. Former VP Sales at Salesforce.',
  ARRAY['GP']::contact_type_enum[],
  true,
  3000000,
  10000000,
  'Series A-B only. Needs $500K+ ARR and strong unit economics. Loves companies with bottom-up adoption model.',
  60,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 3: CTO Candidate (High Match for technical hiring)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, location, relationship_strength, owned_by_profile
) VALUES (
  'Alex Kumar',
  'Alex',
  'Kumar',
  'VP Engineering',
  'TechCorp Inc',
  '15 years building scalable distributed systems. Expert in Python, React, Kubernetes, and AWS. Led engineering teams of 50+ at Series B and C companies. Previous experience at Google and Stripe. Strong interest in health tech and biotech applications of software. Open to CTO opportunities at early-stage startups with technical complexity and social impact.',
  ARRAY['Startup']::contact_type_enum[],
  false,
  'San Francisco, CA',
  45,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 4: Climate Tech Investor (Low Match for biotech)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, check_size_min, check_size_max,
  investor_notes, location, relationship_strength, owned_by_profile
) VALUES (
  'Jennifer Park',
  'Jennifer',
  'Park',
  'Principal',
  'Climate Future Fund',
  'Climate tech investor focused on carbon capture, renewable energy, and sustainability. Series A-B stage investments. Strong technical background in environmental engineering. Portfolio includes solar, battery storage, and carbon credit platforms. Looking for scalable climate solutions with measurable impact.',
  ARRAY['GP']::contact_type_enum[],
  true,
  2000000,
  5000000,
  'Climate tech only. Must have clear path to profitability and measurable environmental impact.',
  'New York, NY',
  30,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 5: Angel Investor - Name Match Test (Bob/Robert)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, check_size_min, check_size_max,
  location, relationship_strength, owned_by_profile
) VALUES (
  'Robert Smith',
  'Robert',
  'Smith',
  'Angel Investor',
  'Former Founder',
  'Former founder of FinTech startup (acquired 2020). Now angel investing in fintech and marketplace startups. Typical check size $50-250K. Strong operational background in payments, lending, and financial services. Can help with product strategy, fundraising, and customer introductions.',
  ARRAY['Angel']::contact_type_enum[],
  true,
  50000,
  250000,
  'Los Angeles, CA',
  80,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 6: LP - Family Office (Good for fundraising)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, is_family_office, avg_check_size,
  investment_types, investor_notes, location, relationship_strength, owned_by_profile
) VALUES (
  'David Thompson',
  'David',
  'Thompson',
  'Investment Director',
  'Thompson Family Office',
  'Manages investments for high-net-worth family. Focus on direct investments and co-investments with top-tier VCs. Particularly interested in healthcare, enterprise software, and fintech. Flexible on stage and check size. Long-term patient capital.',
  ARRAY['LP', 'FamilyOffice']::contact_type_enum[],
  true,
  true,
  1000000,
  ARRAY['direct', 'co-invest']::text[],
  'Direct investments preferred. Can write large checks ($1-5M) for the right opportunity. Wants board observer seat.',
  'Boston, MA',
  65,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 7: PE Investor (Different stage, lower match)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, is_investor, check_size_min, check_size_max,
  investor_notes, relationship_strength, owned_by_profile
) VALUES (
  'Lisa Anderson',
  'Lisa',
  'Anderson',
  'Partner',
  'Growth Equity Partners',
  'Growth equity and private equity investor. Focus on profitable companies with $10M+ revenue. Typical ownership 20-40%. Industry agnostic but strong preference for B2B businesses with recurring revenue. Former investment banker at Goldman Sachs.',
  ARRAY['PE']::contact_type_enum[],
  true,
  10000000,
  50000000,
  'Growth stage only. Must be profitable or path to profitability in 12 months. $10M+ revenue required.',
  40,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 8: Healthcare Operator (Match for healthcare partnerships)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, location, relationship_strength, owned_by_profile
) VALUES (
  'Dr. James Wilson',
  'James',
  'Wilson',
  'Chief Medical Officer',
  'HealthSystem Partners',
  'Physician executive overseeing clinical operations for large hospital network. Deep expertise in healthcare IT, digital health, and clinical workflows. Can provide pilot opportunities and strategic partnerships for health tech companies. Strong interest in AI-powered diagnostic tools and patient engagement platforms.',
  ARRAY['Startup']::contact_type_enum[],
  'Chicago, IL',
  55,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 9: Marketing Expert (Match for hiring/consulting)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, location, relationship_strength, owned_by_profile
) VALUES (
  'Emma Davis',
  'Emma',
  'Davis',
  'VP Marketing',
  'GrowthCo',
  'B2B marketing leader with expertise in demand generation, content marketing, and account-based marketing. Built marketing teams at 3 Series A-C companies. Expert in HubSpot, Salesforce, and modern martech stack. Available for fractional CMO roles or advisory work.',
  ARRAY['Startup']::contact_type_enum[],
  'Austin, TX',
  50,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- Contact 10: Technical Advisor (Match for technical validation)
INSERT INTO contacts (
  name, first_name, last_name, title, company, bio,
  contact_type, location, relationship_strength, owned_by_profile
) VALUES (
  'Matthew Lee',
  'Matthew',
  'Lee',
  'Founder & CEO',
  'AI Research Labs',
  'Deep learning researcher and entrepreneur. PhD in Computer Science from MIT. Expert in natural language processing, computer vision, and reinforcement learning. Founded 2 AI companies. Available as technical advisor for AI/ML startups. Can help with model architecture, data strategy, and AI product strategy.',
  ARRAY['Startup']::contact_type_enum[],
  'Seattle, WA',
  70,
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
);

-- ============================================================================
-- TEST THESES (Investment criteria for investors)
-- ============================================================================

-- Thesis for Sarah Chen (Biotech Investor)
INSERT INTO theses (contact_id, sectors, stages, geos, notes)
SELECT 
  id,
  ARRAY['Biotech', 'Healthcare', 'Life Sciences', 'Therapeutics']::text[],
  ARRAY['Pre-seed', 'Seed', 'Series A']::text[],
  ARRAY['San Francisco', 'Boston', 'San Diego']::text[],
  'Focus on AI-driven drug discovery, precision medicine, and novel therapeutic modalities. Must have strong scientific team and IP.'
FROM contacts 
WHERE name = 'Sarah Chen' AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Thesis for Michael Rodriguez (SaaS Investor)
INSERT INTO theses (contact_id, sectors, stages, geos, notes)
SELECT 
  id,
  ARRAY['SaaS', 'Enterprise Software', 'B2B', 'Cloud Infrastructure']::text[],
  ARRAY['Series A', 'Series B']::text[],
  ARRAY['San Francisco', 'New York', 'Austin']::text[],
  'B2B SaaS with strong ARR growth, product-market fit, and scalable GTM. Enterprise sales motion preferred.'
FROM contacts 
WHERE name = 'Michael Rodriguez' AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Thesis for Jennifer Park (Climate Tech)
INSERT INTO theses (contact_id, sectors, stages, geos, notes)
SELECT 
  id,
  ARRAY['Climate Tech', 'Clean Energy', 'Sustainability', 'Carbon Capture']::text[],
  ARRAY['Series A', 'Series B']::text[],
  ARRAY['San Francisco', 'New York', 'Boulder']::text[],
  'Climate solutions with measurable impact. Must have path to profitability and government/enterprise customers.'
FROM contacts 
WHERE name = 'Jennifer Park' AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Thesis for Robert Smith (Angel)
INSERT INTO theses (contact_id, sectors, stages, geos, notes)
SELECT 
  id,
  ARRAY['Fintech', 'Marketplace', 'Consumer', 'Payments']::text[],
  ARRAY['Pre-seed', 'Seed']::text[],
  ARRAY['Los Angeles', 'San Francisco', 'New York']::text[],
  'Early-stage fintech and marketplaces. Prefer consumer-facing products with network effects.'
FROM contacts 
WHERE name = 'Robert Smith' AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- ============================================================================
-- TEST CONVERSATIONS
-- ============================================================================

-- Conversation 1: Biotech Fundraising (Should match Sarah Chen 3-star)
INSERT INTO conversations (title, owned_by_profile, duration_seconds)
VALUES (
  'Biotech Seed Round Discussion',
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid,
  1800
) RETURNING id;

-- Get the conversation ID (run this separately and save it)
-- \gset conv1_

-- Add rich context to conversation 1 (use the ID from above)
UPDATE conversations
SET 
  target_person = jsonb_build_object(
    'name_mentioned', 'Dr. Sarah Chen',
    'role_title', 'Partner at biotech fund',
    'company_mentioned', 'BioVentures Capital',
    'communication_context', 'Discussed our AI drug discovery platform'
  ),
  matching_intent = jsonb_build_object(
    'what_kind_of_contacts_to_find', ARRAY['biotech investors', 'life sciences VCs', 'pre-seed investors'],
    'hard_constraints', ARRAY['biotech expertise', 'seed stage', '$1-2M check'],
    'soft_preferences', ARRAY['hands-on', 'scientific background']
  ),
  goals_and_needs = jsonb_build_object(
    'fundraising', jsonb_build_object(
      'is_relevant', true,
      'stage', 'Seed',
      'amount_range', '$1.5M',
      'investor_types', ARRAY['biotech VCs', 'life sciences investors']
    )
  ),
  domains_and_topics = jsonb_build_object(
    'primary_industry', 'Biotech',
    'product_keywords', ARRAY['AI-powered drug discovery', 'therapeutics', 'precision medicine'],
    'technology_keywords', ARRAY['machine learning', 'drug discovery', 'AI'],
    'stage_keywords', ARRAY['seed', 'pre-seed', 'early stage'],
    'geography_keywords', ARRAY['San Francisco', 'Bay Area']
  )
WHERE title = 'Biotech Seed Round Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add entities for conversation 1
INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'sector',
  unnest(ARRAY['Biotech', 'Healthcare', 'Life Sciences', 'AI']),
  0.9
FROM conversations 
WHERE title = 'Biotech Seed Round Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'stage',
  unnest(ARRAY['Seed', 'Pre-seed']),
  0.85
FROM conversations 
WHERE title = 'Biotech Seed Round Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'check_size',
  '$1.5M',
  0.8
FROM conversations 
WHERE title = 'Biotech Seed Round Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add transcript segments for conversation 1
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT 
  id,
  0,
  'User',
  'We''re raising a $1.5 million seed round for our AI-powered drug discovery platform. We''re looking for biotech investors who understand the therapeutics space and can provide strategic value beyond capital.'
FROM conversations 
WHERE title = 'Biotech Seed Round Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT 
  id,
  30000,
  'User',
  'We''ve had some interest from general healthcare VCs, but we really need someone with deep biotech expertise. We''re pre-revenue but have strong validation from our scientific advisory board and pilot partnership with a major pharma company.'
FROM conversations 
WHERE title = 'Biotech Seed Round Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Conversation 2: CTO Hiring (Should match Alex Kumar 3-star)
INSERT INTO conversations (title, owned_by_profile, duration_seconds)
VALUES (
  'CTO Search Discussion',
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid,
  1200
);

UPDATE conversations
SET 
  target_person = jsonb_build_object(
    'role_title', 'CTO or VP Engineering',
    'communication_context', 'Discussed technical leadership needs'
  ),
  matching_intent = jsonb_build_object(
    'what_kind_of_contacts_to_find', ARRAY['CTO candidates', 'VP Engineering', 'technical leaders'],
    'hard_constraints', ARRAY['Python experience', 'cloud infrastructure', 'health tech background'],
    'soft_preferences', ARRAY['startup experience', 'can lead teams']
  ),
  goals_and_needs = jsonb_build_object(
    'hiring', jsonb_build_object(
      'is_relevant', true,
      'roles_needed', ARRAY['CTO', 'VP Engineering'],
      'seniority_level', 'Executive',
      'urgency', 'High'
    )
  ),
  domains_and_topics = jsonb_build_object(
    'primary_industry', 'Health Tech',
    'technology_keywords', ARRAY['Python', 'cloud infrastructure', 'scalable systems', 'Kubernetes']
  )
WHERE title = 'CTO Search Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add entities for conversation 2
INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'person_role',
  unnest(ARRAY['CTO', 'VP Engineering']),
  0.9
FROM conversations 
WHERE title = 'CTO Search Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add transcript for conversation 2
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT 
  id,
  0,
  'User',
  'We urgently need a strong technical leader, ideally a VP Engineering or CTO who has experience scaling health tech products. Must know Python and modern cloud infrastructure. Need someone who can lead a team and also get hands-on when needed.'
FROM conversations 
WHERE title = 'CTO Search Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Conversation 3: Name Mention Test (Should match Bob Smith / Robert Smith 3-star)
INSERT INTO conversations (title, owned_by_profile, duration_seconds)
VALUES (
  'Fintech Investor Introduction',
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid,
  900
);

UPDATE conversations
SET 
  target_person = jsonb_build_object(
    'name_mentioned', 'Bob Smith',
    'communication_context', 'Mentioned as potential investor'
  ),
  matching_intent = jsonb_build_object(
    'what_kind_of_contacts_to_find', ARRAY['Bob Smith', 'fintech investors']
  ),
  goals_and_needs = jsonb_build_object(
    'fundraising', jsonb_build_object(
      'is_relevant', true,
      'stage', 'Seed',
      'investor_types', ARRAY['angel investors', 'fintech investors']
    )
  ),
  domains_and_topics = jsonb_build_object(
    'primary_industry', 'Fintech',
    'product_keywords', ARRAY['payments', 'financial services']
  )
WHERE title = 'Fintech Investor Introduction' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add person name entity
INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'person_name',
  'Bob Smith',
  0.95
FROM conversations 
WHERE title = 'Fintech Investor Introduction' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add sector entities
INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'sector',
  unnest(ARRAY['Fintech', 'Payments']),
  0.85
FROM conversations 
WHERE title = 'Fintech Investor Introduction' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add transcript
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT 
  id,
  0,
  'User',
  'I was chatting with Bob Smith last week. He mentioned he''s been looking at fintech deals and really liked our pitch. I think he''d be a great fit for our seed round. Can you make an intro?'
FROM conversations 
WHERE title = 'Fintech Investor Introduction' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Conversation 4: SaaS Discussion (Mixed matches - Michael Rodriguez 2-3 star)
INSERT INTO conversations (title, owned_by_profile, duration_seconds)
VALUES (
  'Enterprise SaaS Product Strategy',
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid,
  1500
);

UPDATE conversations
SET 
  matching_intent = jsonb_build_object(
    'what_kind_of_contacts_to_find', ARRAY['enterprise software investors', 'SaaS investors', 'sales advisors']
  ),
  goals_and_needs = jsonb_build_object(
    'fundraising', jsonb_build_object(
      'is_relevant', true,
      'stage', 'Series A',
      'amount_range', '$5-8M',
      'investor_types', ARRAY['SaaS VCs', 'enterprise software investors']
    ),
    'hiring', jsonb_build_object(
      'is_relevant', true,
      'roles_needed', ARRAY['VP Sales', 'Head of Customer Success']
    )
  ),
  domains_and_topics = jsonb_build_object(
    'primary_industry', 'SaaS',
    'product_keywords', ARRAY['B2B platform', 'enterprise customers', 'ARR growth'],
    'technology_keywords', ARRAY['cloud', 'API', 'enterprise software'],
    'stage_keywords', ARRAY['Series A']
  )
WHERE title = 'Enterprise SaaS Product Strategy' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add entities
INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'sector',
  unnest(ARRAY['SaaS', 'Enterprise Software', 'B2B']),
  0.9
FROM conversations 
WHERE title = 'Enterprise SaaS Product Strategy' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

INSERT INTO conversation_entities (conversation_id, entity_type, value, confidence)
SELECT 
  id,
  'stage',
  'Series A',
  0.85
FROM conversations 
WHERE title = 'Enterprise SaaS Product Strategy' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add transcript
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT 
  id,
  0,
  'User',
  'We''re building a B2B SaaS platform for enterprise customers. Currently at $500K ARR, growing 20% month over month. Thinking about Series A in 6 months. Need to figure out sales strategy and maybe hire a VP Sales.'
FROM conversations 
WHERE title = 'Enterprise SaaS Product Strategy' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Conversation 5: No Match Scenario (Should have zero or very low matches)
INSERT INTO conversations (title, owned_by_profile, duration_seconds)
VALUES (
  'Office Logistics Discussion',
  '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid,
  600
);

-- Minimal/no rich context
UPDATE conversations
SET 
  domains_and_topics = jsonb_build_object(
    'primary_industry', 'Internal Operations'
  )
WHERE title = 'Office Logistics Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Add transcript with no business-relevant content
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT 
  id,
  0,
  'User',
  'We need to figure out the office lease renewal. Also the coffee machine broke again. Should we just get new furniture for the conference room? And maybe paint the walls a different color.'
FROM conversations 
WHERE title = 'Office Logistics Discussion' 
  AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check contacts created
SELECT 
  name, 
  title, 
  company, 
  contact_type, 
  is_investor,
  relationship_strength
FROM contacts 
WHERE owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
ORDER BY name;

-- Check theses created
SELECT 
  c.name,
  t.sectors,
  t.stages,
  t.geos
FROM theses t
JOIN contacts c ON t.contact_id = c.id
WHERE c.owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid;

-- Check conversations created
SELECT 
  id,
  title,
  duration_seconds,
  target_person->>'name_mentioned' as target_name,
  matching_intent->>'what_kind_of_contacts_to_find' as seeking
FROM conversations
WHERE owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
ORDER BY created_at;

-- Check entities for each conversation
SELECT 
  c.title,
  ce.entity_type,
  ce.value,
  ce.confidence
FROM conversation_entities ce
JOIN conversations c ON ce.conversation_id = c.id
WHERE c.owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'::uuid
ORDER BY c.title, ce.entity_type;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this script:
-- 1. Navigate to each conversation page in the UI
-- 2. Click "Regenerate Matches" to run the matching algorithm
-- 3. Validate the match results against expected outcomes
-- 4. Check score breakdowns for each match
-- 5. Verify AI explanations for 2-3 star matches

-- Expected Match Results Summary:
-- 
-- Biotech Seed Round → Sarah Chen (3 stars, high bio embedding score, sector+stage match)
-- CTO Search → Alex Kumar (3 stars, role match, health tech interest)
-- Fintech Introduction → Robert Smith (3 stars, name boost, Bob=Robert fuzzy match)
-- Enterprise SaaS → Michael Rodriguez (2-3 stars, sector+stage match)
-- Office Logistics → No matches or very low scores (no business topics)
