# Project Identification Questionnaire

**Purpose**: This questionnaire helps you identify the right templates and configuration for your multi-agent development system.

**Instructions**: Fill in each section with details about your project. Your answers will guide template selection and customization.

---

## Part 1: Project Overview

### Basic Information

**Project Name**: `_______________________________`

**One-Line Description**: 

`___________________________________________________________________________`

**Project Goals** (What are you building and why?):

```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```

**Project Stage**:
- [ ] Greenfield (starting from scratch)
- [ ] Active Development (actively building features)
- [ ] Maintenance (bug fixes and minor improvements)
- [ ] Legacy Migration (modernizing existing codebase)
- [ ] MVP/Prototype Import (e.g., from Replit, Bolt, V0, etc.)

**Team Size**:
- [ ] Solo (just you)
- [ ] Small (2-5 people)
- [ ] Medium (6-15 people)
- [ ] Large (16+ people)

---

## Part 1B: Project Maturity & Documentation

**IMPORTANT**: Your answers here determine which setup path to follow.

### Documentation Status

**Do you have a Product Design Blueprint (PDB) or similar design document?**
- [ ] **Yes - Complete PDB** (comprehensive product design with features, user flows, tech specs)
- [ ] **Yes - Partial PDB** (some design docs but incomplete)
- [ ] **Yes - Starter Docs** (basic design docs, not formal PDB)
- [ ] **No PDB - Other Documentation** (README, wiki, architecture docs, but no formal design)
- [ ] **No PDB - Undocumented** (code exists but minimal/no documentation)
- [ ] **Net New** (starting from absolute scratch, no code or docs yet)

### Codebase Status

**Select the option that best describes your project's current state**:

- [ ] **Net New Project** 
  - Starting from scratch
  - No existing code
  - Will create PDB and codebase together

- [ ] **New Project with Design Docs**
  - Have PDB or design documentation
  - Little to no code yet
  - Ready to start implementation following the design

- [ ] **Existing Codebase with PDB**
  - Production or active codebase exists
  - Have Product Design Blueprint or comprehensive design docs
  - Want to add multi-agent system to existing workflow

- [ ] **Existing Codebase - Documented (No PDB)**
  - Production or active codebase exists
  - Have README, architecture docs, or wiki
  - No formal Product Design Blueprint
  - Want to modernize documentation and add multi-agent system

- [ ] **Existing Codebase - Undocumented**
  - Production or active codebase exists
  - Minimal or no documentation
  - Need to reverse-engineer documentation from code
  - Want to add multi-agent system with generated documentation

- [ ] **MVP/Prototype Import**
  - Have MVP code from rapid prototyping tool (Replit, Bolt, V0, etc.)
  - Code works but needs production-quality refactoring
  - Need to generate documentation and modernize architecture
  - Want to add multi-agent system during modernization

**If you have existing code, where is it from?**
- [ ] Written by team from scratch
- [ ] Open source project or fork
- [ ] Rapid prototyping tool (Replit, Bolt, V0, Lovable, etc.)
- [ ] Outsourced/contractor code
- [ ] Legacy system being modernized
- [ ] Other: `_______________________________`

**What needs to happen before full development can begin?**
- [ ] Nothing - ready to go
- [ ] Generate missing documentation (PDB, TAD, etc.)
- [ ] Code audit and gap analysis
- [ ] Security and infrastructure hardening
- [ ] Architecture refactoring
- [ ] Test coverage improvement
- [ ] Other: `_______________________________`

---

## Part 2: Project Type

**Primary Project Type** (select one):

- [ ] **Mobile App** - iOS and/or Android application
- [ ] **Web App** - Browser-based application
- [ ] **Backend Service** - API, microservice, or backend system
- [ ] **Desktop App** - Native desktop application
- [ ] **Full-Stack** - Combined frontend and backend
- [ ] **Other**: `_______________________________`

**Platforms** (check all that apply):

