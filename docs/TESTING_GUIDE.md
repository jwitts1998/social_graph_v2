# Testing Guide - Matching System Improvements

## Overview
This guide provides comprehensive testing procedures for the improved matching system.

---

## Test Categories

1. Database Schema Tests
2. Edge Function Tests
3. UI Component Tests
4. Integration Tests
5. Performance Tests

---

## 1. Database Schema Tests

### Test 1.1: Verify New Columns

```sql
-- Test: Check match_suggestions columns exist
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'match_suggestions'
AND column_name IN ('score_breakdown', 'confidence_scores', 'match_version');

-- Expected: 3 rows returned
-- score_breakdown | jsonb | YES
-- confidence_scores | jsonb | YES
-- match_version | text | YES
```

### Test 1.2: Verify Vector Extension

```sql
-- Test: pgvector extension enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Expected: 1 row with extname = 'vector'
```

### Test 1.3: Verify Embedding Columns

```sql
-- Test: Conversations has context_embedding
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'conversations'
AND column_name = 'context_embedding';

-- Expected: 1 row, data_type = USER-DEFINED (vector)
```

### Test 1.4: Test Data Insertion

```sql
-- Test: Insert match with new fields
INSERT INTO match_suggestions (
  conversation_id, contact_id, score, reasons, 
  score_breakdown, confidence_scores, match_version
) VALUES (
  'test-conv-id', 'test-contact-id', 2, '["test"]'::jsonb,
  '{"semantic": 0.5, "tagOverlap": 0.7}'::jsonb,
  '{"overall": 0.6}'::jsonb,
  'v1.1-test'
);

-- Expected: 1 row inserted successfully

-- Cleanup
DELETE FROM match_suggestions WHERE match_version = 'v1.1-test';
```

---

## 2. Edge Function Tests

### Test 2.1: Generate Matches (Basic)

**Test**: Generate matches for existing conversation

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-matches \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "YOUR_CONVERSATION_ID"}'
```

**Expected**:
- 200 OK response
- JSON with `matches` array
- Each match has `score_breakdown` and `confidence_scores`
- Logs show performance summary

**Verify**:
```javascript
{
  "matches": [{
    "score": 2,
    "score_breakdown": {
      "semantic": 0.4,
      "tagOverlap": 0.6,
      ...
    },
    "confidence_scores": {
      "semantic": 0.7,
      "overall": 0.65,
      ...
    },
    "match_version": "v1.1-transparency"
  }],
  "performance": {
    "totalDuration": 450,
    "operations": 5,
    ...
  }
}
```

### Test 2.2: Generate Conversation Embedding

**Test**: Generate embedding for conversation

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/embed-conversation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "YOUR_CONVERSATION_ID"}'
```

**Expected**:
- 200 OK response
- `success: true`
- `embedding_dimensions: 1536`

**Verify**:
```sql
SELECT context_embedding IS NOT NULL as has_embedding
FROM conversations
WHERE id = 'YOUR_CONVERSATION_ID';

-- Expected: has_embedding = true
```

### Test 2.3: Matching With Embeddings

**Test**: Verify embeddings are used when available

**Steps**:
1. Generate contact embeddings
2. Generate conversation embedding
3. Generate matches
4. Check logs for "Embeddings available: true"
5. Verify `embedding` score in breakdown

**Expected Log Output**:
```
Embeddings available: true
Using weights: { embedding: 0.3, semantic: 0.1, ... }
MATCH: John Doe (2★, raw: 0.450, conf: 0.75)
```

---

## 3. UI Component Tests

### Test 3.1: Score Breakdown Component Renders

**Test**: Verify component displays correctly

**Steps**:
1. Navigate to conversation detail page
2. Look for match suggestion cards
3. Click to expand score breakdown
4. Verify all components visible

**Expected**:
- "Score Breakdown" section visible
- Click expands to show details
- Each scoring component shown with progress bar
- Confidence badges visible (High/Medium/Low)
- Tooltips work on info icons

### Test 3.2: Embedding Score Display

**Test**: Verify embedding score shown when available

**Prerequisites**: Match has embedding score

**Expected**:
- "Semantic Similarity (AI)" component visible
- Shows at top of list (most important)
- Progress bar reflects score
- Tooltip explains embeddings

### Test 3.3: Confidence Indicators

**Test**: Verify confidence scores display correctly

**Expected**:
- Each component has confidence badge
- Colors: Green (high), Yellow (medium), Red (low)
- Overall confidence shown in header
- Percentages accurate

---

## 4. Integration Tests

