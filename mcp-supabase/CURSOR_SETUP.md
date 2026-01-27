# Cursor Setup Guide for Supabase MCP Server

## Step 1: Locate Your Cursor MCP Configuration File

Cursor's MCP configuration can be in one of these locations:

### Option A: User-level Configuration (Recommended)
Create or edit: `~/.cursor/mcp.json`

```bash
# Check if it exists
ls -la ~/.cursor/mcp.json

# If it doesn't exist, create it
mkdir -p ~/.cursor
touch ~/.cursor/mcp.json
```

### Option B: Workspace-level Configuration
Create a `.cursor/mcp.json` file in your project root:

```bash
# From your project root
mkdir -p .cursor
touch .cursor/mcp.json
```

## Step 2: Add the MCP Server Configuration

Add this JSON configuration to your `mcp.json` file:

```json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": [
        "/Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/dist/index.js"
      ],
      "env": {
        "VITE_SUPABASE_URL": "YOUR_SUPABASE_URL_HERE",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY_HERE"
      }
    }
  }
}
```

**Important:** Replace the placeholder values with your actual Supabase credentials!

### Finding Your Supabase Credentials

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 3: Alternative - Use Existing .env File

If you already have a `.env` file in your project root with these variables, the MCP server will automatically load them. In that case, you can simplify your config:

```json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": [
        "/Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/dist/index.js"
      ]
    }
  }
}
```

## Step 4: Restart Cursor

After adding the configuration:

1. **Save** the `mcp.json` file
2. **Completely quit** Cursor (Cmd+Q on Mac, not just close the window)
3. **Reopen** Cursor
4. Open your project

## Step 5: Verify It's Working

Once Cursor restarts, you should be able to ask me (the AI) questions like:

- "Show me all contacts in the database"
- "Get recent conversations"
- "Analyze match quality for conversation xyz"
- "Show me the schema for the contacts table"

## Troubleshooting

### Issue: Server not loading

**Check Cursor logs:**
1. In Cursor, open the Command Palette (Cmd+Shift+P)
2. Search for "MCP" or "Model Context Protocol"
3. Look for server connection status

**Verify your configuration:**
```bash
cat ~/.cursor/mcp.json
```

### Issue: Authentication errors

- Double-check your Supabase credentials
- Make sure you're using the **service_role** key, not the **anon** key
- Verify the URL doesn't have trailing slashes

### Issue: Module not found

Make sure the path in `args` matches where you built the server:
```bash
ls -la /Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/dist/index.js
```

### Issue: Permission denied

Make the script executable:
```bash
chmod +x /Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/dist/index.js
```

## Advanced Configuration

### Using Multiple MCP Servers

You can add multiple MCP servers. Your full config might look like:

```json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": ["/path/to/mcp-supabase/dist/index.js"],
      "env": {
        "VITE_SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    },
    "other-mcp-server": {
      "command": "python",
      "args": ["/path/to/other-server.py"]
    }
  }
}
```

### Environment Variables

You can also set environment variables system-wide or in your shell profile instead of in the JSON config:

```bash
# Add to ~/.zshrc or ~/.bashrc
export VITE_SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
```

Then your config only needs:
```json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": ["/path/to/mcp-supabase/dist/index.js"]
    }
  }
}
```

## Security Best Practices

1. ⚠️ **Never commit** `mcp.json` with credentials to git
2. 🔒 Use **environment variables** when possible
3. 🔑 Keep your **service role key** secret
4. 📝 Consider using a **read-only** database user for queries
5. 🚫 The server already restricts to SELECT-only queries for safety

## Next Steps

Once configured, you can:
- Ask me to query any table in your database
- Get real-time context about conversations and matches
- Analyze match quality and scoring
- Debug issues with your matching algorithm
- Explore your data without leaving Cursor

Enjoy your new Supabase MCP server! 🚀
