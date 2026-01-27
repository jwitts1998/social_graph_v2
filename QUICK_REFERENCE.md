# Quick Reference - Social Graph v2

## 🚀 Start Development Server
```bash
npm run dev
```
→ App runs on **http://localhost:3001**

## 🛑 Stop Server
Press `Ctrl+C` in the terminal

## 📁 Key Files & Folders

### Frontend (React)
- `client/src/pages/` - Page components (Home, Dashboard, Contacts, etc.)
- `client/src/components/` - Reusable UI components
- `client/src/hooks/` - Custom React hooks
- `client/src/lib/supabase.ts` - Supabase client configuration

### Backend (Express)
- `server/index.ts` - Main server entry point
- `server/routes/` - API route handlers
- `server/vite.ts` - Vite dev server setup

### Database & Functions
- `supabase/migrations/` - Database schema migrations
- `supabase/functions/` - Edge Functions (AI processing)
- `shared/schema.ts` - TypeScript types for database

### Configuration
- `.env` - Environment variables (Supabase, OpenAI, etc.)
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - TailwindCSS styles
- `package.json` - Dependencies and scripts

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run check            # TypeScript type checking
npm run build            # Build for production

# Database (requires Supabase CLI)
supabase link            # Link to Supabase project
supabase db push         # Apply migrations
supabase db diff         # Check schema differences
```

## 🌐 Environment Variables

**Required:**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Optional:**
```bash
OPENAI_API_KEY=xxx           # For AI features
GOOGLE_CLIENT_ID=xxx         # For calendar sync
GOOGLE_CLIENT_SECRET=xxx     # For calendar sync
HUNTER_API_KEY=xxx           # For contact enrichment
```

## 📊 Matching System

### How It Works
1. **Record Conversation** → Transcribed automatically
2. **Extract Entities** → AI identifies people, topics, needs
3. **Generate Matches** → Weighted scoring algorithm
4. **View Suggestions** → 1-3 star rated matches

### Scoring Factors
- **Semantic Similarity**: 20% (embeddings)
- **Tag Overlap**: 35% (Jaccard similarity)
- **Role Matching**: 15%
- **Geographic**: 10%
- **Relationship Strength**: 20%
- **Name Boost**: Up to +0.3

### Star Ratings
- ⭐ 1 star: Score ≥ 0.05
- ⭐⭐ 2 stars: Score ≥ 0.20
- ⭐⭐⭐ 3 stars: Score ≥ 0.40

## 🎯 Key Features

### Contact Management
- Import via CSV
- Manual entry
- Enrichment via Hunter.io
- Tag management
- Relationship tracking

### Conversation Recording
- Real-time audio recording
- Live transcription
- Participant extraction
- Entity extraction
- Context embeddings

### AI Matching
- Weighted scoring
- Multiple factors
- Confidence scores
- Explanations for top matches
- Score breakdown UI

### Introduction Flow
- Draft email templates
- Double opt-in workflow
- Thread tracking
- Message history

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill -9 $(lsof -ti:3001)

# Or use a different port
PORT=3002 npm run dev
```

### Supabase Not Configured
1. Check `.env` file exists
2. Verify credentials are correct
3. Restart dev server

### Hot Reload Not Working
1. Clear browser cache
2. Check console for errors
3. Restart dev server

### Database Errors
1. Verify Supabase project is active
2. Check if migrations are applied
3. Review RLS policies

## 📚 Documentation

- `LOCAL_SETUP.md` - Setup instructions
- `RUNNING.md` - App status & links
- `SUPABASE_SETUP.md` - Database setup
- `docs/ARCHITECTURE_MATCHING_SYSTEM.md` - System design
- `docs/MATCHING_LOGIC.md` - Algorithm details
- `docs/DEPLOYMENT_GUIDE.md` - Production deployment

## 🔗 Useful URLs

**Supabase:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs

**Project Resources:**
- GitHub: [Your repo URL]
- API Docs: http://localhost:3001/api

## 💡 Tips

1. **Use shadcn/ui components** from `client/src/components/ui/`
2. **Follow TypeScript types** defined in `shared/schema.ts`
3. **Test with real data** for best matching results
4. **Check Edge Function logs** in Supabase dashboard
5. **Use React Query** for data fetching (already set up)

## 🚨 Important Notes

- **Never commit `.env` file** - it's gitignored
- **Use VITE_ prefix** for client-side env vars
- **RLS is enabled** - all queries are user-scoped
- **Edge Functions use Deno** - different runtime than Node.js
- **Migrations are versioned** - always create new ones

---

**Need help?** Check the docs folder or the terminal output for errors.
