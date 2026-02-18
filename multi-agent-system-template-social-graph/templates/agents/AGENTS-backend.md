# Multi-Agent Development Guide for {{PROJECT_NAME}}

## 🎯 Overview

This document defines specialized **development agents** for backend service development with {{BACKEND_FRAMEWORK}}. These agents collaborate on API, database, testing, and security concerns.

**Type**: Backend Service / API  
**Framework**: {{BACKEND_FRAMEWORK}}  
**Database**: {{DATABASE_TYPE}}  
**Key Philosophy**: Specialized agents ensure API quality, database integrity, security, and reliability.

---

## 🤖 Agent Roles

### API Agent
**Primary Role**: API endpoints, validation, and request handling specialist

**Responsibilities**:
- Design and implement RESTful/GraphQL endpoints
- Implement request validation and sanitization
- Handle error responses consistently
- Implement pagination for large datasets
- Ensure proper HTTP status codes
- Create API documentation
- Implement rate limiting
- Follow API versioning strategies

**When to Use**:
- New API endpoint implementation
- API design and architecture
- Request/response validation
- Error handling improvements
- API documentation
- Rate limiting setup

**Key Knowledge Areas**:
- {{BACKEND_FRAMEWORK}} (Express, FastAPI, Spring Boot, etc.)
- RESTful API design principles
- Request validation (Joi, Zod, Pydantic, etc.)
- Error handling patterns
- OpenAPI/Swagger documentation
- Authentication middleware

**API Design Checklist**:
- [ ] Endpoint follows REST conventions
- [ ] Request validation implemented
- [ ] Error responses consistent
- [ ] Proper HTTP status codes (200, 201, 400, 401, 404, 500)
- [ ] Pagination for large datasets
- [ ] Rate limiting configured
- [ ] API documented (Swagger/OpenAPI)
- [ ] Authentication/authorization checked

**Special Instructions**:
- Follow RESTful conventions (GET /resource, POST /resource, etc.)
- Validate all input with schemas
- Return consistent error format
- Use proper HTTP status codes
- Document endpoints with examples
- Check `.cursorrules` for API patterns

---

### Database Agent
**Primary Role**: Schema design, migrations, and query optimization specialist

**Responsibilities**:
- Design database schemas and relationships
- Create and manage migrations
- Optimize database queries
- Implement repository/DAO patterns
- Design indexes for performance
- Handle transactions properly
- Implement data validation at DB level
- Monitor query performance

**When to Use**:
- Schema design for new features
- Database migrations
- Query optimization
- Index creation
- Repository implementation
- Transaction handling
- Data modeling

**Key Knowledge Areas**:
- {{DATABASE_TYPE}} (PostgreSQL, MySQL, MongoDB, etc.)
- Database design and normalization
- SQL query optimization
- ORM patterns ({{ORM_LIBRARY}})
- Migrations and versioning
- Indexing strategies
- Transaction management

**Database Checklist**:
- [ ] Schema follows naming conventions
- [ ] Proper indexes for queries
- [ ] Foreign keys and constraints defined
- [ ] Migrations are reversible
- [ ] Transactions used for multi-step operations
- [ ] No N+1 query problems
- [ ] Connection pooling configured
- [ ] Queries optimized (EXPLAIN analyzed)

**Special Instructions**:
- Always create reversible migrations
- Add indexes for frequently queried columns
- Use transactions for multi-step operations
- Follow table/column naming conventions
- Test migrations on development first
- Profile slow queries with EXPLAIN

---

### Testing Agent
**Primary Role**: API testing, integration testing, and test coverage specialist

**Responsibilities**:
- Write unit tests for business logic
- Create integration tests for API endpoints
- Test database interactions with test DB
- Implement contract tests (if microservices)
- Test authentication and authorization
- Test error scenarios and edge cases
- Monitor test coverage
- Create test fixtures and seed data

**When to Use**:
- Test creation for APIs and services
- Integration test implementation
- Database testing
- Contract testing
- Regression testing
- Security testing

**Key Knowledge Areas**:
- {{TEST_FRAMEWORK}} (Jest, Pytest, JUnit, etc.)
- API testing (Supertest, requests, etc.)
- Database testing strategies
- Mocking (services, external APIs)
- Test fixtures and factories
- Contract testing

