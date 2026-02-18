# Installation Guide

## Overview

The Multi-Agent Development System Template is a **standalone template package** designed to be used across multiple projects. It should be installed in a central location and referenced from your individual projects.

## Recommended Installation

### Option 1: Home Directory (Recommended)

```bash
# Place in your home directory
cd ~/dev  # or create this directory if it doesn't exist
# Copy or move the multi-agent-system-template here

# Verify
ls ~/dev/multi-agent-system-template
```

### Option 2: Shared Location

```bash
# For team-shared templates
/opt/dev-templates/multi-agent-system-template
# or
/usr/local/share/templates/multi-agent-system-template
```

### Option 3: Cloud-Synced Location

```bash
# For personal use across machines
~/Dropbox/dev/templates/multi-agent-system-template
# or
~/Google\ Drive/dev/templates/multi-agent-system-template
```

## Environment Setup

Add to your shell configuration (`~/.zshrc` or `~/.bashrc`):

```bash
# Multi-Agent System Template
export TEMPLATE_DIR=~/dev/multi-agent-system-template
# Adjust path to match your installation location
```

Then reload your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

## Verify Installation

```bash
# Check template directory exists
ls $TEMPLATE_DIR

# Should show:
# README.md
# SETUP_GUIDE.md
# PROJECT_QUESTIONNAIRE.md
# QUICK_START.md
# templates/
# examples/
# docs/
```

## Usage in Projects

Once installed, use in any project:

```bash
# Navigate to your project
cd /path/to/your/project

# Copy templates
cp $TEMPLATE_DIR/templates/cursorrules/mobile-app.cursorrules .cursorrules
cp $TEMPLATE_DIR/templates/agents/AGENTS-mobile.md AGENTS.md
# ... etc
```

## Updating the Template

To update the template in the future:

```bash
cd $TEMPLATE_DIR
# Pull updates or replace files as needed
# Your individual projects won't be affected until you re-copy templates
```

## Multiple Projects

This installation supports using the template across unlimited projects:

```
~/dev/
├── multi-agent-system-template/    # Template (installed once)
├── my-mobile-app/                  # Project 1 (uses template)
├── my-web-app/                     # Project 2 (uses template)
├── my-backend-api/                 # Project 3 (uses template)
└── client-project/                 # Project 4 (uses template)
```

Each project gets its own customized copy of the templates, so they can evolve independently while the central template remains available for new projects.

## Next Steps

- **First Time**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Quick Setup**: See [QUICK_START.md](./QUICK_START.md)
- **Project Selection**: See [PROJECT_QUESTIONNAIRE.md](./PROJECT_QUESTIONNAIRE.md)

---

**Questions?** See [docs/FAQ.md](./docs/FAQ.md)
