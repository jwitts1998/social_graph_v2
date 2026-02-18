# Task Schema Guide

**Version**: 1.0.0  
**Last Updated**: January 2026

## 📖 Overview

This guide documents the task tracking schema used in the multi-agent development system. The schema defines two types of task files:

1. **Portfolio-level tasks** (`tasks.yml`) - High-level milestones and gaps
2. **Per-feature tasks** (`tasks/*.yml`) - Detailed implementation tasks

Both schemas support agent role assignments for multi-agent workflows.

---

## 📋 Portfolio-Level Schema (`tasks.yml`)

### Purpose

Track high-level project milestones, releases, and identified gaps at the portfolio level.

### File Location

`tasks.yml` (project root)

### Schema Structure

```yaml
metadata:
  version: string              # Schema version
  schema_version: string       # Schema version number
  last_updated: string         # ISO date (YYYY-MM-DD)
  project: string              # Project name
  description: string          # Brief description

milestones:
  completed: [Milestone]       # Completed milestones
  in_progress: [Milestone]     # Active milestones
  planned: [Milestone]         # Future milestones

gaps:
  - Gap                        # Identified gaps/issues
```

### Milestone Object

```yaml
id: string                     # Unique identifier (lowercase-hyphen)
title: string                  # Human-readable title
description: string            # Detailed description (multi-line)
status: string                 # completed | in_progress | planned
priority: string               # critical | high | medium | low
effort: string                 # small | medium | large
dependencies: [string]         # List of milestone IDs this depends on
documentation: [string]        # List of documentation file paths
tags: [string]                 # Categorization tags
completed_date: string         # ISO date (YYYY-MM-DD), optional
```

### Gap Object

```yaml
id: string                     # Unique identifier (lowercase-hyphen)
title: string                  # Human-readable title
description: string            # Detailed description (multi-line)
status: string                 # open | in_progress | resolved
priority: string               # critical | high | medium | low
tags: [string]                 # Categorization tags
resolution_date: string        # ISO date (YYYY-MM-DD), optional
```

### Example

```yaml
metadata:
  version: 1.0.0
  schema_version: 1.0.0
  last_updated: '2025-01-29'
  project: 'MyApp'
  description: Project backlog and milestones

milestones:
  completed:
    - id: auth-system
      title: "Authentication System"
      description: >-
        Implemented multi-provider auth with email, Google, and Apple sign-in.
      status: completed
      priority: high
      effort: large
      dependencies: []
      documentation:
        - "docs/auth/AUTH_IMPLEMENTATION.md"
      tags:
        - authentication
        - security
      completed_date: '2025-01-15'
  
  in_progress:
    - id: user-profiles
      title: "User Profile Management"
      description: >-
        Profile viewing, editing, avatar upload, bio management.
      status: in_progress
      priority: high
      effort: medium
      dependencies:
        - auth-system
      documentation:
        - "docs/features/PROFILE_SPEC.md"
      tags:
        - profile
        - user-management

gaps:
  - id: missing-api-docs
    title: "API Documentation Missing"
    description: >-
      Need OpenAPI/Swagger documentation for all endpoints.
    status: open
    priority: medium
    tags:
      - documentation
      - technical-debt
```

---

## 🎯 Per-Feature Schema (`tasks/*.yml`)

### Purpose

Track detailed implementation tasks for specific features or epics.

### File Location

`tasks/{number}_{feature_name}.yml` (e.g., `tasks/01_user_profiles.yml`)

### Schema Structure

```yaml
epic: string                   # High-level initiative name
feature: string                # Specific feature or slice name

context:
  phase: number                # Phase number (optional)
  spec_refs: [string]          # References to specs/docs
  notes: string                # Additional context (multi-line)

defaults:
  status: string               # Default status for tasks
  priority: string             # Default priority for tasks
  owner: string                # Default owner for tasks
  envs: [string]               # Default environments

tasks:
  - Task                       # List of task objects
```

### Task Object

```yaml
id: string                     # Unique identifier (FEATURE_T{N}_{name})
title: string                  # Human-readable title
type: string                   # story | chore | spike
status: string                 # todo | in_progress | blocked | done
priority: string               # high | medium | low
agent_roles: [string]          # Which agents should work on this
spec_refs: [string]            # References to specs/docs
description: string            # Detailed task description (multi-line)
code_areas: [string]           # Code paths affected
acceptance_criteria: [string]  # Definition of done
tests: [string]                # Test requirements
blocked_by: [string]           # Task IDs that block this task
blocks: [string]               # Task IDs that this task blocks
owner: string                  # Task owner (optional)
envs: [string]                 # Target environments (optional)
```

### Agent Roles

