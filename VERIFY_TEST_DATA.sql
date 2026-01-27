-- Quick Test Data Verification Queries
-- Run these in Supabase SQL Editor after running TEST_DATASET.sql

-- 1. Get your user ID (copy this for TEST_DATASET.sql)
SELECT auth.uid() as your_user_id;

-- 2. Check if test contacts were created
SELECT 
  name, 
  title, 
  company, 
  is_investor,
  relationship_strength
FROM contacts 
WHERE owned_by_profile = auth.uid()
ORDER BY name;

-- Expected: 10 contacts including Sarah Chen, Michael Rodriguez, Alex Kumar, Robert Smith

-- 3. Check if theses were created
SELECT 
  c.name as contact_name,
  t.sectors,
  t.stages,
  t.geos
FROM theses t
JOIN contacts c ON t.contact_id = c.id
WHERE c.owned_by_profile = auth.uid();

-- Expected: 4 theses (Sarah Chen, Michael Rodriguez, Jennifer Park, Robert Smith)

-- 4. Check if test conversations were created
SELECT 
  id,
  title,
  created_at,
  duration_seconds
FROM conversations
WHERE owned_by_profile = auth.uid()
ORDER BY created_at;

-- Expected: 5 conversations including:
-- - Biotech Seed Round Discussion
-- - CTO Search Discussion
-- - Fintech Investor Introduction
-- - Enterprise SaaS Product Strategy
-- - Office Logistics Discussion

-- 5. Check conversation entities
SELECT 
  c.title as conversation,
  ce.entity_type,
  ce.value,
  ce.confidence
FROM conversation_entities ce
JOIN conversations c ON ce.conversation_id = c.id
WHERE c.owned_by_profile = auth.uid()
ORDER BY c.title, ce.entity_type;

-- Expected: Multiple entities per conversation (sectors, stages, person names)

-- 6. Check if matches exist (run AFTER regenerating matches)
SELECT 
  c.title as conversation,
  COUNT(ms.id) as match_count,
  COUNT(CASE WHEN ms.score = 3 THEN 1 END) as three_star,
  COUNT(CASE WHEN ms.score = 2 THEN 1 END) as two_star,
  COUNT(CASE WHEN ms.score = 1 THEN 1 END) as one_star
FROM conversations c
LEFT JOIN match_suggestions ms ON c.id = ms.conversation_id
WHERE c.owned_by_profile = auth.uid()
GROUP BY c.id, c.title
ORDER BY c.title;

-- Expected: Matches for most conversations, with varying star distributions

-- 7. Check specific test case: Biotech → Sarah Chen
SELECT 
  c.title as conversation,
  con.name as contact,
  ms.score as stars,
  ms.reasons,
  ms.confidence_scores->>'overall' as confidence,
  ms.match_version
FROM match_suggestions ms
JOIN conversations c ON ms.conversation_id = c.id
JOIN contacts con ON ms.contact_id = con.id
WHERE c.title = 'Biotech Seed Round Discussion'
  AND c.owned_by_profile = auth.uid()
ORDER BY ms.score DESC, ms.created_at DESC
LIMIT 5;

-- Expected: Sarah Chen should be top match with 3 stars

-- 8. Check name match test: Bob Smith → Robert Smith
SELECT 
  c.title as conversation,
  con.name as contact,
  ms.score as stars,
  ms.score_breakdown->>'nameMatch' as name_match_score,
  ms.reasons
FROM match_suggestions ms
JOIN conversations c ON ms.conversation_id = c.id
JOIN contacts con ON ms.contact_id = con.id
WHERE c.title = 'Fintech Investor Introduction'
  AND c.owned_by_profile = auth.uid()
ORDER BY ms.score DESC
LIMIT 5;

-- Expected: Robert Smith with 3 stars and nameMatch score ~0.9

-- 9. Clean up test data (ONLY RUN IF YOU WANT TO DELETE EVERYTHING)
-- Uncomment to use:
/*
DELETE FROM match_suggestions 
WHERE conversation_id IN (
  SELECT id FROM conversations WHERE owned_by_profile = auth.uid()
);

DELETE FROM conversation_entities 
WHERE conversation_id IN (
  SELECT id FROM conversations WHERE owned_by_profile = auth.uid()
);

DELETE FROM conversation_segments 
WHERE conversation_id IN (
  SELECT id FROM conversations WHERE owned_by_profile = auth.uid()
);

DELETE FROM conversations WHERE owned_by_profile = auth.uid();

DELETE FROM theses 
WHERE contact_id IN (
  SELECT id FROM contacts WHERE owned_by_profile = auth.uid()
);

DELETE FROM contacts WHERE owned_by_profile = auth.uid();
*/
