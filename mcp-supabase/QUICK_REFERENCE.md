# Supabase MCP Server - Quick Reference Card

## Setup (One-Time)

```bash
# 1. Test connection
cd mcp-supabase && npm test

# 2. Add to ~/.cursor/mcp.json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": ["/full/path/to/mcp-supabase/dist/index.js"],
      "env": {
        "VITE_SUPABASE_URL": "your-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}

# 3. Restart Cursor (Cmd+Q and reopen)
```

## Common Queries

| What You Want | What To Ask |
|---------------|-------------|
| List contacts | "Show me all contacts" |
| Recent conversations | "Get the 10 most recent conversations" |
| Match suggestions | "Show matches for conversation XYZ" |
| Contact details | "Get details for contact ABC" |
| Match analysis | "Analyze match quality for conversation XYZ" |
| Table schema | "Show me the schema for contacts table" |
| Investor contacts | "Get all contacts where is_investor is true" |

## 7 Available Tools

1. **query_table** - Flexible table queries with filters
2. **get_table_schema** - View column definitions
3. **get_conversation_matches** - Matches with contact details
4. **get_contact_details** - Full contact profile + thesis
5. **execute_sql** - Custom SQL (SELECT only)
6. **get_recent_conversations** - Recent convos + participants
7. **analyze_match_quality** - Score analysis + breakdown

## Quick Examples

### Example 1: Find Investor Contacts
**Ask:** "Show me all contacts who are investors"

**I'll use:** `query_table` with filter `is_investor = true`

### Example 2: Match Analysis
**Ask:** "Analyze matches for conversation abc-123"

**I'll use:** `analyze_match_quality` + `get_conversation_matches`

**You get:**
- Score distribution (3/2/1 star counts)
- Component breakdowns
- Top matches with reasons
- Status distribution

### Example 3: Contact Deep Dive
**Ask:** "Get full details for contact xyz-789"

**I'll use:** `get_contact_details`

**You get:**
- Basic info (name, email, company, title)
- Investor profile
- Investment thesis
- Recent matches

## Debugging Workflow

```
1. "Get recent conversations" 
   → See all conversations

2. "Show matches for conversation XYZ"
   → See all match suggestions

3. "Analyze match quality for conversation XYZ"
   → Deep dive into scores

4. "Get details for contact ABC"
   → Understand why contact matched
```

## Available Tables

- `profiles` - Users
- `contacts` - Contact network  
- `conversations` - Recordings
- `match_suggestions` - Matches
- `theses` - Investment theses
- `conversation_entities` - Extracted data
- `conversation_segments` - Transcripts
- `conversation_participants` - Attendees
- `calendar_events` - Meetings
- `introduction_threads` - Intros

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not loading | Check `~/.cursor/mcp.json` exists |
| Auth errors | Verify service role key in Supabase |
| No results | Try `npm test` to check connection |
| Module not found | Rebuild: `npm run build` |

## Commands

```bash
# Test connection
npm test

# Rebuild server
npm run build

# Watch mode (dev)
npm run watch

# Check build output
ls -la dist/index.js
```

## Filter Operators

Use in queries with `query_table`:

- `eq` - equals
- `neq` - not equals
- `gt` / `gte` - greater than (or equal)
- `lt` / `lte` - less than (or equal)
- `like` / `ilike` - pattern match (case-sensitive/insensitive)
- `in` - in array
- `is` - is null/not null

## Tips

✅ **DO:**
- Be specific: "Show contacts in fintech"
- Use IDs when you have them
- Ask for analysis, not just raw data
- Chain queries (broad → specific)

❌ **DON'T:**
- Don't ask for modifications (INSERT/UPDATE/DELETE)
- Don't query without filters on large tables
- Don't commit mcp.json with credentials

## Getting Help

1. Read `CURSOR_SETUP.md` for setup
2. Read `EXAMPLE_QUERIES.md` for 50+ examples
3. Read `README.md` for technical docs
4. Run `npm test` to debug connection

---

**Quick Start:** Test connection → Configure Cursor → Restart → Ask questions!
