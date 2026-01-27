# Social Graph v2 - Codebase Audit Report

**Generated**: January 2026  
**Status**: Complete

---

## Executive Summary

Social Graph v2 is a **Proactive Relationship Intelligence** platform that transforms conversation transcriptions into actionable network insights. The system uses AI-powered entity extraction and semantic matching to suggest warm introductions.

**Key Finding**: The codebase is well-architected with comprehensive documentation. Embedding-based matching (v1.1) is already implemented despite docs marking it as "future use."

---

## Tech Stack Snapshot

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.3.1 | UI framework with functional components |
| **Styling** | TailwindCSS + shadcn/ui | 3.4.17 | Radix UI primitives styled with Tailwind |
| **Routing** | wouter | 3.3.5 | Lightweight client-side routing |
| **State/Data** | TanStack Query | 5.60.5 | Server state & caching |
| **Backend** | Supabase | Latest | PostgreSQL + Auth + Real-time + Edge Functions |
| **Runtime** | Deno | N/A | Edge function execution environment |
| **ORM** | Drizzle | 0.39.1 | Type generation only (queries use Supabase client) |
| **AI** | OpenAI | 6.7.0 | GPT-4o-mini + text-embedding-3-small |
| **Database** | PostgreSQL + pgvector | 15+ | Relational DB with vector similarity search |

**Architecture Pattern**: Serverless with real-time subscriptions

---

## Business Domains (Auto-PDB)

### 1. Conversation Intelligence
**Goal**: Capture transient meeting context automatically  
**Logic**: Audio recording → Transcription → AI entity extraction → Rich context storage

**Key Components**:
- `extract-entities` Edge Function (GPT-4o-mini)
- `extract-participants` Edge Function
- `conversations` table with JSONB rich context

**Business Value**: Eliminates manual note-taking; builds institutional memory

### 2. Network Management
**Goal**: Structure informal relationships into searchable assets  
**Logic**: Multi-dimensional contact profiles with investment theses and relationship scores

**Key Components**:
- `contacts` table (multi-type support: LP, GP, Angel, PE, Startup)
- `theses` table (Sectors, Stages, Geos, Check Sizes)
- `relationship_scores` table (0-100 strength metric)

**Business Value**: Transforms "who do I know?" into queryable data

### 3. Matching Engine
**Goal**: Suggest high-value connections based on current conversation needs  
**Logic**: Weighted scoring (6 factors) + semantic embeddings (30%) + name boost

**Key Components**:
- `generate-matches` Edge Function
- `embed-conversation` Edge Function
- `match_suggestions` table with transparency fields

**Business Value**: Proactive intelligence vs. reactive CRM searches

### Business Intent Mapping

| Technical Module | Business Goal | User Outcome |
|-----------------|---------------|--------------|
| `extract-entities` | Context Capture | "AI remembers the meeting for me" |
| `generate-matches` | Intelligence | "Who do I know that can help right now?" |
| `embed-conversation` | Deep Relevance | Matches meaning, not just keywords |
| `introduction_threads` | Execution | Frictionless double opt-in workflow |
| `match_feedback` | Learning | System improves from user actions |

---

## Documentation Audit

### Strengths
✅ Comprehensive architecture docs (`ARCHITECTURE_MATCHING_SYSTEM.md`)  
✅ Detailed gap analysis (`GAP_ANALYSIS.md`)  
✅ Clear implementation summary (`IMPLEMENTATION_SUMMARY.md`)  
✅ Well-defined matching logic (`MATCHING_LOGIC.md`)  
✅ Existing `.cursorrules` with domain context

### Contradictions Found
⚠️ **Embedding Status**: Docs say "future use" but implementation shows embeddings are LIVE in v1.1  
⚠️ **Matching Weights**: Some docs list old weights (20% semantic) vs. actual adaptive weights (30% embedding when available)

### Documentation Quality: 8.5/10
- Current implementation is ahead of documentation
- No critical gaps, just version lag

---

## MCP Recommendations

