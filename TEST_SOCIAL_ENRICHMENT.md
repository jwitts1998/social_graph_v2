# Testing Social Media Enrichment Function

## Function Deployed Successfully! ✅

The `enrich-social` function has been deployed and is ready to test.

## Quick Test Guide

### Step 1: Find a Contact ID

Query your database to get a contact ID with an active social media presence:

```sql
-- Get contacts to test (preferably public figures)
SELECT id, name, company, twitter 
FROM contacts 
WHERE name IS NOT NULL
LIMIT 10;
```

### Step 2: Test via curl

Replace `YOUR_CONTACT_ID` with an actual contact ID:

```bash
curl -X POST https://mtelyxosqqaeadrrrtgk.supabase.co/functions/v1/enrich-social \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contactId": "YOUR_CONTACT_ID"}'
```

### Step 3: Monitor Logs

Watch the enrichment happen in real-time:

```bash
supabase functions logs enrich-social --tail
```

### Step 4: Verify Results

Check the contact record was updated:

```sql
-- Check enriched data
SELECT 
  name,
  personal_interests,
  expertise_areas,
  enrichment_source,
  data_completeness_score,
  last_enriched_at
FROM contacts 
WHERE id = 'YOUR_CONTACT_ID';
```

## What to Test

### Test Case 1: Public Figure with Active Social Media
**Example:** A VC or founder with Twitter/Instagram presence

**Expected:**
- `personal_interests`: Array with hobbies, sports, causes
- `expertise_areas`: Updated with topics they post about
- `enrichment_source`: "social" or "serper+social"
- `data_completeness_score`: Increased

### Test Case 2: Person with Limited Social Presence
**Example:** Private individual or less public person

**Expected:**
- `personal_interests`: Empty array or minimal entries
- Response message: "No social media presence found"
- No errors, graceful handling

### Test Case 3: Invalid Contact ID

```bash
curl -X POST https://mtelyxosqqaeadrrrtgk.supabase.co/functions/v1/enrich-social \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contactId": "invalid-id"}'
```

**Expected:**
- Status: 404
- Error message: "Contact not found"

## Sample Response (Success)

```json
{
  "success": true,
  "contactId": "abc123",
  "enrichedFields": {
    "personal_interests": ["hiking", "jazz", "AI/ML", "Boston Celtics"],
    "expertise_areas": ["venture capital", "climate tech", "SaaS", "marketplaces"],
    "social_activity_level": "high",
    "social_tone": "professional",
    "social_handles": {
      "twitter": "@username",
      "instagram": "@username"
    },
    "data_completeness_score": 75
  },
  "enrichmentSource": "serper-social"
}
```

## Sample Response (No Social Media Found)

```json
{
  "success": true,
  "contactId": "abc123",
  "message": "No social media presence found",
  "enrichedFields": {
    "personal_interests": [],
    "content_topics": [],
    "social_activity_level": "none"
  }
}
```

## Troubleshooting

### "OPENAI_API_KEY not configured"
```bash
supabase secrets list
# Verify OPENAI_API_KEY is present
```

### "SERPER_API_KEY not configured"
```bash
supabase secrets list
# Verify SERPER_API_KEY is present
```

### No results found
- Check logs: `supabase functions logs enrich-social`
- Try with a different contact (more public figure)
- Verify contact name is correct in database

## Cost Tracking

Each enrichment costs approximately:
- 3 Serper searches: $0.03
- 1 GPT-4o-mini call: $0.01
- **Total: ~$0.04 per contact**

## Recommended Test Contacts

Good candidates for testing:
1. **VCs/Investors** - Usually have active Twitter presence
2. **Startup Founders** - Often post on social media
3. **Public Figures** - Clear social media presence
4. **Tech Leaders** - Active on Twitter/LinkedIn

Avoid:
- Very private individuals
- People with common names (hard to find right person)
- Non-English names (search quality may vary)

## Next Steps After Testing

1. **Validate data quality**
   - Do extracted interests match reality?
   - Are handles correct?
   - Is activity level accurate?

2. **Measure improvement**
   - Check completeness score before/after
   - See if personal affinity matching improves

3. **Decide on integration**
   - If quality is good → Integrate into `research-contact`
   - If needs work → Iterate on prompts
   - If not worth it → Keep as standalone for high-value contacts

## Integration Options (Future)

### Option A: Merge into research-contact
Add social searches to the main enrichment flow.

### Option B: Standalone with UI trigger
Add a "Enrich Social" button separate from main enrichment.

### Option C: Batch processing
Run on all contacts with high priority (investors, key relationships).

## Logs to Watch For

**Success indicators:**
```
[Social Enrichment] Searching social media for: John Doe
[Social Enrichment] Found 3 search result sets
[Social Enrichment] Extracting insights with GPT for: John Doe
[Social Enrichment] Successfully extracted insights
[Social Enrichment] Updating contact: abc123
[Social Enrichment] New completeness score: 75
=== SOCIAL ENRICHMENT END ===
```

**No social presence (not an error):**
```
[Social Enrichment] Searching social media for: Jane Smith
[Social Enrichment] No social media search results found
```

**Error indicators:**
```
[Social Search] Serper error: 429
[Social Enrichment] OpenAI error: 500
[Social Enrichment] Failed to extract insights
```

---

**Function Status:** ✅ Deployed and ready
**Dashboard:** https://supabase.com/dashboard/project/mtelyxosqqaeadrrrtgk/functions
**Logs:** `supabase functions logs enrich-social --tail`
