# Supabase MCP Server

A Model Context Protocol (MCP) server that provides Cursor with direct access to your Supabase database for the Social Graph v2 project.

## Features

### Available Tools

1. **query_table** - Query any table with filters, ordering, and limits
   - Supports all major SQL operators (eq, neq, gt, gte, lt, lte, like, ilike, in, is)
   - Flexible column selection
   - Ordering and pagination

2. **get_table_schema** - View table schemas and available columns

3. **get_conversation_matches** - Get all match suggestions for a conversation
   - Includes full contact details
   - Filter by star rating
   - Shows score breakdown and reasons

4. **get_contact_details** - Full contact profile with thesis and match history

5. **execute_sql** - Run custom SQL queries (SELECT only for safety)

6. **get_recent_conversations** - List recent conversations with participants

7. **analyze_match_quality** - Comprehensive match quality analysis
   - Score distribution
   - Component breakdowns
   - Top matches with details

## Setup

### 1. Install Dependencies

```bash
cd mcp-supabase
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Cursor

Add this to your Cursor MCP configuration file (`~/.cursor/mcp.json` or workspace settings):

```json
{
  "mcpServers": {
    "supabase-social-graph": {
      "command": "node",
      "args": ["/Users/jacksonwittenberg/dev/projects/social_graph_v2/mcp-supabase/dist/index.js"],
      "env": {
        "VITE_SUPABASE_URL": "your-supabase-project-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

**Important:** Replace the environment variables with your actual Supabase credentials!

Alternatively, if you have a `.env` file in the project root, the server will automatically load it.

### 4. Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

## Usage Examples

Once configured, I (the AI assistant) can use these tools automatically. Here are some example queries you can ask me:

- "Show me all conversations for profile ID abc123"
- "Get the match suggestions for conversation xyz789"
- "Show me all contacts who are investors"
- "Analyze the match quality for conversation abc"
- "Get details for contact John Smith"
- "Show me recent conversations with their participants"

### Example Tool Calls

**Query a table:**
```json
{
  "table": "contacts",
  "select": "id, name, company, title",
  "filters": [
    { "column": "is_investor", "operator": "eq", "value": "true" }
  ],
  "order": { "column": "created_at", "ascending": false },
  "limit": 10
}
```

**Get conversation matches:**
```json
{
  "conversation_id": "conv-123-abc",
  "min_stars": 2
}
```

**Analyze match quality:**
```json
{
  "conversation_id": "conv-123-abc"
}
```

## Development

### Watch Mode

For development, you can run in watch mode:

```bash
npm run watch
```

This will automatically rebuild when you make changes to the TypeScript files.

### Adding New Tools

To add a new tool:

1. Add the tool definition in the `ListToolsRequestSchema` handler
2. Add the tool implementation in the `CallToolRequestSchema` handler
3. Rebuild with `npm run build`

## Security

- The server uses the **service role key** which has full database access
- SQL queries are restricted to SELECT only for safety
- Consider using read-only credentials if available
- Never commit your `.env` file or expose credentials

## Available Tables

- `profiles` - User profiles
- `contacts` - Contact network
- `conversations` - Recorded conversations
- `match_suggestions` - AI-generated matches
- `theses` - Investment theses
- `conversation_entities` - Extracted entities
- `conversation_segments` - Transcript segments
- `conversation_participants` - Conversation participants
- `calendar_events` - Calendar events
- `introduction_threads` - Introduction workflows

## Troubleshooting

### Server not starting

- Check that environment variables are set correctly
- Verify Supabase credentials are valid
- Check the logs in Cursor's MCP output panel

### No data returned

- Verify the table and column names are correct
- Check filters are properly formatted
- Ensure the profile/user has data in the database

### Connection errors

- Verify Supabase URL is correct (should end in `.supabase.co`)
- Check that the service role key is valid
- Ensure network connectivity to Supabase

## License

MIT
