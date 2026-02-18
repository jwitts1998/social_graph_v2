# Multi-Agent Development Workflow

**Date**: February 2026
**Status**: Active

## Purpose

This document describes how specialized development agents collaborate to implement features efficiently while maintaining code quality and consistency in Social Graph v2.

---

## Agent Roles Summary

See `AGENTS.md` for detailed agent responsibilities. Common roles:

- **Frontend Agent**: React components, TanStack Query hooks, shadcn/ui, real-time subscriptions
- **Supabase / Edge Functions Agent**: Deno Edge Functions, CORS, auth patterns, OpenAI integration
- **Schema / Data Agent**: PostgreSQL migrations, Drizzle types, RLS policies, query optimization
- **Shared Types Agent**: `shared/schema.ts` types, Edge Function request/response contracts
- **Testing Agent**: Unit, component, integration, and E2E tests
- **Matching / Entity Agent**: Matching algorithm, entity extraction, scoring weights, star thresholds

---

## Workflow Patterns

### Pattern 1: Sequential Full-Stack Implementation (Recommended)

**Use Case**: New feature spanning types, Edge Functions, and client UI

**Workflow**:
1. **Shared Types Agent** -> Define or update types in `shared/schema.ts`
2. **Schema / Data Agent** -> Migration and Drizzle type updates if needed
3. **Supabase Agent** -> Implement Edge Function endpoint
4. **Frontend Agent** -> Build React components and TanStack Query hooks
5. **Testing Agent** -> Write tests across the stack

**Example Task**:
```yaml
- id: FEATURE_T1_new_endpoint
  title: "Implement new feature end-to-end"
  agent_roles: [shared_types, schema_data, supabase, frontend, testing]
  description: >
    Full-stack feature: Types -> Schema -> Edge Function -> Client -> Tests
```

### Pattern 2: Matching / Entity Changes

**Use Case**: Changes to scoring weights, entity extraction, or match quality

**Workflow**:
1. **Matching / Entity Agent** -> Design algorithm change
2. **Supabase Agent** -> Implement in Edge Function
3. **Testing Agent** -> Test with diverse conversation scenarios (fundraising, hiring, partnerships)
4. **Matching / Entity Agent** -> Update `docs/MATCHING_LOGIC.md`

### Pattern 3: Parallel Independent Work

**Use Case**: Independent tasks that don't block each other

**Workflow**:
- **Agent A** -> Works on feature/task A
- **Agent B** -> Works on feature/task B simultaneously
- **Agent C** -> Works on feature/task C simultaneously

### Pattern 4: Review-Based Collaboration

**Use Case**: Implementation followed by multi-perspective review

**Workflow**:
1. **Implementation Agent** -> Implements feature
2. **Code Review subagent** -> Reviews code quality and architecture
3. **Testing Agent** -> Reviews test coverage and creates missing tests
4. **Security Auditor subagent** -> Reviews security (for auth/data-handling changes)

---

## Task Selection Process

1. **Open relevant task file**: `tasks/*.yml` for the feature
2. **Find a task**: Look for `status: todo` with `priority: high`
3. **Check agent_roles**: Verify your agent type matches
4. **Read context**: Review `spec_refs`, `description`, `acceptance_criteria`
5. **Check dependencies**: Ensure `blocked_by` tasks are complete
6. **Propose status change**: Suggest `status: in_progress` before starting
7. **Work on task**: Follow agent-specific responsibilities
8. **Update task**: Propose `status: done` when acceptance criteria are met

---

## Agent Handoff Protocol

When multiple agents work on the same task:

1. **First Agent**:
   - Complete their portion
   - Update task notes with work completed and next steps
   - Propose status update if appropriate

2. **Subsequent Agents**:
   - Review previous work
   - Complete their portion
   - Update task with progress
   - Hand off to next agent or mark complete

3. **Final Agent**:
   - Validate all acceptance criteria
   - Ensure all previous work is integrated
   - Propose `status: done`

---

## Quality Assurance

### Agent-Specific Checklists

See `AGENTS.md` for complete checklists. Key items:

**Frontend Agent**:
- [ ] TanStack Query hook created/updated
- [ ] shadcn/ui components used where appropriate
- [ ] Loading, error, and empty states handled
- [ ] Responsive design verified

**Supabase Agent**:
- [ ] CORS headers included
- [ ] Auth check applied correctly
- [ ] Error handling returns proper JSON
- [ ] Follows existing Edge Function patterns

**Schema / Data Agent**:
- [ ] Migration file created
- [ ] Drizzle types updated in `shared/schema.ts`
- [ ] RLS policies reviewed
- [ ] Indexes for frequently queried fields

**Testing Agent**:
- [ ] Unit tests for business logic
- [ ] Component tests for React UI
- [ ] Integration tests for Edge Functions
- [ ] Matching algorithm tested with diverse scenarios

**Matching / Entity Agent**:
- [ ] Weights and thresholds documented
- [ ] Backward compatibility verified
- [ ] `docs/MATCHING_LOGIC.md` updated
- [ ] Tested with fundraising, hiring, and partnership conversations

---

## Social Graph Notes

- **Real-time processing**: Conversations are processed every 5 seconds during recording. The pipeline is: Extract participants -> Extract entities -> Generate matches. Changes to any step in this pipeline should be tested end-to-end.
- **Matching algorithm changes** always go through the Matching / Entity Agent first, even if the code change is in an Edge Function.
- **Entity extraction prompt changes** should be tested with multiple conversation types before deploying.

---

## Best Practices

### Do's
1. Start with context (read task file, spec_refs, related docs)
2. Propose status changes rather than silently applying
3. Document decisions in task notes or documentation
4. Follow existing patterns in codebase
5. Coordinate through task comments when multiple agents involved

### Don'ts
1. Don't skip reading context before starting
2. Don't mark tasks complete without meeting all acceptance criteria
3. Don't ignore agent_roles assignments
4. Don't work on blocked tasks
5. Don't bypass quality checks

---

## Related Documentation

- **AGENTS.md**: Detailed agent role definitions
- **.cursorrules**: Architecture and code standards
- **tasks/*.yml**: Feature task files with agent_roles
- **docs/MATCHING_LOGIC.md**: Matching algorithm documentation

---

**Last Updated**: February 2026