Valid values for `agent_roles` field:

**Universal**:
- `implementation` - Implementation Agent
- `quality_assurance` - QA Agent
- `testing` - Testing Agent
- `documentation` - Documentation Agent

**Mobile-Specific**:
- `ui_ux` - UI/UX Agent

**Web-Specific**:
- `frontend` - Frontend Agent
- `design_system` - Design System Agent
- `performance` - Performance Agent

**Backend-Specific**:
- `api` - API Agent
- `database` - Database Agent
- `security` - Security Agent

**Full-Stack**:
- `backend` - Backend Agent
- `frontend` - Frontend Agent
- `api_contract` - API Contract Agent

### Example

```yaml
epic: User_Management
feature: User_Profiles

context:
  phase: 2
  spec_refs:
    - "PDB: docs/product_design/app_pdb.md — User Profiles section"
    - "Design: Figma link or design doc"
  notes: >
    This feature enables users to view and edit their profiles with
    avatar upload, bio editing, and privacy settings.

defaults:
  status: todo
  priority: medium
  owner: team
  envs: [dev]

tasks:
  - id: PROFILE_T1_view_profile
    title: "Implement profile viewing page"
    type: story
    status: todo
    priority: high
    agent_roles:
      - implementation
      - ui_ux
    spec_refs:
      - "PDB: docs/product_design/app_pdb.md — Profile View"
      - "Design: Figma profile view mockup"
    description: >
      Create a profile viewing page that displays user information including
      avatar, name, bio, and stats. Should handle both own profile and
      other users' profiles.
    code_areas:
      - "lib/features/profile/presentation/pages/profile_page.dart"
      - "lib/features/profile/presentation/widgets/"
    acceptance_criteria:
      - "User can view their own profile"
      - "User can view other users' profiles"
      - "Avatar, name, bio displayed correctly"
      - "Stats (posts, followers, following) displayed"
      - "UI follows design system"
    tests:
      - "Widget test for ProfilePage"
      - "Integration test for profile viewing flow"
    blocked_by: []
    blocks:
      - PROFILE_T2_edit_profile
  
  - id: PROFILE_T2_edit_profile
    title: "Implement profile editing"
    type: story
    status: todo
    priority: high
    agent_roles:
      - implementation
      - ui_ux
      - testing
    spec_refs:
      - "PDB: docs/product_design/app_pdb.md — Profile Editing"
    description: >
      Add profile editing functionality with avatar upload, name editing,
      and bio editing. Include validation and error handling.
    code_areas:
      - "lib/features/profile/presentation/pages/edit_profile_page.dart"
      - "lib/features/profile/data/services/profile_service.dart"
    acceptance_criteria:
      - "User can edit name and bio"
      - "User can upload/change avatar"
      - "Changes save to backend"
      - "Validation works correctly"
      - "Error handling present"
    tests:
      - "Unit tests for ProfileService"
      - "Widget test for EditProfilePage"
      - "Integration test for edit flow"
    blocked_by:
      - PROFILE_T1_view_profile
    blocks: []
```

---

## 🔑 Field Definitions

### Status Values

**Portfolio-level** (`milestones`):
- `completed` - Milestone finished
- `in_progress` - Currently being worked on
- `planned` - Scheduled for future

**Per-feature** (`tasks`):
- `todo` - Not started
- `in_progress` - Currently being worked on
- `blocked` - Blocked by dependencies or issues
- `done` - Completed and verified

### Priority Values

- `critical` - Urgent, blocking other work
- `high` - Important, should be done soon
- `medium` - Normal priority
- `low` - Nice to have, can be deferred

### Effort Values (Portfolio-level only)

- `small` - < 1 week
- `medium` - 1-3 weeks
- `large` - > 3 weeks

### Type Values (Per-feature only)

- `story` - User-facing feature or functionality
- `chore` - Technical work, refactoring, infrastructure
- `spike` - Research or exploration task

---

## 🤖 Multi-Agent Integration

### Agent Role Assignment

The `agent_roles` field indicates which agents should work on a task:

```yaml
- id: TASK_T1_example
  agent_roles:
    - implementation  # Implementation Agent handles business logic
    - ui_ux          # UI/UX Agent handles design
    - testing        # Testing Agent writes tests
```

### Workflow Patterns

**Sequential** (agents work one after another):
```yaml
agent_roles: [ui_ux, implementation, testing]
# UI/UX designs → Implementation builds → Testing tests
```

**Parallel** (agents work independently):
```yaml
# Task A
agent_roles: [implementation]

# Task B (separate)
agent_roles: [ui_ux]
```

**Review-based** (implementation + reviews):
```yaml
agent_roles: [implementation, quality_assurance, testing]
# Implementation builds → QA reviews → Testing tests
```

