# Test Data Setup - Matching System Validation

## Overview

This document describes the comprehensive test data created to validate the matching system with multiple scenarios: fundraising, hiring, and partnerships.

**Conversation ID:** `0ff8bfc6-178a-4cb9-a1e9-9245933293e4`
**Test URL:** http://localhost:3005/conversation/0ff8bfc6-178a-4cb9-a1e9-9245933293e4

## Data Populated

### Phase 1: Updated Existing Investors (5 contacts)

All existing investors now have complete thesis data with sectors, stages, geos, and check sizes:

1. **Keith Bender** (Pear VC)
   - Sectors: FinTech, B2B SaaS, Enterprise Software
   - Stages: Seed, Series A
   - Geos: San Francisco, Palo Alto, Bay Area
   - Check Size: $500K - $3M
   - **Expected Match:** 2-3 stars (Series A, FinTech, SF-based)

2. **Patrick Klas** (MGV.VC)
   - Sectors: FinTech, InsurTech, Healthcare
   - Stages: Series A, Series B
   - Geos: United States, New York
   - Check Size: $2M - $10M
   - **Expected Match:** 2 stars (Series A, FinTech, but higher check size)

3. **Pedro Sorrentino** (Atman Capital)
   - Sectors: FinTech, AI/ML, Blockchain
   - Stages: Pre-Seed, Seed, Series A
   - Geos: Global, Latin America, United States
   - Check Size: $250K - $5M
   - **Expected Match:** 2 stars (FinTech, stage overlap)

4. **Han Shen** (iFly.vc)
   - Sectors: FinTech, Marketplace, Consumer
   - Stages: Seed, Series A, Series B
   - Geos: Asia, China, Southeast Asia
   - Check Size: $1M - $8M
   - **Expected Match:** 2 stars (FinTech, Series A, but Asia-focused)

5. **Ethan Austin** (Outside VC)
   - Sectors: FinTech, Climate Tech, Real Estate Tech
   - Stages: Series A, Series B, Series C
   - Geos: United States, Europe
   - Check Size: $3M - $15M
   - **Expected Match:** 1-2 stars (FinTech, Series A, but higher stage)

### Phase 2: New Test Contacts (6 contacts)

#### Investors (for Fundraising Matches)

1. **Sarah Chen** - Fintech Ventures
   - Title: Partner
   - Bio: 15 years in FinTech investing. Led investments in Stripe, Plaid, and Chime
   - Sectors: FinTech, Payment Processing, Embedded Finance
   - Stages: Series A, Series B
   - Geos: San Francisco, United States
   - Check Size: $5M - $20M
   - **Expected Match:** ⭐⭐⭐ 3 stars (Perfect match: Series A, FinTech, payment focus, SF)

2. **Marcus Rodriguez** - Seedstage Capital
   - Title: Managing Director
   - Bio: Former engineering lead at Square. Early-stage FinTech infrastructure
   - Sectors: FinTech, Developer Tools, API Infrastructure
   - Stages: Pre-Seed, Seed
   - Geos: Remote, United States, Global
   - Check Size: $500K - $3M
   - **Expected Match:** ⭐⭐ 2 stars (Stage overlap Seed/Series A, FinTech)

#### Engineers (for Hiring Matches)

3. **Alex Thompson** - Coinbase
   - Title: Staff Software Engineer - Payments
   - Bio: 10+ years building payment systems. Led Coinbase payment infrastructure
   - **Expected Match:** ⭐⭐⭐ 3 stars (Perfect hiring match: payment systems, senior level)

4. **Priya Patel** - Plaid
   - Title: Engineering Manager - Banking APIs
   - Bio: Scaling FinTech teams. Previously at Stripe and Robinhood
   - **Expected Match:** ⭐⭐⭐ 3 stars (Perfect hiring match: FinTech eng leader)

#### Partnerships (for Partnership Matches)

5. **David Kim** - PayFlow
   - Title: CEO & Co-founder
   - Bio: Building B2B payment infrastructure. Series A stage ($8M raised)
   - **Expected Match:** ⭐⭐ 2 stars (Partnership match: payment infrastructure)