- [ ] iOS
- [ ] Android
- [ ] Web Browser
- [ ] macOS
- [ ] Windows
- [ ] Linux
- [ ] Other: `_______________________________`

---

## Part 3: Technology Stack

### Programming Language(s)

**Primary Language**: `_______________________________`

**Language Version**: `_______________________________`

**Additional Languages** (if applicable):
- `_______________________________`
- `_______________________________`

### Framework(s)

**Primary Framework**: `_______________________________`

**Framework Version**: `_______________________________`

**Additional Frameworks** (if applicable):
- `_______________________________`
- `_______________________________`

### Technology Stack Details

**State Management** (if applicable):
- [ ] Redux / Redux Toolkit
- [ ] MobX
- [ ] Riverpod
- [ ] Provider
- [ ] Context API
- [ ] Vuex / Pinia
- [ ] NgRx
- [ ] Svelte Stores
- [ ] Other: `_______________________________`
- [ ] Not applicable

**Backend/API**:
- [ ] REST API
- [ ] GraphQL
- [ ] gRPC
- [ ] Firebase
- [ ] Supabase
- [ ] AWS (Amplify, AppSync, Lambda, etc.)
- [ ] Custom backend
- [ ] Other: `_______________________________`
- [ ] Not applicable (frontend only)

**Database** (check all that apply):
- [ ] PostgreSQL
- [ ] MySQL / MariaDB
- [ ] MongoDB
- [ ] Redis
- [ ] SQLite
- [ ] Firestore
- [ ] DynamoDB
- [ ] Other: `_______________________________`
- [ ] Not applicable

**Testing Framework**:
- [ ] Jest
- [ ] Vitest
- [ ] Pytest
- [ ] JUnit
- [ ] Flutter Test
- [ ] Cypress
- [ ] Playwright
- [ ] Other: `_______________________________`

---

## Part 4: Architecture

**Architecture Pattern** (select primary):

- [ ] **Clean Architecture** - Data / Domain / Presentation layers
- [ ] **MVC** - Model / View / Controller
- [ ] **MVVM** - Model / View / ViewModel
- [ ] **Feature-First** - Organized by features/modules
- [ ] **Domain-Driven Design** - Organized by business domains
- [ ] **Microservices** - Distributed services architecture
- [ ] **Monolith** - Single unified codebase
- [ ] **Other**: `_______________________________`

**Architecture Philosophy** (describe your approach in 1-2 sentences):

```
___________________________________________________________________________
___________________________________________________________________________
```

**Code Organization** (describe your directory structure or preferred organization):

```
project/
├── _______________________________
├── _______________________________
├── _______________________________
└── _______________________________
```

---

## Part 5: Key Features

**Primary Features** (check all that apply to your project):

- [ ] **Authentication** - User login, registration, password reset
- [ ] **Authorization** - Role-based access control, permissions
- [ ] **Content Management** - Create, edit, delete content
- [ ] **Social Features** - Friends, followers, comments, likes
- [ ] **E-commerce** - Products, cart, checkout, payments
- [ ] **Real-time** - Live updates, websockets, presence
- [ ] **Analytics** - Tracking, metrics, dashboards
- [ ] **Search** - Full-text search, filtering, sorting
- [ ] **File Upload** - Images, videos, documents
- [ ] **Notifications** - Push, email, SMS
- [ ] **Messaging** - Chat, direct messages
- [ ] **Geolocation** - Maps, location-based features
- [ ] **Offline Support** - Local storage, sync
- [ ] **Multi-language** - Internationalization (i18n)
- [ ] **Accessibility** - WCAG compliance, screen readers
- [ ] **Other**: `_______________________________`

