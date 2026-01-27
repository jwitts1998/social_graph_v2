# Match Validation - Quick Reference Card

**App**: http://localhost:3001
**Status**: Ready to Test
**Time**: ~30 minutes

---

## Quick Test Sequence

### 1. Biotech → Sarah Chen (3⭐)
- **Find**: "Biotech Seed Round Discussion"
- **Click**: Regenerate Matches
- **Expect**: Sarah Chen, 3 stars, name boost visible
- **Critical**: Name "Dr. Sarah Chen" should match

### 2. CTO Search → Alex Kumar (3⭐)
- **Find**: "CTO Search Discussion"
- **Click**: Regenerate Matches
- **Expect**: Alex Kumar, 3 stars, role match 100%
- **Critical**: VP Engineering → CTO role match

### 3. Fintech → Robert Smith (3⭐) ⚠️ CRITICAL
- **Find**: "Fintech Investor Introduction"
- **Click**: Regenerate Matches
- **Expect**: Robert Smith, 3 stars, name boost
- **Critical**: "Bob Smith" → "Robert Smith" fuzzy match
- **Previous**: FAILED (zero matches)

### 4. SaaS → Michael Rodriguez (2-3⭐)
- **Find**: "Enterprise SaaS Product Strategy"
- **Click**: Regenerate Matches
- **Expect**: Michael Rodriguez, 2-3 stars
- **Critical**: Multiple matches (3-5 expected)

### 5. Office → No Matches (0⭐)
- **Find**: "Office Logistics Discussion"
- **Click**: Regenerate Matches
- **Expect**: Zero matches or all ≤1 star
- **Critical**: No false positives

---

## What to Watch

### Terminal (logs)
```
✅ extract-entities 200
⚠️ embed-conversation 400 (OK if no API key)
✅ generate-matches 200
```

### Browser Console (F12)
- ✅ No red errors
- ✅ All API calls succeed

### Match Cards
- ✅ Star rating displayed
- ✅ "View Details" expandable
- ✅ Score breakdown shows all 6 components
- ✅ AI explanation for 2+ stars
- ✅ Match version: "v1.1-transparency"

---

## Pass Criteria

**Minimum**: 4/5 tests pass (80%)

**Must Have**:
- ✅ Sarah Chen matches (3⭐)
- ✅ Robert Smith matches with name boost (3⭐)
- ✅ Alex Kumar matches (3⭐)
- ✅ Office has no 2+ star matches

---

## If Something Fails

### Zero Matches
→ Check terminal logs
→ Check entities extracted
→ Check contacts exist

### Wrong Match
→ Check score breakdown
→ Compare expected vs actual scores
→ Check which components scored high/low

### No Name Boost
→ Critical: Name fuzzy matching broken
→ Check terminal for "Name match found"
→ Report this immediately

---

## Documents

- **Execution Guide**: `MATCH_VALIDATION_EXECUTION_GUIDE.md`
- **Results Template**: `MATCH_VALIDATION_RESULTS.md`
- **Gap Analysis**: `match_quality_gap_analysis_report_2447bd22.plan.md`

---

**Start Testing**: Open http://localhost:3001 now!
