# Contact Enrichment Testing Guide

## Overview

This guide covers how to test the enhanced contact enrichment system with Proxycurl, Serper, and GPT-4o-mini integration.

## Prerequisites

1. **Apply database migration:**
   ```bash
   cd /Users/jacksonwittenberg/dev/projects/social_graph_v2
   supabase db push
   ```

2. **Set API keys as Supabase secrets:**
   ```bash
   # Required
   supabase secrets set OPENAI_API_KEY=your_key_here
   supabase secrets set SERPER_API_KEY=your_key_here
   
   # Optional (for LinkedIn enrichment)
   supabase secrets set PROXYCURL_API_KEY=your_key_here
   ```

3. **Deploy updated functions:**
   ```bash
   supabase functions deploy research-contact
   supabase functions deploy generate-matches
   ```

## Testing Checklist

### Phase 1: Basic Enrichment (Without Proxycurl)

Test the Serper + GPT enrichment flow:

1. **Create or select a test contact:**
   - Name: "Sarah Chen"
   - Company: "BioVentures Capital"
   - Title: "Partner"
   - LinkedIn URL: (leave empty for now)

2. **Trigger enrichment:**
   - Open Contacts page
   - Click the Sparkles (✨) icon on the contact
   - Watch the progress indicators

3. **Expected results:**
   - Bio should be filled (2-3 sentences)
   - Title should be updated if more specific
   - Data completeness score should appear (aim for 40-60%)

4. **Check logs:**
   ```bash
   supabase functions logs research-contact --tail
   ```
   Look for:
   - `[Research] Using Chat API with web search`
   - `[Research] Found X search result sets`
   - `Data completeness score: XX`

### Phase 2: LinkedIn Enrichment (With Proxycurl)

Test the full enrichment flow with LinkedIn profile scraping:

1. **Add Proxycurl API key** (if not already set)

2. **Select a contact with LinkedIn URL:**
   - Name: Someone with a public LinkedIn profile
   - LinkedIn URL: Full LinkedIn profile URL
   - Example: https://www.linkedin.com/in/satyanadella/

3. **Trigger enrichment:**
   - Click Sparkles icon
   - Watch for "Checking LinkedIn profile data (Proxycurl)" in progress

4. **Expected results:**
   - Bio filled with LinkedIn summary
   - Education section appears with schools, degrees, years
   - Career history shows previous roles
   - Expertise areas populated with skills
   - Personal interests (if found in LinkedIn profile)
   - Data completeness score 70-90%

5. **Verify in ContactCard:**
   - Education icon (🎓) with schools
   - Career icon (💼) with previous roles
   - Lightbulb icon (💡) with expertise
   - Heart icon (❤️) with interests
   - Completeness badge shows percentage

### Phase 3: Investor Enrichment

Test enrichment for investor contacts:

1. **Create investor contact:**
   - Name: Known investor (e.g., "Roy Bahat")
   - Company: VC firm (e.g., "Bloomberg Beta")
   - Contact Type: "GP"
   - LinkedIn URL: (if available)

2. **Trigger enrichment**

3. **Expected results:**
   - Bio mentions investment focus
   - Portfolio companies appear (if public data available)
   - Investment thesis extracted
   - Sectors, stages populated in thesis section
   - Data completeness 60-80%

### Phase 4: Match Quality Testing

Test if enriched data improves matching:

1. **Create a conversation with rich context:**
   - Record or create a conversation segment
   - Mention: "Looking for biotech investor, MIT alum who understands drug discovery"

2. **Extract entities:**
   - Wait for automatic entity extraction
   - Verify entities: sector=biotech, person_attributes=MIT

3. **Generate matches:**
   - Navigate to conversation detail page
   - Check match suggestions

4. **Expected improvements:**
   - Contacts with MIT education should rank higher (personal affinity)
   - Contacts with "drug discovery" in expertise areas should rank higher
   - Match reasons should include: "Shared education: MIT" or "Expertise match: drug discovery"

5. **Check score breakdown:**
   - Personal affinity component should be > 0 for enriched contacts
   - Overall scores should be higher for well-enriched contacts

## Test Scenarios

### Scenario 1: LinkedIn Profile with Rich Data

**Contact:** Corporate executive with full LinkedIn profile

**Expected enrichment:**
- Education: 2-3 entries
- Career history: 3-5 entries  
- Expertise: 5-10 items
- Completeness: 80-90%

