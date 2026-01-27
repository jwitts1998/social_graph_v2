# 🚀 Supabase MCP Server - Quick Start

## What Is This?

A **Model Context Protocol (MCP) server** that lets Cursor's AI assistant query your Supabase database directly. No more copy-pasting SQL queries or switching to the Supabase dashboard!

## ⚡ Quick Start (3 Steps)

### 1️⃣ Test Connection

```bash
cd mcp-supabase
npm test
```

Expected output:
```
✅ Successfully connected to Supabase!

📊 Database Stats:
   Profiles: X
   Contacts: X
   Conversations: X
   Match Suggestions: X
```

### 2️⃣ Configure Cursor

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": [
        "/Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/dist/index.js"
      ],
      "env": {
        "VITE_SUPABASE_URL": "your-supabase-url-here",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
      }
    }
  }
}
```

**Get your credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy **Project URL** and **service_role** key

### 3️⃣ Restart Cursor

- **Quit** Cursor completely (Cmd+Q on Mac)
- **Reopen** Cursor
- You're ready!

## 🎯 Try It Out

Ask me (the AI) questions like:

```
"Show me all contacts"
"Get recent conversations"
"Analyze matches for conversation abc-123"
"Show me all investor contacts"
"Get details for contact xyz-789"
```

## 📚 Documentation

| File | Purpose |
|------|---------|
| **[CURSOR_SETUP.md](mcp-supabase/CURSOR_SETUP.md)** | Detailed setup guide |
| **[QUICK_REFERENCE.md](mcp-supabase/QUICK_REFERENCE.md)** | Handy cheat sheet |
| **[EXAMPLE_QUERIES.md](mcp-supabase/EXAMPLE_QUERIES.md)** | 50+ example queries |
| **[README.md](mcp-supabase/README.md)** | Technical reference |

## 🎁 What You Get

- ✅ **7 powerful query tools** for your database
- ✅ **Natural language interface** - just ask questions
- ✅ **Match quality analysis** - understand your algorithm
- ✅ **Safe by default** - read-only queries
- ✅ **Formatted output** - easy to read summaries

## 🛠️ What You Can Do

### Query Any Table
```
"Show me the contacts table schema"
"Get all contacts where is_investor is true"
"List conversations from the last week"
```

### Analyze Matches
```
"Analyze match quality for conversation XYZ"
"Show me 3-star matches"
"Why did contact ABC match with conversation XYZ?"
```

### Debug Issues
```
"Get conversation details for ID XYZ"
"Show me contacts missing email addresses"
"Find matches without explanations"
```

### Explore Data
```
"How many conversations do I have?"
"What's the distribution of contact types?"
"Show me the top 10 contacts by match count"
```

## 🔧 Maintenance

### Rebuild After Changes
```bash
cd mcp-supabase
npm run build
```

### Update Dependencies
```bash
npm update
```

### Watch Mode (Development)
```bash
npm run watch
```

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Run `npm test` to check connection |
| Can't find config file | Create `~/.cursor/mcp.json` |
| Auth errors | Verify credentials in Supabase dashboard |
| No results | Check that data exists in tables |

Full troubleshooting guide: [`mcp-supabase/CURSOR_SETUP.md`](mcp-supabase/CURSOR_SETUP.md)

## 🎉 You're All Set!

Once configured, you have a powerful database exploration tool right in Cursor. Just ask questions in natural language, and I'll use the MCP server to query your Supabase database.

**Happy querying!** 🚀

---

**Need Help?** Read the detailed docs in the `mcp-supabase/` directory.
