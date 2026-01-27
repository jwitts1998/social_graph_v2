#!/bin/bash
# Manually trigger entity extraction for test conversation

CONVERSATION_ID="3600d6e1-2134-4708-8fb9-c70c11940f70"

# Load env vars
source .env

echo "🔍 Triggering entity extraction for conversation: $CONVERSATION_ID"
echo ""

# Get auth token (you'll need to replace this with your actual session token)
# You can get this from browser dev tools: Application > Local Storage > sb-{project}-auth-token
echo "⚠️  You need to provide your Supabase auth token"
echo "Get it from browser dev tools:"
echo "  1. Open https://localhost:3001 (your app)"
echo "  2. Open DevTools > Application > Local Storage"
echo "  3. Find key like 'sb-mtelyxosqqaeadrrrtgk-auth-token'"
echo "  4. Copy the 'access_token' value"
echo ""
read -p "Paste your access_token here: " AUTH_TOKEN

echo ""
echo "📡 Calling extract-entities..."

curl -X POST "https://mtelyxosqqaeadrrrtgk.supabase.co/functions/v1/extract-entities" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\"}" \
  | jq '.'

echo ""
echo "✅ Done! Check the Supabase logs for extract-entities to see if it worked."
