# Mobile App Example - FitTracker

This example shows a complete multi-agent system setup for a Flutter mobile app.

**Note**: This is a reference example. The actual template files are in the parent `multi-agent-system-template` directory, which should be placed in a central location accessible to all your projects.

## Project Overview

**Name**: FitTracker  
**Description**: Fitness tracking mobile app with workout plans and progress tracking  
**Platform**: iOS & Android  
**Tech Stack**: Flutter + Dart, Riverpod, Firebase

## Files in This Example

```
fittracker/
├── .cursorrules                       # From templates/cursorrules/mobile-app.cursorrules
├── AGENTS.md                          # From templates/agents/AGENTS-mobile.md
├── tasks.yml                          # From templates/tasks/tasks-schema.yml
├── tasks/
│   └── 01_user_profiles.yml          # From templates/tasks/feature-task-template.yml
├── docs/
│   └── workflow/
│       ├── MULTI_AGENT_WORKFLOW.md   # From templates/workflow/
│       └── DEVELOPMENT_WORKFLOW.md
└── .cursor/
    └── agents/
        ├── code-reviewer.md           # From templates/subagents/generic/
        ├── designer.md                # UI/UX, design system, accessibility
        ├── test-writer.md
        ├── debugger.md
        ├── doc-generator.md
        └── flutter-specialist.md      # From templates/subagents/specialists/
```

## Customized Variables

### In `.cursorrules`:
```
{{PROJECT_NAME}} → FitTracker
{{PROJECT_DESCRIPTION}} → Fitness tracking mobile app for iOS and Android
{{PRIMARY_LANGUAGE}} → Dart
{{FRAMEWORK}} → Flutter
{{STATE_MANAGEMENT}} → Riverpod
{{BACKEND}} → Firebase (Auth, Firestore, Storage)
{{ARCHITECTURE_PATTERN}} → Clean Architecture (complex) / Presentation-Only (simple)
{{TEST_COVERAGE_TARGET}} → 80
```

### In `AGENTS.md`:
```
{{PROJECT_NAME}} → FitTracker
{{FRAMEWORK}} → Flutter
{{PRIMARY_LANGUAGE}} → Dart
{{STATE_MANAGEMENT}} → Riverpod
{{DESIGN_SYSTEM}} → Material 3 with custom branding
{{BACKEND}} → Firebase
```

### In Subagents:
```
All {{PROJECT_NAME}} → FitTracker
{{FRAMEWORK}} → Flutter
{{TEST_FRAMEWORK}} → Flutter Test
```

## Example Task File

**File**: `tasks/01_user_profiles.yml`

```yaml
epic: User_Management
feature: User_Profiles

context:
  phase: 1
  spec_refs:
    - "PDB: docs/product_design/fittracker_pdb.md — User Profiles"
    - "Design: Figma profile mockups"
  notes: >
    User profile feature with avatar upload, bio editing, stats display.

defaults:
  status: todo
  priority: medium
  owner: team
  envs: [dev]

tasks:
  - id: PROFILE_T1_view_profile
    title: "Implement profile viewing page"
    type: story
    status: done
    priority: high
    agent_roles:
      - implementation
      - ui_ux
    spec_refs:
      - "PDB: User Profile View section"
    description: >
      Create profile viewing page with avatar, name, bio, and workout stats.
    code_areas:
      - "lib/features/profile/presentation/pages/profile_page.dart"
      - "lib/features/profile/presentation/widgets/"
    acceptance_criteria:
      - "User can view their own profile"
      - "Avatar, name, bio displayed correctly"
      - "Workout stats (workouts, calories, streak) displayed"
      - "UI follows Material 3 design system"
      - "Works on iOS and Android"
    tests:
      - "Widget test for ProfilePage"
      - "Integration test for profile viewing"
    blocked_by: []
    blocks:
      - PROFILE_T2_edit_profile
  
  - id: PROFILE_T2_edit_profile
    title: "Implement profile editing"
    type: story
    status: in_progress
    priority: high
    agent_roles:
      - implementation
      - ui_ux
      - testing
    spec_refs:
      - "PDB: Profile Editing section"
    description: >
      Add profile editing with avatar upload, name/bio editing, validation.
    code_areas:
      - "lib/features/profile/presentation/pages/edit_profile_page.dart"
      - "lib/features/profile/data/services/profile_service.dart"
      - "lib/core/media/services/media_service.dart"
    acceptance_criteria:
      - "User can edit name and bio"
      - "User can upload/change avatar"
      - "Changes save to Firestore"
      - "Validation works (max lengths, etc.)"
      - "Error handling present"
      - "Loading states during save"
    tests:
      - "Unit tests for ProfileService"
      - "Widget test for EditProfilePage"
      - "Integration test for edit flow"
    blocked_by:
      - PROFILE_T1_view_profile
    blocks: []
```

## Usage Example

### 1. Setup

```bash
# Set template directory (adjust to where you placed the template)
TEMPLATE_DIR=/path/to/multi-agent-system-template

# Copy templates
cp $TEMPLATE_DIR/templates/cursorrules/mobile-app.cursorrules .cursorrules
cp $TEMPLATE_DIR/templates/agents/AGENTS-mobile.md AGENTS.md
cp $TEMPLATE_DIR/templates/tasks/tasks-schema.yml tasks.yml

# Set up directories
mkdir -p tasks docs/workflow .cursor/agents

# Copy workflow docs
cp $TEMPLATE_DIR/templates/workflow/*.md docs/workflow/

# Copy subagent configs
cp $TEMPLATE_DIR/templates/subagents/generic/*.md .cursor/agents/
cp $TEMPLATE_DIR/templates/subagents/specialists/flutter-specialist.md .cursor/agents/
```

### 2. Customize

Replace all `{{VARIABLE}}` placeholders with FitTracker-specific values.

### 3. Use

**Select a task**:
1. Open `tasks/01_user_profiles.yml`
2. Find task with `status: todo`
3. Check `agent_roles` matches your work (e.g., `implementation`)

**Work on task**:
1. Read task description and `acceptance_criteria`
2. Check `.cursorrules` for architecture patterns
3. Implement feature following Flutter best practices
4. Run tests
5. Update task `status: done`

**Automatic reviews**:
- **code-reviewer** subagent activates after implementation
- **test-writer** suggests tests if missing
- **flutter-specialist** provides Flutter-specific guidance

## Expected Workflow

```
Task: PROFILE_T2_edit_profile
    ↓
Implementation Agent reads task
    ↓
Checks .cursorrules (Clean Architecture for this feature)
    ↓
Invokes flutter-specialist subagent
    ↓
Implements ProfileService (data layer)
    ↓
Implements EditProfilePage (presentation layer)
    ↓
code-reviewer automatically reviews
    ↓
Feedback: Add error handling, use theme tokens
    ↓
Implementation Agent fixes issues
    ↓
test-writer creates tests
    ↓
All acceptance criteria met
    ↓
Task status: done
```

## Success Metrics

✅ Implementation follows Clean Architecture pattern  
✅ Uses Material 3 design tokens consistently  
✅ Works on both iOS and Android  
✅ Test coverage > 80%  
✅ All acceptance criteria met  
✅ Code reviewed automatically  
✅ No hardcoded values or secrets  

## Next Steps

1. Continue with remaining tasks in `tasks/01_user_profiles.yml`
2. Add new feature task files as needed (e.g., `tasks/02_workout_tracking.yml`)
3. Refine `.cursorrules` based on project evolution
4. Add custom subagents for domain-specific needs
