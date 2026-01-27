# Edge Case Testing Guide

This guide covers edge case scenarios to ensure the matching system is robust and handles unexpected inputs gracefully.

## Why Edge Case Testing Matters

Production systems encounter:
- Incomplete data (missing bios, empty theses)
- Extreme inputs (1000+ contacts, 50+ entities)
- User errors (typos, malformed data)
- System states (no contacts, first conversation)

The matching system should **never crash** and should degrade gracefully when data quality is poor.

## Edge Case Categories

### 1. Data Completeness Edge Cases

#### Test 1.1: Contact with No Bio
**Scenario**: Contact has basic info but no bio text

**Setup**:
```sql
INSERT INTO contacts (name, title, company, is_investor, owned_by_profile)
VALUES ('Empty Bio Person', 'Investor', 'XYZ Fund', true, auth.uid());
```

**Expected Behavior**:
- ✅ Contact still appears in matching
- ⚠️ Embedding score = 0 (no bio to embed)
- ⚠️ Semantic score = 0 (no keywords to match)
- ✅ Other scores still work (tags, role, geo, relationship)
- ✅ Lower confidence scores reflect sparse data
- ✅ No crash, graceful degradation

**Validation**:
```sql
SELECT 
  c.name,
  c.bio,
  LENGTH(c.bio) as bio_length
FROM contacts c
WHERE c.name = 'Empty Bio Person';
```

#### Test 1.2: Contact with No Thesis
**Scenario**: Investor contact without investment thesis

**Setup**: Contact exists but no row in `theses` table

**Expected Behavior**:
- ✅ Tag overlap score = 0 (no tags to match)
- ⚠️ Lower overall confidence
- ✅ Other components still score
- ✅ System continues to work

#### Test 1.3: Conversation with No Entities
**Scenario**: Conversation completed but entity extraction found nothing

**Setup**:
```sql
-- Create conversation with no entities
INSERT INTO conversations (title, owned_by_profile)
VALUES ('Empty Context Conversation', auth.uid());

-- Add generic transcript
INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
SELECT id, 0, 'User', 'Uh huh. Yeah. Okay. Got it. Thanks.'
FROM conversations 
WHERE title = 'Empty Context Conversation';
```

**Expected Behavior**:
- ✅ Returns empty matches array `[]`
- ✅ No crash or 500 error
- ✅ Frontend shows "No matches found"
- ✅ Logs: "NO ENTITIES - returning empty matches"

**Code Reference**: generate-matches/index.ts lines 261-267

#### Test 1.4: Conversation with Only Person Names (No Topics)
**Scenario**: User mentions names but no business context

**Setup**:
```sql
INSERT INTO conversation_entities (conversation_id, entity_type, value)
VALUES 
  ('<conversation_id>', 'person_name', 'John Doe'),
  ('<conversation_id>', 'person_name', 'Jane Smith');
-- No sectors, stages, or topics
```

**Expected Behavior**:
- ✅ Name matching still works (if names match contacts)
- ✅ High name boost for matched contacts (+0.3)
- ⚠️ Other scores low (no tag/role/semantic match)
- ✅ Matches generated for name-matched contacts only

### 2. Scale Edge Cases

#### Test 2.1: User with Zero Contacts
**Scenario**: New user, no contacts imported yet

**Setup**: Clear all contacts for test user
```sql
DELETE FROM contacts WHERE owned_by_profile = auth.uid();
```

**Expected Behavior**:
- ✅ Returns empty matches array `[]`
- ✅ No crash
- ✅ Logs: "NO CONTACTS - returning empty matches"
- ✅ Frontend shows helpful message

**Code Reference**: generate-matches/index.ts lines 294-299

#### Test 2.2: User with 1000+ Contacts
**Scenario**: Large database, test performance

**Setup**: Load test data
```sql
-- Generate 1000 test contacts
INSERT INTO contacts (name, title, company, bio, owned_by_profile)
SELECT 
  'Test Contact ' || i,
  'Title ' || i,
  'Company ' || i,
  'Bio text for contact ' || i || '. Some keywords here.',
  auth.uid()
FROM generate_series(1, 1000) AS i;
```

**Expected Behavior**:
- ✅ Completes in <5 seconds
- ✅ Returns top 20 matches (not all 1000)
- ✅ No timeout or memory issues
- ✅ Performance logs show acceptable times

