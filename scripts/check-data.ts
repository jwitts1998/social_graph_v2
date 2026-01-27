#!/usr/bin/env tsx
/**
 * Quick script to check what data exists in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔍 Checking database for existing data...\n');

  // Check for any conversations
  const { data: allConvs, error: convsError } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .limit(10);

  if (convsError) {
    console.error('❌ Error fetching conversations:', convsError.message);
    console.error('   This is expected if you need to be authenticated.');
    console.error('   The validation script needs to be run from the browser or with a user token.\n');
    process.exit(1);
  }

  console.log(`✅ Found ${allConvs?.length || 0} conversations (showing up to 10):\n`);
  
  if (allConvs && allConvs.length > 0) {
    allConvs.forEach((conv, i) => {
      console.log(`   ${i + 1}. ${conv.title}`);
      console.log(`      ID: ${conv.id}`);
      console.log(`      Created: ${new Date(conv.created_at).toLocaleString()}\n`);
    });

    // Check if any have matches
    console.log('Checking for matches...\n');
    for (const conv of allConvs.slice(0, 3)) {
      const { data: matches } = await supabase
        .from('match_suggestions')
        .select('id, score')
        .eq('conversation_id', conv.id);

      console.log(`   ${conv.title}: ${matches?.length || 0} matches`);
      if (matches && matches.length > 0) {
        const starDist = matches.reduce((acc, m) => {
          acc[m.score] = (acc[m.score] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        console.log(`      Star distribution: ${JSON.stringify(starDist)}`);
      }
    }
  } else {
    console.log('   No conversations found. You may need to:');
    console.log('   1. Create a user account and log in');
    console.log('   2. Run the TEST_DATASET.sql script');
    console.log('   3. Or record some conversations in the app');
  }

  console.log('\n✅ Data check complete\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
