# Regenerate Matches Feature

## Overview

Added a "Regenerate Matches" button to the conversation detail page that allows manual reprocessing of conversations through the entire matching pipeline.

## Location

The button is located in the conversation header, next to the Export button.

## How It Works

When you click "Regenerate Matches", the system:

1. **Extract Entities** - Calls `extract-entities` Edge Function to reprocess the conversation and extract:
   - Target person information
   - Matching intent and goals
   - Domain topics and keywords
   - Relationship context

2. **Generate Embeddings** - Calls `embed-conversation` Edge Function to create semantic embeddings:
   - Constructs rich context from conversation data
   - Generates vector embeddings using OpenAI text-embedding-3-small
   - Stores embeddings for similarity matching

3. **Generate Matches** - Calls `generate-matches` Edge Function with enhanced algorithm:
   - Uses latest transparency features (score breakdowns)
   - Applies embedding-based semantic matching (if available)
   - Calculates confidence scores for each component
   - Generates AI explanations for matches

4. **Refresh UI** - Automatically updates the display:
   - Invalidates React Query cache
   - Fetches fresh match data
   - Shows updated score breakdowns
   - Displays new transparency metrics

## Use Cases

### 1. Testing New Features
After deploying algorithm improvements, regenerate matches to see:
- New score breakdowns
- Updated confidence levels
- Improved semantic matching
- Better AI explanations

### 2. Reprocessing Old Conversations
For conversations processed before recent enhancements:
- Apply latest matching algorithm
- Generate missing embeddings
- Get transparency metrics
- Update match quality

### 3. Debugging & Quality Assurance
When investigating match quality:
- Rerun with fresh data
- Compare before/after results
- Test edge cases
- Validate algorithm changes

### 4. Data Migration
After schema changes or data updates:
- Regenerate all matches systematically
- Ensure consistency across conversations
- Apply new features to historical data

## UI/UX Features

### Button States
- **Default**: "Regenerate Matches" with refresh icon
- **Processing**: "Processing..." with spinning icon
- **Disabled**: Button disabled during processing

### User Feedback
- **Success Toast**: "Matches regenerated! The conversation has been reprocessed..."
- **Error Toast**: Shows specific error message if processing fails
- **Loading Indicator**: Spinning refresh icon during processing

### Layout
- **Desktop**: Buttons side-by-side in flex row
- **Mobile**: Buttons stacked in flex column
- **Responsive**: Full width on mobile, auto width on desktop

## API Endpoints

### 1. Extract Entities
```
POST /api/supabase/functions/v1/extract-entities
Body: { "conversationId": "uuid" }
```

### 2. Generate Embeddings
```
POST /api/supabase/functions/v1/embed-conversation
Body: { "conversationId": "uuid" }
```

### 3. Generate Matches
```
POST /api/supabase/functions/v1/generate-matches
Body: { "conversationId": "uuid" }
```

## Error Handling

The system handles errors gracefully:

1. **Entity Extraction Failure**: Shows error toast, stops processing
2. **Embedding Failure**: Logs warning, continues to match generation
3. **Match Generation Failure**: Shows error toast with details
4. **Network Errors**: Caught and displayed to user

## Performance

Typical processing times:
- **Entity Extraction**: 5-10 seconds
- **Embedding Generation**: 2-5 seconds
- **Match Generation**: 10-30 seconds (depending on contact count)
- **Total**: 20-45 seconds for full pipeline

## Testing

### Test Steps
1. Navigate to any conversation detail page
2. Click "Regenerate Matches" button
3. Observe loading state (spinning icon, disabled button)
4. Wait for processing to complete
5. Check success toast notification
6. Verify matches updated in UI

### Expected Results
- ✅ Button shows loading state immediately
- ✅ Matches display shows "No matches" briefly during processing
- ✅ New matches appear with updated scores
- ✅ Score breakdowns show latest algorithm components
- ✅ Confidence scores reflect current matching logic

### Test Cases

**Test 1: Basic Regeneration**
- Click button on conversation with existing matches
- Verify matches are replaced with new ones
- Check score breakdowns are updated

**Test 2: First-Time Processing**
- Click button on conversation without matches
- Verify matches are generated from scratch
- Check all transparency features work

**Test 3: Network Error**
- Disconnect network
- Click regenerate button
- Verify error toast displays
- Verify button returns to normal state

**Test 4: Concurrent Requests**
- Click button multiple times rapidly
- Verify only one request processes
- Verify button stays disabled until complete

## Code Changes

### Modified Files
- `client/src/pages/ConversationDetail.tsx`

### Added Imports
- `RefreshCw` from lucide-react (refresh icon)
- `useMutation`, `useQueryClient` from @tanstack/react-query

### New Functions
- `regenerateMatches` - Mutation to handle the entire pipeline
- `handleRegenerateMatches` - Click handler for the button

### UI Components
- New button with responsive layout
- Loading state with animation
- Toast notifications for success/error

## Future Enhancements

### Possible Improvements
1. **Progress Indicator**: Show which step is currently processing
2. **Batch Processing**: Regenerate multiple conversations at once
3. **Scheduling**: Automatically regenerate on a schedule
4. **Comparison View**: Show before/after match quality
5. **Selective Regeneration**: Choose which pipeline steps to run

### Performance Optimizations
1. **Caching**: Cache entity extraction results
2. **Parallel Processing**: Run embedding + extraction concurrently
3. **Incremental Updates**: Only regenerate changed data
4. **Background Jobs**: Queue long-running regenerations

## Troubleshooting

### Button Not Responding
- Check browser console for errors
- Verify API endpoints are accessible
- Check authentication status

### Processing Takes Too Long
- Check Edge Function logs for bottlenecks
- Verify OpenAI API key is set
- Check database performance

### Matches Not Updating
- Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
- Check React Query cache invalidation
- Verify mutation success in network tab

### Error Toasts
- Read error message carefully
- Check Edge Function logs in Supabase Dashboard
- Verify conversation has required data (segments, etc.)

---

**Feature Added**: January 15, 2025
**Version**: v1.1-transparency
**Status**: ✅ Ready for use
