# Multi-Agent Development Guide for Social Graph v2

## Overview

This document defines specialized **development agents** for the Social Graph v2 application. These agents collaborate on frontend, Supabase Edge Functions, database schema, matching/entity logic, testing, and integration concerns.

**Type**: Full-Stack Application (React + Supabase)
**Frontend**: React (TypeScript, Vite), TailwindCSS, shadcn/ui
**Backend**: Supabase Edge Functions (Deno)
**Database**: PostgreSQL (Supabase)
**State Management**: TanStack Query (React Query)
**Key Philosophy**: Specialized agents ensure quality across the entire stack. The matching algorithm and entity extraction pipeline are the core domain -- changes there require the Matching / Entity Agent.

---

## Agent Roles

### Frontend Agent
**Primary Role**: Client-side components, state management, and Edge Function integration

**Responsibilities**: Build React UI components with shadcn/ui and TailwindCSS, implement TanStack Query hooks for data fetching, integrate with Supabase Edge Functions via `client/src/lib/edgeFunctions.ts`, handle routing, ensure responsive design

**When to Use**: Component implementation, TanStack Query hooks, UI state, routing, Supabase real-time subscriptions on the client

**Key Knowledge Areas**: React (TypeScript, Vite), TanStack Query, shadcn/ui, TailwindCSS, Supabase JS client, real-time subscriptions

**Key Files**:
- `client/src/components/` -- UI components (PascalCase)
- `client/src/pages/` -- Page components
- `client/src/hooks/` -- Custom hooks (`use` prefix, camelCase)
- `client/src/lib/edgeFunctions.ts` -- Edge Function client calls
- `client/src/lib/supabaseHelpers.ts` -- Supabase client helpers

---

### Supabase / Edge Functions Agent
**Primary Role**: Server-side logic via Supabase Edge Functions (Deno runtime)

**Responsibilities**: Implement and maintain Edge Functions in `supabase/functions/`, handle CORS headers, use service-role client for admin operations and user client for authenticated operations, integrate with OpenAI API for entity extraction and explanations, handle errors with proper JSON responses

**When to Use**: New or modified Edge Functions, CORS or auth patterns, Deno-specific issues, OpenAI API integration

**Key Knowledge Areas**: Deno runtime, Supabase Edge Functions, CORS headers, service-role vs user client, OpenAI GPT-4o-mini integration

**Key Files**:
- `supabase/functions/generate-matches/index.ts` -- Matching algorithm
- `supabase/functions/extract-entities/index.ts` -- Entity extraction
- `supabase/functions/research-contact/index.ts` -- Contact enrichment
- `supabase/functions/enrich-social/index.ts` -- Social media enrichment
- `supabase/functions/sync-google-calendar/index.ts` -- Calendar sync
- `supabase/functions/_shared/` -- Shared utilities (e.g. `data-quality.ts`)

**Edge Function Pattern**:
```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    // Auth check
    // Business logic
    // Return response
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
```

---

### Schema / Data Agent
**Primary Role**: Database schema design, migrations, Drizzle ORM types, and data access patterns

**Responsibilities**: Design and maintain PostgreSQL schema via Supabase migrations in `supabase/migrations/`, define Drizzle ORM types in `shared/schema.ts` (type generation only -- actual queries use Supabase client), manage RLS policies, optimize indexes and query performance

**When to Use**: Schema changes, new migrations, RLS policy updates, Drizzle type updates, database query optimization

**Key Knowledge Areas**: PostgreSQL, Supabase migrations, Drizzle ORM (type generation), Row Level Security (RLS), Supabase client queries

**Key Files**:
- `shared/schema.ts` -- Drizzle ORM type definitions
- `supabase/migrations/` -- SQL migration files
- Key tables: `contacts`, `conversations`, `match_suggestions`, `theses`, `conversation_entities`

**Supabase Query Pattern**:
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('field1, field2, relation:foreign_key (related_field)')
  .eq('filter_field', value)
  .order('sort_field', { ascending: false });
