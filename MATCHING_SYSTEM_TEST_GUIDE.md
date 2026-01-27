# Matching System Test Guide

This guide helps you validate the matching system functionality end-to-end.

## Prerequisites

1. Dev server running: `npm run dev`
2. User account created and logged in
3. Supabase project configured with:
   - Edge functions deployed
   - `OPENAI_API_KEY` set as a Supabase secret (if not set, embeddings will be skipped)
   - Database migrations applied

## Test Status Checklist

### ✅ Phase 1: Schema & Infrastructure (COMPLETED)

- [x] `context_embedding` column exists in `conversations` table
- [x] `bio_embedding` column exists in `contacts` table  
- [x] `thesis_embedding` column exists in `contacts` table
- [x] TypeScript schema updated to reflect embedding columns
- [x] Matching algorithm supports adaptive weights (30% embedding when available)
- [x] Score breakdown UI component exists
- [x] Confidence scoring implemented

### 🔄 Phase 2: API & Authentication (IN PROGRESS)

#### Test 1: Regenerate Matches Authentication

**Goal**: Verify auth token passing works correctly

**Steps**:
1. Open browser DevTools → Network tab
2. Navigate to `/conversation/:id` page
3. Click "Regenerate Matches" button
4. Observe the following API calls:

```
POST /api/supabase/functions/v1/extract-entities
POST /api/supabase/functions/v1/embed-conversation  
POST /api/supabase/functions/v1/generate-matches
```

**Expected Results**:
- All three calls return 200 status
- No 401 Unauthorized errors
- Authorization headers present in requests
- Matches appear in UI within 5-10 seconds

**Current Status**: ⚠️ NEEDS TESTING
- Frontend auth fix implemented (gets token from Supabase session)
- Backend proxy implemented (forwards auth tokens)
- Not yet tested end-to-end

#### Test 2: Embedding Generation

**Goal**: Verify embeddings are generated and stored

**Steps**:
1. Create a conversation with rich context (or use regenerate matches)
2. Check terminal logs for:
   ```
   Embedding conversation: <conversation_id>
   Context text: ...
   Generated embedding with 1536 dimensions
   Embedding stored successfully
   ```
3. Verify in Supabase SQL Editor:
   ```sql
   SELECT id, context_embedding IS NOT NULL as has_embedding
   FROM conversations
   WHERE id = '<conversation_id>';
   ```

**Expected Results**:
- `embed-conversation` returns 200 status
- Logs show successful embedding generation
- Database column populated with 1536-dimensional vector

**Current Status**: ⚠️ FAILING
- Returns 400 error
- Likely cause: `OPENAI_API_KEY` not set in Supabase Edge Function secrets
- To fix: Run in Supabase CLI:
  ```bash
  supabase secrets set OPENAI_API_KEY=<your-key>
  ```

### 📋 Phase 3: Test Dataset Creation (TODO)

Create test data to validate matching quality:

#### Test Contacts (5-10 profiles)

1. **Biotech Investor (High Match)**
   - Name: "Sarah Chen"
   - Title: "Partner"
   - Company: "BioVentures Capital"
   - Bio: "Early-stage biotech investor focusing on therapeutics and drug discovery. Invest $500K-$2M in pre-seed and seed rounds. Strong interest in AI-driven drug discovery platforms."
   - Contact Type: ["GP"]
   - Is Investor: true
   - Check Size: $500K - $2M
   - Thesis: Sectors: ["Biotech", "Healthcare"], Stages: ["Pre-seed", "Seed"]
   - Relationship Strength: 75

2. **SaaS Investor (Medium Match)**
   - Name: "Michael Rodriguez"
   - Title: "Managing Partner"
   - Company: "Cloud Capital Partners"
   - Bio: "B2B SaaS specialist. Series A-B focused. Typical check $3-10M. Looking for strong ARR growth and enterprise sales motion."
   - Contact Type: ["GP"]
   - Is Investor: true
   - Check Size: $3M - $10M
   - Thesis: Sectors: ["SaaS", "Enterprise Software"], Stages: ["Series A", "Series B"]
   - Relationship Strength: 60

3. **CTO Candidate (Role Match)**
   - Name: "Alex Kumar"
   - Title: "VP Engineering"
   - Company: "TechCorp"
   - Bio: "15 years building scalable systems. Python, React, Kubernetes expert. Led teams of 50+. Looking for CTO opportunities in health tech."
   - Contact Type: ["Startup"]
   - Relationship Strength: 45

4. **Weak Match - Climate Investor**
   - Name: "Jennifer Park"
   - Title: "Principal"
   - Company: "Climate Future Fund"
   - Bio: "Climate tech investor. Focus on carbon capture, renewable energy, and sustainability. Series A-B stage."
   - Contact Type: ["GP"]
   - Is Investor: true
   - Thesis: Sectors: ["Climate Tech", "Clean Energy"], Stages: ["Series A", "Series B"]
   - Relationship Strength: 30