### High Priority
1. **Memory MCP** - Persist architectural decisions and domain dictionary across sessions
2. **Sequential Thinking MCP** - Debug complex 6-factor scoring algorithm
3. **Database MCP** (Custom) - Browse `contacts`/`conversations` tables directly in Cursor

### Medium Priority
4. **GitHub MCP** - Track `DEVELOPMENT_BACKLOG.md` items as formal issues

### Not Needed
- ❌ Web Search MCP (docs are comprehensive)
- ❌ File System MCP (standard tools sufficient)

---

## Gap Analysis & Technical Debt

### Documentation vs. Code Mismatches
1. **Embeddings marked as "future"** → Already implemented in `v1.1-transparency`
2. **Pipeline error handling** → Recording flow lacks robust retry logic
3. **Feedback loop incomplete** → UI collects thumbs up/down but backend doesn't adjust weights

### Brittle Areas
1. **Recording Pipeline** (`Record.tsx`) - No error recovery if Edge Function fails during 5s polling
2. **Name Matching** - Limited nickname support; no phonetic algorithms (Soundex/Metaphone)
3. **Geographic Matching** - Simple string matching; "SF" doesn't match "San Francisco"

### Missing Features (Documented in Backlog)
- Adaptive weight learning from feedback
- Temporal factors (urgency, recency)
- Relationship graph traversal (mutual connections)

---

## Initial Task Backlog (Prioritized)

### Task 1: [Alignment - P0]
**Fix Documentation Lag**  
Update `ARCHITECTURE_MATCHING_SYSTEM.md` lines 419-420 to reflect embeddings as "active implementation"

**Effort**: 5 min | **Impact**: Documentation accuracy

### Task 2: [Resilience - P0]
**Pipeline Error Handling**  
Add retry logic and exponential backoff to `PipelineContext.tsx` for failed Edge Function calls

**Effort**: 2 hours | **Impact**: Production stability

### Task 3: [Feature - P1]
**Connect Match Feedback to Learning**  
Wire `match_feedback` table inserts to trigger weight adjustment analytics job

**Effort**: 1 day | **Impact**: Enables Phase 3 (adaptive learning)

### Task 4: [Quality - P1]
**Phonetic Name Matching**  
Add Soundex/Metaphone to `fuzzyNameMatch()` in `generate-matches/index.ts`

**Effort**: 4 hours | **Impact**: Better match recall for name variations

### Task 5: [UX - P1]
**Score Breakdown Tooltips**  
Add hover tooltips to `SuggestionCard.tsx` that explain each score component from `score_breakdown` JSONB

**Effort**: 3 hours | **Impact**: User trust via transparency

---

## Cursor AI Optimizations Applied

✅ Enhanced `.cursorrules` with:
- Domain Dictionary (Target Person, Matching Intent, Thesis, etc.)
- AI Context Instructions (always check `/docs` before changes)
- Version awareness (v1.1-transparency)

✅ Fixed embedding documentation contradiction in `ARCHITECTURE_MATCHING_SYSTEM.md`

---

## Recommended Pinned Files for Cursor

For future development sessions, keep these in context:

1. `shared/schema.ts` - Source of truth for database types
2. `supabase/functions/generate-matches/index.ts` - Core matching logic
3. `client/src/contexts/PipelineContext.tsx` - Application data flow
4. `docs/ARCHITECTURE_MATCHING_SYSTEM.md` - System design reference

---

## Assessment: Production Readiness

**Score**: 8/10 - Solid foundation with minor gaps

**Strengths**:
- ✅ Sophisticated AI-powered matching (embeddings + multi-factor scoring)
- ✅ Comprehensive transparency features (score breakdown, confidence)
- ✅ Real-time updates via Supabase subscriptions
- ✅ Well-documented architecture

**Needs Improvement**:
- ⚠️ Error handling in recording pipeline
- ⚠️ Feedback loop backend integration
- ⚠️ Geographic/name matching sophistication

**Recommendation**: Address P0 tasks (documentation + error handling) before major feature adds.

---

*Report generated by AI audit - January 2026*
