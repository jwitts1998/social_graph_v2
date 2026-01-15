# Deployment Guide - Matching System Improvements

## Overview
This guide covers deploying the improved matching system with transparency features, embeddings, and performance monitoring.

---

## Prerequisites

- Supabase CLI installed
- Supabase project created
- OpenAI API key (for embeddings)
- Database access

---

## Step 1: Database Migrations

### Run Migrations

```bash
# Navigate to project directory
cd /path/to/social_graph_v2

# Apply transparency migration
supabase db push

# Verify migrations applied
supabase db diff
```

### Migrations Included

1. **20250115000000_add_match_transparency.sql**
   - Adds `score_breakdown` JSONB column
   - Adds `confidence_scores` JSONB column
   - Adds `match_version` TEXT column
   - Creates indexes

2. **20250115000001_add_embedding_indexes.sql**
   - Enables pgvector extension
   - Adds `context_embedding` to conversations
   - Creates ivfflat indexes for similarity search

### Verify Migrations

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'match_suggestions'
AND column_name IN ('score_breakdown', 'confidence_scores', 'match_version');

-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('contacts', 'conversations')
AND indexname LIKE '%embedding%';
```

---

## Step 2: Deploy Edge Functions

### Deploy All Functions

```bash
# Deploy matching function (updated)
supabase functions deploy generate-matches

# Deploy new embedding function
supabase functions deploy embed-conversation

# Deploy existing functions (if needed)
supabase functions deploy extract-entities
supabase functions deploy embed-contact
```

### Set Environment Variables

```bash
# Set OpenAI API key for embeddings
supabase secrets set OPENAI_API_KEY=your_openai_key_here
```

### Verify Deployments

```bash
# List deployed functions
supabase functions list

# Test function
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-matches \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "test-id"}'
```

---

## Step 3: Generate Embeddings for Existing Data

### For Contacts

Use the existing `embed-contact` function to generate embeddings for all contacts:

```bash
# Via API or create a script
# Example script below
```

**Script: `scripts/generate-contact-embeddings.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateContactEmbeddings() {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, bio')
    .is('bio_embedding', null)
    .limit(100); // Batch process

  console.log(`Processing ${contacts?.length} contacts...`);

  for (const contact of contacts || []) {
    if (contact.bio && contact.bio.length > 50) {
      try {
        await supabase.functions.invoke('embed-contact', {
          body: { contactId: contact.id }
        });
        console.log(`✅ Embedded contact: ${contact.id}`);
      } catch (error) {
        console.error(`❌ Failed for ${contact.id}:`, error);
      }
    }
  }
}

generateContactEmbeddings();
```

### For Conversations

Generate embeddings for recent conversations:

```typescript
async function generateConversationEmbeddings() {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .is('context_embedding', null)
    .order('recorded_at', { ascending: false })
    .limit(50);

  for (const conv of conversations || []) {
    try {
      await supabase.functions.invoke('embed-conversation', {
        body: { conversationId: conv.id }
      });
      console.log(`✅ Embedded conversation: ${conv.id}`);
    } catch (error) {
      console.error(`❌ Failed for ${conv.id}:`, error);
    }
  }
}
```

---

## Step 4: Update Client Code

### Install Dependencies

```bash
cd client
npm install
```

### Build and Deploy

```bash
# Build client
npm run build

# Deploy to Vercel/hosting
vercel deploy --prod
```

---

## Step 5: Testing

### Test Transparency Features

1. Record a new conversation
2. Generate matches
3. Verify score breakdown UI appears
4. Check that component scores are visible
5. Verify confidence indicators show

### Test Embedding-Based Matching

1. Generate embeddings for a few contacts
2. Generate embeddings for a conversation
3. Run matching
4. Verify embedding score appears in breakdown
5. Check logs for "Embeddings available: true"

### Test Performance Monitoring

1. Generate matches
2. Check Edge Function logs
3. Verify performance summary appears:
   ```
   ========== PERFORMANCE SUMMARY ==========
   Operation: generate-matches
   Total Duration: XXXms
   Operations: X
   Success: X | Errors: 0
   ```

---

## Step 6: Monitoring

### Check Edge Function Logs

```bash
# View recent logs
supabase functions logs generate-matches --tail

# Filter for performance
supabase functions logs generate-matches | grep "PERF"
```

### Monitor Database Performance

```sql
-- Check query performance
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%match_suggestions%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check embedding query performance
EXPLAIN ANALYZE
SELECT id, bio_embedding <=> '[...]'::vector AS distance
FROM contacts
ORDER BY distance
LIMIT 20;
```

---

## Step 7: Rollback Plan

### If Issues Occur

1. **Rollback Edge Functions**
   ```bash
   # Deploy previous version
   git checkout previous-commit
   supabase functions deploy generate-matches
   ```

2. **Rollback Database**
   ```bash
   # Revert migrations
   supabase db reset
   ```

3. **Disable New Features**
   - Remove score breakdown component from UI
   - Edge function will work without embeddings (fallback mode)

---

## Common Issues & Solutions

### Issue: Embeddings Not Generating

**Symptoms**: 
- Logs show "Embeddings available: false"
- No embedding scores in results

**Solutions**:
1. Check OpenAI API key is set
2. Verify embed-conversation function deployed
3. Run embedding generation manually
4. Check OpenAI API quota

### Issue: Performance Degradation

**Symptoms**:
- Matching takes >2 seconds
- Database queries slow

**Solutions**:
1. Check if indexes are created
2. Run VACUUM ANALYZE on tables
3. Check contact count (may need batching)
4. Monitor Edge Function logs

### Issue: Score Breakdown Not Showing

**Symptoms**:
- UI doesn't show breakdown
- Console errors

**Solutions**:
1. Check match_suggestions has new columns
2. Verify client code updated
3. Check browser console for errors
4. Clear browser cache

---

## Success Criteria

✅ All migrations applied successfully
✅ Edge functions deployed and responding
✅ Embeddings generating (check database)
✅ Score breakdown visible in UI
✅ Performance logs showing metrics
✅ No increase in error rates
✅ Latency remains <500ms (p95)

---

## Next Steps

1. Monitor performance for 24-48 hours
2. Collect user feedback on transparency
3. Analyze embedding impact on match quality
4. Plan Phase 3: Feedback Loop & Analytics

---

*Last Updated: January 2025*