5. **Name Mention Test**
   - Name: "Robert Smith"
   - Nickname: "Bob Smith" (to test fuzzy matching)
   - Title: "Angel Investor"
   - Bio: "Former founder, now angel investor in fintech and marketplace startups."
   - Contact Type: ["Angel"]
   - Relationship Strength: 80

#### Test Conversations (3-5 scenarios)

1. **Biotech Fundraising (Should match Sarah Chen 3-star)**
   ```
   Title: "Biotech Fundraise Discussion"
   Transcript excerpt:
   "We're raising a $1.5M seed round for our AI-powered drug discovery platform. 
   We're looking for biotech investors who understand the therapeutics space. 
   We've had some interest from general healthcare VCs, but need someone with 
   deep biotech expertise. Early stage, pre-revenue, but strong scientific team."
   ```
   
   Expected entities:
   - Sectors: ["Biotech", "Healthcare", "AI"]
   - Stages: ["Seed", "Pre-seed"]
   - Check sizes: ["$1.5M"]
   - Investor types: ["biotech investors"]

2. **Hiring CTO (Should match Alex Kumar 3-star)**
   ```
   Title: "CTO Search"
   Transcript excerpt:
   "We urgently need a strong technical leader, ideally a VP Engineering or CTO 
   who has experience scaling health tech products. Must know Python and modern 
   cloud infrastructure. Need someone who can lead a team and also get hands-on 
   when needed."
   ```
   
   Expected entities:
   - Hiring roles: ["CTO", "VP Engineering"]
   - Topics: ["health tech", "Python", "cloud"]

3. **Name Mention Test (Should match Bob/Robert 3-star)**
   ```
   Title: "Investor Introduction"
   Transcript excerpt:
   "I was chatting with Bob Smith last week. He mentioned he's been looking at 
   fintech deals and really liked our pitch. I think he'd be a great fit for 
   our seed round. Can you make an intro?"
   ```
   
   Expected entities:
   - Person names: ["Bob Smith"]
   - Sectors: ["Fintech"]

4. **Generic SaaS Discussion (Mixed matches)**
   ```
   Title: "Product Strategy"
   Transcript excerpt:
   "We're building a B2B SaaS platform for enterprise customers. Currently at 
   $500K ARR, growing 20% MoM. Thinking about Series A in 6 months. Need to 
   figure out sales strategy and maybe hire a VP Sales."
   ```
   
   Expected entities:
   - Sectors: ["SaaS", "Enterprise Software"]
   - Stages: ["Series A"]
   - Topics: ["B2B", "sales"]

5. **No Match Scenario**
   ```
   Title: "Office Logistics"
   Transcript excerpt:
   "We need to figure out the office lease renewal. Also the coffee machine 
   broke again. Should we just get new furniture for the conference room?"
   ```
   
   Expected: Zero or very low matches (no relevant business topics)

### 🧪 Phase 4: Matching Quality Validation (TODO)

For each test conversation, validate:

#### Scoring Validation

1. **Star Rating Distribution**
   - 3-star matches: Obvious strong fits (name mention, perfect domain match)
   - 2-star matches: Good fits (some overlap, reasonable connection)
   - 1-star matches: Weak but plausible (minimal overlap, low confidence)

2. **Component Scores** (check score breakdown UI)
   - Embedding score: Should be high for semantic similarity
   - Tag overlap: Should reflect Jaccard similarity
   - Role match: 1.0 for exact matches, 0 for no match
   - Geo match: 1.0 for location overlap
   - Relationship: Normalized to 0-1 scale
   - Name match: +0.3 boost when name mentioned

3. **Confidence Scores**
   - High (≥80%): Rich profiles, clear match
   - Medium (50-79%): Some uncertainty or sparse data
   - Low (<50%): Weak signals, unreliable match

#### Expected Match Results

| Conversation | Contact | Expected Stars | Key Reasons |
|-------------|---------|---------------|-------------|
| Biotech Fundraise | Sarah Chen | 3 | Sector match, stage match, check size fit |
| Biotech Fundraise | Michael Rodriguez | 1-2 | Wrong sector (SaaS not biotech) |
| Biotech Fundraise | Jennifer Park | 1 | Both investors but wrong sector |
| CTO Hiring | Alex Kumar | 3 | Role match, health tech interest |
| Name Mention | Bob Smith | 3 | Name boost (fuzzy match Bob/Robert) |
| SaaS Discussion | Michael Rodriguez | 2-3 | Sector match, stage match |
| SaaS Discussion | Sarah Chen | 1 | Wrong sector |
| Office Logistics | (any) | 0-1 | No business topics |

### 🔍 Phase 5: Edge Case Testing (TODO)

#### Edge Cases to Test

