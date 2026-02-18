# Multi-Agent Development Guide for {{PROJECT_NAME}}

## 🎯 Overview

This document defines specialized **development agents** for full-stack application development. These agents collaborate on frontend, backend, database, testing, and integration concerns.

**Type**: Full-Stack Application  
**Frontend**: {{FRONTEND_FRAMEWORK}}  
**Backend**: {{BACKEND_FRAMEWORK}}  
**Database**: {{DATABASE_TYPE}}  
**Key Philosophy**: Specialized agents ensure quality across the entire stack with clear API contracts.

---

## 🤖 Agent Roles

### Frontend Agent
**Primary Role**: Client-side components, state management, and API integration

**Responsibilities**: Build UI components, implement state management, integrate APIs, handle routing, ensure responsive design

**When to Use**: Component implementation, state management, API client creation, routing

**Key Knowledge Areas**: {{FRONTEND_FRAMEWORK}}, {{STATE_MANAGEMENT}}, API integration, responsive design

---

### Backend Agent
**Primary Role**: Server-side logic, API endpoints, and business logic

**Responsibilities**: Implement API endpoints, business logic services, authentication, error handling

**When to Use**: API implementation, business logic, service layer, middleware

**Key Knowledge Areas**: {{BACKEND_FRAMEWORK}}, API design, authentication, error handling

---

### Database Agent
**Primary Role**: Schema design, migrations, and data access

**Responsibilities**: Design schemas, create migrations, implement repositories, optimize queries

**When to Use**: Schema design, migrations, database queries, data modeling

**Key Knowledge Areas**: {{DATABASE_TYPE}}, migrations, query optimization, ORM patterns

---

### API Contract Agent
**Primary Role**: Shared types and API contract definition

**Responsibilities**: Define request/response types in `shared/types/`, ensure type safety across stack, document API contracts

**When to Use**: New API endpoints, type updates, API contract changes

**Key Knowledge Areas**: TypeScript types, API contracts, request/response schemas

---

### Testing Agent (Full-Stack)
**Primary Role**: Testing across the entire stack

**Responsibilities**: Unit tests, component tests, API tests, E2E tests, integration tests

**When to Use**: Test creation, coverage validation, E2E testing, integration testing

**Key Knowledge Areas**: Frontend testing, backend testing, E2E testing, integration testing

---

## 🔄 Full-Stack Workflow

### Sequential Full-Stack Implementation
1. **API Contract Agent** → Define shared types in `shared/types/`
2. **Backend Agent** → Implement API endpoint
3. **Database Agent** → Create schema, migration, repository
4. **Frontend Agent** → Build API client and UI components
5. **Testing Agent** → Write tests (unit, integration, E2E)

### Example Task
```yaml
- id: FULLSTACK_T1_user_profile
  title: "Implement user profile feature"
  agent_roles: [api_contract, backend, database, frontend, testing]
  description: >
    Full-stack feature: API contract → backend → database → frontend → tests
```

---

## ✅ Full-Stack Checklists

### API Contract Checklist
- [ ] Types defined in `shared/types/`
- [ ] Request/response shapes documented
- [ ] Types shared between client and server

### Backend Checklist
- [ ] Endpoint follows REST conventions
- [ ] Validation implemented
- [ ] Error handling consistent

### Database Checklist
- [ ] Schema designed
- [ ] Migration created
- [ ] Repository implemented

### Frontend Checklist
- [ ] API client created
- [ ] UI components built
- [ ] State management integrated

### Testing Checklist
- [ ] Backend tests (unit, integration)
- [ ] Frontend tests (component, integration)
- [ ] E2E test for critical flow

---

**Last Updated**: {{LAST_UPDATED_DATE}}  
**Maintainer**: {{MAINTAINER}}  
**Purpose**: Define specialized agents for full-stack development
