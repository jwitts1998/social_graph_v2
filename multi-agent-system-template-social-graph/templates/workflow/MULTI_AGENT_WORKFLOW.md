# Multi-Agent Development Workflow

**Date**: January 2026  
**Status**: Active

## 🎯 Purpose

This document describes how specialized development agents collaborate to implement features efficiently while maintaining code quality and consistency.

---

## 🤖 Agent Roles Summary

See `AGENTS.md` for detailed agent responsibilities. Common roles:

- **Implementation Agent**: Business logic, services, core functionality
- **UI/UX Agent** (Frontend): Design system, accessibility, user experience
- **Quality Assurance Agent**: Code review, security, architecture compliance
- **Testing Agent**: Test coverage, QA automation
- **Documentation Agent**: Code docs, architecture docs, API docs

---

## 🔄 Workflow Patterns

### Pattern 1: Sequential Feature Implementation (Recommended)

**Use Case**: New feature with complete development lifecycle

**Workflow**:
1. **{{FIRST_AGENT}}** → Initial implementation or design
2. **{{SECOND_AGENT}}** → Review or build upon first agent's work
3. **Testing Agent** → Write comprehensive tests
4. **Documentation Agent** → Add documentation

**Example Task**:
```yaml
- id: FEATURE_T1_user_profile
  title: "Implement user profile feature"
  agent_roles: [{{AGENT_ROLE_1}}, {{AGENT_ROLE_2}}, testing, documentation]
  description: >
    Full feature: {{WORKFLOW_DESCRIPTION}}
```

### Pattern 2: Parallel Independent Work

**Use Case**: Independent tasks that don't block each other

**Workflow**:
- **Agent A** → Works on feature/task A
- **Agent B** → Works on feature/task B simultaneously
- **Agent C** → Works on feature/task C simultaneously

### Pattern 3: Review-Based Collaboration

**Use Case**: Implementation followed by multi-perspective review

**Workflow**:
1. **Implementation Agent** → Implements feature
2. **Quality Assurance Agent** → Reviews code quality
3. **Testing Agent** → Reviews test coverage and creates missing tests
4. **Documentation Agent** → Reviews and updates documentation

---

## 📋 Task Selection Process

1. **Open relevant task file**: `tasks/*.yml` for the feature
2. **Find a task**: Look for `status: todo` with `priority: high`
3. **Check agent_roles**: Verify your agent type matches
4. **Read context**: Review `spec_refs`, `description`, `acceptance_criteria`
5. **Check dependencies**: Ensure `blocked_by` tasks are complete
6. **Propose status change**: Suggest `status: in_progress` before starting
7. **Work on task**: Follow agent-specific responsibilities
8. **Update task**: Propose `status: done` when acceptance criteria are met

---

## 🤝 Agent Handoff Protocol

When multiple agents work on the same task:

1. **First Agent**:
   - Complete their portion
   - Update task notes: "{{AGENT_NAME}}: {{WORK_COMPLETED}}. Ready for {{NEXT_AGENT}}."
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

## ✅ Quality Assurance

### Agent-Specific Checklists

See `AGENTS.md` for complete checklists. Key items:

**Implementation Agent**:
- [ ] Architecture pattern followed
- [ ] Code follows style guidelines
- [ ] Error handling and edge cases covered
- [ ] No hardcoded secrets

**UI/UX Agent** (if applicable):
- [ ] Design system tokens used
- [ ] Responsive design implemented
- [ ] Accessibility requirements met
- [ ] Visual consistency maintained

**Quality Assurance Agent**:
- [ ] Code quality meets standards
- [ ] Security best practices followed
- [ ] Architecture patterns adhered to
- [ ] Performance considerations addressed

**Testing Agent**:
- [ ] Unit tests for business logic
- [ ] Integration tests for features
- [ ] Tests are fast and deterministic
- [ ] Coverage meets target ({{TEST_COVERAGE_TARGET}}%)

**Documentation Agent**:
- [ ] Code documentation present
- [ ] Feature documented in `docs/`
- [ ] API documentation updated (if applicable)
- [ ] Examples provided

---

## 💡 Best Practices

### Do's ✅

1. Start with context (read task file, spec_refs, related docs)
2. Propose status changes rather than silently applying
3. Document decisions in task notes or documentation
4. Follow existing patterns in codebase
5. Coordinate through task comments when multiple agents involved

### Don'ts ❌

1. Don't skip reading context before starting
2. Don't mark tasks complete without meeting all acceptance criteria
3. Don't ignore agent_roles assignments
4. Don't work on blocked tasks
5. Don't bypass quality checks

---

## 🔗 Related Documentation

- **AGENTS.md**: Detailed agent role definitions
- **.cursorrules**: Architecture and code standards
- **TASK_SCHEMA_GUIDE.md**: Task file schema documentation

---

**Last Updated**: {{DATE}}
