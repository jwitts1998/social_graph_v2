# Contact Enrichment System - Deployment Guide

## ✅ Modern Architecture (2024)

Your system uses **current best practices**:
- **Serper API** - Active Google search (✅ Already configured)
- **OpenAI GPT-4o-mini** - Latest AI model (✅ Already configured)  
- **Supabase Edge Functions** - Modern serverless
- **pgvector** - State-of-the-art semantic matching

**No outdated dependencies!** Ready to deploy immediately.

## Implementation Summary

The contact enrichment system has been fully implemented with the following components:

### 1. Database Schema ✅
- **Migration:** `20250124000000_add_enrichment_fields.sql`
- **New fields:**
  - `education` (JSONB) - School, degree, field, year
  - `career_history` (JSONB) - Previous roles and companies
  - `personal_interests` (TEXT[]) - Hobbies, sports, causes
  - `expertise_areas` (TEXT[]) - Specific domain expertise
  - `portfolio_companies` (TEXT[]) - For investors
  - `last_enriched_at` (TIMESTAMPTZ) - Enrichment timestamp
  - `enrichment_source` (TEXT) - Data source tracking
  - `data_completeness_score` (INTEGER) - Quality metric 0-100

### 2. Backend Services ✅

**Data Quality Module** (`supabase/functions/_shared/data-quality.ts`):
- `calculateCompletenessScore()` - Weighted scoring of profile completeness
- `getEnrichmentPriority()` - High/medium/low prioritization
- `getMissingCriticalFields()` - Identifies gaps
- `assessEnrichmentQuality()` - Overall quality assessment

**Enhanced Research** (`supabase/functions/research-contact/index.ts`):
- **Modern enrichment strategy:**
  1. Serper searches Google for LinkedIn, Crunchbase, company sites
  2. GPT-4o-mini extracts structured data from results
  3. Store results in new schema fields
- **Improved GPT prompts:**
  - Extract factual data only (not generated)
  - Focus on education, career, interests, expertise
  - Return structured JSON format
- **Metadata tracking:**
  - Source attribution (proxycurl, serper, proxycurl+serper)
  - Completeness scoring
  - Enrichment timestamp

**Matching Enhancement** (`supabase/functions/generate-matches/index.ts`):
- **Personal Affinity Scoring (15-20% weight):**
  - Education overlap (shared schools)
  - Personal interests alignment
  - Portfolio company overlap
  - Expertise domain matching
- **Updated weights:**
  - With embeddings: embedding 25%, tagOverlap 25%, personalAffinity 15%
  - Without embeddings: semantic 15%, tagOverlap 30%, personalAffinity 20%

### 3. Frontend Components ✅

**ContactCard** (`client/src/components/ContactCard.tsx`):
- Education display with GraduationCap icon
- Career history with Briefcase icon
- Expertise areas with Lightbulb icon
- Personal interests with Heart icon
- Portfolio companies with Building icon
- Data completeness badge (color-coded)

**EnrichmentDialog** (`client/src/components/EnrichmentDialog.tsx`):
- Updated progress indicators
- Shows Proxycurl step
- Enhanced messaging about data sources

**Contacts Page** (`client/src/pages/Contacts.tsx`):
- Passes enrichment fields to ContactCard
- Displays completeness scores
- Shows enriched data inline

### 4. TypeScript Types ✅

**Schema** (`shared/schema.ts`):
- Added enrichment fields to contacts table definition
- Proper JSONB and array types
- Drizzle ORM compatibility

## Deployment Steps

### Step 1: Apply Database Migration

```bash
cd /Users/jacksonwittenberg/dev/projects/social_graph_v2

# Apply migration to add new fields
supabase db push
```

**Verify migration:**
```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
  AND column_name IN ('education', 'career_history', 'personal_interests', 'expertise_areas', 'portfolio_companies', 'last_enriched_at', 'enrichment_source', 'data_completeness_score');
```

