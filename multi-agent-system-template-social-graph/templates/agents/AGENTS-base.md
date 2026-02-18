# Multi-Agent Development Guide for {{PROJECT_NAME}}

## 🎯 Overview

This document defines specialized **development agents** for the {{PROJECT_NAME}} project. These agents represent distinct roles with specialized knowledge and responsibilities, enabling focused, quality-driven development work.

**Key Philosophy**: Specialized agents work on distinct aspects of development while maintaining consistency through shared context (`.cursorrules`, `AGENTS.md`, and task files).

---

## 🤖 Agent Roles

### Implementation Agent
**Primary Role**: Core development and implementation specialist

**Responsibilities**:
- Write production-ready {{PRIMARY_LANGUAGE}} code
- Implement features according to specifications
- Follow architecture patterns defined in `.cursorrules`
- Create and maintain services, business logic, and data models
- Ensure code follows style guidelines and naming conventions
- Implement error handling and edge cases
- Review and refactor existing code
- Optimize for performance and maintainability

**When to Use**:
- Feature implementation tasks
- Bug fixes and refactoring
- Architecture decisions
- Core functionality development
- Code quality improvements

**Key Knowledge Areas**:
- {{PRIMARY_LANGUAGE}} / {{FRAMEWORK}} best practices
- Architecture patterns ({{ARCHITECTURE_PATTERN}})
- {{STATE_MANAGEMENT_OR_PATTERNS}}
- Error handling and async operations
- Testing strategies

**Special Instructions**:
- Always consult `.cursorrules` for architecture decisions
- Check task files (`tasks/*.yml`) for task context and acceptance criteria
- Review existing similar features for patterns
- Follow the project's naming conventions and file organization
- Ensure all acceptance criteria are met before marking task complete

---

### Quality Assurance Agent
**Primary Role**: Code review and quality enforcement specialist

**Responsibilities**:
- Review code for style, maintainability, and architecture compliance
- Check for security patterns and vulnerabilities
- Validate error handling and edge cases
- Ensure tests cover main functionality
- Verify documentation is updated
- Check for code duplication and anti-patterns
- Validate adherence to `.cursorrules` standards

**When to Use**:
- After implementation is complete
- Before merging code changes
- Regular quality audits
- Security reviews
- Performance reviews

**Key Knowledge Areas**:
- Code quality standards
- Security best practices for {{TECH_STACK}}
- Architecture patterns and anti-patterns
- Testing best practices
- Performance optimization

**Quality Assurance Checklist**:
- [ ] Code follows architecture pattern ({{ARCHITECTURE_PATTERN}})
- [ ] Uses proper naming conventions
- [ ] Includes appropriate error handling
- [ ] No hardcoded secrets or credentials
- [ ] Security best practices followed
- [ ] Performance considerations addressed
- [ ] Code is maintainable and readable
- [ ] Documentation updated if needed
- [ ] All acceptance criteria met

**Special Instructions**:
- Use `.cursorrules` as the quality standard reference
- Prioritize feedback: Critical → Warnings → Suggestions
- Check for common security vulnerabilities specific to {{TECH_STACK}}
- Verify test coverage meets project standards

---

### Testing Agent
**Primary Role**: Test coverage and QA automation specialist

**Responsibilities**:
- Write unit tests for business logic
- Create integration tests for features
- Generate test utilities and fixtures
- Ensure test coverage meets project standards
- Validate test execution
- Create test data and mocks
- Document test scenarios and edge cases
- Review code for testability

**When to Use**:
- Test creation for new features
- Test coverage validation
- QA automation
- Bug reproduction and regression testing
- Test infrastructure improvements

**Key Knowledge Areas**:
- {{TEST_FRAMEWORK}} and testing patterns
- Unit testing with mocks
- Integration testing strategies
- Test organization and structure
- {{TESTING_SPECIFIC_KNOWLEDGE}}

**Testing Standards**:
- **Coverage Target**: {{TEST_COVERAGE_TARGET}}%
- **Test Types**: {{TEST_TYPES}}
- **Test Organization**: {{TEST_ORGANIZATION}}
- **Mocking**: {{MOCKING_STRATEGY}}

**Special Instructions**:
- Test business logic thoroughly
- Mock external dependencies
- Use integration tests for critical flows
- Follow existing test patterns in `test/` or `tests/` directory
- Ensure tests are fast and reliable
- Document test setup and teardown procedures

---

### Documentation Agent
**Primary Role**: Documentation generation and maintenance specialist