### Test 4.1: End-to-End Matching Flow

**Test**: Complete workflow from recording to matching

**Steps**:
1. Start new conversation recording
2. Speak for 30 seconds (mention sectors, names)
3. Stop recording
4. Wait for entity extraction (5s)
5. Wait for match generation (5s)
6. Check match suggestions appear
7. Expand score breakdown
8. Verify all fields populated

**Expected**:
- Matches appear within 10 seconds
- Score breakdown shows all components
- Confidence scores present
- Match version = "v1.1-transparency"
- Performance metrics logged

### Test 4.2: Embedding Generation Flow

**Test**: Verify embeddings generated automatically

**Steps**:
1. Create new contact with bio
2. Trigger embed-contact function
3. Start conversation
4. Extract entities
5. Generate conversation embedding
6. Generate matches
7. Verify embedding score in breakdown

**Expected**:
- Contact bio_embedding populated
- Conversation context_embedding populated
- Match includes embedding score
- Score breakdown shows "Semantic Similarity (AI)"

---

## 5. Performance Tests

### Test 5.1: Matching Latency

**Test**: Measure matching latency with various contact counts

**Setup**:
- Test with 10, 50, 100, 500, 1000 contacts

**Method**:
```javascript
const start = Date.now();
await supabase.functions.invoke('generate-matches', {
  body: { conversationId }
});
const duration = Date.now() - start;
console.log(`Latency: ${duration}ms`);
```

**Expected**:
- 10 contacts: <200ms
- 50 contacts: <500ms
- 100 contacts: <1000ms
- 500 contacts: <2000ms
- 1000 contacts: <3000ms

**Target**: p95 < 500ms for typical use (50-100 contacts)

### Test 5.2: Embedding Query Performance

**Test**: Measure similarity search performance

```sql
EXPLAIN ANALYZE
SELECT id, bio_embedding <=> '[...1536 dimensions...]'::vector AS distance
FROM contacts
WHERE bio_embedding IS NOT NULL
ORDER BY distance
LIMIT 20;
```

**Expected**:
- Uses ivfflat index
- Execution time < 100ms
- Index scan, not sequential scan

### Test 5.3: Concurrent Requests

**Test**: Multiple users generating matches simultaneously

**Method**: Use load testing tool (k6, artillery)

```javascript
// k6 test script
import http from 'k6/http';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
};

export default function() {
  http.post('https://YOUR_PROJECT.supabase.co/functions/v1/generate-matches',
    JSON.stringify({ conversationId: 'test-id' }),
    { headers: { 'Authorization': 'Bearer KEY' }}
  );
}
```

**Expected**:
- No timeouts
- Error rate < 1%
- Average response time < 1s

---

## 6. Regression Tests

### Test 6.1: Old Matches Still Work

**Test**: Verify old matches without new fields display correctly

**Expected**:
- Old matches load without errors
- Score breakdown hidden if no data
- No console errors
- Graceful degradation

### Test 6.2: Backwards Compatibility

**Test**: Matching works without embeddings

**Method**:
1. Generate matches without embeddings
2. Verify fallback to keyword matching
3. Check logs show "Embeddings available: false"
4. Confirm original weights used

---

## 7. Error Handling Tests

### Test 7.1: Invalid Conversation ID

```bash
curl -X POST ... -d '{"conversationId": "invalid"}'
```

**Expected**: 400 error, clear message

### Test 7.2: Missing OpenAI Key

**Test**: Embed function without API key

**Expected**: Error message about missing key

### Test 7.3: Database Connection Error

**Test**: Simulate database timeout

**Expected**: Graceful error, not crash

---

## Test Checklist

Before deploying to production:

- [ ] All database migrations applied
- [ ] All Edge functions deployed
- [ ] Database schema tests pass
- [ ] Edge function tests pass
- [ ] UI component tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] No regression issues
- [ ] Error handling verified
- [ ] Rollback plan tested
- [ ] Documentation reviewed
- [ ] Team trained on new features

---

## Automated Testing (Future)

### Unit Tests

Create tests for:
- `cosineSimilarity()` function
- `calculateConfidenceScores()` function
- Score breakdown component rendering
- Monitoring utilities

### Integration Tests

Automate:
- End-to-end matching flow
- Embedding generation
- Performance benchmarks

---

## Reporting Issues

When reporting issues, include:
1. Test name and step where failure occurred
2. Expected vs actual behavior
3. Logs from Edge Functions
4. Database query results
5. Screenshots (for UI issues)
6. Environment (staging/production)

---

*Last Updated: January 2025*