### Step 2: Set API Keys

```bash
# Check that required keys are already set (they should be!)
supabase secrets list

# You should see:
# ✅ OPENAI_API_KEY
# ✅ SERPER_API_KEY

# Optional: Add People Data Labs for enhanced enrichment
# supabase secrets set PDL_API_KEY=your_pdl_key_here
```

### Step 3: Deploy Edge Functions

```bash
# Deploy research-contact function (enrichment logic)
supabase functions deploy research-contact

# Deploy generate-matches function (updated matching)
supabase functions deploy generate-matches

# Verify deployments
supabase functions list
```

### Step 4: Rebuild Frontend

```bash
# Install dependencies (if new ones added)
npm install

# Build frontend with new components
npm run build

# If using Vercel/similar, push to trigger rebuild
git add .
git commit -m "feat: add contact enrichment system with Proxycurl and personal affinity matching"
git push origin main
```

### Step 5: Verify Deployment

1. **Check database:**
   ```sql
   SELECT COUNT(*) FROM contacts WHERE education IS NOT NULL;
   SELECT COUNT(*) FROM contacts WHERE personal_interests IS NOT NULL;
   ```

2. **Test enrichment:**
   - Open Contacts page in browser
   - Click Sparkles icon on a contact
   - Watch progress dialog
   - Verify new fields appear

3. **Check logs:**
   ```bash
   supabase functions logs research-contact --tail
   supabase functions logs generate-matches --tail
   ```

4. **Test matching:**
   - Create/view a conversation
   - Generate matches
   - Check match reasons include personal affinity

## Cost Optimization

### Current Configuration

**Cache-first strategy:**
- Proxycurl: Use `use_cache: 'if-present'` (cached = $0.02, fresh = $0.10)
- Fallback to Serper if Proxycurl unavailable
- GPT-4o-mini with optimized token limits

**Expected costs per enrichment:**
- Serper (Google search): $0.01
- GPT-4o-mini extraction: $0.01
- **Total:** $0.01-0.02 per contact (very affordable!)

**Monthly estimates:**
- 100 enrichments/month: $1-2
- 500 enrichments/month: $5-10
- 1000 enrichments/month: $10-20

**Very cost-effective!**

### Cost Reduction Tips

1. **Batch enrichment during off-peak:**
   - Create background job for bulk enrichment
   - Process 50-100 contacts overnight

2. **Selective enrichment:**
   - Only enrich contacts with completeness < 60%
   - Skip re-enrichment if enriched within 30 days

3. **Optimize GPT usage:**
   - Current max_tokens: 1500
   - Reduce if bios typically shorter
   - Use temperature: 0.2 (lower = fewer retries)

4. **Optional: Add People Data Labs**
   - For high-value contacts needing verified data
   - $0.01-0.05 per enrichment
   - Already integrated in `enrich-contact` function

## Success Metrics

Track these metrics to evaluate enrichment impact:

### Data Quality Metrics
```sql
-- Average completeness by enrichment source
SELECT 
  enrichment_source,
  COUNT(*) as contacts,
  AVG(data_completeness_score) as avg_score,
  ROUND(AVG(data_completeness_score)::numeric, 1) as rounded_score
FROM contacts
WHERE enrichment_source IS NOT NULL
GROUP BY enrichment_source;

-- Enrichment coverage
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN data_completeness_score >= 70 THEN 1 END) as high_quality,
  COUNT(CASE WHEN data_completeness_score >= 40 THEN 1 END) as medium_quality,
  ROUND(100.0 * COUNT(CASE WHEN data_completeness_score >= 70 THEN 1 END) / COUNT(*), 1) as pct_high
FROM contacts;
```

