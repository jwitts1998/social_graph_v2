# Example Queries for Supabase MCP Server

Once the MCP server is configured in Cursor, you can ask me (the AI) natural language questions, and I'll use the MCP tools to query your database.

## Basic Queries

### View All Contacts
"Show me all contacts in my database"
"List the first 20 contacts"
"Get all investor contacts"

### Recent Conversations
"Show me the 10 most recent conversations"
"Get recent conversations with participants"
"List all conversations from today"

### Match Suggestions
"Show me all match suggestions for conversation abc-123"
"Get 3-star matches for this conversation"
"Analyze match quality for conversation xyz-789"

### Contact Details
"Get full details for contact John Smith"
"Show me the investment thesis for contact ID xyz"
"What contacts are investors in the fintech sector?"

## Advanced Queries

### Filter by Status
"Show me all pending match suggestions"
"Get all contacts with investor status true"
"List conversations with status 'completed'"

### Investment Analysis
"Show me all contacts who invest in Series A"
"Find investors in AI/ML with check sizes over $100k"
"Get all contacts in the fintech sector"

### Match Quality Analysis
"Analyze the match quality for conversation abc-123"
"Show me the score distribution for this conversation"
"What are the top 5 matches and their reasons?"

### Relationship Tracking
"Show me contacts with high relationship strength (>80)"
"Get all contacts I've had recent interactions with"
"Find contacts who haven't been contacted in 6+ months"

### Cross-Table Queries
"Show me all conversations with their match suggestions"
"Get contacts with their investment theses"
"List conversations with participant names"

## Real-World Use Cases

### Debugging the Matching System
"Why did contact X get matched to conversation Y?"
"Show me the score breakdown for this match"
"Compare the match scores for conversation A vs B"
"What components contributed most to this match?"

### Validating Test Data
"Show me all test conversations from the TEST_DATASET"
"Verify that matches were generated for conversation X"
"Check if contact Y has a thesis defined"

### Data Exploration
"How many conversations do I have?"
"What's the distribution of contact types?"
"Show me all 3-star matches across all conversations"
"Which conversations have the most matches?"

### Quality Assurance
"Find contacts missing email addresses"
"Show me conversations without participants"
"List matches without explanations"
"Get contacts with incomplete profiles"

## Example Conversation

**You:** "Show me all conversations for my profile"

**AI:** I'll query the conversations table for your profile.
*[Uses query_table tool]*
Here are your 5 most recent conversations:
1. "Fundraising Discussion" - Jan 15, 2026
2. "Partnership Chat" - Jan 14, 2026
...

**You:** "Get the matches for the first conversation"

**AI:** Let me get the match suggestions for that conversation.
*[Uses get_conversation_matches tool]*
Found 12 matches (3 three-star, 5 two-star, 4 one-star):

Top matches:
⭐⭐⭐ Jane Investor (Score: 0.67)
  Partner @ Acme VC
  Reasons: sector_match, stage_match, geo_match
...

**You:** "Analyze the match quality"

**AI:** I'll analyze the match quality distribution.
*[Uses analyze_match_quality tool]*
Match Quality Analysis:
- Average score: 0.34
- Component breakdown:
  - Semantic similarity: 0.25
  - Tag overlap: 0.38
  - Role matching: 0.31
...

## Pro Tips

1. **Be specific**: Instead of "show data", say "show me all investor contacts"
2. **Use IDs when you have them**: "Get matches for conversation abc-123"
3. **Ask for analysis**: "Analyze match quality" gives you insights, not just raw data
4. **Chain queries**: Start broad, then drill down based on results
5. **Request formatting**: Ask for "top 10" or "sorted by score" for better results

## Available Tables

You can query these tables:
- `profiles` - User accounts
- `contacts` - Your contact network
- `conversations` - Recorded conversations
- `match_suggestions` - AI-generated matches
- `theses` - Investment theses for contacts
- `conversation_entities` - Extracted entities
- `conversation_segments` - Transcript text
- `conversation_participants` - Who was in each conversation
- `calendar_events` - Calendar/meeting data
- `introduction_threads` - Double opt-in introductions

## Custom SQL

For complex queries not covered by the standard tools:

"Run this SQL query: SELECT contacts.name, COUNT(match_suggestions.id) as match_count FROM contacts LEFT JOIN match_suggestions ON contacts.id = match_suggestions.contact_id GROUP BY contacts.id, contacts.name ORDER BY match_count DESC LIMIT 10"

The MCP server will execute it safely (SELECT only).

## Troubleshooting Queries

### No Results?
- "Show me the schema for the contacts table"
- "How many rows are in the contacts table?"
- "Get any single contact to see the data format"

### Errors?
- Check the table name is correct
- Verify column names match the schema
- Ensure the data type matches (string vs number)

---

**Have fun exploring your data!** The MCP server gives you direct database access right from Cursor's AI assistant.
