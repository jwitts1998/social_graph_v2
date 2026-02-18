# Backend Service Example - PaymentAPI

Complete multi-agent system setup for a Node.js backend service.

**Note**: This is a reference example. The actual template files are in the parent `multi-agent-system-template` directory, which should be placed in a central location accessible to all your projects.

## Project Overview

**Name**: PaymentAPI  
**Description**: Payment processing REST API for e-commerce platforms  
**Platform**: Backend / API  
**Tech Stack**: Node.js + Express + TypeScript, PostgreSQL, Redis

## Customized Variables

### In `.cursorrules` (from templates/cursorrules/backend-service.cursorrules):
- `{{PROJECT_NAME}}` → PaymentAPI
- `{{BACKEND_FRAMEWORK}}` → Express
- `{{PRIMARY_LANGUAGE}}` → TypeScript
- `{{DATABASE_TYPE}}` → PostgreSQL
- `{{ORM_LIBRARY}}` → Prisma
- `{{TEST_COVERAGE_TARGET}}` → 90

### In `AGENTS.md` (from templates/agents/AGENTS-backend.md):
- Agent roles: API, Database, Testing, Security

## Example Task

```yaml
- id: PAYMENT_T1_process_payment
  title: "Implement payment processing endpoint"
  agent_roles: [api, database, security, testing]
  description: >
    Create POST /api/v1/payments endpoint with validation, processing, and webhooks.
  acceptance_criteria:
    - "Endpoint validates payment data"
    - "Integrates with Stripe API"
    - "Stores transaction in database"
    - "Sends webhook on completion"
    - "Rate limiting enabled"
    - "All security checks pass"
```

## Workflow Example

```
Task selected → API Agent implements endpoint
    ↓
Database Agent creates transaction schema and migration
    ↓
node-specialist provides Express/TypeScript patterns
    ↓
Security Agent audits (input validation, auth, rate limiting)
    ↓
test-writer creates integration tests
    ↓
Task complete
```

## Success Metrics

✅ Response time < 200ms (p95)  
✅ Test coverage > 90%  
✅ No security vulnerabilities  
✅ API documented (OpenAPI)  
