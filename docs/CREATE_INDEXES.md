# Creating Vector Indexes Manually

## Why Manual Index Creation?

The database migrations skip creating ivfflat indexes due to memory constraints during automated migration (`maintenance_work_mem` limit). The vector columns work perfectly without indexes - they just optimize query performance.

## When to Create Indexes

Create indexes after you have:
- ✅ Completed all database migrations
- ✅ Generated embeddings for your contacts
- ✅ Started using the matching system

## How to Create Indexes

### Option 1: Via Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run these commands **one at a time**:

```sql
-- Index for contact bio embeddings (improves bio similarity search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_bio_embedding_cosine 
ON contacts USING ivfflat (bio_embedding vector_cosine_ops) 
WITH (lists = 10);

-- Index for contact thesis embeddings (improves thesis matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_thesis_embedding_cosine
ON contacts USING ivfflat (thesis_embedding vector_cosine_ops) 
WITH (lists = 10);

-- Index for conversation context embeddings (improves semantic matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_context_embedding_cosine
ON conversations USING ivfflat (context_embedding vector_cosine_ops) 
WITH (lists = 10);
```

### Option 2: Increase Memory and Use Migration

If you have access to database configuration:

1. Increase `maintenance_work_mem` in database settings to at least 64MB
2. Re-run the migration
3. The indexes will be created automatically

## Performance Impact

**Without indexes:**
- Similarity searches work but scan all rows
- Acceptable for < 1,000 contacts
- Queries take 100-500ms

**With indexes:**
- Similarity searches are optimized
- Handles 10,000+ contacts efficiently  
- Queries take 10-50ms

## Verification

Check if indexes exist:

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE '%embedding%';
```

## Troubleshooting

**Still getting memory errors?**
- Reduce `lists` from 10 to 5
- Create indexes during low-traffic periods
- Use `CONCURRENTLY` to avoid table locks

**Want to drop and recreate?**
```sql
DROP INDEX IF EXISTS idx_contacts_bio_embedding_cosine;
DROP INDEX IF EXISTS idx_contacts_thesis_embedding_cosine;
DROP INDEX IF EXISTS idx_conversations_context_embedding_cosine;
```

Then recreate with the commands above.