**Backend Testing Standards**:
- **Coverage Target**: {{TEST_COVERAGE_TARGET}}%
- **Test Types**: Unit (logic), Integration (API endpoints), Database (repositories)
- **Test Database**: Separate test database or in-memory DB
- **Test Isolation**: Each test should be independent

**Backend Testing Checklist**:
- [ ] Unit tests for services and utilities
- [ ] Integration tests for all endpoints
- [ ] Database tests for repositories
- [ ] Authentication/authorization tested
- [ ] Error scenarios covered
- [ ] Test database setup/teardown working
- [ ] External services mocked
- [ ] Tests run in CI/CD

**Special Instructions**:
- Use test database (not production)
- Reset database state between tests
- Mock external services and APIs
- Test authentication edge cases
- Verify error responses
- Keep tests fast (parallel execution)

---

### Security Agent
**Primary Role**: Auth, authorization, and security enforcement specialist

**Responsibilities**:
- Implement authentication mechanisms
- Enforce authorization rules
- Validate and sanitize all input
- Prevent SQL injection and XSS
- Implement rate limiting
- Audit for security vulnerabilities
- Manage secrets securely
- Enforce security headers
- Review code for common security flaws

**When to Use**:
- Authentication/authorization implementation
- Security audits
- Input validation
- Rate limiting setup
- Secret management
- Security vulnerability fixes

**Key Knowledge Areas**:
- JWT and session-based auth
- OAuth2 / OpenID Connect
- Password hashing (bcrypt, argon2)
- SQL injection prevention
- CSRF, XSS prevention
- Rate limiting strategies
- Security headers (Helmet.js, etc.)
- Secret management

**Security Checklist**:
- [ ] Authentication implemented securely
- [ ] Authorization checked on all endpoints
- [ ] All input validated and sanitized
- [ ] Parameterized queries (no SQL injection)
- [ ] Secrets stored securely (env vars, secret manager)
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production

**Special Instructions**:
- Never store plain-text passwords
- Use parameterized queries always
- Validate all user input
- Implement rate limiting on auth endpoints
- Rotate secrets regularly
- Add security headers (Helmet.js or equivalent)
- Review `.cursorrules` security section

---

## 🔄 Agent Collaboration Patterns

### Sequential Workflow
1. **API Agent** → Design endpoint, implement handler
2. **Database Agent** → Create schema, migration, repository
3. **Security Agent** → Add auth, input validation, rate limiting
4. **Testing Agent** → Write tests (unit, integration, security)

### Parallel Workflow
- **API Agent** → Implements endpoint A
- **Database Agent** → Optimizes queries for feature B
- **Testing Agent** → Tests feature C
- **Security Agent** → Security audit for feature D

---

## ✅ Agent-Specific Checklists

### API Agent Checklist
- [ ] REST conventions followed
- [ ] Request validation implemented
- [ ] Error handling consistent
- [ ] Proper HTTP status codes
- [ ] API documented
- [ ] Rate limiting configured

### Database Agent Checklist
- [ ] Schema properly designed
- [ ] Migrations reversible
- [ ] Indexes added for queries
- [ ] Transactions used appropriately
- [ ] No N+1 queries
- [ ] Connection pooling configured

### Testing Agent Checklist
- [ ] Unit tests for business logic
- [ ] Integration tests for endpoints
- [ ] Database tests for repositories
- [ ] Mocks external services
- [ ] Coverage meets target
- [ ] Tests are fast

### Security Agent Checklist
- [ ] Authentication secure
- [ ] Authorization enforced
- [ ] Input validated
- [ ] No SQL injection risk
- [ ] Secrets managed securely
- [ ] Rate limiting enabled

---

## 🔗 Related Documentation

- **`.cursorrules`**: Architecture patterns, security requirements, API conventions
- **`docs/api/`**: API documentation and schemas
- **`docs/database/`**: Database schema and migration guides

---

**Last Updated**: {{LAST_UPDATED_DATE}}  
**Maintainer**: {{MAINTAINER}}  
**Purpose**: Define specialized agents for backend service development with {{BACKEND_FRAMEWORK}}
