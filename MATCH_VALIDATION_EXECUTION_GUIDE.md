# Match Validation Execution Guide

**Status**: Ready to Execute
**Date**: 2026-01-18
**Your App**: http://localhost:3001

---

## Current State

✅ **Test data verified**:
- 10 test contacts created (Sarah Chen, Robert Smith, Alex Kumar, etc.)
- 5 test conversations created with entities
- All data properly configured in database

❌ **Matches not yet generated**:
- No matches exist for any test conversation
- Need to run "Regenerate Matches" for each one

---

## Execution Instructions

### Open Your App
Go to: **http://localhost:3001**

### Test Each Conversation in Order

For each conversation below:
1. Find it in your conversation list
2. Click to open the conversation detail page
3. Click **"Regenerate Matches"** button
4. Wait 10-20 seconds
5. Record results in the tracking table below

---

## Test 1: Biotech Seed Round Discussion

**Conversation ID**: `e1b8f1a5-6ad3-4c3f-bf3f-87bd926e655f`

### How to Find It
- Look for title: **"Biotech Seed Round Discussion"**
- Created: Jan 18, 2026
- Duration: 30 minutes

### Expected Result
**Top Match**: Sarah Chen (3⭐⭐⭐)

**Why**: 
- Name mentioned: "Dr. Sarah Chen" 
- Perfect sector match: Biotech, Healthcare, AI drug discovery
- Perfect stage match: Seed, Pre-seed
- Check size fits: $500K-$2M range covers $1.5M ask

### Validation Checklist
- [ ] Sarah Chen appears as top match
- [ ] Sarah Chen has 3 stars
- [ ] Click to expand score breakdown
- [ ] Check "Name Match" component shows boost
- [ ] Check "Tag Overlap" shows Biotech, Healthcare
- [ ] Check AI explanation exists
- [ ] Take screenshot

### Record Results
**Actual Top Match**: _______________
**Actual Stars**: ___
**Issues**: _______________

---

## Test 2: CTO Search Discussion

**Conversation ID**: `63e7b45b-70d5-4fd6-8108-ca6096fe79ba`

### How to Find It
- Look for title: **"CTO Search Discussion"**
- Created: Jan 18, 2026
- Duration: 20 minutes

### Expected Result
**Top Match**: Alex Kumar (3⭐⭐⭐)

**Why**:
- Title match: "VP Engineering" → CTO role needed
- Tech stack match: Python, Kubernetes, cloud
- Industry match: Health tech interest
- Explicit: "Open to CTO opportunities"

### Validation Checklist
- [ ] Alex Kumar appears as top match
- [ ] Alex Kumar has 3 stars
- [ ] Role match score is 100%
- [ ] Check score breakdown
- [ ] Take screenshot

### Record Results
**Actual Top Match**: _______________
**Actual Stars**: ___
**Issues**: _______________

---

## Test 3: Fintech Investor Introduction

**Conversation ID**: `3600d6e1-2134-4708-8fb9-c70c11940f70`

### How to Find It
- Look for title: **"Fintech Investor Introduction"**
- Created: Jan 18, 2026
- Duration: 15 minutes

### Expected Result
**Top Match**: Robert Smith (3⭐⭐⭐)

**Why**:
- **NAME MATCH**: "Bob Smith" mentioned → "Robert Smith" (fuzzy match)
- Perfect sector match: Fintech
- Stage match: Seed
- Highest relationship: 80

### Validation Checklist
- [ ] Robert Smith appears as match
- [ ] Robert Smith has 3 stars
- [ ] **CRITICAL**: Check if "Name Match" boost shows (~90%)
- [ ] Check if fuzzy matching worked (Bob → Robert)
- [ ] Check terminal logs for "Name match found" message
- [ ] Take screenshot

### Record Results
**Actual Top Match**: _______________
**Actual Stars**: ___
**Name Boost Visible?**: YES / NO
**Issues**: _______________

**NOTE**: This conversation PREVIOUSLY returned zero matches. This is the critical test.

---

## Test 4: Enterprise SaaS Product Strategy

**Conversation ID**: `10d730a8-eade-41fa-9fce-abe6c201e042`

### How to Find It
- Look for title: **"Enterprise SaaS Product Strategy"**
- Created: Jan 18, 2026
- Duration: 25 minutes

### Expected Result
**Top Match**: Michael Rodriguez (2-3⭐⭐⭐ or ⭐⭐)

**Why**:
- Perfect sector match: SaaS, Enterprise Software, B2B
- Perfect stage match: Series A
- Check size fits: $3-10M covers $5-8M ask

**Secondary Matches**:
- Emma Davis (VP Marketing - for hiring need)
- David Thompson (Family office investor)

### Validation Checklist
- [ ] Michael Rodriguez in top 3
- [ ] Michael Rodriguez has 2-3 stars
- [ ] Multiple contacts matched (3-5 expected)
- [ ] Take screenshot

### Record Results
**Actual Top Match**: _______________
**Actual Stars**: ___
**Total Matches**: ___
**Issues**: _______________

---