**Performance Targets**:
- Scoring: <2 seconds
- Total: <5 seconds
- Memory: Reasonable (no OOM)

**Code Reference**: generate-matches/index.ts line 739 (limits to top 20)

#### Test 2.3: Conversation with 50+ Entities
**Scenario**: Very detailed conversation with many extracted entities

**Setup**:
```sql
-- Add many entities
INSERT INTO conversation_entities (conversation_id, entity_type, value)
SELECT 
  '<conversation_id>',
  'sector',
  'Sector ' || i
FROM generate_series(1, 30) AS i;

INSERT INTO conversation_entities (conversation_id, entity_type, value)
SELECT 
  '<conversation_id>',
  'person_name',
  'Person ' || i
FROM generate_series(1, 20) AS i;
```

**Expected Behavior**:
- ✅ All entities processed
- ✅ No performance degradation
- ✅ Tag overlap calculated correctly
- ✅ Name matching handles all names

### 3. Data Quality Edge Cases

#### Test 3.1: Name with Typos
**Scenario**: User mentions "Sarrah Chen" instead of "Sarah Chen"

**Setup**:
```sql
INSERT INTO conversation_entities (conversation_id, entity_type, value)
VALUES ('<conversation_id>', 'person_name', 'Sarrah Chen');
```

**Expected Behavior**:
- ✅ Fuzzy match catches it (Levenshtein distance ≤ 2)
- ✅ Match score: 0.80-0.85 (not perfect but close)
- ✅ Match type: "levenshtein"
- ✅ Still gets name boost

**Code Reference**: generate-matches/index.ts lines 139-148

**Test Matrix**:
| Mentioned Name | Actual Name | Expected Match | Match Type |
|---------------|-------------|----------------|------------|
| Sarah Chen | Sarah Chen | ✅ 1.0 | exact |
| sarah chen | Sarah Chen | ✅ 1.0 | exact (case insensitive) |
| Sarrah Chen | Sarah Chen | ✅ 0.80 | levenshtein |
| Sarah | Sarah Chen | ✅ 0.70 | first-only |
| Chen | Sarah Chen | ✅ 0.70 | last-only |
| Bob Smith | Robert Smith | ✅ 0.90 | fuzzy-both (nickname) |
| Mike Rodriguez | Michael Rodriguez | ✅ 0.90 | fuzzy-both (nickname) |
| Matt Lee | Matthew Lee | ✅ 0.90 | fuzzy-both (nickname) |
| John Doe | Sarah Chen | ❌ 0.0 | none |

#### Test 3.2: Nickname Variations
**Scenario**: Test all nickname mappings work

**Test Cases**:
```javascript
// Should all match with high scores
'Bob' ↔ 'Robert'
'Mike' ↔ 'Michael'
'Matt' ↔ 'Matthew'
'Jim' ↔ 'James'
'Bill' ↔ 'William'
'Tom' ↔ 'Thomas'
'Joe' ↔ 'Joseph'
'Dan' ↔ 'Daniel'
'Chris' ↔ 'Christopher'
'Alex' ↔ 'Alexander'
'Sam' ↔ 'Samuel'
'Nick' ↔ 'Nicholas'
'Steve' ↔ 'Steven' / 'Stephen'
'Tony' ↔ 'Anthony'
'Dave' ↔ 'David'
'Ed' ↔ 'Edward'
'Sara' ↔ 'Sarah'
'Kate' ↔ 'Katherine' / 'Catherine'
'Liz' ↔ 'Elizabeth'
'Jen' ↔ 'Jennifer'
```

**Validation**:
- ✅ All nickname pairs score ≥ 0.65
- ✅ Match type: "fuzzy-both" or "first-nickname"
- ✅ Name boost applied

**Code Reference**: generate-matches/index.ts lines 40-109 (nickname dictionary)

#### Test 3.3: Missing/Malformed Check Sizes
**Scenario**: Check size values in unexpected formats

**Test Cases**:
```sql
-- Various formats to test
INSERT INTO conversation_entities (conversation_id, entity_type, value)
VALUES 
  ('<id>', 'check_size', '$1.5M'),           -- Standard
  ('<id>', 'check_size', '1.5 million'),     -- Word form
  ('<id>', 'check_size', '$500K'),           -- Thousands
  ('<id>', 'check_size', '2000000'),         -- Raw number
  ('<id>', 'check_size', '$1,500,000'),      -- Commas
  ('<id>', 'check_size', 'about 2 million'); -- Text description
```

