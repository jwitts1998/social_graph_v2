# Manual Match Quality Validation Guide

This guide walks you through validating the matching algorithm quality step-by-step.

## Prerequisites

✅ Dev server running (`npm run dev`)  
✅ User account created  
✅ Logged in to the application  

## Step 1: Create Test Data

### Option A: Run SQL Script (Recommended)

1. **Get your user ID**:
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Run: `SELECT auth.uid();`
   - Copy the UUID returned

2. **Update TEST_DATASET.sql**:
   - Open `TEST_DATASET.sql`
   - Find line 15: `\set user_id 'YOUR_USER_ID_HERE'`
   - Replace with your actual UUID:
     ```sql
     \set user_id '12345678-1234-1234-1234-123456789012'
     ```

3. **Run the script**:
   - In Supabase SQL Editor
   - Copy the entire contents of `TEST_DATASET.sql`
   - Paste and run
   - Verify: Should create 10 contacts, 4 theses, 5 conversations

4. **Verify data created**:
   ```sql
   -- Check contacts
   SELECT name, title FROM contacts WHERE owned_by_profile = auth.uid();
   
   -- Check conversations
   SELECT id, title FROM conversations WHERE owned_by_profile = auth.uid();
   ```

### Option B: Manual Creation (if SQL fails)

Create at least these 3 key test contacts and conversations via the UI:

**Test Contact 1: Sarah Chen (Biotech Investor)**
- Name: Sarah Chen
- Title: Partner
- Company: BioVentures Capital
- Bio: "Early-stage biotech investor focusing on AI-powered drug discovery. Invest $500K-$2M in pre-seed and seed rounds."
- Contact Type: GP
- Is Investor: Yes
- Check Size: $500,000 - $2,000,000
- Relationship Strength: 75

**Test Contact 2: Robert Smith (Angel - for name matching)**
- Name: Robert Smith
- First Name: Robert
- Last Name: Smith
- Title: Angel Investor
- Bio: "Former fintech founder, now angel investing. Typical check $50-250K."
- Contact Type: Angel
- Is Investor: Yes
- Relationship Strength: 80

**Test Contact 3: Alex Kumar (CTO Candidate)**
- Name: Alex Kumar
- Title: VP Engineering
- Company: TechCorp
- Bio: "15 years building scalable systems. Python, React, Kubernetes expert. Open to CTO opportunities in health tech."
- Relationship Strength: 45

## Step 2: Generate Matches for Test Conversations

For each test conversation created by the SQL script:

1. Navigate to the conversation detail page: `/conversation/{id}`
2. Click the **"Regenerate Matches"** button
3. Wait 5-10 seconds for processing
4. Verify no errors in browser console (F12 → Console)

**Expected API Calls** (check Network tab):
```
POST /api/supabase/functions/v1/extract-entities → 200 OK
POST /api/supabase/functions/v1/embed-conversation → 200 OK (or 400 if no API key)
POST /api/supabase/functions/v1/generate-matches → 200 OK
```

## Step 3: Validate Match Quality

### Test Case 1: Biotech Seed Round Discussion

**Navigate to**: "Biotech Seed Round Discussion" conversation page

**Expected Top Match**: Sarah Chen (3⭐)

**Validation Checklist**:

- [ ] Sarah Chen appears as top match
- [ ] Sarah Chen has 3 stars (⭐⭐⭐)
- [ ] Match score breakdown visible (click to expand)
- [ ] Tag overlap score > 50% (Biotech, Healthcare, Seed match)
- [ ] Semantic/Embedding score > 60%
- [ ] Confidence score: High (≥70%)
- [ ] Reasons include: "Matches: Biotech, Healthcare" or similar
- [ ] AI explanation present (2+ stars)
- [ ] Match version shows "v1.1-transparency"

**Expected Score Breakdown** (approximate):
```
Embedding:     70-85%  (weight: 30%)
Semantic:      60-70%  (weight: 10%)
Tag Overlap:   60-75%  (weight: 30%)
Role Match:    80-90%  (weight: 10%)
Geo Match:     0-100%  (weight: 10%)
Relationship:  75%     (weight: 10%)
```

**Screenshot Location**: Save as `screenshots/test1-biotech-sarah-chen.png`

---

### Test Case 2: CTO Search Discussion

**Navigate to**: "CTO Search Discussion" conversation page

**Expected Top Match**: Alex Kumar (3⭐)

**Validation Checklist**:

- [ ] Alex Kumar appears as top match
- [ ] Alex Kumar has 3 stars
- [ ] Role match score is 100% (VP Engineering matches CTO need)
- [ ] Bio mentions "CTO opportunities" and "health tech"
- [ ] Confidence score: Medium-High (50-80%)
- [ ] AI explanation mentions technical leadership

