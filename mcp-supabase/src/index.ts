#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../.env" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: Missing required environment variables");
  console.error("Required: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create MCP server
const server = new Server(
  {
    name: "supabase-query",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Table schemas for reference
const TABLES = {
  profiles: ["id", "email", "full_name", "role", "onboarding_completed", "created_at", "updated_at"],
  contacts: ["id", "owned_by_profile", "name", "first_name", "last_name", "email", "company", "title", "linkedin_url", "location", "phone", "category", "bio", "relationship_strength", "is_investor", "contact_type", "created_at", "updated_at"],
  conversations: ["id", "owned_by_profile", "event_id", "title", "duration_seconds", "recorded_at", "status", "target_person", "matching_intent", "goals_and_needs", "domains_and_topics", "created_at"],
  match_suggestions: ["id", "conversation_id", "contact_id", "score", "reasons", "justification", "status", "promise_status", "score_breakdown", "confidence_scores", "match_version", "created_at", "updated_at"],
  theses: ["id", "contact_id", "sectors", "stages", "check_sizes", "geos", "personas", "intents", "notes", "created_at", "updated_at"],
  conversation_entities: ["id", "conversation_id", "entity_type", "value", "confidence", "context_snippet", "created_at"],
  conversation_segments: ["id", "conversation_id", "timestamp_ms", "speaker", "text", "created_at"],
  conversation_participants: ["id", "conversation_id", "contact_id", "created_at"],
  calendar_events: ["id", "owned_by_profile", "title", "description", "start_time", "end_time", "attendees", "location", "meeting_url", "created_at"],
  introduction_threads: ["id", "suggestion_id", "initiated_by_profile", "contact_a_id", "contact_b_id", "current_status", "meeting_scheduled", "created_at"],
};

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_table",
        description: "Query a Supabase table with filters and limits. Supports SELECT queries with WHERE, ORDER BY, and LIMIT clauses.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: `Table name to query. Available: ${Object.keys(TABLES).join(", ")}`,
              enum: Object.keys(TABLES),
            },
            select: {
              type: "string",
              description: "Columns to select (default: '*'). Use comma-separated list or '*' for all columns",
              default: "*",
            },
            filters: {
              type: "array",
              description: "Array of filter conditions. Each filter has: column, operator (eq, neq, gt, gte, lt, lte, like, ilike, in), value",
              items: {
                type: "object",
                properties: {
                  column: { type: "string" },
                  operator: { 
                    type: "string",
                    enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"],
                  },
                  value: { type: "string" },
                },
                required: ["column", "operator", "value"],
              },
            },
            order: {
              type: "object",
              description: "Order results by column",
              properties: {
                column: { type: "string" },
                ascending: { type: "boolean", default: false },
              },
            },
            limit: {
              type: "number",
              description: "Maximum number of rows to return (default: 100)",
              default: 100,
            },
          },
          required: ["table"],
        },
      },
      {
        name: "get_table_schema",
        description: "Get the schema/column information for a specific table",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name to get schema for",
              enum: Object.keys(TABLES),
            },
          },
          required: ["table"],
        },
      },
      {
        name: "get_conversation_matches",
        description: "Get all match suggestions for a specific conversation with full details including contact info",
        inputSchema: {
          type: "object",
          properties: {
            conversation_id: {
              type: "string",
              description: "The conversation ID to get matches for",
            },
            min_stars: {
              type: "number",
              description: "Minimum star rating to filter by (1, 2, or 3)",
              default: 1,
            },
          },
          required: ["conversation_id"],
        },
      },
      {
        name: "get_contact_details",
        description: "Get full details for a contact including thesis and relationships",
        inputSchema: {
          type: "object",
          properties: {
            contact_id: {
              type: "string",
              description: "The contact ID to get details for",
            },
          },
          required: ["contact_id"],
        },
      },
      {
        name: "execute_sql",
        description: "Execute a raw SQL query (READ-ONLY). For complex queries not covered by other tools. Be careful with this!",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute (SELECT only, no modifications allowed)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_recent_conversations",
        description: "Get recent conversations with participant and entity information",
        inputSchema: {
          type: "object",
          properties: {
            profile_id: {
              type: "string",
              description: "Profile ID to filter conversations by (optional)",
            },
            limit: {
              type: "number",
              description: "Number of conversations to return (default: 10)",
              default: 10,
            },
          },
        },
      },
      {
        name: "analyze_match_quality",
        description: "Analyze match quality for a conversation - shows score distribution, component breakdown, and top matches",
        inputSchema: {
          type: "object",
          properties: {
            conversation_id: {
              type: "string",
              description: "The conversation ID to analyze",
            },
          },
          required: ["conversation_id"],
        },
      },
    ],
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "query_table": {
        const { table, select = "*", filters = [], order, limit = 100 } = args as any;
        
        let query: any = supabase.from(table).select(select).limit(limit);
        
        // Apply filters
        for (const filter of filters) {
          const { column, operator, value } = filter;
          switch (operator) {
            case "eq":
              query = query.eq(column, value);
              break;
            case "neq":
              query = query.neq(column, value);
              break;
            case "gt":
              query = query.gt(column, value);
              break;
            case "gte":
              query = query.gte(column, value);
              break;
            case "lt":
              query = query.lt(column, value);
              break;
            case "lte":
              query = query.lte(column, value);
              break;
            case "like":
              query = query.like(column, value);
              break;
            case "ilike":
              query = query.ilike(column, value);
              break;
            case "in":
              query = query.in(column, JSON.parse(value));
              break;
            case "is":
              query = query.is(column, value === "null" ? null : value);
              break;
          }
        }
        
        // Apply ordering
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? false });
        }
        
        const { data, error }: any = await query;
        
        if (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Found ${data.length} rows from ${table}:\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "get_table_schema": {
        const { table } = args as any;
        const columns = TABLES[table as keyof typeof TABLES];
        
        return {
          content: [
            {
              type: "text",
              text: `Schema for table '${table}':\n\nColumns:\n${columns.map(col => `  - ${col}`).join('\n')}`,
            },
          ],
        };
      }

      case "get_conversation_matches": {
        const { conversation_id, min_stars = 1 } = args as any;
        
        // Calculate minimum score based on stars (from matching logic)
        const minScoreMap = { 1: 0.05, 2: 0.20, 3: 0.40 };
        const minScore = minScoreMap[min_stars as keyof typeof minScoreMap] || 0.05;
        
        const { data, error } = await supabase
          .from("match_suggestions")
          .select(`
            *,
            contact:contacts (
              id,
              name,
              company,
              title,
              location,
              bio,
              relationship_strength,
              is_investor,
              contact_type
            ),
            conversation:conversations (
              id,
              title,
              target_person,
              matching_intent,
              goals_and_needs,
              domains_and_topics
            )
          `)
          .eq("conversation_id", conversation_id)
          .gte("score", minScore)
          .order("score", { ascending: false });
        
        if (error) {
          return {
            content: [{ type: "text", text: `❌ Error: ${error.message}` }],
            isError: true,
          };
        }
        
        const summary = `
🎯 Match Analysis for Conversation: ${conversation_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Matches: ${data.length}
Min Stars Filter: ${min_stars}+ ⭐

Score Distribution:
  3 stars (≥0.40): ${data.filter(m => m.score >= 0.40).length}
  2 stars (≥0.20): ${data.filter(m => m.score >= 0.20 && m.score < 0.40).length}
  1 star  (≥0.05): ${data.filter(m => m.score >= 0.05 && m.score < 0.20).length}

${data.length > 0 ? '\nTop Matches:\n' + data.slice(0, 10).map((m, i) => {
  const stars = m.score >= 0.40 ? '⭐⭐⭐' : m.score >= 0.20 ? '⭐⭐' : '⭐';
  return `${i + 1}. ${stars} ${m.contact?.name || 'Unknown'} (Score: ${m.score.toFixed(3)})
   ${m.contact?.title ? m.contact.title : ''} ${m.contact?.company ? `@ ${m.contact.company}` : ''}
   Status: ${m.status}
   Reasons: ${(m.reasons || []).join(', ')}
`;
}).join('\n') : '\nNo matches found.'}

Full Data:
${JSON.stringify(data, null, 2)}
        `;
        
        return {
          content: [{ type: "text", text: summary }],
        };
      }

      case "get_contact_details": {
        const { contact_id } = args as any;
        
        const { data: contact, error: contactError } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contact_id)
          .single();
        
        if (contactError) {
          return {
            content: [{ type: "text", text: `❌ Error: ${contactError.message}` }],
            isError: true,
          };
        }
        
        const { data: thesis } = await supabase
          .from("theses")
          .select("*")
          .eq("contact_id", contact_id)
          .single();
        
        const { data: matches } = await supabase
          .from("match_suggestions")
          .select("id, conversation_id, score, status, created_at")
          .eq("contact_id", contact_id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        const summary = `
👤 Contact Details: ${contact.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basic Info:
  Name: ${contact.name}
  Email: ${contact.email || 'N/A'}
  Company: ${contact.company || 'N/A'}
  Title: ${contact.title || 'N/A'}
  Location: ${contact.location || 'N/A'}
  
Profile:
  Is Investor: ${contact.is_investor ? 'Yes' : 'No'}
  Contact Types: ${contact.contact_type?.join(', ') || 'None'}
  Relationship Strength: ${contact.relationship_strength || 50}/100

${thesis ? `
Investment Thesis:
  Sectors: ${thesis.sectors?.join(', ') || 'None'}
  Stages: ${thesis.stages?.join(', ') || 'None'}
  Geos: ${thesis.geos?.join(', ') || 'None'}
  Check Sizes: ${thesis.check_sizes?.join(', ') || 'None'}
  ${thesis.notes ? `Notes: ${thesis.notes}` : ''}
` : ''}

Recent Matches: ${matches?.length || 0}
${matches?.map(m => `  - Score: ${m.score.toFixed(3)}, Status: ${m.status}, ID: ${m.conversation_id}`).join('\n') || '  None'}

Full Contact Data:
${JSON.stringify(contact, null, 2)}

${thesis ? `\nFull Thesis Data:\n${JSON.stringify(thesis, null, 2)}` : ''}
        `;
        
        return {
          content: [{ type: "text", text: summary }],
        };
      }

      case "execute_sql": {
        const { query } = args as any;
        
        // Basic safety check - only allow SELECT
        if (!query.trim().toLowerCase().startsWith("select")) {
          return {
            content: [
              {
                type: "text",
                text: "❌ Error: Only SELECT queries are allowed for safety reasons",
              },
            ],
            isError: true,
          };
        }
        
        const { data, error } = await supabase.rpc("exec_sql", { query });
        
        if (error) {
          return {
            content: [{ type: "text", text: `❌ Error: ${error.message}` }],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Query executed successfully:\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case "get_recent_conversations": {
        const { profile_id, limit = 10 } = args as any;
        
        let query = supabase
          .from("conversations")
          .select(`
            *,
            participants:conversation_participants (
              contact:contacts (
                name,
                company,
                title
              )
            )
          `)
          .order("recorded_at", { ascending: false })
          .limit(limit);
        
        if (profile_id) {
          query = query.eq("owned_by_profile", profile_id);
        }
        
        const { data, error } = await query;
        
        if (error) {
          return {
            content: [{ type: "text", text: `❌ Error: ${error.message}` }],
            isError: true,
          };
        }
        
        const summary = `
📅 Recent Conversations (${data.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.map((conv, i) => `
${i + 1}. ${conv.title || 'Untitled Conversation'}
   ID: ${conv.id}
   Recorded: ${new Date(conv.recorded_at).toLocaleString()}
   Duration: ${conv.duration_seconds ? `${Math.floor(conv.duration_seconds / 60)}m ${conv.duration_seconds % 60}s` : 'N/A'}
   Status: ${conv.status}
   Participants: ${conv.participants?.map((p: any) => p.contact?.name).filter(Boolean).join(', ') || 'None'}
`).join('\n')}

Full Data:
${JSON.stringify(data, null, 2)}
        `;
        
        return {
          content: [{ type: "text", text: summary }],
        };
      }

      case "analyze_match_quality": {
        const { conversation_id } = args as any;
        
        const { data: matches, error } = await supabase
          .from("match_suggestions")
          .select(`
            *,
            contact:contacts (name, company, title)
          `)
          .eq("conversation_id", conversation_id)
          .order("score", { ascending: false });
        
        if (error) {
          return {
            content: [{ type: "text", text: `❌ Error: ${error.message}` }],
            isError: true,
          };
        }
        
        if (!matches || matches.length === 0) {
          return {
            content: [{ type: "text", text: `No matches found for conversation: ${conversation_id}` }],
          };
        }
        
        // Analyze score components
        const avgBreakdown: any = {};
        matches.forEach(m => {
          if (m.score_breakdown) {
            Object.entries(m.score_breakdown).forEach(([key, value]) => {
              avgBreakdown[key] = (avgBreakdown[key] || 0) + (value as number);
            });
          }
        });
        
        Object.keys(avgBreakdown).forEach(key => {
          avgBreakdown[key] = (avgBreakdown[key] / matches.length).toFixed(3);
        });
        
        const analysis = `
📊 Match Quality Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Conversation: ${conversation_id}

Overall Statistics:
  Total Matches: ${matches.length}
  3 Stars (≥0.40): ${matches.filter(m => m.score >= 0.40).length}
  2 Stars (≥0.20): ${matches.filter(m => m.score >= 0.20 && m.score < 0.40).length}
  1 Star  (≥0.05): ${matches.filter(m => m.score >= 0.05 && m.score < 0.20).length}
  
Score Statistics:
  Highest: ${matches[0]?.score.toFixed(3)}
  Lowest: ${matches[matches.length - 1]?.score.toFixed(3)}
  Average: ${(matches.reduce((sum, m) => sum + m.score, 0) / matches.length).toFixed(3)}

Average Component Scores:
${Object.entries(avgBreakdown).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

Top 5 Matches:
${matches.slice(0, 5).map((m, i) => {
  const stars = m.score >= 0.40 ? '⭐⭐⭐' : m.score >= 0.20 ? '⭐⭐' : '⭐';
  return `
${i + 1}. ${stars} ${m.contact?.name || 'Unknown'} - ${m.score.toFixed(3)}
   ${m.contact?.title ? `${m.contact.title} @ ` : ''}${m.contact?.company || ''}
   Breakdown: ${JSON.stringify(m.score_breakdown, null, 2)}
   Reasons: ${(m.reasons || []).join(', ')}
`;
}).join('\n')}

Status Distribution:
${Object.entries(matches.reduce((acc: any, m) => {
  acc[m.status] = (acc[m.status] || 0) + 1;
  return acc;
}, {})).map(([status, count]) => `  ${status}: ${count}`).join('\n')}
        `;
        
        return {
          content: [{ type: "text", text: analysis }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error executing ${name}: ${error.message}\n\nStack: ${error.stack}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error("✅ Supabase MCP Server running");
console.error(`🔗 Connected to: ${SUPABASE_URL}`);
console.error(`📊 Available tables: ${Object.keys(TABLES).join(", ")}`);