## Test 5: Office Logistics Discussion

**Conversation ID**: `447e5550-f1a1-443e-8603-15d09c6a707c`

### How to Find It
- Look for title: **"Office Logistics Discussion"**
- Created: Jan 18, 2026
- Duration: 10 minutes

### Expected Result
**Top Match**: NONE (or all below 1 star)

**Why**:
- No business-relevant content
- No fundraising, hiring, or partnership goals
- No sectors, stages, or person names

### Validation Checklist
- [ ] Zero matches OR all matches have ≤1 star
- [ ] No 2-3 star false positives
- [ ] Take screenshot

### Record Results
**Actual Matches**: _______________
**Highest Stars**: ___
**Pass?**: YES / NO (Pass = no 2+ star matches)

---

## Monitoring During Tests

### Terminal Output
Watch your terminal for these logs after clicking "Regenerate Matches":

```
POST /api/supabase/functions/v1/extract-entities 200 in XXXms
POST /api/supabase/functions/v1/embed-conversation 200/400 in XXXms
POST /api/supabase/functions/v1/generate-matches 200 in XXXms
```

**Expected**:
- extract-entities: 200 ✅
- embed-conversation: 200 ✅ (or 400 ⚠️ if no OpenAI key - OK)
- generate-matches: 200 ✅

### Browser Console
Open DevTools (F12) → Console tab

**Look for**:
- ✅ No red errors
- ✅ API calls complete successfully
- ❌ Any JavaScript errors (report these)

---

## Results Summary Table

Fill this in as you complete each test:

| Test # | Conversation | Expected Match | Expected Stars | Actual Match | Actual Stars | Pass? | Issues |
|--------|-------------|----------------|---------------|-------------|-------------|-------|--------|
| 1 | Biotech | Sarah Chen | 3⭐ | | | ☐ | |
| 2 | CTO Search | Alex Kumar | 3⭐ | | | ☐ | |
| 3 | Fintech | Robert Smith | 3⭐ | | | ☐ | |
| 4 | SaaS | Michael Rodriguez | 2-3⭐ | | | ☐ | |
| 5 | Office | None | 0⭐ | | | ☐ | |

**Pass Rate**: ___/5 (___%)

---

## Success Criteria

### Minimum to Pass (80%)
- ✅ 4 out of 5 tests pass

### Critical Requirements
- ✅ Biotech → Sarah Chen (3⭐)
- ✅ Fintech → Robert Smith (3⭐) with name boost
- ✅ CTO → Alex Kumar (3⭐)
- ✅ Office → No false positives

### Quality Checks
- ✅ Score breakdowns display correctly
- ✅ All 6 components visible (embedding, semantic, tags, role, geo, relationship)
- ✅ Name match boost visible when applicable
- ✅ AI explanations for 2+ star matches
- ✅ Match version shows "v1.1-transparency"

---

## If Tests Fail

### Fintech Returns Zero Matches (Most Likely Issue)

**Debug Steps**:
1. Check terminal logs for:
   - "Name match found: Bob Smith ~ Robert Smith"
   - Raw scores for Robert Smith
   - "MATCH: Robert Smith (X★, raw: X.XXX)"

2. If you see Robert Smith in logs but not UI:
   - Score might be below 0.05 threshold
   - Check the raw score value

3. If you don't see Robert Smith in logs:
   - Name fuzzy matching may not be working
   - Check if other contacts match instead

### Other Tests Fail

**Check**:
- Do contacts have bios? (Yes, verified)
- Do contacts have theses? (Yes, verified)
- Are entities extracted? (Yes, verified)
- Are all contacts being scored? (Check terminal logs)

---

## After Completing All Tests

### 1. Document Results
Create `MATCH_VALIDATION_RESULTS.md` with your findings

### 2. Share with Team
- Screenshots of key matches
- Pass/fail summary
- Any issues discovered

### 3. Next Steps Based on Results

**If all tests pass (4-5/5)**:
- ✅ System validated
- ✅ Ready for production testing
- ✅ Mark validation task as complete

**If tests fail (0-3/5)**:
- ❌ Investigate root cause
- ❌ Fix matching algorithm issues
- ❌ Re-run validation

---

## Quick Reference

**App URL**: http://localhost:3001

**Test Conversations**:
1. Biotech Seed Round Discussion (`e1b8f1a5-6ad3-4c3f-bf3f-87bd926e655f`)
2. CTO Search Discussion (`63e7b45b-70d5-4fd6-8108-ca6096fe79ba`)
3. Fintech Investor Introduction (`3600d6e1-2134-4708-8fb9-c70c11940f70`) ⚠️ Critical
4. Enterprise SaaS Product Strategy (`10d730a8-eade-41fa-9fce-abe6c201e042`)
5. Office Logistics Discussion (`447e5550-f1a1-443e-8603-15d09c6a707c`)

**Expected Timeline**: 30-45 minutes total
- Test execution: 20-30 minutes (5 mins per test)
- Documentation: 10-15 minutes

---

**Ready to start? Open http://localhost:3001 and begin with Test 1!**