**Expected Score Breakdown**:
```
Embedding:     65-75%
Semantic:      50-60%
Tag Overlap:   40-50%
Role Match:    100%    ← Should be perfect
Geo Match:     0-50%
Relationship:  45%
```

**Screenshot Location**: `screenshots/test2-cto-alex-kumar.png`

---

### Test Case 3: Fintech Investor Introduction (Name Match Test)

**Navigate to**: "Fintech Investor Introduction" conversation page

**Expected Top Match**: Robert Smith (3⭐)

**Critical Validation** (tests fuzzy name matching):

- [ ] Robert Smith appears as match (even though mentioned as "Bob Smith")
- [ ] Has 3 stars (name boost should push score high)
- [ ] **Name Match Boost** visible in score breakdown: ~90%
- [ ] Reasons include: "Name mentioned" or "Similar name: Robert Smith"
- [ ] Name match boost added ~0.27 to raw score (+30% × 90%)

**Expected Score Breakdown**:
```
Embedding:     55-65%
Semantic:      45-55%
Tag Overlap:   50-60%
Role Match:    80%
Geo Match:     0-50%
Relationship:  80%
Name Match:    90%     ← NAME BOOST (adds 0.27 to total)
```

**Why This Test Matters**: Validates that "Bob" correctly matches "Robert" via nickname fuzzy matching.

**Screenshot Location**: `screenshots/test3-name-match-bob-robert.png`

---

### Test Case 4: Enterprise SaaS Product Strategy

**Navigate to**: "Enterprise SaaS Product Strategy" conversation page

**Expected Top Match**: Michael Rodriguez (2-3⭐)

**Validation Checklist**:

- [ ] Michael Rodriguez appears in top 3 matches
- [ ] Has 2 or 3 stars
- [ ] Tag overlap includes "SaaS", "Enterprise Software", "Series A"
- [ ] Multiple relevant matches (3-5 total)
- [ ] Emma Davis may appear (marketing/sales need)

**Screenshot Location**: `screenshots/test4-saas-michael.png`

---

### Test Case 5: Office Logistics Discussion (No Match Test)

**Navigate to**: "Office Logistics Discussion" conversation page

**Expected Result**: Zero or very low matches

**Validation Checklist**:

- [ ] No matches OR all matches have 1 star or less
- [ ] No 3-star matches (would be false positive)
- [ ] No 2-star matches (would be false positive)
- [ ] Message shown: "No strong matches found" or similar

**Why This Test Matters**: Confirms system doesn't generate false positives for irrelevant conversations.

**Screenshot Location**: `screenshots/test5-no-match-office.png`

---

## Step 4: Check Component Scores

For each match, click "View Score Breakdown" and verify:

### 1. All Components Visible

- [ ] Embedding Score (if OPENAI_API_KEY set)
- [ ] Semantic Score (keyword matching)
- [ ] Tag Overlap Score (Jaccard similarity)
- [ ] Role Match Score
- [ ] Geographic Match Score
- [ ] Relationship Score
- [ ] Name Match Boost (if name mentioned)

### 2. Weights Display Correctly

Example display:
```
Embedding: 75% × 30% = 22.5%
Tag Overlap: 65% × 30% = 19.5%
```

### 3. Confidence Scores Present

- Overall: 0-100%
- Level indicator: High / Medium / Low
- Individual component confidence scores

### 4. Match Version

- Shows: "v1.1-transparency"
- If missing, matches may be from older algorithm

## Step 5: Validate AI Explanations

For all 2+ star matches:

**Check Quality**:
- [ ] Explanation is specific, not generic
- [ ] Mentions why connection is mutually beneficial
- [ ] No phrases like "perfect fit" or "ideal match"
- [ ] 1-2 sentences long
- [ ] Professionally written

**Example Good Explanation**:
> "Sarah's deep expertise in AI-driven drug discovery and her active investment thesis in biotech therapeutics aligns well with your seed-stage platform, and her scientific background could provide valuable strategic guidance beyond capital."

**Example Bad Explanation** (too generic):
> "This person is a perfect fit for your needs and would be an ideal match."

## Step 6: Performance Validation

Check browser Network tab or terminal logs:

**Expected Timings**:
- Entity extraction: 5-15 seconds
- Embedding generation: 2-5 seconds  
- Match generation: 0.5-2 seconds
- Total: 10-25 seconds

**Red Flags** (needs investigation):
- Total > 30 seconds
- Any step > 15 seconds
- Frequent timeouts

## Step 7: Edge Case Testing

### Test: Empty Conversation

Create a conversation with minimal text:
- Title: "Test Empty"
- Transcript: "Hello. Yes. Ok. Bye."

**Expected**: Zero matches or very low scores

### Test: No Contacts