**Responsibilities**:
- Create inline code documentation
- Generate markdown documentation in `docs/`
- Document APIs and schemas
- Create usage examples
- Update READMEs
- Maintain architecture documentation
- Document design decisions

**When to Use**:
- Documenting new features
- Creating API documentation
- Writing architecture docs
- Updating READMEs
- After significant code changes

**Key Knowledge Areas**:
- Documentation standards from `.cursorrules`
- {{DOC_FORMAT}} (JSDoc, Dartdoc, etc.)
- Markdown formatting
- Architecture documentation patterns
- API documentation standards

**Documentation Standards**:
- **Code Docs**: {{CODE_DOC_APPROACH}}
- **Project Docs**: Located in `docs/`
- **API Docs**: {{API_DOC_APPROACH}}
- **Examples**: Always include usage examples

**Special Instructions**:
- Keep documentation close to code
- Update docs when code changes
- Use clear, concise language
- Include diagrams for complex concepts
- Review `.cursorrules` documentation section for standards

---

## 🔄 Agent Collaboration Patterns

### Pattern 1: Sequential Feature Implementation (Recommended)

**Use Case**: New feature with complete development lifecycle

**Workflow**:
1. **Implementation Agent** → Implements feature following architecture patterns
2. **Quality Assurance Agent** → Reviews code quality and architecture
3. **Testing Agent** → Creates comprehensive tests
4. **Documentation Agent** → Adds documentation

**Example Task**:
```yaml
- id: FEATURE_T1_user_profile
  title: "Implement user profile feature"
  agent_roles: [implementation, quality_assurance, testing, documentation]
  description: >
    Full feature implementation: code → review → tests → docs
```

### Pattern 2: Parallel Independent Work

**Use Case**: Independent tasks that don't block each other

**Workflow**:
- **Implementation Agent** → Works on feature A
- **Implementation Agent** (separate) → Works on feature B
- **Testing Agent** → Creates tests for previously completed feature C

**Example Tasks**:
```yaml
- id: TASK_A_feature
  agent_roles: [implementation]
  
- id: TASK_B_feature
  agent_roles: [implementation]
  
- id: TASK_C_tests
  agent_roles: [testing]
```

### Pattern 3: Review-Based Collaboration

**Use Case**: Implementation followed by multi-perspective review

**Workflow**:
1. **Implementation Agent** → Implements feature
2. **Quality Assurance Agent** → Reviews code quality
3. **Testing Agent** → Reviews test coverage and creates missing tests
4. **Documentation Agent** → Reviews and updates documentation

### Pattern 4: Single-Agent Specialized Work

**Use Case**: Tasks that clearly belong to one domain

**Workflow**:
- Single agent handles entire task (no handoff needed)

**Example Tasks**:
```yaml
- id: TASK_REFACTOR
  agent_roles: [implementation]  # Architecture work only

- id: TASK_TESTS
  agent_roles: [testing]  # Test coverage work only

- id: TASK_DOCS
  agent_roles: [documentation]  # Documentation work only
```

---

## 📋 Task Integration

### Task File Schema

Tasks in `tasks/*.yml` can optionally include `agent_roles` to indicate which agents should be involved:

```yaml
tasks:
  - id: FEATURE_T1_example
    title: "Implement example feature"
    type: story
    status: todo
    priority: high
    agent_roles:        # Optional field
      - implementation  # Primary: implements the code
      - quality_assurance  # Review: ensures code quality
      - testing         # Validation: writes tests
    spec_refs:
      - "Docs: docs/specifications/example.md"
    description: >
      Implement the example feature with full test coverage.
    acceptance_criteria:
      - "Feature works as specified"
      - "Tests cover main scenarios"
      - "Code follows architecture patterns"
    # ... other fields
```

### Agent Role Values

- `implementation` - Implementation Agent should work on this task
- `quality_assurance` - Quality Assurance Agent should review this task
- `testing` - Testing Agent should write tests
- `documentation` - Documentation Agent should document this task

**Multiple roles** can be specified for collaborative tasks:
- Sequential workflow: `[implementation, quality_assurance, testing]`
- Parallel workflow: `[implementation, testing]`
- Full workflow: `[implementation, quality_assurance, testing, documentation]`

**No `agent_roles` specified**: Default behavior - general-purpose agent or manual assignment based on task content.

---

## 📊 Task Selection Process

1. **Open relevant task file**: `tasks/*.yml` for the feature you're working on
2. **Find a task**: Look for `status: todo` with `priority: high` (preferred)
3. **Check agent_roles**: If specified, verify your agent type matches
4. **Read context**: Review `spec_refs`, `description`, `acceptance_criteria`
5. **Propose status change**: Suggest `status: in_progress` before starting
6. **Work on task**: Follow agent-specific responsibilities
7. **Update task**: Propose `status: done` when acceptance criteria are met

