# Embedding Generation Fix - Status Report

## Issue Identified

The `embed-conversation` Edge Function is returning 400 errors:
```
POST /api/supabase/functions/v1/embed-conversation 400 in 1359ms :: {"error":"F…
```

## Root Cause

The `OPENAI_API_KEY` is **not set as a Supabase Edge Function secret**. 

Edge Functions run in Supabase's cloud environment (Deno runtime), not locally. They need their own environment variables configured separately from your local `.env` file.

## How Edge Functions Work

```
Local Development:
- Uses .env file
- Proxied through server/routes.ts
- Makes HTTP calls to Supabase cloud functions

Production (Supabase Cloud):
- Uses Supabase secrets
- No access to local .env
- Runs in isolated Deno runtime
```

## Fix Instructions

### Option 1: Set Secret via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add new secret**
5. Name: `OPENAI_API_KEY`
6. Value: Your OpenAI API key (starts with `sk-...`)
7. Click **Save**

### Option 2: Set Secret via Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <YOUR_PROJECT_REF>

# Set the secret
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Verify it's set
supabase secrets list
```

### Option 3: Deploy Functions with .env

If you have the OpenAI key in your local `.env`:

```bash
# Create a .env file in supabase/functions/
echo "OPENAI_API_KEY=sk-your-key-here" > supabase/functions/.env

# Deploy functions (will read from .env)
supabase functions deploy embed-conversation
supabase functions deploy generate-matches
```

## Verification Steps

After setting the secret:

1. **Check logs** in Supabase Dashboard:
   - Go to **Edge Functions** → `embed-conversation` → **Logs**
   - Look for: "Generated embedding with 1536 dimensions"

2. **Test the function** directly:
   ```bash
   # Get your auth token from Supabase dashboard
   curl -X POST \
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/embed-conversation \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"conversationId": "test-conversation-id"}'
   ```

3. **Test via the app**:
   - Navigate to a conversation
   - Click "Regenerate Matches"
   - Check browser Network tab for 200 response

## Expected Behavior After Fix

### Success Response
```json
{
  "success": true,
  "embedding_dimensions": 1536,
  "context_length": 245
}
```

### Database State
```sql
SELECT 
  id, 
  title,
  context_embedding IS NOT NULL as has_embedding
FROM conversations
WHERE context_embedding IS NOT NULL
LIMIT 5;
```

Should show `has_embedding = true` for conversations after the fix.

## Fallback Behavior (If Key Not Set)

The system is designed to **continue working without embeddings**:

1. `embed-conversation` will fail with 400
2. `generate-matches` will proceed anyway
3. Matching algorithm uses **keyword fallback**:
   - Semantic weight: 20% (instead of 10%)
   - No embedding weight: 0% (instead of 30%)
4. **Match quality reduced** but system still functional

## Impact Analysis

### With Embeddings (Current Target - v1.1-transparency)

- **Semantic Understanding**: Deep AI-powered meaning alignment (30% weight)
- **Match Quality**: Higher precision, catches subtle connections
- **Use Case**: "AI-driven drug discovery" matches "therapeutics platform"

### Without Embeddings (Fallback Mode)

- **Keyword Matching**: Simple text search (20% weight)
- **Match Quality**: Lower precision, misses nuanced connections  
- **Use Case**: Only matches exact keyword overlaps

## Testing After Fix

1. **Create a test conversation** with rich context
2. **Check terminal logs**:
   ```
   Embedding conversation: <id>
   Context text: Person: Sarah Chen. Role: Partner...
   Generated embedding with 1536 dimensions
   Embedding stored successfully
   ```
3. **Verify in database**:
   ```sql
   SELECT LENGTH(context_embedding::text) as embedding_length
   FROM conversations
   WHERE id = '<conversation-id>';
   ```
   Should return ~40,000+ characters (1536 floats as JSON array)

4. **Check matching logs**:
   ```
   Embeddings available: true
   Using weights: { embedding: 0.3, semantic: 0.1, ... }
   ```

## Files Affected

- ✅ `supabase/functions/embed-conversation/index.ts` - Already correct
- ✅ `supabase/functions/generate-matches/index.ts` - Already handles both modes
- ✅ `shared/schema.ts` - Updated to include embedding columns
- ⚠️ Supabase secrets - **Needs manual configuration**

## Why This Wasn't Caught Earlier

1. **Local development** doesn't use Edge Functions directly
2. **Proxy layer** forwards requests but can't add missing secrets
3. **Terminal logs** only show truncated error message
4. **Function works** when key is available (seen in codebase)

## Action Required

**YOU MUST** set the `OPENAI_API_KEY` secret in Supabase for embeddings to work.

Choose one of the three options above and follow the instructions.

## Documentation Updated

- ✅ Created `MATCHING_SYSTEM_TEST_GUIDE.md` with troubleshooting section
- ✅ Updated `shared/schema.ts` to reflect embedding columns
- ✅ This fix report documents the issue and solution

## Next Steps

1. **Set the OPENAI_API_KEY secret** (manual action required)
2. **Test embedding generation** (follow verification steps above)
3. **Proceed to test dataset creation** (once embeddings work)
4. **Validate match quality** with real data