### Match Quality Metrics
```sql
-- Average match scores before/after enrichment
SELECT 
  DATE(created_at) as date,
  AVG(CASE 
    WHEN score >= 3 THEN 1.0
    WHEN score >= 2 THEN 0.67
    ELSE 0.33
  END) as avg_normalized_score,
  COUNT(*) as match_count
FROM match_suggestions
WHERE match_version = 'v1.1-transparency'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Personal affinity contribution
SELECT 
  COUNT(*) as matches_with_affinity,
  AVG((score_breakdown->>'personalAffinity')::float) as avg_affinity_score
FROM match_suggestions
WHERE score_breakdown->>'personalAffinity' IS NOT NULL
  AND (score_breakdown->>'personalAffinity')::float > 0;
```

### Target Goals

1. **Data Completeness:**
   - 70%+ of contacts with score ≥ 60
   - 40%+ of contacts with score ≥ 70

2. **Match Quality:**
   - Average raw match score increase from 0.15 to 0.30+
   - 3-star matches increase by 50%+
   - Personal affinity contributing to 30%+ of high-quality matches

3. **Cost Efficiency:**
   - Average cost per enrichment: < $0.05
   - 70%+ Proxycurl cache hit rate
   - < $50/month for 1000 contacts

## Rollback Plan

If issues arise, rollback in reverse order:

### 1. Disable Proxycurl (keep Serper)
```bash
supabase secrets unset PROXYCURL_API_KEY
```
System will fall back to Serper + GPT only.

### 2. Revert Matching Algorithm
Redeploy previous version:
```bash
git checkout HEAD~1 -- supabase/functions/generate-matches/index.ts
supabase functions deploy generate-matches
```

### 3. Revert Enrichment Function
```bash
git checkout HEAD~1 -- supabase/functions/research-contact/index.ts
supabase functions deploy research-contact
```

### 4. Rollback Database Migration
```sql
-- Remove new columns (data will be lost!)
ALTER TABLE contacts 
  DROP COLUMN IF EXISTS education,
  DROP COLUMN IF EXISTS career_history,
  DROP COLUMN IF EXISTS personal_interests,
  DROP COLUMN IF EXISTS expertise_areas,
  DROP COLUMN IF EXISTS portfolio_companies,
  DROP COLUMN IF EXISTS last_enriched_at,
  DROP COLUMN IF EXISTS enrichment_source,
  DROP COLUMN IF EXISTS data_completeness_score;
```

## Monitoring & Alerts

### Set up monitoring:

1. **Enrichment failures:**
   ```bash
   # Check for errors in last hour
   supabase functions logs research-contact --since=1h | grep ERROR
   ```

2. **Cost tracking:**
   - Monitor Proxycurl dashboard for credit usage
   - Track OpenAI API usage
   - Set budget alerts in each service

3. **Performance:**
   - Average enrichment time: 10-20 seconds
   - Match generation time: < 5 seconds
   - Database query performance

### Alert thresholds:

- Enrichment error rate > 10%
- Average enrichment time > 30 seconds
- Daily enrichment cost > $5
- Proxycurl credit balance < 100

## Documentation Links

- **Setup Guide:** `PROXYCURL_SETUP.md`
- **Testing Guide:** `ENRICHMENT_TESTING_GUIDE.md`
- **Implementation Plan:** `.cursor/plans/contact_enrichment_strategy_*.plan.md`
- **API Documentation:**
  - Proxycurl: https://nubela.co/proxycurl/docs
  - Serper: https://serper.dev/docs
  - OpenAI: https://platform.openai.com/docs

## Support

For issues or questions:

1. Check logs: `supabase functions logs <function-name>`
2. Review testing guide for troubleshooting
3. Verify API keys are set correctly
4. Check database migration was applied

## Next Steps

1. **Deploy to production** following steps above
2. **Run test scenarios** from testing guide
3. **Monitor for 24 hours** to catch any issues
4. **Analyze first 50 enrichments** for quality
5. **Adjust GPT prompts** if extraction quality low
6. **Optimize costs** based on actual usage patterns
7. **Iterate on matching weights** based on user feedback
