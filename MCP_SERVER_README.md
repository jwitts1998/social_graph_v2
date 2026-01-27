# Supabase MCP Server - Setup Complete ✅

## What Was Built

A custom **Model Context Protocol (MCP)** server that connects Cursor's AI assistant directly to your Supabase database. This allows you to query your database, analyze matches, and explore data without leaving the IDE.

## Location

```
/Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/
```

## Features

### 7 Powerful Tools

1. **query_table** - Query any table with filters, ordering, and limits
2. **get_table_schema** - View table structures
3. **get_conversation_matches** - Get match suggestions with full details
4. **get_contact_details** - Complete contact profiles with thesis
5. **execute_sql** - Run custom SQL (SELECT only, for safety)
6. **get_recent_conversations** - List conversations with participants
7. **analyze_match_quality** - Comprehensive match analysis

### Built-in Safety

- ✅ Read-only operations (SELECT queries only)
- ✅ Automatic query validation
- ✅ Error handling and user-friendly messages
- ✅ Formatted output with summaries

## Quick Start

### 1. Test the Connection

```bash
cd mcp-supabase
npm test
```

This will verify your Supabase credentials work.

### 2. Configure Cursor

Follow the detailed instructions in:
```
mcp-supabase/CURSOR_SETUP.md
```

**Quick version:**
- Create/edit `~/.cursor/mcp.json`
- Add your Supabase credentials
- Restart Cursor

### 3. Start Using It

Once configured, ask me (the AI) questions like:
- "Show me all contacts"
- "Get matches for conversation xyz"
- "Analyze match quality"

See `mcp-supabase/EXAMPLE_QUERIES.md` for 50+ example queries!

## Files Created

```
mcp-supabase/
├── src/
│   └── index.ts              # Main MCP server code
├── dist/                      # Compiled JavaScript
│   └── index.js              # Built server (executable)
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── test-connection.js        # Connection test utility
├── README.md                 # Technical documentation
├── CURSOR_SETUP.md          # Step-by-step setup guide
├── EXAMPLE_QUERIES.md       # 50+ example queries
└── .gitignore               # Ignore node_modules/dist

```

## Documentation

- **[CURSOR_SETUP.md](mcp-supabase/CURSOR_SETUP.md)** - Complete setup instructions
- **[EXAMPLE_QUERIES.md](mcp-supabase/EXAMPLE_QUERIES.md)** - Query examples and use cases
- **[README.md](mcp-supabase/README.md)** - Technical reference

## Example Use Cases

### 🔍 Debugging Matches
"Show me why contact X matched with conversation Y"
→ Detailed score breakdown with component analysis

### 📊 Data Exploration
"Get all 3-star matches across all conversations"
→ Comprehensive list with contact details

### ✅ Validation
"Verify the test dataset was loaded correctly"
→ Count records, check relationships

### 🎯 Match Analysis
"Analyze match quality for conversation abc"
→ Score distribution, top matches, component averages

## Security Notes

⚠️ **Important:**
- Uses **service role key** (full database access)
- Restricted to **SELECT queries only**
- Keep credentials in **environment variables**
- Never commit `.env` or `mcp.json` with credentials

## Maintenance

### Rebuild After Changes
```bash
cd mcp-supabase
npm run build
```

### Watch Mode (Development)
```bash
npm run watch
```

### Update Dependencies
```bash
npm update
```

## Troubleshooting

### Server Won't Start
```bash
# Test connection
npm test

# Check build
ls -la dist/index.js

# Verify permissions
chmod +x dist/index.js
```

### Can't Find MCP Config
```bash
# Check if file exists
ls -la ~/.cursor/mcp.json

# Create if missing
mkdir -p ~/.cursor
echo '{"mcpServers":{}}' > ~/.cursor/mcp.json
```

### Authentication Errors
- Verify URL: `echo $VITE_SUPABASE_URL`
- Verify Key: `echo $SUPABASE_SERVICE_ROLE_KEY | cut -c1-20`
- Check Supabase dashboard for correct credentials

## Next Steps

1. ✅ **Test the connection:** `npm test`
2. ✅ **Configure Cursor:** Follow `CURSOR_SETUP.md`
3. ✅ **Restart Cursor:** Quit completely and reopen
4. ✅ **Try a query:** "Show me all contacts"
5. ✅ **Explore:** See `EXAMPLE_QUERIES.md` for ideas

## Integration with Your Project

This MCP server is specifically designed for your **Social Graph v2** project:

- ✅ Knows your database schema (from `shared/schema.ts`)
- ✅ Understands your matching system
- ✅ Provides match quality analysis
- ✅ Supports all your tables (contacts, conversations, matches, etc.)
- ✅ Formats output for easy reading

## Benefits

### For Development
- Query data without leaving Cursor
- Debug matching algorithm issues
- Validate test datasets
- Explore database structure

### For Testing
- Verify match quality
- Check entity extraction
- Analyze score distributions
- Validate relationships

### For Debugging
- Investigate why matches were made
- Check missing data
- Verify data integrity
- Trace data flow

## Technical Details

- **Language:** TypeScript
- **Runtime:** Node.js
- **Protocol:** Model Context Protocol (MCP)
- **SDK:** `@modelcontextprotocol/sdk`
- **Database:** Supabase PostgreSQL
- **Client:** `@supabase/supabase-js`

## Support

If you encounter issues:

1. Check the documentation in `mcp-supabase/`
2. Run `npm test` to verify connection
3. Check Cursor's MCP logs
4. Verify credentials in Supabase dashboard

## Success! 🎉

You now have a powerful database query tool integrated directly into Cursor. Ask me anything about your data, and I'll use the MCP server to get you answers!

---

**Built:** January 2026
**Version:** 1.0.0
**Status:** ✅ Production Ready