**Expected Behavior**:
- ✅ All parsed correctly by `parseCheckSize()` function
- ✅ Comparison works for check size range matching
- ❌ Malformed values return `null` (graceful failure)

**Code Reference**: generate-matches/index.ts lines 188-201

#### Test 3.4: Location Matching Variations
**Scenario**: Geographic matching with different formats

**Test Cases**:
```
Contact location: "San Francisco, CA"
Mentioned: "SF", "San Francisco", "Bay Area", "san francisco"

Contact location: "New York, NY"
Mentioned: "NYC", "New York City", "New York", "Manhattan"
```

**Current Behavior** (basic matching):
- ✅ Exact substring match works
- ⚠️ "SF" doesn't match "San Francisco" (future improvement)
- ⚠️ "Bay Area" doesn't match "San Francisco" (future improvement)

**Code Reference**: generate-matches/index.ts lines 605-613

**Note**: Geographic matching is basic. Future improvement: location normalization (see DEVELOPMENT_BACKLOG.md Phase 3, Task M3).

### 4. System State Edge Cases

#### Test 4.1: First Conversation Ever
**Scenario**: Brand new user, first recording

**Expected Behavior**:
- ✅ All functions work
- ✅ Empty matches if no contacts
- ✅ Proper onboarding flow
- ✅ No errors

#### Test 4.2: Rapid Regeneration
**Scenario**: User clicks "Regenerate Matches" multiple times quickly

**Expected Behavior**:
- ✅ No race conditions
- ✅ Latest result wins
- ✅ Previous requests cancelled or ignored
- ✅ UI doesn't break

**Code Reference**: client/src/pages/ConversationDetail.tsx useMutation

#### Test 4.3: Partial Pipeline Failure
**Scenario**: Entity extraction succeeds, embedding fails, matching succeeds

**Expected Behavior**:
- ✅ Pipeline continues despite embedding failure
- ✅ Falls back to keyword matching (20% weight)
- ⚠️ Lower match quality but system works
- ✅ Logs show fallback mode: "Embeddings available: false"

**Code Reference**: generate-matches/index.ts lines 334-350 (adaptive weights)

### 5. Authentication & Authorization Edge Cases

#### Test 5.1: Unauthorized Access
**Scenario**: User A tries to generate matches for User B's conversation

**Expected Behavior**:
- ❌ 403 Forbidden error
- ✅ Error message: "Forbidden: You do not own this conversation"
- ✅ No data leaked

**Code Reference**: generate-matches/index.ts lines 242-247

#### Test 5.2: Expired Token
**Scenario**: Auth token expires during request

**Expected Behavior**:
- ❌ 401 Unauthorized error
- ✅ Frontend redirects to login
- ✅ User can retry after re-auth

#### Test 5.3: Missing Authorization Header
**Scenario**: Request without auth header

**Expected Behavior**:
- ❌ 401 Unauthorized error
- ✅ Error message: "Unauthorized"

**Code Reference**: generate-matches/index.ts lines 226-229

### 6. Data Integrity Edge Cases

#### Test 6.1: Deleted Contact During Matching
**Scenario**: Contact deleted while matches are being generated

**Expected Behavior**:
- ✅ Matching continues with remaining contacts
- ⚠️ Match might reference deleted contact (stale data)
- ✅ Frontend handles missing contact gracefully

**Note**: Future improvement: Check contact exists before displaying.

#### Test 6.2: Circular References
**Scenario**: Conversation references itself as participant

**Expected Behavior**:
- ✅ No infinite loops
- ✅ System handles gracefully

#### Test 6.3: Extremely Long Bio (10,000+ characters)
**Scenario**: Contact bio exceeds typical length

**Expected Behavior**:
- ✅ Embedding truncated to 8,000 chars (OpenAI limit)
- ✅ Semantic matching works on truncated text
- ✅ No errors

**Code Reference**: embed-conversation/index.ts line 26

### 7. Performance Degradation Edge Cases

#### Test 7.1: OpenAI API Timeout
**Scenario**: Embedding generation times out

**Expected Behavior**:
- ⚠️ Embedding generation fails
- ✅ Matching continues without embeddings
- ✅ Falls back to keyword matching

