# Local Development Setup Guide

## Prerequisites

- **Node.js**: v20.x or higher (you have v20.19.4 ✅)
- **npm**: v10.x or higher (you have v10.8.2 ✅)
- **Supabase Account**: Create at https://supabase.com
- **OpenAI API Key**: Get from https://platform.openai.com

## Quick Start

### 1. Install Dependencies

Dependencies are already installed ✅

If you need to reinstall:
```bash
npm install
```

### 2. Configure Environment Variables

Your `.env` file is already created. Ensure it has:

```bash
# Required for the app to run
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional (for AI features)
OPENAI_API_KEY=your-openai-api-key-here
```

**Where to find Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project (or create one)
3. Click **Settings** → **API**
4. Copy `URL` and `anon` `public` key

### 3. Set Up Database (First Time Only)

If this is your first time, you need to set up the database schema:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to create tables
supabase db push
```

Alternatively, run the SQL manually:
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20250101000000_initial_schema.sql`
3. Copy and paste the SQL
4. Click **Run**

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at: http://localhost:5000

## Project Structure

```
social_graph_v2/
├── client/              # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities (Supabase client)
├── server/              # Express backend
│   └── routes/          # API routes
├── supabase/
│   ├── functions/       # Edge Functions (Deno runtime)
│   └── migrations/      # Database migrations
└── shared/              # Shared types and schemas

```

## Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run check` - TypeScript type checking

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **State Management**: TanStack Query (React Query)

## Features

### Core Features
✅ **Audio Recording**: Record conversations with real-time transcription
✅ **Contact Management**: Import and manage your network contacts
✅ **AI Matching**: Weighted scoring algorithm to suggest relevant connections
✅ **Entity Extraction**: Automatically extract people, topics, and needs from conversations
✅ **Introduction Flow**: Draft warm intro emails

### Optional Features (Require Additional Setup)
- **Google Calendar Sync**: Requires Google OAuth credentials
- **Contact Enrichment**: Requires Hunter.io API key
- **Embedding-based Matching**: Requires OpenAI API key

## Database Setup Details

### Tables Created
- `profiles` - User profiles
- `contacts` - Network contacts
- `conversations` - Recorded conversations
- `conversation_segments` - Transcript segments
- `conversation_entities` - Extracted entities
- `match_suggestions` - AI-generated matches
- `theses` - Investment criteria
- `relationship_events` - Interaction history
- And more...

### Row Level Security (RLS)
All tables have RLS policies to ensure users can only access their own data.

## Troubleshooting

### App shows "Supabase not configured"
- Check that `.env` file exists and has valid credentials
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after changing `.env`

### Database errors
- Ensure migrations are applied: `supabase db push`
- Check Supabase dashboard for any issues
- Verify your Supabase project is active

### TypeScript errors
- Run `npm run check` to see all type errors
- Ensure dependencies are installed: `npm install`

### Port already in use
- Change the port in `vite.config.ts` or kill the process using port 5000

## Deployment

See `docs/DEPLOYMENT_GUIDE.md` for production deployment instructions.

## Development Workflow

1. **Make code changes** in `client/src/` or `server/`
2. **Hot reload** will automatically update the app
3. **Check types** with `npm run check`
4. **Test features** in the browser
5. **Commit changes** with descriptive messages

## Getting Help

- **Documentation**: See `docs/` folder for detailed guides
- **Architecture**: `docs/ARCHITECTURE_MATCHING_SYSTEM.md`
- **Matching Logic**: `docs/MATCHING_LOGIC.md`
- **API Reference**: `SUPABASE_SETUP.md`

## Next Steps

1. ✅ Environment configured
2. ✅ Dependencies installed
3. 🔄 Start dev server: `npm run dev`
4. 📝 Set up database (if first time)
5. 🎉 Start building!

---

*Last Updated: January 2026*