1. **No Entities Extracted**
   - Conversation with no clear topics
   - Expected: Zero matches or very low scores
   - System should not crash

2. **No Contacts**
   - User with empty contact list
   - Expected: Empty matches array
   - No errors

3. **1000+ Contacts**
   - Load test with large contact list
   - Expected: Performance acceptable (<5 seconds)
   - Top 20 matches returned

4. **Missing/Incomplete Data**
   - Contacts with no bio
   - Contacts with no thesis
   - Expected: System uses available data, confidence scores reflect data quality

5. **Name Variations**
   - "Matt" should match "Matthew"
   - "Bob" should match "Robert"
   - "Mike Rodriguez" should match "Michael Rodriguez"
   - Test with typos: "Sarrah Chen" ≈ "Sarah Chen"

6. **No Embeddings**
   - When `OPENAI_API_KEY` not set
   - Expected: Falls back to keyword matching (20% weight)
   - System continues to work (degraded quality)

## How to Run Tests

### Manual Testing

1. **Create Test Data** (via UI or SQL inserts):
   ```sql
   -- Insert test contact
   INSERT INTO contacts (name, title, company, bio, is_investor, contact_type, 
                        check_size_min, check_size_max, owned_by_profile)
   VALUES ('Sarah Chen', 'Partner', 'BioVentures Capital', 
           'Early-stage biotech investor...', true, ARRAY['GP'], 
           500000, 2000000, auth.uid());
   ```

2. **Create Test Conversations** (via Record page or SQL):
   ```sql
   -- Insert test conversation
   INSERT INTO conversations (title, owned_by_profile)
   VALUES ('Biotech Fundraise Discussion', auth.uid());
   
   -- Add transcript segments
   INSERT INTO conversation_segments (conversation_id, timestamp_ms, speaker, text)
   VALUES ('<conversation_id>', 0, 'User', 'We''re raising a $1.5M seed round...');
   ```

3. **Run Matching**:
   - Navigate to conversation page
   - Click "Regenerate Matches"
   - Observe results

4. **Validate Results**:
   - Check star ratings
   - Expand score breakdown
   - Verify reasons make sense
   - Check AI explanations (for 2-3 star matches)

### Automated Testing (Future)

```javascript
// Example unit test structure
describe('Matching Algorithm', () => {
  test('fuzzyNameMatch: exact match', () => {
    expect(fuzzyNameMatch('John Doe', 'John Doe')).toEqual({
      match: true,
      score: 1.0,
      type: 'exact'
    });
  });
  
  test('fuzzyNameMatch: nickname', () => {
    expect(fuzzyNameMatch('Bob Smith', 'Robert Smith')).toEqual({
      match: true,
      score: 0.9,
      type: 'fuzzy-both'
    });
  });
  
  test('weighted scoring: name boost', () => {
    const result = calculateMatchScore({
      embedding: 0.7,
      tagOverlap: 0.5,
      nameMatch: true
    });
    expect(result).toBeGreaterThan(0.7); // Name adds +0.3
  });
});
```

## Troubleshooting

### Embeddings Not Working

**Symptoms**: `embed-conversation` returns 400 error

**Solution**:
1. Check Supabase Edge Function secrets:
   ```bash
   supabase secrets list
   ```
2. Set OpenAI key:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```
3. Redeploy function:
   ```bash
   supabase functions deploy embed-conversation
   ```

### No Matches Generated

**Possible Causes**:
1. No entities extracted → Check `conversation_entities` table
2. No contacts in database → Add test contacts
3. Thresholds too high → Check raw scores in database
4. Auth issue → Check browser console for errors

### Poor Match Quality

**Investigation**:
1. Check score breakdown UI - which components are low?
2. Review embedding scores - are they being calculated?
3. Check tag overlap - do contacts have thesis data?
4. Verify rich context extraction - is `target_person`, `goals_and_needs` populated?

### Performance Issues

**If matching takes >10 seconds**:
1. Check database indexes are created
2. Monitor Edge Function logs for slow steps
3. Consider reducing contact count for testing
4. Check if embeddings are causing delays

## Success Criteria

The matching system is working well when:

- ✅ All three edge functions return 200 status
- ✅ Embeddings are generated and stored (when API key available)
- ✅ 3-star matches are obvious strong fits
- ✅ 1-star matches are weak but reasonable
- ✅ Name mentions consistently boost to 2+ stars
- ✅ Score breakdown UI shows all 6 components
- ✅ Confidence scores reflect data quality
- ✅ AI explanations are relevant and compelling
- ✅ System handles edge cases gracefully
- ✅ Performance is acceptable (<5 seconds for 100+ contacts)

## Next Steps After Testing

1. **Document findings** in test results file
2. **Fix critical bugs** discovered during testing
3. **Tune weights** if match quality needs improvement
4. **Add unit tests** for core matching functions
5. **Update documentation** with lessons learned
6. **Deploy to production** once validated