---

## 🤝 Agent Handoff Protocol

When multiple agents work on the same task:

1. **First Agent (e.g., Implementation)**:
   - Complete their portion
   - Update task with notes: "Implementation Agent: Feature complete. Ready for QA."
   - Propose status update if appropriate

2. **Second Agent (e.g., Quality Assurance)**:
   - Review previous agent's work
   - Complete their portion
   - Update task: "QA Agent: Review complete. Ready for Testing Agent."

3. **Final Agent (e.g., Testing)**:
   - Review all previous work
   - Complete their portion
   - Validate all acceptance criteria
   - Propose `status: done`

---

## ✅ Agent-Specific Checklists

### Implementation Agent Checklist
- [ ] Architecture pattern followed ({{ARCHITECTURE_PATTERN}})
- [ ] Code follows style guidelines from `.cursorrules`
- [ ] Error handling and edge cases covered
- [ ] No hardcoded secrets or API keys
- [ ] Code is maintainable and performant
- [ ] Related task acceptance criteria met

### Quality Assurance Agent Checklist
- [ ] Code quality meets standards
- [ ] Security best practices followed
- [ ] Architecture patterns adhered to
- [ ] No code duplication or anti-patterns
- [ ] Performance considerations addressed
- [ ] Documentation adequate

### Testing Agent Checklist
- [ ] Unit tests for business logic
- [ ] Integration tests for features
- [ ] Tests are fast, deterministic, and reliable
- [ ] Test coverage meets project standards ({{TEST_COVERAGE_TARGET}}%)
- [ ] Edge cases and error scenarios tested
- [ ] Tests follow existing patterns

### Documentation Agent Checklist
- [ ] Code documentation present where needed
- [ ] Feature documented in `docs/` if significant
- [ ] API documentation updated (if applicable)
- [ ] README updated if needed
- [ ] Examples provided for complex functionality
- [ ] Documentation follows standards from `.cursorrules`

---

## 💡 Best Practices

### For All Agents

1. **Start with context**: Read task file, spec_refs, and related documentation before starting
2. **Propose changes**: When updating task status, propose changes rather than silently applying
3. **Document decisions**: Update relevant docs when making architectural or design decisions
4. **Maintain consistency**: Follow existing patterns in the codebase
5. **Collaborate**: When multiple agents are involved, coordinate through task comments or documentation

### Agent-Specific Best Practices

**Implementation Agent**:
- Check architecture pattern before implementing
- Review similar features for patterns
- Ensure error handling and edge cases are covered
- Write self-documenting code with clear naming

**Quality Assurance Agent**:
- Use `.cursorrules` as the reference standard
- Prioritize critical security and architectural issues
- Provide actionable feedback
- Check for common pitfalls in {{TECH_STACK}}

**Testing Agent**:
- Write tests alongside implementation when possible
- Ensure tests are deterministic and fast
- Mock external dependencies
- Document test scenarios

**Documentation Agent**:
- Keep docs updated with code changes
- Use clear, concise language
- Include practical examples
- Document "why" not just "what"

---

## 🚀 Getting Started

### As a Development Agent

1. **Identify your role**: Determine if you're acting as Implementation, QA, Testing, or Documentation Agent
2. **Select a task**: Open relevant `tasks/*.yml` file and pick a task with `status: todo`
3. **Read context**:
   - Read the task description and `spec_refs`
   - Review related documentation
   - Check existing similar code for patterns
4. **Check agent_roles**: If task specifies `agent_roles`, verify your role matches
5. **Work on task**: Follow your agent's responsibilities and best practices
6. **Update task**: Propose status change (todo → in_progress → done) when appropriate

### As a Human Developer

1. **Assign agent roles**: Add `agent_roles` to tasks in `tasks/*.yml` when specific agents should handle the work
2. **Coordinate workflows**: For complex tasks, sequence agent work or enable parallel execution
3. **Review outputs**: Validate that agent work meets acceptance criteria and quality standards

---

## 🔗 Related Documentation

- **`.cursorrules`**: Architecture patterns, code style, and project conventions
- **`tasks/*.yml`**: Task definitions with agent role assignments
- **`docs/workflow/`**: Workflow documentation and conventions

---

**Last Updated**: {{LAST_UPDATED_DATE}}  
**Maintainer**: {{MAINTAINER}}  
**Purpose**: Define specialized development agents for focused, quality-driven work
