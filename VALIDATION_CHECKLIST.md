# Quick Validation Checklist

Use this checklist to quickly validate matching system quality.

## Pre-Validation Setup

- [ ] Dev server running (`npm run dev`)
- [ ] User logged in
- [ ] Test data created (run `TEST_DATASET.sql`)
- [ ] Matches regenerated for each test conversation

## Test Results

### Test 1: Biotech → Sarah Chen (3⭐)
- [ ] Sarah Chen is top match
- [ ] Has 3 stars
- [ ] Tag overlap > 50%
- [ ] AI explanation present
- [ ] Confidence: High

**Notes**: ________________________________________________

### Test 2: CTO → Alex Kumar (3⭐)
- [ ] Alex Kumar is top match
- [ ] Has 3 stars
- [ ] Role match = 100%
- [ ] AI explanation mentions technical leadership

**Notes**: ________________________________________________

### Test 3: Name Match → Robert Smith (3⭐)
- [ ] Robert Smith matches "Bob Smith"
- [ ] Has 3 stars
- [ ] Name match boost visible (~90%)
- [ ] Reasons mention name

**Notes**: ________________________________________________

### Test 4: SaaS → Michael Rodriguez (2-3⭐)
- [ ] Michael Rodriguez in top 3
- [ ] Has 2-3 stars
- [ ] Tags include SaaS, Series A

**Notes**: ________________________________________________

### Test 5: Office Logistics → No Matches (0-1⭐)
- [ ] Zero matches OR all ≤ 1 star
- [ ] No false positives

**Notes**: ________________________________________________

## Score Breakdown Validation

For any match, expand score breakdown:

- [ ] All 6 components visible
- [ ] Weights shown (e.g., "30% × 75%")
- [ ] Confidence scores present
- [ ] Match version: v1.1-transparency

## Performance Check

- [ ] Entity extraction: < 15s
- [ ] Match generation: < 5s
- [ ] Total time: < 25s
- [ ] No errors in console

## Final Assessment

**Pass Rate**: _____ / 5 tests (____%)

**Overall Quality**: ⭐⭐⭐ Excellent / ⭐⭐ Good / ⭐ Needs Work

**Blocker Issues**: 
________________________________________________

**Ready for Production**: YES / NO

**Signature**: _________________ **Date**: _________
