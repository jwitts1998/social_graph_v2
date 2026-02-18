# Quick Start Guide

**5-Minute Setup for Experienced Developers**

## 1. Set Template Location

```bash
# Add to your ~/.zshrc or ~/.bashrc for convenience
export TEMPLATE_DIR=~/dev/multi-agent-system-template
# (adjust path to wherever you placed this template)
```

## 2. Start New Project Setup

```bash
# In your project directory
cd /path/to/your/project

# Copy templates
cp $TEMPLATE_DIR/templates/cursorrules/{PROJECT_TYPE}.cursorrules .cursorrules
cp $TEMPLATE_DIR/templates/agents/AGENTS-{PROJECT_TYPE}.md AGENTS.md
cp $TEMPLATE_DIR/templates/tasks/tasks-schema.yml tasks.yml

# Set up directories
mkdir -p tasks docs/workflow .cursor/agents

# Copy subagents
cp $TEMPLATE_DIR/templates/subagents/generic/*.md .cursor/agents/
cp $TEMPLATE_DIR/templates/subagents/specialists/{SPECIALIST}.md .cursor/agents/
```

Where `{PROJECT_TYPE}` is one of:
- `mobile-app` (Flutter, React Native)
- `web-app` (React, Vue, Angular)
- `backend-service` (Node.js, Python, Java)
- `full-stack` (Next.js, Nuxt, etc.)
- `base-template` (generic for any project)

Where `{SPECIALIST}` is one of:
- `flutter-specialist`
- `react-specialist`
- `node-specialist`
- etc.

## 3. Customize Templates

Search and replace all `{{VARIABLES}}`:

```bash
# Find remaining variables
grep -r "{{" .cursorrules AGENTS.md

# Replace with your values
# {{PROJECT_NAME}} → YourProjectName
# {{FRAMEWORK}} → Flutter/React/Django/etc
# {{PRIMARY_LANGUAGE}} → Dart/TypeScript/Python/etc
```

## 4. Commit and Start Using

```bash
git add .cursorrules AGENTS.md tasks.yml .cursor/
git commit -m "Add multi-agent development system"
```

Now AI agents in Cursor will follow your project's patterns!

---

**For Detailed Instructions**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

**For Project Type Selection**: See [PROJECT_QUESTIONNAIRE.md](./PROJECT_QUESTIONNAIRE.md)
