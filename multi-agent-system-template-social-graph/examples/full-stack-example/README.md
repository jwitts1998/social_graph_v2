# Full-Stack Example - TaskManager

Complete multi-agent system setup for a full-stack application.

**Note**: This is a reference example. The actual template files are in the parent `multi-agent-system-template` directory, which should be placed in a central location accessible to all your projects.

## Project Overview

**Name**: TaskManager  
**Description**: Task management app with web frontend and Node.js backend  
**Platform**: Full-Stack  
**Frontend**: Next.js + React + TypeScript  
**Backend**: Node.js + Express + PostgreSQL

## Customized Variables

### In `.cursorrules` (from templates/cursorrules/full-stack.cursorrules):
- `{{PROJECT_NAME}}` → TaskManager
- `{{FRONTEND_FRAMEWORK}}` → Next.js
- `{{BACKEND_FRAMEWORK}}` → Express
- `{{DATABASE_TYPE}}` → PostgreSQL

### In `AGENTS.md` (from templates/agents/AGENTS-full-stack.md):
- Agent roles: Frontend, Backend, Database, API Contract, Testing

## Example Task

```yaml
- id: TASK_T1_create_task
  title: "Implement task creation feature"
  agent_roles: [api_contract, backend, frontend, testing]
  description: >
    Full-stack task creation: API contract → backend → frontend → tests
  acceptance_criteria:
    - "Shared types defined in shared/types/"
    - "Backend endpoint /api/tasks POST implemented"
    - "Frontend create task form implemented"
    - "E2E test covers full flow"
```

## Workflow Example

```
Task selected → API Contract Agent defines types
    ↓
Backend Agent implements API endpoint
    ↓
Database Agent creates schema and migration
    ↓
Frontend Agent implements UI and API client
    ↓
Testing Agent writes E2E tests
    ↓
Task complete
```

## Success Metrics

✅ Type safety across stack  
✅ API contracts enforced  
✅ E2E tests cover critical flows  
✅ Frontend + backend test coverage > 85%  
