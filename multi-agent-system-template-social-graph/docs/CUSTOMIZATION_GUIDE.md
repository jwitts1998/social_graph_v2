# Customization Guide

**Version**: 1.0.0  
**Last Updated**: January 2026

## 📖 Overview

This guide explains how to customize the multi-agent system templates for your specific project needs.

---

## 🎨 Customization Levels

### Level 1: Minimal (Variable Replacement Only)

Replace template variables with your project values.

**Time**: 15-30 minutes  
**Effort**: Low  
**When**: Standard project that fits templates well

### Level 2: Moderate (Adjust Templates)

Replace variables + modify sections to fit your architecture and patterns.

**Time**: 1-2 hours  
**Effort**: Medium  
**When**: Project with some unique patterns or requirements

### Level 3: Extensive (Heavily Customize)

Deep customization of all templates to match your specific needs.

**Time**: 3-4 hours  
**Effort**: High  
**When**: Project with unique architecture, tech stack, or requirements

---

## 🔧 Component Customization

### `.cursorrules` Customization

**Required Variables**:
- `{{PROJECT_NAME}}` - Your project name
- `{{PROJECT_DESCRIPTION}}` - One-sentence description
- `{{PRIMARY_LANGUAGE}}` - Main language
- `{{FRAMEWORK}}` - Primary framework
- `{{ARCHITECTURE_PATTERN}}` - Architecture style

**Common Customizations**:

1. **Add Project-Specific Patterns**:
```markdown
## Custom Patterns for {{PROJECT_NAME}}

### API Client Pattern
- Always use ApiClient singleton
- Wrap responses in Result<T, Error> type
- Implement retry logic with exponential backoff
```

2. **Add Security Requirements**:
```markdown
## Security Requirements

### API Key Management
- Use AWS Secrets Manager
- Rotate keys every 90 days
- Never log API keys
```

3. **Add Testing Standards**:
```markdown
## Testing Strategy

### Contract Testing
- Use Pact for consumer-driven contracts
- Test all API integrations
- Run contract tests in CI/CD
```

### `AGENTS.md` Customization

**Add Custom Agent Roles**:

```markdown
### Deployment Agent
**Primary Role**: Deployment automation and release management

**Responsibilities**:
- Manage deployment pipelines
- Create release notes
- Handle rollbacks
- Monitor post-deployment

**When to Use**: Deployment tasks, release management
```

**Adjust Agent Responsibilities**:

Add project-specific items to existing agent checklists:

```markdown
### Implementation Agent Checklist
- [ ] Architecture pattern followed
- [ ] YOUR_CUSTOM_CHECK_1
- [ ] YOUR_CUSTOM_CHECK_2
```

### Task Schema Customization

**Add Custom Fields**:

```yaml
tasks:
  - id: TASK_T1
    # Standard fields
    # ... 
    # Custom fields
    estimated_hours: 8
    complexity: high
    risk_level: medium
    deployment_env: [dev, staging]
```

**Add Custom Agent Roles**:

```yaml
agent_roles:
  - implementation
  - deployment      # Custom role
  - monitoring      # Custom role
```

### Subagent Customization

**Create Custom Subagents**:

```markdown
---
name: deployment-specialist
description: Expert in CI/CD, Docker, Kubernetes deployment. Use proactively for deployment tasks.
---

You are a deployment specialist for {{PROJECT_NAME}}.

## Deployment Process

1. Build Docker images
2. Run integration tests
3. Deploy to staging
4. Run smoke tests
5. Deploy to production

## Rollback Procedure

[Your rollback steps]
```

**Customize Existing Subagents**:

Add project-specific sections:

```markdown
## Special Instructions for {{PROJECT_NAME}}

- Use project's custom logging framework
- Follow naming conventions for containers
- Always tag images with git SHA
- Deploy during maintenance windows only
```

---

## 💡 Customization Examples

### Example 1: Microservices Architecture

**Changes needed**:

**.cursorrules**:
```markdown
## Architecture: Microservices

### Service Communication
- Use gRPC for inter-service communication
- Implement circuit breakers
- Use service mesh (Istio)

### Service Structure
```
project/
├── services/
│   ├── auth-service/
│   ├── user-service/
│   └── payment-service/
```
```

**AGENTS.md** - Add agents:
```markdown
### Service Integration Agent
Handles inter-service communication and API contracts.

### Infrastructure Agent
Manages Kubernetes, service mesh, and infrastructure as code.
```

### Example 2: Monorepo with Multiple Apps

**Changes needed**:

**.cursorrules**:
```markdown
## Monorepo Structure
```
project/
├── apps/
│   ├── mobile/      # React Native
│   ├── web/         # Next.js
│   └── admin/       # React
├── packages/
│   ├── shared/      # Shared code
│   └── ui/          # UI components
```

### Workspace Guidelines
- Shared code in packages/
- Each app is independent
- Shared types in packages/shared/types/
```

**AGENTS.md** - Adjust for monorepo:
```markdown
### Cross-Platform Agent
Ensures consistency across mobile, web, and admin apps.
```

---

## ⚠️ Common Pitfalls

### Don't Over-Customize Initially

Start minimal, add customizations as needed.

❌ **Bad**: Spend hours adding every possible edge case upfront  
✅ **Good**: Start with variables, add custom sections as you encounter needs

### Don't Break Template Structure

Keep the structure intact, add within sections.

❌ **Bad**: Completely restructure `.cursorrules`  
✅ **Good**: Add custom sections within existing structure

### Don't Leave Variables Unfilled

Search for `{{` to find remaining variables.

❌ **Bad**: Commit files with `{{PROJECT_NAME}}`  
✅ **Good**: Replace all variables before committing

---

## 🔍 Validation

### Check Your Customizations

1. **Variable Check**: Search for `{{` - should find none
2. **Syntax Check**: Verify YAML is valid
3. **Link Check**: Verify all `spec_refs` point to real files
4. **Agent Role Check**: All `agent_roles` are defined in `AGENTS.md`

### Test Your Setup

1. **Manual Test**: Ask AI to review a file using your `.cursorrules`
2. **Agent Test**: Invoke a subagent and verify it uses project context
3. **Task Test**: Have AI select and work on a task

---

## 🔗 Related Documentation

- [SETUP_GUIDE.md](../SETUP_GUIDE.md)
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Questions?** See [FAQ.md](./FAQ.md)