#### Test 7.2: Database Slow Query
**Scenario**: Database query takes >5 seconds

**Expected Behavior**:
- ⏱️ Request times out after 30 seconds
- ❌ Returns timeout error
- ✅ No hanging requests

#### Test 7.3: Memory Constraints
**Scenario**: System runs low on memory

**Expected Behavior**:
- ✅ Pagination/batching prevents OOM
- ✅ Top 20 limit prevents excessive memory
- ✅ Graceful failure if OOM occurs

## Edge Case Testing Checklist

### Critical Path (Must Pass)
- [ ] Zero contacts → returns empty array, no crash
- [ ] Zero entities → returns empty array, no crash
- [ ] Missing bio → lower scores but no crash
- [ ] Missing thesis → lower tag scores but no crash
- [ ] 1000+ contacts → completes in <5 seconds
- [ ] Unauthorized access → 403 error, no data leak
- [ ] Missing auth → 401 error

### Important (Should Pass)
- [ ] Typos in names → fuzzy match catches most
- [ ] Nickname variations → all common nicknames work
- [ ] Check size formats → various formats parsed
- [ ] Partial pipeline failure → falls back gracefully
- [ ] Rapid regeneration → no race conditions
- [ ] First conversation → works for new users

### Nice to Have (Can Fail)
- [ ] Location variations (SF ↔ San Francisco) → basic matching only
- [ ] Complex geographic matching → future improvement
- [ ] 50+ entities → works but not optimized
- [ ] Extremely long bios → truncated to 8K chars

## Running Edge Case Tests

### Manual Testing Script

```bash
# 1. Create edge case contacts
psql -d supabase -f edge_case_contacts.sql

# 2. Create edge case conversations
psql -d supabase -f edge_case_conversations.sql

# 3. Test each scenario
# - Navigate to conversation page
# - Click "Regenerate Matches"
# - Observe behavior
# - Check terminal logs
# - Verify no crashes

# 4. Clean up
psql -d supabase -c "DELETE FROM contacts WHERE name LIKE '%Test%';"
```

### Automated Testing (Future)

```javascript
describe('Edge Cases', () => {
  test('handles zero contacts gracefully', async () => {
    const result = await generateMatches(conversationId, []);
    expect(result.matches).toEqual([]);
    expect(result.error).toBeUndefined();
  });
  
  test('handles missing bio', async () => {
    const contact = { name: 'Test', bio: null };
    const match = await scoreContact(contact, entities);
    expect(match.semanticScore).toBe(0);
    expect(match.confidenceScores.semantic).toBeLessThan(0.5);
  });
  
  test('handles name typos with fuzzy matching', () => {
    const result = fuzzyNameMatch('Sarrah Chen', 'Sarah Chen');
    expect(result.match).toBe(true);
    expect(result.score).toBeGreaterThan(0.75);
  });
});
```

## Success Criteria

Edge case testing passes when:

- ✅ **No Crashes**: System handles all edge cases without crashing
- ✅ **Graceful Degradation**: Missing data lowers quality but doesn't break
- ✅ **Clear Error Messages**: Users understand what went wrong
- ✅ **Performance Maintained**: Edge cases don't cause slowdowns
- ✅ **Data Integrity**: No data leaks or unauthorized access
- ✅ **Fuzzy Matching Works**: Common typos and nicknames handled
- ✅ **Limits Enforced**: Top 20 matches, 8K char truncation, etc.

## Known Limitations (Future Improvements)

From DEVELOPMENT_BACKLOG.md:

1. **Geographic Matching** (Phase 3, M3)
   - Current: Simple substring matching
   - Future: Location normalization, city/region mapping

2. **Name Matching** (Phase 3, M4)
   - Current: 70+ nicknames, Levenshtein distance
   - Future: Phonetic matching (Soundex/Metaphone)

3. **Feedback Loop** (Phase 5)
   - Current: UI collects feedback but doesn't adjust weights
   - Future: Adaptive learning from user actions

## Next Steps

After edge case testing:
1. **Document Findings**: Create edge case test results file
2. **Fix Critical Bugs**: Address any crashes or data leaks
3. **Accept Limitations**: Document known edge cases that won't be fixed immediately
4. **Update Docs**: Add edge case behavior to user documentation
5. **Move to Production**: Deploy once edge cases handled appropriately
