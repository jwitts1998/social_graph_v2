# Matching System Architecture - Detailed Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Data Flow](#data-flow)
3. [Component Architecture](#component-architecture)
4. [Matching Algorithm](#matching-algorithm)
5. [Entity Extraction](#entity-extraction)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Performance Characteristics](#performance-characteristics)
9. [Current Limitations](#current-limitations)

---

## System Overview

The matching system is a core component of the Social Graph Connector application. It analyzes conversation transcripts to identify relevant contacts from a user's network that could facilitate introductions or connections.

### High-Level Architecture

```
┌─────────────────┐
│   User Record   │
│   Conversation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Entity Extraction│ ◄─── OpenAI GPT-4o-mini
│   (Edge Func)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rich Context   │
│  + Entities     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Match Generation│ ◄─── Contact Database
│   (Edge Func)   │      + Investment Theses
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Match Suggestions│
│   (Database)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UI Display    │
│  (React Client) │
└─────────────────┘
```

### Key Components

1. **Entity Extraction Service** (`extract-entities`)
   - Analyzes conversation transcripts
   - Extracts entities and rich context
   - Uses OpenAI GPT-4o-mini

2. **Match Generation Service** (`generate-matches`)
   - Scores contacts against conversation context
   - Uses weighted scoring algorithm
   - Generates AI explanations

3. **Database Layer** (Supabase PostgreSQL)
   - Stores conversations, contacts, matches
   - Manages relationships and theses

4. **Client Application** (React + TypeScript)
   - Displays matches to users
   - Handles user feedback
   - Real-time updates via subscriptions

---

## Data Flow

### 1. Conversation Recording Flow

```
User starts recording
    │
    ▼
Audio captured → Transcription → Segments stored
    │
    ▼
Every 5 seconds:
    ├─ Extract Participants
    ├─ Extract Entities
    └─ Generate Matches
    │
    ▼
Real-time UI updates via Supabase subscriptions
```

### 2. Entity Extraction Flow

```
Conversation Segments
    │
    ▼
GPT-4o-mini Analysis
    │
    ├─ Target Person (name, role, company, location)
    ├─ Goals & Needs (fundraising, hiring, customers)
    ├─ Domains & Topics (industries, keywords, geo)
    ├─ Matching Intent (what to find, constraints)
    └─ Legacy Entities (sector, stage, check_size, geo, person_name)
    │
    ▼
Stored in:
    ├─ conversation_entities (legacy format)
    └─ conversations.rich_context (JSONB)
```

### 3. Match Generation Flow

```
Conversation Context
    │
    ├─ Entities (sectors, stages, geos, names)
    └─ Rich Context (goals, needs, intent)
    │
    ▼
For each contact:
    ├─ Load contact data + theses
    ├─ Calculate semantic score (20%)
    ├─ Calculate tag overlap (35%)
    ├─ Calculate role match (15%)
    ├─ Calculate geo match (10%)
    ├─ Calculate relationship (20%)
    └─ Check name match (boost +0.3)
    │
    ▼
Weighted Score Calculation
    │
    ▼
Star Rating Assignment
    ├─ 3 stars: ≥0.40
    ├─ 2 stars: ≥0.20
    └─ 1 star: ≥0.05
    │
    ▼
Top 20 matches selected
    │
    ├─ AI explanations (top 5, 2+ stars)
    └─ Stored in match_suggestions
```

---

## Component Architecture

### 1. Entity Extraction Service

**Location**: `supabase/functions/extract-entities/index.ts`

**Responsibilities**:
- Analyze conversation transcripts
- Extract structured information using AI
- Store entities and rich context
- Auto-append conversation summaries to contact notes

**Input**:
- `conversationId`: UUID of the conversation

**Output**:
- `entities`: Array of legacy entity objects
- `richContext`: Structured JSON with target person, goals, domains, intent
- `matchingIntentSummary`: Text summary
- `targetPersonSummary`: Text summary

**Key Functions**:
```typescript
// Main handler
Deno.serve(async (req) => {
  // 1. Authenticate user
  // 2. Fetch conversation segments
  // 3. Call OpenAI API with RICH_EXTRACTION_PROMPT
  // 4. Parse JSON response
  // 5. Extract legacy entities
  // 6. Store in database
  // 7. Update conversation with rich context
  // 8. Auto-append to contact notes if match found
})
```

**AI Prompt Structure**:
- System prompt defines JSON schema
- User prompt contains transcript
- Response format: JSON object
- Model: `gpt-4o-mini`
- Temperature: 0.2 (low for consistency)

**Rich Context Schema**:
```typescript
{
  target_person: {
    is_current_conversation_partner: boolean,
    name_mentioned: string | null,
    normalized_name_guess: string | null,
    role_title: string | null,
    company_mentioned: string | null,
    // ... more fields
  },
  current_goals_and_needs: {
    fundraising: { is_relevant, stage, amount_range, investor_types },
    hiring: { is_relevant, roles_needed, seniority },
    customers_or_partners: { is_relevant, ideal_customer_types, partner_types },
    other_needs: []
  },
  domains_and_topics: {
    primary_industry: string | null,
    secondary_industries: [],
    product_keywords: [],
    technology_keywords: [],
    stage_keywords: [],
    geography_keywords: []
  },
  matching_intent: {
    what_kind_of_contacts_to_find: [],
    hard_constraints: [],
    soft_preferences: [],
    urgency: string | null
  },
  extracted_keywords_for_matching: {
    names_mentioned: [],
    companies_mentioned: [],
    free_form_keywords: []
  }
}
```

### 2. Match Generation Service

**Location**: `supabase/functions/generate-matches/index.ts`

**Responsibilities**:
- Score contacts against conversation context
- Generate match suggestions
- Create AI explanations for top matches
- Store results in database

**Input**:
- `conversationId`: UUID of the conversation

**Output**:
- `matches`: Array of match objects with scores and explanations

**Scoring Algorithm**:

#### Weight Configuration
```typescript
const WEIGHTS = {
  semantic: 0.20,      // Keyword matching
  tagOverlap: 0.35,    // Jaccard similarity
  roleMatch: 0.15,     // Investor type / role matching
  geoMatch: 0.10,      // Location overlap
  relationship: 0.20,  // Relationship strength
};
```

#### Scoring Components

**1. Semantic Score (20% weight)**
- **Method**: Keyword matching
- **Input**: Contact bio, title, investor_notes, company
- **Process**: 
  - Extract all search terms (sectors, stages, conversation tags)
  - Count keyword matches in contact text
  - Score = matches / total_search_terms (capped at 1.0)
- **Limitation**: Simple substring matching, no semantic understanding

**2. Tag Overlap Score (35% weight)**
- **Method**: Jaccard similarity
- **Input**: 
  - Conversation tags (sectors, stages, geos, keywords)
  - Contact tags (from theses, contact_type, extracted keywords)
- **Process**:
  - Build contact tags from:
    - Thesis sectors, stages, geos
    - Contact type (GP, Angel, LP, etc.)
    - Extracted investment terms from bio/title/notes
  - Calculate Jaccard similarity: intersection / union
- **Formula**: `intersection_size / union_size`

**3. Role Match Score (15% weight)**
- **Method**: Title/type matching
- **Input**: Contact title, contact_type, hiring roles, investor types
- **Process**:
  - Check if contact title matches hiring roles needed
  - Check if contact_type matches investor types needed
  - Score: 1.0 for match, 0.8 for partial match, 0.0 for no match

**4. Geographic Match Score (10% weight)**
- **Method**: Location string matching
- **Input**: Conversation geos, contact location
- **Process**:
  - Case-insensitive partial string matching
  - Score: 1.0 for match, 0.0 for no match
- **Limitation**: No location normalization (e.g., "SF" vs "San Francisco")

**5. Relationship Strength Score (20% weight)**
- **Method**: Direct value normalization
- **Input**: `contact.relationship_strength` (0-100)
- **Process**: Score = relationship_strength / 100
- **Note**: Currently uses placeholder value of 50 if not set

**6. Name Match Boost (+0.3 max)**
- **Method**: Fuzzy name matching
- **Input**: Person names from conversation, contact names
- **Process**:
  - Uses `fuzzyNameMatch()` function
  - Match types: exact, contains, full, nickname-full, first-only, etc.
  - If match found: `rawScore += 0.3 * nameMatchScore`
- **Special**: This is an additive boost, not a weighted component

#### Final Score Calculation

```typescript
// Weighted combination
rawScore = 
  WEIGHTS.semantic * semanticScore +
  WEIGHTS.tagOverlap * tagOverlapScore +
  WEIGHTS.roleMatch * roleMatchScore +
  WEIGHTS.geoMatch * geoMatchScore +
  WEIGHTS.relationship * relationshipScore;

// Name match boost (additive)
if (nameMatch) {
  rawScore += 0.3 * nameMatchScore;
}

// Clamp to 0-1
rawScore = Math.min(Math.max(rawScore, 0), 1);

// Map to star rating
if (rawScore >= 0.40) starScore = 3;
else if (rawScore >= 0.20) starScore = 2;
else if (rawScore >= 0.05) starScore = 1;
```

#### Name Matching Algorithm

**Location**: `fuzzyNameMatch()` function in `generate-matches/index.ts`

**Match Types & Scores**:
- `exact`: 1.00 - Exact string match
- `contains`: 0.95 - One name contains the other
- `fuzzy-both`: 0.90 - First + last name match (with nickname support)
- `first-only`: 0.70 - Only first name matches
- `first-nickname`: 0.65 - First name nickname match
- `levenshtein`: 0.60 - Close spelling (distance ≤ 2)
- `last-only`: 0.70 - Only last name matches
- `none`: 0.00 - No match

**Nickname Support**:
- Hardcoded nickname mapping (Matt/Matthew, Rob/Robert, etc.)
- Bidirectional matching
- Limited to common names

**Levenshtein Distance**:
- Used for fuzzy matching
- Threshold: distance ≤ 2 for short names, similarity ≥ 0.8 for longer names

### 3. Database Schema

#### Key Tables

**conversations**
```sql
- id: UUID (PK)
- owned_by_profile: UUID (FK → profiles)
- event_id: UUID (FK → calendar_events, nullable)
- title: TEXT
- duration_seconds: INTEGER
- recorded_at: TIMESTAMP
- status: TEXT (default: 'completed')
- target_person: JSONB (rich context)
- matching_intent: JSONB (rich context)
- goals_and_needs: JSONB (rich context)
- domains_and_topics: JSONB (rich context)
```

**conversation_entities** (legacy format)
```sql
- id: UUID (PK)
- conversation_id: UUID (FK → conversations)
- entity_type: TEXT (sector, stage, check_size, geo, person_name, company)
- value: TEXT
- confidence: DECIMAL(3,2)
- context_snippet: TEXT
```

**contacts**
```sql
- id: VARCHAR (PK)
- owned_by_profile: UUID (FK → profiles)
- name: TEXT (NOT NULL)
- first_name: TEXT
- last_name: TEXT
- email: TEXT
- title: TEXT
- company: TEXT
- bio: TEXT
- location: TEXT
- contact_type: TEXT[] (LP, GP, Angel, FamilyOffice, Startup, PE)
- is_investor: BOOLEAN
- investor_notes: TEXT
- relationship_strength: INTEGER (0-100, nullable)
- check_size_min: INTEGER
- check_size_max: INTEGER
- bio_embedding: VECTOR (future use)
- thesis_embedding: VECTOR (future use)
```

**theses** (investment theses for contacts)
```sql
- id: VARCHAR (PK)
- contact_id: VARCHAR (FK → contacts)
- sectors: TEXT[]
- stages: TEXT[]
- check_sizes: TEXT[]
- geos: TEXT[]
- personas: TEXT[]
- intents: TEXT[]
- notes: TEXT
```

**match_suggestions**
```sql
- id: VARCHAR (PK)
- conversation_id: UUID (FK → conversations)
- contact_id: VARCHAR (FK → contacts)
- score: INTEGER (1-3 stars)
- reasons: JSONB (array of strings)
- justification: TEXT
- ai_explanation: TEXT (nullable)
- status: TEXT (pending, promised, intro_made, dismissed, maybe)
- promise_status: TEXT (general, promised)
- promised_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**match_feedback** (for learning)
```sql
- id: VARCHAR (PK)
- suggestion_id: VARCHAR (FK → match_suggestions)
- profile_id: UUID (FK → profiles)
- feedback: TEXT (thumbs_up, thumbs_down, saved, intro_sent)
- feedback_reason: TEXT (nullable)
- created_at: TIMESTAMP
```

### 4. Client Application

**Key Components**:

**SuggestionCard** (`client/src/components/SuggestionCard.tsx`)
- Displays individual match suggestion
- Shows: contact info, star rating, reasons, AI explanation
- Actions: Make intro, Maybe, Dismiss, Thumbs up/down

**ConversationDetail** (`client/src/pages/ConversationDetail.tsx`)
- Shows conversation details
- Displays match suggestions in tabs
- Handles match status updates

**RecordingDrawer** (`client/src/components/RecordingDrawer.tsx`)
- Real-time recording interface
- Shows matches as they're generated
- Displays transcript and matches in tabs

**Hooks**:

**useMatchSuggestions** (`client/src/hooks/useMatches.ts`)
- Fetches matches for a conversation
- Uses React Query for caching
- Real-time updates via Supabase subscriptions

**Edge Function Invocation** (`client/src/lib/edgeFunctions.ts`)
- `extractEntities(conversationId)`: Calls extract-entities function
- `generateMatches(conversationId)`: Calls generate-matches function

---

## Matching Algorithm - Detailed Breakdown

### Algorithm Flow

```
1. Load conversation entities and rich context
2. Parse entities by type (sectors, stages, geos, names, check_sizes)
3. Build conversation tags from entities and rich context
4. Load all user contacts with theses
5. For each contact:
   a. Build contact tags from theses and profile
   b. Calculate semantic score (keyword matching)
   c. Calculate tag overlap (Jaccard similarity)
   d. Calculate role match (title/type matching)
   e. Calculate geo match (location matching)
   f. Calculate relationship score (normalized strength)
   g. Check name match (fuzzy matching)
   h. Calculate weighted raw score
   i. Apply name match boost if applicable
   j. Map to star rating
   k. Include if ≥1 star
6. Sort by star score (desc), then raw score (desc)
7. Take top 20 matches
8. Generate AI explanations for top 5 (2+ stars)
9. Store in match_suggestions table
```

### Scoring Example

**Conversation Context**:
- Sectors: ["SaaS", "AI"]
- Stages: ["Seed", "Series A"]
- Geos: ["Bay Area"]
- Names: ["John Smith"]
- Goals: Fundraising, looking for GP investors

**Contact Profile**:
- Name: "John Smith"
- Title: "Partner at VC Fund"
- Company: "Tech Ventures"
- Bio: "Invests in early-stage SaaS and AI companies"
- Location: "San Francisco, CA"
- Contact Type: ["GP"]
- Thesis: { sectors: ["SaaS", "AI"], stages: ["Seed"], geos: ["Bay Area"] }
- Relationship Strength: 75

**Scoring**:
1. **Semantic**: "SaaS" and "AI" found in bio → 2/2 = 1.0 → Weighted: 0.20
2. **Tag Overlap**: 
   - Conversation tags: ["SaaS", "AI", "Seed", "Series A", "Bay Area"]
   - Contact tags: ["SaaS", "AI", "Seed", "Bay Area", "GP", "investor"]
   - Intersection: 4, Union: 7 → 4/7 = 0.57 → Weighted: 0.20
3. **Role Match**: GP matches investor type → 0.8 → Weighted: 0.12
4. **Geo Match**: "Bay Area" matches "San Francisco" → 1.0 → Weighted: 0.10
5. **Relationship**: 75/100 = 0.75 → Weighted: 0.15
6. **Name Match**: Exact match "John Smith" → 1.0 → Boost: +0.30

**Raw Score**: 0.20 + 0.20 + 0.12 + 0.10 + 0.15 + 0.30 = **1.07** (clamped to 1.0)
**Star Rating**: 3 stars (≥0.40)

---

## Entity Extraction - Detailed Breakdown

### Extraction Process

1. **Transcript Assembly**
   - Fetches conversation segments ordered by timestamp
   - Joins segments into single transcript text

2. **AI Analysis**
   - Sends transcript to GPT-4o-mini with structured prompt
   - Receives JSON response with rich context

3. **Entity Extraction**
   - Extracts legacy entities from rich context:
     - Person names → `person_name` entities
     - Companies → `company` entities
     - Industries → `sector` entities
     - Stages → `stage` entities
     - Check sizes → `check_size` entities
     - Locations → `geo` entities

4. **Storage**
   - Legacy entities stored in `conversation_entities` table
   - Rich context stored in `conversations` table (JSONB columns)

5. **Contact Note Appending**
   - If target person name matches a contact, appends conversation summary to `investor_notes`

### Entity Types

- `person_name`: Names mentioned in conversation
- `sector`: Industries/sectors discussed
- `stage`: Funding stages (Seed, Series A, etc.)
- `check_size`: Investment amounts mentioned
- `geo`: Geographic locations
- `company`: Company names mentioned
- `persona`: (Future use)

---

## API Endpoints

### Edge Functions

**POST /functions/v1/extract-entities**
- **Input**: `{ conversationId: string }`
- **Output**: `{ entities: Entity[], richContext: RichContext, ... }`
- **Auth**: Required (user must own conversation)

**POST /functions/v1/generate-matches**
- **Input**: `{ conversationId: string }`
- **Output**: `{ matches: Match[] }`
- **Auth**: Required (user must own conversation)

### Supabase Client Queries

**Match Suggestions**:
```typescript
supabase
  .from('match_suggestions')
  .select(`
    *,
    contact:contacts (
      id, name, email, company, title, location, bio,
      check_size_min, check_size_max, investor_notes, contact_type
    )
  `)
  .eq('conversation_id', conversationId)
  .order('score', { ascending: false })
```

**Conversations**:
```typescript
supabase
  .from('conversations')
  .select('*')
  .eq('owned_by_profile', userId)
  .order('recorded_at', { ascending: false })
```

---

## Performance Characteristics

### Current Performance

**Entity Extraction**:
- Latency: ~2-5 seconds (OpenAI API call)
- Frequency: Every 5 seconds during recording
- Cost: ~$0.001-0.002 per extraction (GPT-4o-mini)

**Match Generation**:
- Latency: ~500ms - 2s (depends on contact count)
- Frequency: Every 5 seconds during recording
- Cost: ~$0.001-0.005 per generation (AI explanations for top 5)

**Database Queries**:
- Contact loading: ~100-500ms (depends on contact count)
- Match storage: ~50-200ms
- Real-time subscriptions: <100ms latency

### Scalability Considerations

**Current Limitations**:
- Processes all contacts for each match generation
- No caching of entity extraction results
- No incremental matching (reprocesses all segments)
- No batch processing for large contact lists

**Bottlenecks**:
- OpenAI API rate limits
- Database query performance with large contact lists
- Real-time processing every 5 seconds

---

## Current Limitations

### Algorithm Limitations

1. **Semantic Matching**: Uses simple keyword matching, not true semantic understanding
2. **Geographic Matching**: Basic string matching, no location normalization
3. **Name Matching**: Limited nickname support, no phonetic matching
4. **Relationship Scoring**: Uses placeholder value (50) if not set
5. **No Learning**: Doesn't learn from user feedback
6. **No Temporal Factors**: Doesn't consider recency or urgency
7. **Fixed Weights**: Weights are hardcoded, not configurable

### Data Quality Limitations

1. **Contact Data**: Incomplete contact profiles reduce match quality
2. **Thesis Data**: Missing theses reduce tag overlap scores
3. **Relationship Strength**: Often not set, defaults to 50
4. **No Data Quality Metrics**: Can't identify low-quality contacts

### Transparency Limitations

1. **Limited Explanations**: Only AI explanations for top 5 matches
2. **No Score Breakdown**: Users can't see individual component scores
3. **No Confidence Scores**: No confidence indicators for matching factors
4. **No History**: Can't see how scores changed over time

### Performance Limitations

1. **No Caching**: Entity extraction results not cached
2. **Full Reprocessing**: Reprocesses all segments each time
3. **No Batching**: Processes all contacts sequentially
4. **No Optimization**: No database indexes on frequently queried fields

### User Experience Limitations

1. **Limited Feedback**: Basic thumbs up/down, no detailed feedback
2. **No Customization**: Can't adjust matching preferences
3. **No Filtering**: Can't filter matches by criteria
4. **No Sorting Options**: Only sorted by score

---

## Dependencies

### External Dependencies
- **OpenAI API**: GPT-4o-mini for entity extraction and explanations
- **Supabase**: Database, authentication, edge functions, real-time
- **Deno**: Runtime for edge functions

### Internal Dependencies
- Entity extraction must complete before matching
- Contacts must have theses for better matching
- Relationship strength should be set for accurate scoring

### Data Dependencies
- Conversations require segments for entity extraction
- Contacts require theses for tag overlap matching
- Match suggestions require both conversation and contact data

---

## Error Handling

### Entity Extraction Errors
- **No segments**: Returns empty entities
- **OpenAI timeout**: 25s timeout, returns error
- **JSON parse error**: Returns empty entities (graceful degradation)

### Match Generation Errors
- **No entities**: Returns empty matches
- **No contacts**: Returns empty matches
- **Database errors**: Logged, returns error response

### Client-Side Error Handling
- **API errors**: Displayed in toast notifications
- **Real-time errors**: Logged to console
- **Network errors**: Retry logic in React Query

---

## Security Considerations

### Authentication
- All edge functions require user authentication
- Users can only access their own conversations and contacts
- Service role key only used server-side

### Data Privacy
- Conversation transcripts stored securely
- Contact data is user-owned
- Match suggestions are private to user

### API Security
- CORS headers configured
- Input validation on edge functions
- SQL injection prevention via Supabase client

---

*Last Updated: January 2025*
*Version: 1.0*
