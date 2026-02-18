# Development Workflow

**Date**: January 2026  
**Status**: Active

## 🎯 Overview

This document describes the general development workflow for {{PROJECT_NAME}}, independent of specific agent assignments.

---

## 🚀 Feature Development Process

### 1. Planning Phase

- Review feature requirements and specifications
- Check `spec_refs` in task file for detailed requirements
- Review design mockups (if applicable)
- Understand architecture pattern to use
- Identify dependencies and blockers

### 2. Implementation Phase

**For new features**:
1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}
4. {{STEP_4}}
5. {{STEP_5}}

**Architecture Guidelines**:
- Follow architecture pattern from `.cursorrules`
- {{ARCHITECTURE_GUIDELINE_1}}
- {{ARCHITECTURE_GUIDELINE_2}}

### 3. Testing Phase

- Write unit tests for business logic
- {{TEST_TYPE_1}}
- {{TEST_TYPE_2}}
- Ensure coverage meets {{TEST_COVERAGE_TARGET}}%

### 4. Review Phase

- Self-review against `.cursorrules` standards
- Check acceptance criteria are met
- Verify no hardcoded secrets
- Ensure documentation is updated

### 5. Integration Phase

- {{INTEGRATION_STEP_1}}
- {{INTEGRATION_STEP_2}}
- Test feature end-to-end

---

## 📝 Code Review Process

### Self-Review Checklist

Before requesting review:
- [ ] Code follows `.cursorrules` style guidelines
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] No console errors or warnings
- [ ] Documentation updated
- [ ] No hardcoded secrets

### Review Guidelines

{{REVIEW_GUIDELINES}}

---

## 🧪 Testing Requirements

### Test Types

1. **Unit Tests**: {{UNIT_TEST_DESCRIPTION}}
2. **{{TEST_TYPE_2}}**: {{TEST_TYPE_2_DESCRIPTION}}
3. **{{TEST_TYPE_3}}**: {{TEST_TYPE_3_DESCRIPTION}}

### Testing Standards

- Coverage target: {{TEST_COVERAGE_TARGET}}%
- All tests must pass before merge
- Tests should be fast and deterministic
- Mock external dependencies

---

## 📚 Documentation Standards

### Code Documentation

- {{CODE_DOC_REQUIREMENT_1}}
- {{CODE_DOC_REQUIREMENT_2}}
- {{CODE_DOC_REQUIREMENT_3}}

### Project Documentation

Documentation lives in `docs/`:
- Update relevant docs when code changes
- Create new docs for significant features
- Include diagrams for complex concepts

---

## 🔄 Task Management

### Task Lifecycle

```
todo → in_progress → done
         ↓
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

## 🔗 Related Documentation

- **.cursorrules**: Architecture patterns and code standards
- **AGENTS.md**: Agent roles and responsibilities
- **TASK_SCHEMA_GUIDE.md**: Task file schema

---

**Last Updated**: {{DATE}}
