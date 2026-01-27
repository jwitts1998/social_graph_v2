import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login first
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'jack@thewittenbergs.net',
  password: process.env.USER_PASSWORD || 'testpassword123', // You'll need to provide this
});

if (authError) {
  console.error('❌ Auth error:', authError.message);
  process.exit(1);
}

console.log('✅ Authenticated as:', authData.user?.email);

const conversationId = 'e1b8f1a5-6ad3-4c3f-bf3f-87bd926e655f';

console.log('\n🚀 Calling generate-matches Edge Function...\n');

const { data, error } = await supabase.functions.invoke('generate-matches', {
  body: { conversationId },
});

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('✅ Success!');
console.log('\n📊 Response:', JSON.stringify(data, null, 2));
console.log('\n📈 Matches found:', data.matches?.length || 0);

if (data.matches && data.matches.length > 0) {
  console.log('\n🎯 Top Matches:');
  data.matches.forEach((m: any, i: number) => {
    console.log(`  ${i + 1}. ${m.contact?.first_name} ${m.contact?.last_name} - ${m.stars}⭐ (score: ${m.score?.toFixed(3)})`);
  });
} else {
  console.log('\n⚠️  NO MATCHES returned');
}