6. **Jennifer Wu** - LendTech Solutions
   - Title: VP of Partnerships
   - Bio: Series B lending platform. Seeking API integrations with payment processors
   - **Expected Match:** ⭐⭐ 2-3 stars (Partnership match: lending + payments)

### Phase 3: Enhanced Conversation Transcript

The conversation now includes 7 detailed segments covering:

**Segment 1 (0ms):** Fundraising context
- "Building a B2B payment infrastructure platform, like Stripe for lending"

**Segment 2 (5000ms):** Traction and round details
- "$2M in ARR, 20% MoM growth"
- "Series A round, $5-8 million range"

**Segment 3 (10000ms):** Investor criteria
- "FinTech infrastructure investors"
- "Payment processing and lending platforms expertise"
- "Based in San Francisco"

**Segment 4 (15000ms):** Hiring needs
- "Staff Engineer or Engineering Manager level"
- "Built payment systems at scale"
- "From Stripe, Plaid, or Coinbase"

**Segment 5 (20000ms):** Partnership needs
- "Lending platforms" for partnerships
- "Payment processors expanding into lending"

**Segment 6 (25000ms):** Summary of needs
- Series A investors focused on FinTech
- Experienced payment engineers
- Founders building in lending space

**Segment 7 (30000ms):** Company details
- Company name: PaymentCore
- At inflection point

## Expected Entity Extraction

When "Regenerate Matches" is clicked, the system should extract:

### Sectors
- FinTech
- Payment Processing
- Lending
- B2B SaaS
- Infrastructure

### Stages
- Series A

### Geos
- San Francisco
- United States

### Roles/Personas
- Staff Engineer
- Engineering Manager
- VP of Partnerships
- Investors

### Companies Mentioned
- Stripe
- Plaid
- Coinbase

### Check Sizes
- $5M - $8M range

## Expected Matching Results

### Total Expected Matches: 10-12

#### Fundraising Matches (7 expected)

**3-Star Matches (⭐⭐⭐):**
1. Sarah Chen (Fintech Ventures) - Perfect: Series A, FinTech, payment processing, SF, right check size
2. Keith Bender (Pear VC) - Excellent: Series A, FinTech, Bay Area, payment infrastructure interest

**2-Star Matches (⭐⭐):**
3. Marcus Rodriguez (Seedstage Capital) - Good: FinTech, API infrastructure, stage overlap
4. Patrick Klas (MGV.VC) - Good: Series A, FinTech, but higher check size
5. Pedro Sorrentino (Atman Capital) - Good: FinTech, payment processing, stage overlap
6. Han Shen (iFly.vc) - Moderate: FinTech, Series A, but Asia-focused
7. Ethan Austin (Outside VC) - Moderate: FinTech, Series A, but later stage

#### Hiring Matches (2 expected)

**3-Star Matches (⭐⭐⭐):**
1. Alex Thompson (Coinbase) - Perfect: Staff Engineer, payment systems expertise
2. Priya Patel (Plaid) - Perfect: Engineering Manager, FinTech scaling experience

#### Partnership Matches (2-3 expected)

**2-3 Star Matches (⭐⭐⭐ / ⭐⭐):**
1. Jennifer Wu (LendTech Solutions) - Excellent: VP Partnerships, lending platform, API integrations
2. David Kim (PayFlow) - Good: CEO, B2B payments, Series A stage

## Testing Instructions

### 1. Navigate to Conversation
```
http://localhost:3005/conversation/0ff8bfc6-178a-4cb9-a1e9-9245933293e4
```

### 2. Click "Regenerate Matches"
- Open browser DevTools (F12) and watch the Console tab
- Look for the API calls to extract-entities and generate-matches

### 3. Verify Entity Extraction
Check the console for logs showing:
```
Extract entities successful:
- Sectors: FinTech, Payment Processing, Lending
- Stages: Series A
- Geos: San Francisco
- Roles: Staff Engineer, Engineering Manager
```

