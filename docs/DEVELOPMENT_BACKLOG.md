# Development Backlog - Matching System

## Sprint Planning

### Completed Sprint: Architecture Documentation & Gap Analysis
**Goal**: Document current system and identify improvement opportunities
**Status**: Complete

#### Completed
- [x] Explore codebase architecture
- [x] Create .cursorrules file
- [x] Create feature tasks document
- [x] Create development backlog
- [x] Document current matching system architecture → `docs/ARCHITECTURE_MATCHING_SYSTEM.md`
- [x] Perform gap analysis → `docs/GAP_ANALYSIS.md`
- [x] Create improvement recommendations → included in `docs/GAP_ANALYSIS.md`
- [x] Initial codebase exploration
- [x] Documentation structure setup

---

### Completed Sprint: Contact Enrichment & Profile
**Goal**: Add rich contact enrichment and a dedicated contact profile page

#### Completed
- [x] Contact enrichment system (Serper + GPT-4o-mini) — DB migration, research-contact, generate-matches, frontend display
- [x] Social media enrichment function (`enrich-social`) — deployed, standalone, ready for testing
- [x] Contact Profile page (`/contacts/:id`) — hero, quick actions, smart insights, shared context, deeper context
- [x] Data quality module (`_shared/data-quality.ts`) — completeness scoring, priority, quality assessment
- [x] Personal affinity scoring in matching algorithm — education overlap, interests, portfolio, expertise
- [x] Updated schema types for enrichment fields
- [x] Calendar sync updates and unique constraint migration
- [x] Transcription fix

#### Awaiting Validation
- [ ] Enrichment v1.2 testing on 10–20 contacts (data completeness + match quality) → use `docs/ENRICHMENT_VALIDATION_2025.md`
- [x] Social enrichment integration decision → UI button on Contact Profile ("Social" button calls `enrich-social`)
- [ ] Production deploy of enrichment + profile changes

---

## Backlog Items

### Phase 1: Foundation & Documentation (Complete)
**Estimated Duration**: 1-2 weeks
**Status**: Complete

1. **Architecture Documentation** [A1]
   - Status: Complete ✅
   - Priority: P0
   - Description: Create comprehensive documentation of current matching system
   - Deliverable: `docs/ARCHITECTURE_MATCHING_SYSTEM.md`
   - Acceptance Criteria:
     - [x] Complete architecture map created
     - [x] All components documented
     - [x] Data flow diagrams included
     - [x] Dependencies mapped

2. **Gap Analysis** [A1.1]
   - Status: Complete ✅
   - Priority: P0
   - Dependencies: Architecture documentation
   - Description: Identify gaps between current and ideal matching system
   - Deliverable: `docs/GAP_ANALYSIS.md`
   - Acceptance Criteria:
     - [x] Gap analysis document created
     - [x] Improvement opportunities identified
     - [x] Prioritized recommendations provided

### Phase 2: Transparency & Explainability (Complete)
**Estimated Duration**: 2-3 weeks
**Status**: Complete

3. **Match Explanation UI** [T1]
   - Status: Complete ✅
   - Priority: P0
   - Description: Create detailed UI showing why matches were suggested
   - Deliverable: `client/src/components/MatchScoreBreakdown.tsx`
   - Acceptance Criteria:
     - [x] Component shows individual scoring factors
     - [x] Confidence scores displayed
     - [x] User can expand/collapse details
     - [x] Visual indicators for each factor

4. **Scoring Breakdown Display** [T2]
   - Status: Complete ✅
   - Priority: P0
   - Dependencies: T1
   - Description: Show individual component scores in UI
   - Acceptance Criteria:
     - [x] Semantic score visible
     - [x] Tag overlap score visible
     - [x] Role match score visible
     - [x] Geo match score visible
     - [x] Relationship score visible
     - [x] Name match boost visible
     - [x] Personal affinity visible (new)

5. **Confidence Score Display** [T3]
   - Status: Complete ✅
   - Priority: P0
   - Dependencies: T2
   - Description: Display confidence scores for each matching factor
   - Deliverable: `client/src/components/MatchScoreBreakdown.tsx` + `matchFromDb` mapping
   - Acceptance Criteria:
     - [x] Confidence scores shown for each factor
     - [x] Visual confidence indicators (bars, colors)
     - [x] Tooltips explaining confidence calculation
     - [x] confidence_scores persisted in generate-matches upsert
     - [x] matchFromDb maps score_breakdown, confidence_scores, match_version

### Phase 3: Algorithm Improvements
**Estimated Duration**: 3-4 weeks

6. **Embedding-Based Semantic Matching** [M1]
   - Status: Complete ✅
   - Priority: P0
   - Description: Replace keyword matching with embedding-based semantic similarity
   - Deliverables:
     - `supabase/functions/embed-contact/index.ts` (single + batch)
     - `supabase/functions/embed-conversation/index.ts`
     - Cosine similarity in `generate-matches/index.ts`
     - Client wrappers in `edgeFunctions.ts`
   - Technical Notes:
     - Uses OpenAI text-embedding-3-small (1536 dimensions)
     - Contact embeddings include bio, title, company, interests, expertise, portfolio
     - Conversation embeddings from rich context (target_person, goals, domains, intent)
     - Adaptive weights: 25% embedding when available, fallback to keyword-only
   - Acceptance Criteria:
     - [x] Embeddings generated for contacts (embed-contact, single + batch)
     - [x] Embeddings generated for conversations (embed-conversation)
     - [x] Semantic matching uses embeddings (cosine similarity in generate-matches)
     - [x] Performance acceptable (cosine similarity is O(n) per contact, <500ms for typical contact list)