**Most Complex Feature** (what's your biggest technical challenge?):

```
___________________________________________________________________________
___________________________________________________________________________
```

---

## Part 6: Quality Priorities

**Rank your top 3 quality priorities** (1 = highest priority):

- [ ] **Performance** - Speed, efficiency, optimization `___`
- [ ] **Security** - Auth, data protection, vulnerabilities `___`
- [ ] **Accessibility** - WCAG compliance, inclusive design `___`
- [ ] **Testability** - Unit tests, integration tests, coverage `___`
- [ ] **Documentation** - Code docs, API docs, guides `___`
- [ ] **Maintainability** - Clean code, refactoring, technical debt `___`
- [ ] **Scalability** - Handle growth, horizontal scaling `___`
- [ ] **Developer Experience** - Tooling, onboarding, productivity `___`
- [ ] **User Experience** - Intuitive, delightful, accessible `___`

**Quality Standards** (any specific standards or compliance requirements?):

```
___________________________________________________________________________
___________________________________________________________________________
```

---

## Part 7: Development Workflow

**Version Control**:
- [ ] Git
- [ ] GitHub
- [ ] GitLab
- [ ] Bitbucket
- [ ] Other: `_______________________________`

**CI/CD**:
- [ ] GitHub Actions
- [ ] GitLab CI
- [ ] CircleCI
- [ ] Jenkins
- [ ] Not set up yet
- [ ] Other: `_______________________________`

**Code Review Process**:
- [ ] Pull requests with manual review
- [ ] Automated review tools
- [ ] Pair programming
- [ ] No formal process yet
- [ ] Other: `_______________________________`

**Deployment Environment(s)**:
- [ ] Development
- [ ] Staging / UAT
- [ ] Production
- [ ] Other: `_______________________________`

---

## Part 8: Agent Preferences

**Which agents would be most valuable for your project?** (check all that apply)

### Core Agents (recommended for all projects)
- [ ] **Implementation Agent** - Business logic, services, data models
- [ ] **Quality Assurance Agent** - Code review, security, architecture
- [ ] **Testing Agent** - Unit tests, integration tests, coverage

### Frontend Agents (for web/mobile projects)
- [ ] **UI/UX Agent** - Design system, accessibility, user experience
- [ ] **Design System Agent** - Component library, theming, consistency
- [ ] **Performance Agent** - Bundle size, lazy loading, optimization

### Backend Agents (for API/service projects)
- [ ] **API Agent** - Endpoints, validation, error handling
- [ ] **Database Agent** - Schema, migrations, queries, indexes
- [ ] **Security Agent** - Auth, authorization, rate limiting

### Specialized Agents
- [ ] **Documentation Agent** - API docs, architecture docs, guides
- [ ] **Refactoring Agent** - Code cleanup, technical debt
- [ ] **Debugger Agent** - Error investigation, root cause analysis

**Other agents you'd like** (describe):

```
___________________________________________________________________________
___________________________________________________________________________
```

---

## Part 9: Current Pain Points

**What challenges are you currently facing?** (check all that apply)

- [ ] Inconsistent code style across the codebase
- [ ] Missing or outdated documentation
- [ ] Poor test coverage
- [ ] Security vulnerabilities
- [ ] Performance issues
- [ ] Difficult onboarding for new developers
- [ ] Technical debt accumulation
- [ ] Unclear architecture patterns
- [ ] Slow development velocity
- [ ] Frequent bugs and regressions
- [ ] Difficulty maintaining consistency
- [ ] Other: `_______________________________`

**Top 3 problems you want the multi-agent system to solve**:

1. `___________________________________________________________________________`
2. `___________________________________________________________________________`
3. `___________________________________________________________________________`

---

## Part 10: Customization Preferences

**How much customization do you want?**

- [ ] **Minimal** - Use templates as-is with basic variable replacement
- [ ] **Moderate** - Adjust templates to fit our architecture and patterns
- [ ] **Extensive** - Heavily customize everything for our specific needs

**Existing conventions to preserve** (coding standards, naming conventions, etc.):

```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```

**Documentation preferences**:
- [ ] Minimal inline comments, comprehensive external docs
- [ ] Extensive inline comments, minimal external docs
- [ ] Balanced approach (both inline and external)
- [ ] Auto-generated from code (JSDoc, Dartdoc, etc.)

---

## Part 11: Success Criteria

**How will you know the multi-agent system is successful?** (check all that apply)

- [ ] Faster feature development
- [ ] Fewer bugs in production
- [ ] Better code quality (measurable via linters, reviews)
- [ ] Improved test coverage
- [ ] More consistent architecture
- [ ] Better documentation
- [ ] Easier onboarding for new developers
- [ ] Team members actually use the agents
- [ ] Positive developer feedback
- [ ] Other: `_______________________________`

**Target metrics** (if applicable):

- Test Coverage Target: `_______%`
- Code Review Time Target: `_______`
- Bug Reduction Target: `_______%`
- Development Velocity Increase: `_______%`

---

## Questionnaire Summary

### Recommended Template Configuration

Based on your answers, you should use:

**Project Type Template**: `_______________________________`

**Agent Configuration**: `_______________________________`

**Subagents to Include**:
- `_______________________________`
- `_______________________________`
- `_______________________________`

**Customization Level**: `_______________________________`

### Next Steps

1. **Review Recommendations**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for template selection guidance
2. **Select Templates**: Choose templates matching your project type from `templates/` directory
3. **Customize**: Replace variables and adjust for your project
4. **Deploy**: Copy customized files to your project
5. **Test**: Verify agents work correctly
6. **Iterate**: Refine based on usage and feedback

---

## Example Completed Questionnaires

### Example 1: Mobile App (Flutter)

**Project Name**: FitTracker
**Description**: Fitness tracking mobile app with workout plans and progress tracking
**Project Stage**: Active Development
**Team Size**: Small (3 people)

**Technology Stack**:
- Primary Language: Dart
- Framework: Flutter
- State Management: Riverpod
- Backend: Firebase (Auth, Firestore, Storage)
- Testing: Flutter Test

**Architecture**: Clean Architecture (Data / Domain / Presentation)

**Key Features**: Authentication, Content Management, Analytics, Offline Support

**Quality Priorities**: 
1. Testability (comprehensive test coverage)
2. Performance (smooth animations, fast load times)
3. User Experience (intuitive, delightful)

**Recommended Agents**: Implementation Agent, UI/UX Agent, Testing Agent

### Example 2: Web App (React + TypeScript)

**Project Name**: CollabDocs
**Description**: Real-time collaborative document editor for teams
**Project Stage**: Greenfield
**Team Size**: Solo

**Technology Stack**:
- Primary Language: TypeScript
- Framework: React
- State Management: Redux Toolkit
- Backend: Node.js + Express + PostgreSQL
- Testing: Jest + React Testing Library + Cypress

**Architecture**: Feature-First with Clean Architecture patterns

**Key Features**: Real-time collaboration, Authentication, Content Management, Search

**Quality Priorities**:
1. Performance (real-time sync, bundle size)
2. Security (auth, data protection)
3. Testability (high test coverage)

**Recommended Agents**: Frontend Agent, Design System Agent, Testing Agent, Performance Agent

### Example 3: Backend Service (Node.js + Express)

**Project Name**: PaymentAPI
**Description**: Payment processing REST API for e-commerce platforms
**Project Stage**: Active Development
**Team Size**: Medium (8 people)

**Technology Stack**:
- Primary Language: TypeScript
- Framework: Express
- Database: PostgreSQL
- Testing: Jest + Supertest

**Architecture**: Clean Architecture with Domain-Driven Design

**Key Features**: E-commerce (payments), Authentication, Authorization, Analytics

**Quality Priorities**:
1. Security (PCI compliance, auth, encryption)
2. Testability (comprehensive API tests)
3. Scalability (handle high transaction volume)

**Recommended Agents**: API Agent, Database Agent, Testing Agent, Security Agent

---

**Need Help?** See [SETUP_GUIDE.md](./SETUP_GUIDE.md) or [docs/FAQ.md](./docs/FAQ.md)

**Ready to Set Up?** Continue to [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.
