# Web App Example - CollabDocs

Complete multi-agent system setup for a React web application.

**Note**: This is a reference example. The actual template files are in the parent `multi-agent-system-template` directory, which should be placed in a central location accessible to all your projects.

## Project Overview

**Name**: CollabDocs  
**Description**: Real-time collaborative document editor for teams  
**Platform**: Web (Browser)  
**Tech Stack**: React + TypeScript, Redux Toolkit, Node.js + PostgreSQL

## Customized Variables

### In `.cursorrules` (from templates/cursorrules/web-app.cursorrules):
- `{{PROJECT_NAME}}` → CollabDocs
- `{{FRONTEND_FRAMEWORK}}` → React
- `{{PRIMARY_LANGUAGE}}` → TypeScript
- `{{STATE_MANAGEMENT}}` → Redux Toolkit
- `{{STYLING_APPROACH}}` → Styled Components + Tailwind CSS
- `{{TEST_COVERAGE_TARGET}}` → 85

### In `AGENTS.md` (from templates/agents/AGENTS-web.md):
- Agent roles: Frontend, Design System, Testing, Performance

## Example Task

```yaml
- id: EDITOR_T1_realtime_sync
  title: "Implement real-time collaborative editing"
  agent_roles: [frontend, testing, performance]
  description: >
    Add real-time sync using WebSockets for collaborative editing.
  acceptance_criteria:
    - "Multiple users can edit simultaneously"
    - "Changes sync in real-time (<100ms latency)"
    - "Conflict resolution works correctly"
    - "No performance degradation with 10+ users"
```

## Workflow Example

```
Task selected → Frontend Agent implements
    ↓
react-specialist provides React/TypeScript patterns
    ↓
code-reviewer reviews code quality
    ↓
performance-optimizer checks bundle size and rendering
    ↓
test-writer creates component and E2E tests
    ↓
Task complete
```

## Success Metrics

✅ Bundle size < 250KB initial  
✅ Lighthouse score > 90  
✅ Test coverage > 85%  
✅ Core Web Vitals meet targets  