```

---

### Shared Types Agent
**Primary Role**: Shared type definitions and Edge Function request/response contracts

**Responsibilities**: Define and maintain TypeScript types in `shared/schema.ts`, ensure type safety across client and Edge Functions, document Edge Function request/response shapes, keep Drizzle types in sync with actual database schema

**When to Use**: New Edge Function endpoints, type updates that span client and backend, API contract changes

**Key Knowledge Areas**: TypeScript strict types, Drizzle ORM type definitions, zod for runtime validation, request/response shapes

**Key Files**:
- `shared/schema.ts` -- Central type definitions

---

### Testing Agent (Full-Stack)
**Primary Role**: Testing across the entire stack

**Responsibilities**: Unit tests for business logic (matching algorithm, entity extraction), component tests for React UI, integration tests for Edge Functions, E2E tests for critical flows (recording → entity extraction → match generation), coverage validation

**When to Use**: Test creation, coverage improvement, regression testing, validating matching logic changes

**Key Knowledge Areas**: Frontend testing (React Testing Library), Edge Function testing, matching algorithm test scenarios (fundraising, hiring, partnerships), entity extraction test cases

**Testing Priorities**:
- Matching algorithm with various entity combinations
- Name matching (including nicknames)
- Edge cases: empty entities, no contacts, single contact
- Real-time update flows
- AI explanation generation

---

### Matching / Entity Agent
**Primary Role**: Domain-specific logic for the matching algorithm and entity extraction pipeline

**Responsibilities**: Maintain and evolve the weighted scoring algorithm in `generate-matches`, manage entity extraction logic in `extract-entities`, tune scoring weights and star rating thresholds, ensure backward compatibility with existing `match_suggestions` data, update `docs/MATCHING_LOGIC.md` for any algorithm changes

**When to Use**: Any change to matching weights, scoring factors, star thresholds, entity extraction prompts, or matching-related UI. Other agents defer to this agent for scoring and entity decisions.

**Key Knowledge Areas**: Weighted scoring algorithm, Jaccard similarity, semantic similarity, name matching, geographic matching, relationship strength, OpenAI GPT-4o-mini entity extraction

**Key Files**:
- `supabase/functions/generate-matches/index.ts` -- Matching algorithm
- `supabase/functions/extract-entities/index.ts` -- Entity extraction
- `docs/MATCHING_LOGIC.md` -- Algorithm documentation

**Current Weights**:
- Semantic similarity: 20%
- Tag overlap (Jaccard): 35%
- Role matching: 15%
- Geographic matching: 10%
- Relationship strength: 20%
- Name matching boost: up to +0.3

**Star Thresholds**: 1 star (>=0.05), 2 stars (>=0.20), 3 stars (>=0.40)

**Rules**:
1. Update `WEIGHTS` constant when changing scoring balance
2. Update star rating thresholds when changing match inclusion criteria
3. Test with various conversation types (fundraising, hiring, partnerships)
4. Ensure backward compatibility with existing match_suggestions data
5. Always update `docs/MATCHING_LOGIC.md` with algorithm changes

---

### Research Agent
**Primary Role**: General-purpose research -- topic investigation, source gathering, option comparison, and structured synthesis

**Responsibilities**: Clarify research scope, gather information from multiple sources (web search, documentation, codebase), synthesize findings with citations, deliver structured output (summaries, comparison tables, or research memos)

**When to Use**: User requests research on a topic, asks to compare options or alternatives, needs a research memo, or asks an open-ended "find out about X" question

**Key Knowledge Areas**: Web research, source evaluation, structured synthesis, comparison frameworks, citing sources

**Subagent Config**: `.cursor/agents/research.md`

---

## Full-Stack Workflow

### Sequential Feature Implementation
1. **Shared Types Agent** -> Define or update types in `shared/schema.ts`
2. **Schema / Data Agent** -> Create migration, update schema if needed
3. **Supabase Agent** -> Implement Edge Function endpoint
4. **Frontend Agent** -> Build React components and TanStack Query hooks
5. **Testing Agent** -> Write tests (unit, integration, E2E)

### Matching / Entity Changes
1. **Matching / Entity Agent** -> Design algorithm change, update weights/thresholds
2. **Supabase Agent** -> Implement in Edge Function
3. **Testing Agent** -> Test with diverse conversation scenarios
4. **Matching / Entity Agent** -> Update `docs/MATCHING_LOGIC.md`

### Example Task
```yaml
- id: FEATURE_T1_match_explanation_ui
  title: "Implement match explanation UI"
  agent_roles: [matching_entity, frontend, testing]
  description: >
    Show detailed scoring breakdown for each match suggestion.
    Matching/Entity agent defines data shape, Frontend builds UI, Testing validates.
```

---

## Full-Stack Checklists

### Shared Types Checklist
- [ ] Types defined in `shared/schema.ts`
- [ ] Request/response shapes for Edge Functions documented
- [ ] Types consistent between client and Edge Functions
- [ ] Zod schemas added for runtime validation where needed

### Supabase / Edge Functions Checklist
- [ ] CORS headers included
- [ ] Auth check (service role or user client) applied correctly
- [ ] Error handling returns proper JSON response
- [ ] Edge Function follows existing patterns in `supabase/functions/`

### Schema / Data Checklist
- [ ] Migration file created in `supabase/migrations/`
- [ ] Drizzle types updated in `shared/schema.ts`
- [ ] RLS policies reviewed / updated
- [ ] Indexes added for frequently queried fields

### Frontend Checklist
- [ ] TanStack Query hook created or updated
- [ ] shadcn/ui components used where appropriate
- [ ] Loading, error, and empty states handled
- [ ] Responsive design verified

### Testing Checklist
- [ ] Unit tests for business logic
- [ ] Component tests for React UI
- [ ] Edge Function integration tests
- [ ] Matching algorithm tested with diverse scenarios

### Matching / Entity Checklist
- [ ] Weights and thresholds documented
- [ ] Backward compatibility verified
- [ ] `docs/MATCHING_LOGIC.md` updated
- [ ] Tested with fundraising, hiring, and partnership conversations

---

**Last Updated**: February 2026
**Maintainer**: jackson
**Purpose**: Define specialized agents for Social Graph v2 multi-agent development