If possible, test with a fresh user account with zero contacts:

**Expected**: Empty matches array, no errors

### Test: Name Variations

Test fuzzy matching with other nicknames:
- "Matt" should match "Matthew"
- "Mike Rodriguez" should match "Michael Rodriguez"
- "Jim Wilson" should match "James Wilson"

## Validation Report Template

After completing validation, create `MATCH_VALIDATION_RESULTS.md`:

```markdown
# Match Validation Results

**Date**: [Date]
**Tester**: [Your Name]
**Environment**: Local Dev / Staging / Production

## Summary

| Test Case | Status | Top Match | Stars | Issues |
|-----------|--------|-----------|-------|--------|
| Biotech Seed Round | ✅ / ❌ | Sarah Chen | 3⭐ | [list issues] |
| CTO Search | ✅ / ❌ | Alex Kumar | 3⭐ | [list issues] |
| Name Match (Bob→Robert) | ✅ / ❌ | Robert Smith | 3⭐ | [list issues] |
| SaaS Strategy | ✅ / ❌ | Michael Rodriguez | 2⭐ | [list issues] |
| Office Logistics | ✅ / ❌ | None | 0⭐ | [list issues] |

**Pass Rate**: X/5 (X%)

## Detailed Findings

### Test 1: Biotech Seed Round Discussion

**Status**: ✅ PASS / ❌ FAIL

**Top Match**: Sarah Chen (3⭐)

**Score Breakdown**:
- Embedding: 78%
- Tag Overlap: 67%
- Role Match: 85%
- [etc.]

**AI Explanation**: "[paste explanation]"

**Issues Found**:
- [Issue 1]
- [Issue 2]

**Screenshot**: [link]

[Repeat for each test case]

## Overall Assessment

- **Match Quality**: Excellent / Good / Needs Improvement / Poor
- **Confidence Scores**: Accurate / Somewhat Accurate / Inaccurate
- **AI Explanations**: High Quality / Acceptable / Needs Work
- **Performance**: Fast (<10s) / Acceptable (10-20s) / Slow (>20s)

## Recommendations

1. [Action item 1]
2. [Action item 2]

## Blocker Issues

- [ ] [Critical issue that must be fixed]

## Nice-to-Have Improvements

- [ ] [Enhancement suggestion]
```

## Troubleshooting

### Issue: No Matches Generated

**Diagnosis**:
1. Check conversation has transcript segments
2. Check entities were extracted (Supabase → conversation_entities table)
3. Check contacts exist for the user
4. Check terminal logs for errors

**Solution**: Re-run entity extraction or check API logs

### Issue: Embeddings Failing (400 Error)

**Symptom**: `embed-conversation` returns 400 in Network tab

**Solution**:
1. Embeddings are optional - system falls back to keyword matching
2. To fix: Set `OPENAI_API_KEY` in Supabase Edge Function secrets
3. Without embeddings, semantic weight changes from 30% to 20%

### Issue: Name Match Not Working

**Check**:
1. Entities table has person_name entries
2. Contact names match format (first + last)
3. Nickname in dictionary (lines 66-109 in generate-matches/index.ts)

### Issue: Poor Match Quality

**Investigation**:
1. Expand score breakdown - which component is low?
2. Check if contacts have rich bios and thesis data
3. Verify conversation has good entity extraction
4. Check confidence scores - low confidence means sparse data

## Success Criteria

✅ The matching system is validated when:

- [ ] 4/5 test cases pass (80% pass rate minimum)
- [ ] Sarah Chen is top match for Biotech (3⭐)
- [ ] Alex Kumar is top match for CTO (3⭐)
- [ ] Robert Smith matches "Bob Smith" (3⭐, name boost)
- [ ] Office Logistics has no 2+ star matches (no false positives)
- [ ] Score breakdowns display all 6 components
- [ ] Confidence scores reflect data quality
- [ ] AI explanations are specific and relevant
- [ ] Performance < 20 seconds per regeneration
- [ ] No JavaScript errors in console
- [ ] Match version shows v1.1-transparency

## Next Steps After Validation

### If All Tests Pass ✅

1. Document results in `MATCH_VALIDATION_RESULTS.md`
2. Take screenshots of top matches
3. Test with real user data (if available)
4. Consider deploying to production
5. Monitor match quality feedback from users

### If Tests Fail ❌

1. Document specific failures
2. Investigate root cause (check logs, database, code)
3. Fix critical issues
4. Re-run validation
5. Repeat until tests pass

## Automated Validation (Future)

Once test data is confirmed working, you can run:

```bash
npx tsx scripts/validate-matching.ts
```

This will automatically check all test cases and generate a report.

**Note**: Requires test data to be created first and SUPABASE_SERVICE_ROLE_KEY in .env
