# Development Workflow

**Date**: February 2026
**Status**: Active

## Overview

This document describes the general development workflow for Social Graph v2, independent of specific agent assignments.

---

## Feature Development Process

### 1. Planning Phase

- Review feature requirements and specifications
- Check `spec_refs` in task file for detailed requirements
- Review design mockups (if applicable)
- Understand architecture pattern to use (see `.cursorrules`)
- Identify dependencies and blockers

### 2. Implementation Phase

**For new full-stack features**:
1. Define or update shared types in `shared/schema.ts`
2. Create database migration in `supabase/migrations/` if schema changes needed
3. Implement Edge Function in `supabase/functions/` with CORS and auth
4. Build React components and TanStack Query hooks in `client/src/`
5. Wire up real-time subscriptions if needed (Supabase real-time)

**Architecture Guidelines**:
- Follow architecture patterns from `.cursorrules`
- Use Supabase client for all database queries (not raw SQL in application code)
- Use Drizzle ORM for type definitions only (`shared/schema.ts`)
- Edge Functions use Deno runtime with proper CORS headers

### 3. Testing Phase

- Write unit tests for business logic (matching algorithm, scoring, entity extraction)
- Write component tests for React UI (React Testing Library)
- Write integration tests for Edge Functions
- Test matching algorithm with diverse conversation scenarios
- Verify real-time update flows work correctly

### 4. Review Phase

- Self-review against `.cursorrules` standards
- Check acceptance criteria are met
- Verify no hardcoded secrets or API keys
- Ensure documentation is updated
- For matching changes: verify `docs/MATCHING_LOGIC.md` is current

### 5. Integration Phase

- Deploy Edge Functions to Supabase
- Run database migrations if applicable
- Test feature end-to-end in dev environment
- Verify backward compatibility with existing data

---

## Code Review Process

### Self-Review Checklist

Before requesting review:
- [ ] Code follows `.cursorrules` style guidelines
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] No console errors or warnings
- [ ] Documentation updated
- [ ] No hardcoded secrets
- [ ] CORS headers present on Edge Functions
- [ ] Error handling returns proper JSON responses

### Review Guidelines

Use the code-reviewer subagent (`.cursor/agents/code-reviewer.md`) for automated review. Focus on:
- Architecture compliance (`.cursorrules` patterns)
- Security (auth checks, input validation, no secrets)
- Performance (no N+1 queries, efficient algorithms)
- Consistency with existing codebase patterns

---

## Testing Requirements

### Test Types

1. **Unit Tests**: Individual functions and scoring logic (matching weights, Jaccard similarity, name matching)
2. **Component Tests**: React components with React Testing Library (renders correctly, user interactions, state management)
3. **Integration Tests**: Edge Function endpoints (request/response validation, error handling, auth checks)

### Testing Standards

- All tests must pass before merge
- Tests should be fast and deterministic
- Mock external dependencies (OpenAI API, Supabase client)
- Test matching algorithm with multiple conversation types (fundraising, hiring, partnerships)

---

## Documentation Standards

### Code Documentation

- Add JSDoc/TSDoc comments for exported functions and complex logic
- Document Edge Function request/response shapes
- Comment non-obvious matching algorithm decisions

### Project Documentation

Documentation lives in `docs/`:
- Update `docs/MATCHING_LOGIC.md` when algorithm changes
- Create new docs for significant features
- Include diagrams for complex data flows
- Keep architecture documentation in `docs/` directory

---

## Task Management

### Task Lifecycle

```
todo -> in_progress -> done
           |
        blocked (if dependencies unmet)
```

### Status Updates

- Update status when starting work (`in_progress`)
- Update status when blocked (`blocked`)
- Update status when complete (`done`)

### Acceptance Criteria

Task is complete when all acceptance criteria are met:
- Feature works as specified
- Tests pass
- Code reviewed
- Documentation updated

---

## Related Documentation

- **.cursorrules**: Architecture patterns and code standards
- **AGENTS.md**: Agent roles and responsibilities
- **tasks/*.yml**: Feature task files
- **docs/MATCHING_LOGIC.md**: Matching algorithm documentation

---

**Last Updated**: February 2026