**Cost:** $0.02-0.10 (Proxycurl) + $0.01 (GPT)

### Scenario 2: Investor with Portfolio

**Contact:** VC partner with Crunchbase profile

**Expected enrichment:**
- Bio mentioning investment focus
- Portfolio: 5-15 companies
- Thesis keywords extracted
- Completeness: 60-70%

**Cost:** $0.01 (Serper) + $0.01 (GPT)

### Scenario 3: Minimal Public Data

**Contact:** Startup founder with no LinkedIn

**Expected enrichment:**
- Basic bio generated from company/title
- Limited additional data
- Completeness: 30-40%

**Cost:** $0.01 (GPT only)

## Validation Checklist

- [ ] Database migration applied successfully
- [ ] New fields visible in Supabase dashboard
- [ ] Enrichment dialog shows updated progress indicators
- [ ] ContactCard displays education section
- [ ] ContactCard displays career history section
- [ ] ContactCard displays expertise badges
- [ ] ContactCard displays personal interests
- [ ] ContactCard displays portfolio companies (for investors)
- [ ] Data completeness badge appears with correct color
- [ ] Match algorithm includes personal affinity scoring
- [ ] Match reasons include education/interest overlap
- [ ] Enrichment metadata tracked (last_enriched_at, enrichment_source)

## Monitoring

### Check enrichment performance:
```bash
# View recent enrichments
supabase functions logs research-contact --tail

# Check for errors
supabase functions logs research-contact | grep ERROR
```

### SQL queries for analysis:
```sql
-- Check enrichment coverage
SELECT 
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN last_enriched_at IS NOT NULL THEN 1 END) as enriched_contacts,
  AVG(data_completeness_score) as avg_completeness,
  COUNT(CASE WHEN education IS NOT NULL AND jsonb_array_length(education) > 0 THEN 1 END) as has_education,
  COUNT(CASE WHEN personal_interests IS NOT NULL AND array_length(personal_interests, 1) > 0 THEN 1 END) as has_interests
FROM contacts;

-- Check enrichment sources
SELECT 
  enrichment_source,
  COUNT(*) as contact_count,
  AVG(data_completeness_score) as avg_completeness
FROM contacts
WHERE enrichment_source IS NOT NULL
GROUP BY enrichment_source;

-- Find contacts needing enrichment
SELECT 
  id, 
  name, 
  data_completeness_score,
  last_enriched_at
FROM contacts
WHERE data_completeness_score < 50
  OR last_enriched_at IS NULL
ORDER BY data_completeness_score ASC
LIMIT 20;
```

## Troubleshooting

### Issue: Enrichment fails with "Proxycurl API failed"

**Solution:** 
- Check Proxycurl API key is set
- Verify account has credits
- System will fall back to Serper automatically

### Issue: Education/career fields not appearing

**Solution:**
- Check database migration was applied
- Verify `contacts` table has new columns
- Redeploy frontend: `npm run build`

### Issue: Completeness score is 0

**Solution:**
- Check data-quality.ts module is deployed
- Verify calculateCompletenessScore is called in research-contact
- Check logs for calculation errors

### Issue: Personal affinity always 0 in matches

**Solution:**
- Verify contacts have enrichment data (education, interests)
- Check conversation context has target_person data
- Review generate-matches logs for personal affinity calculation

## Cost Tracking

Track enrichment costs over time:

| Enrichments | Proxycurl | Serper | GPT | Total |
|-------------|-----------|--------|-----|-------|
| 100 | $2-10 | $1 | $1 | $4-12 |
| 500 | $10-50 | $5 | $5 | $20-60 |
| 1000 | $20-100 | $10 | $10 | $40-120 |

**Note:** Costs vary based on:
- Proxycurl cache hit rate (cached = $0.02, fresh = $0.10)
- Search result count (more results = higher GPT costs)
- Bio length (longer bios = more tokens)

## Next Steps

1. Run through all test scenarios above
2. Document any issues or unexpected behavior
3. Measure match quality improvements:
   - Before: Average match score ~0.15 (raw)
   - After: Target match score ~0.35+ (raw)
4. Analyze enrichment coverage:
   - Target: 70%+ of contacts with data_completeness_score > 60
5. Monitor costs over first 100 enrichments
6. Iterate on GPT prompts if extraction quality is low