7. **Temporal Factors** [M2]
   - Status: Backlog
   - Priority: P1
   - Description: Add time-based factors to matching (recency, urgency)
   - Acceptance Criteria:
     - Recent conversations weighted higher
     - Urgency indicators affect matching
     - Time-sensitive needs prioritized

8. **Geographic Matching Improvements** [M3]
   - Status: Backlog
   - Priority: P1
   - Description: Improve location matching with normalization
   - Acceptance Criteria:
     - Location normalization implemented
     - City/state/country matching
     - Region matching (e.g., "Bay Area" = "San Francisco")

9. **Enhanced Name Matching** [M4]
   - Status: Backlog
   - Priority: P1
   - Description: Add phonetic and advanced fuzzy matching
   - Acceptance Criteria:
     - Phonetic matching implemented
     - Better nickname handling
     - Company name matching improved

### Phase 4: Performance & Efficiency
**Estimated Duration**: 2-3 weeks

10. **Caching Layer** [P1]
    - Status: Backlog
    - Priority: P1
    - Description: Cache entity extraction results
    - Acceptance Criteria:
      - Entity extraction cached
      - Cache invalidation strategy
      - Performance improvement measured

11. **Database Optimization** [P2]
    - Status: Backlog
    - Priority: P1
    - Description: Add indexes and optimize queries
    - Acceptance Criteria:
      - Indexes on frequently queried fields
      - Query performance improved
      - Query execution time <100ms

12. **Batch Processing** [P3]
    - Status: Backlog
    - Priority: P1
    - Description: Process large contact lists in batches
    - Acceptance Criteria:
      - Batch processing implemented
      - Handles 1000+ contacts efficiently
      - Progress indicators shown

### Phase 5: Feedback & Learning
**Estimated Duration**: 3-4 weeks

13. **Feedback Collection** [F1]
    - Status: Backlog
    - Priority: P0
    - Description: Collect explicit user feedback on matches
    - Acceptance Criteria:
      - Thumbs up/down buttons
      - Feedback stored in database
      - Feedback visible in UI

14. **Implicit Feedback Tracking** [F2]
    - Status: Backlog
    - Priority: P0
    - Dependencies: F1
    - Description: Track user actions (intro made, dismissed, saved)
    - Acceptance Criteria:
      - Actions tracked automatically
      - Data stored for analysis
      - Analytics dashboard shows feedback

15. **Feedback Analysis Pipeline** [F3]
    - Status: Backlog
    - Priority: P1
    - Dependencies: F1, F2
    - Description: Analyze feedback to improve matching
    - Acceptance Criteria:
      - Feedback analyzed regularly
      - Patterns identified
      - Insights generated

16. **Weight Adjustment** [F4]
    - Status: Backlog
    - Priority: P1
    - Dependencies: F3
    - Description: Adjust matching weights based on feedback
    - Acceptance Criteria:
      - Weights updated based on feedback
      - A/B testing framework
      - Performance monitored

### Phase 6: Testing & Validation
**Estimated Duration**: 2-3 weeks

17. **Test Suite** [V1]
    - Status: Backlog
    - Priority: P1
    - Description: Create comprehensive test suite
    - Acceptance Criteria:
      - Unit tests for matching logic
      - Integration tests for full pipeline
      - Test coverage >80%

18. **Golden Dataset** [V2]
    - Status: Backlog
    - Priority: P1
    - Dependencies: V1
    - Description: Create golden dataset for regression testing
    - Acceptance Criteria:
      - Dataset of known good matches
      - Regression tests pass
      - Tests run on CI/CD

## Technical Debt

### High Priority
- Refactor matching weights into configuration
- Improve error handling in edge functions
- Add comprehensive logging
- Standardize API response formats

### Medium Priority
- Extract matching logic into separate module
- Create matching service abstraction
- Improve type safety across codebase
- Add input validation

### Low Priority
- Code cleanup and refactoring
- Documentation improvements
- Performance profiling
- Security audit

## Notes

### Current Limitations
1. Matching uses simple keyword matching for semantic similarity
2. No learning from user feedback
3. Limited transparency into scoring
4. No performance metrics collection
5. Geographic matching is basic
6. Name matching could be improved

### Future Considerations
- Multi-user collaboration features
- Advanced analytics and reporting
- Integration with external data sources
- Mobile app support
- API for third-party integrations

---

## Research: Conversation-from-Contact & Desktop (See docs/RESEARCH_CONVERSATION_AND_DESKTOP.md)

**Start conversation from contact**
- [x] One-click "Start conversation" from contact profile (opens recording flow with contact context + associates contact as participant).
- [ ] Optional link to Google Meet / Calendar event so conversation syncs with meetings.
- [ ] Notifications to intuitively begin conversation records (e.g. "Call with [Contact] in 15 min – start recording?").

**Google Meet AI (optional use only)**
- [ ] Research: Google Meet transcript, summary, and action-items APIs or export formats.
- [ ] Optional import of Meet transcript/summary to supplement our Whisper pipeline; do not rely on Meet AI as required.

**Desktop-first**
- [ ] UX and flows optimized as a desktop tool; user explicitly starts recording (no required auto-capture).

**Desktop app / browser plug-in (RESEARCH)**
- [ ] **Research: Desktop app that plugs into browser or account** – Explore building a desktop application (e.g. Electron/Tauri) or browser extension that plugs into the user's browser or Google account. Evaluate: "plug into browser" vs "plug into account"; desktop app vs extension vs PWA; how each supports one-click "Start conversation," Meet/Calendar link, and notifications; recommendation or ranked options. See `docs/RESEARCH_CONVERSATION_AND_DESKTOP.md` §4.

## Estimation Guidelines
- Small: 1-3 days
- Medium: 3-5 days
- Large: 1-2 weeks
- Epic: 2+ weeks

## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Monitored for issues
