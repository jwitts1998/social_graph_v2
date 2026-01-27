#!/usr/bin/env node
/**
 * Quick test script to verify Supabase connection
 * Run with: node test-connection.js
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../.env" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 Testing Supabase Connection...\n");

if (!SUPABASE_URL) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_URL");
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("✅ Environment variables found:");
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: ${SUPABASE_KEY.substring(0, 20)}...`);
console.log();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test query
console.log("🔌 Testing database connection...\n");

try {
  // Count profiles
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  
  if (profileError) throw profileError;
  
  // Count contacts
  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true });
  
  if (contactError) throw contactError;
  
  // Count conversations
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true });
  
  if (convError) throw convError;
  
  // Count matches
  const { data: matches, error: matchError } = await supabase
    .from("match_suggestions")
    .select("id", { count: "exact", head: true });
  
  if (matchError) throw matchError;
  
  console.log("✅ Successfully connected to Supabase!\n");
  console.log("📊 Database Stats:");
  console.log(`   Profiles: ${profiles?.length || 0}`);
  console.log(`   Contacts: ${contacts?.length || 0}`);
  console.log(`   Conversations: ${conversations?.length || 0}`);
  console.log(`   Match Suggestions: ${matches?.length || 0}`);
  console.log();
  console.log("✨ Your MCP server should work correctly!");
  
} catch (error) {
  console.error("❌ Connection failed:");
  console.error(error.message);
  console.error("\nPlease check:");
  console.error("  1. Your SUPABASE_URL is correct");
  console.error("  2. Your SUPABASE_SERVICE_ROLE_KEY is valid");
  console.error("  3. Your Supabase project is running");
  console.error("  4. The tables exist in your database");
  process.exit(1);
}