### Agent Selection Guidelines

See `AGENTS.md` for detailed agent responsibilities and when to use each role.

---

## 📊 Task Dependencies

### Blocking Relationships

Use `blocked_by` and `blocks` to define task dependencies:

```yaml
- id: TASK_T1_foundation
  blocked_by: []     # No dependencies
  blocks:
    - TASK_T2_feature_a
    - TASK_T3_feature_b

- id: TASK_T2_feature_a
  blocked_by:
    - TASK_T1_foundation  # Must wait for T1
  blocks: []
```

### Dependency Rules

1. **No Circular Dependencies**: Task A cannot depend on Task B if B depends on A
2. **Cross-Feature Dependencies**: Use full task IDs (e.g., `FEATURE_A_T1`)
3. **Portfolio Dependencies**: Use milestone IDs in `dependencies` field

---

## ✅ Best Practices

### ID Naming Conventions

**Portfolio-level** (`tasks.yml`):
- Milestones: `lowercase-hyphenated` (e.g., `auth-system`, `user-profiles`)
- Gaps: `lowercase-hyphenated` (e.g., `missing-docs`, `performance-issue`)

**Per-feature** (`tasks/*.yml`):
- Tasks: `{FEATURE}_{T}{N}_{short_name}` (e.g., `PROFILE_T1_view_page`, `AUTH_T3_2fa`)

### Title Guidelines

- **Descriptive**: Clear what the task/milestone is about
- **Actionable**: Use verbs (Implement, Create, Fix, Add, Update)
- **Concise**: Keep under 80 characters
- **Specific**: Avoid vague terms like "improvements" or "enhancements"

### Description Guidelines

- **Context**: Why is this needed?
- **Details**: What specifically needs to be done?
- **Scope**: What's included and excluded?
- **References**: Link to relevant docs/specs

### Acceptance Criteria Guidelines

- **Testable**: Can be verified objectively
- **Specific**: Concrete outcomes, not vague goals
- **Complete**: Defines "done" completely
- **User-focused**: Written from user/system perspective

### Tag Guidelines

Use consistent tags for filtering and reporting:

- **By Type**: `feature`, `bug`, `refactor`, `docs`, `infra`
- **By Area**: `auth`, `profile`, `search`, `payments`, etc.
- **By Concern**: `performance`, `security`, `accessibility`, `technical-debt`

---

## 🔄 Workflow Integration

### Task Selection

1. Open relevant feature task file (`tasks/*.yml`)
2. Find task with `status: todo` (prefer `priority: high`)
3. Check `agent_roles` field to verify your role matches
4. Read `spec_refs`, `description`, `acceptance_criteria`
5. Check `blocked_by` to ensure dependencies are met

### Status Updates

Propose status changes as you work:

```yaml
# Before starting
status: todo

# While working
status: in_progress

# If blocked
status: blocked

# When complete
status: done
```

### Completion Criteria

Mark task as `done` only when:
- All `acceptance_criteria` are met
- All `tests` are implemented and passing
- Code is reviewed (if `quality_assurance` agent involved)
- Documentation updated (if `documentation` agent involved)

---

## 📖 Related Documentation

- **AGENTS.md**: Agent role definitions and responsibilities
- **.cursorrules**: Architecture patterns and code conventions
- **docs/workflow/MULTI_AGENT_WORKFLOW.md**: Workflow patterns and collaboration

---

## 🔗 Validation

### Manual Validation

Check your task files:

1. **Schema validity**: Ensure YAML is valid
2. **Required fields**: All required fields present
3. **ID uniqueness**: No duplicate task IDs
4. **Dependency validity**: All `blocked_by` tasks exist
5. **Agent roles**: All `agent_roles` values are valid

### Automated Validation (Optional)

Create a validation script:

```javascript
// scripts/validate-tasks.js
const yaml = require('js-yaml');
const fs = require('fs');

function validateTaskFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(content);
  
  // Validate required fields
  if (!data.epic || !data.feature || !data.tasks) {
    throw new Error(`Missing required fields in ${filePath}`);
  }
  
  // Validate task IDs
  const ids = new Set();
  for (const task of data.tasks) {
    if (ids.has(task.id)) {
      throw new Error(`Duplicate task ID: ${task.id}`);
    }
    ids.add(task.id);
  }
  
  console.log(`✓ ${filePath} is valid`);
}
```

---

**Version History**:
- 1.0.0 (Jan 2026) - Initial schema documentation

**Questions?** See [SETUP_GUIDE.md](../../SETUP_GUIDE.md) or [FAQ.md](../../docs/FAQ.md)