### 4. Verify Match Generation
The UI should display match cards for 10+ contacts with:
- Star ratings (1-3 stars)
- Match reasons (tags matched, role fit, etc.)
- AI-generated explanations (for 2-3 star matches)
- Contact details (name, company, title, bio)

### 5. Check Match Quality

**Look for these specific matches:**
- ✅ Sarah Chen should be 3-star (perfect Series A FinTech match)
- ✅ Alex Thompson should be 3-star (perfect hiring match)
- ✅ Priya Patel should be 3-star (perfect hiring match)
- ✅ Keith Bender should be 2-3 star (strong FinTech + Bay Area match)
- ✅ Jennifer Wu should be 2-3 star (lending + payments partnership)

### 6. Validate Match Transparency

For each match card, verify the expanded details show:
- **Score Breakdown:** semantic, tagOverlap, roleMatch, geoMatch, relationship scores
- **Confidence Scores:** individual confidence for each component
- **Match Reasons:** specific tags/sectors/stages that matched
- **AI Explanation:** contextual explanation of why this is a good match

## Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check all investor contacts have theses
SELECT c.name, c.company, c.is_investor, c.check_size_min, c.check_size_max,
       t.sectors, t.stages, t.geos
FROM contacts c
LEFT JOIN theses t ON c.id = t.contact_id
WHERE c.owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'
AND c.is_investor = true
ORDER BY c.name;

-- Check new test contacts were created
SELECT name, company, title, category, bio
FROM contacts
WHERE name IN ('Sarah Chen', 'Marcus Rodriguez', 'Alex Thompson', 'Priya Patel', 'David Kim', 'Jennifer Wu')
AND owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe74'
ORDER BY name;

-- Check enhanced transcript
SELECT timestamp_ms, speaker, LEFT(text, 100) as preview
FROM conversation_segments
WHERE conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4'
ORDER BY timestamp_ms;

-- Check entities extracted (after regenerating matches)
SELECT entity_type, value, confidence
FROM conversation_entities
WHERE conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4'
ORDER BY entity_type, confidence DESC;

-- Check match suggestions (after regenerating matches)
SELECT ms.score, c.name, c.company, c.title,
       ms.reasons, ms.ai_explanation
FROM match_suggestions ms
JOIN contacts c ON ms.contact_id = c.id
WHERE ms.conversation_id = '0ff8bfc6-178a-4cb9-a1e9-9245933293e4'
ORDER BY ms.score DESC, c.name;
```

## Troubleshooting

### No Matches Generated
1. Check if entities were extracted: `SELECT * FROM conversation_entities WHERE conversation_id = '...'`
2. Check if contacts have theses: `SELECT * FROM theses WHERE contact_id IN (...)`
3. Check browser console for API errors
4. Check Supabase function logs for extract-entities and generate-matches

### Fewer Matches Than Expected
- Verify all 5 existing investors have updated theses (check `theses` table)
- Verify all 6 new contacts were created (check `contacts` table)
- Check if RLS is still disabled on relevant tables
- Verify matching threshold settings (default: score >= 0.05 for 1 star)

### Wrong Match Scores
- Check score_breakdown in match_suggestions table
- Verify thesis data matches conversation content
- Check if semantic embedding matching is working (context_embedding field)

## Success Criteria

✅ **Phase 1:** 5 existing investor contacts have populated theses  
✅ **Phase 2:** 6 new test contacts created with complete profiles  
✅ **Phase 3:** Conversation transcript enhanced with 7 detailed segments  
✅ **Phase 4:** Migration applied successfully to database  
✅ **Phase 5:** "Regenerate Matches" returns 10+ matches  
✅ **Phase 6:** Matches span all three categories (fundraising, hiring, partnerships)  
✅ **Phase 7:** Match scores align with expectations  
✅ **Phase 8:** AI explanations are relevant and specific  
✅ **Phase 9:** Match transparency features show score breakdowns  

## Next Steps

After successful validation:
1. Test with additional conversation types (hiring-only, partnership-only)
2. Test edge cases (no matching contacts, single contact)
3. Validate AI explanation quality and relevance
4. Test real-time matching during active recordings
5. Verify match status updates (promised, intro_made, dismissed)
