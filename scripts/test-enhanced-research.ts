import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test web search
async function testWebSearch(name: string, company: string) {
  console.log('\n🔍 Testing Web Search\n');
  console.log(`Target: ${name} at ${company}\n`);
  
  const SERPER_API_KEY = process.env.SERPER_API_KEY || '8985ba8dc13e275ad1d48a391d4bdcdf125f52d0';
  
  const query = `"${name}" "${company}" LinkedIn profile`;
  console.log(`Query: ${query}\n`);
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    
    if (!response.ok) {
      console.error('❌ Serper API error:', response.status);
      return;
    }
    
    const data = await response.json();
    const results = data.organic || [];
    
    console.log(`✅ Found ${results.length} search results:\n`);
    
    results.forEach((r: any, i: number) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   ${r.link}`);
      console.log(`   ${r.snippet}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Test contact research
async function testContactResearch(contactId: string) {
  console.log('\n🔬 Testing Contact Research Function\n');
  
  // Get contact details first
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  
  if (!contact) {
    console.error('❌ Contact not found');
    return;
  }
  
  console.log(`Contact: ${contact.name}`);
  console.log(`Company: ${contact.company || 'N/A'}`);
  console.log(`Current Bio: ${contact.bio?.substring(0, 100) || 'None'}...\n`);
  
  // Call research function
  const { data, error } = await supabase.functions.invoke('research-contact', {
    body: { contactId }
  });
  
  if (error) {
    console.error('❌ Research function error:', error);
    return;
  }
  
  console.log('✅ Research complete!\n');
  console.log('Results:', JSON.stringify(data, null, 2));
  
  // Fetch updated contact
  const { data: updatedContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  
  if (updatedContact) {
    console.log('\n📊 Updated Contact Data:\n');
    console.log(`Bio: ${updatedContact.bio || 'None'}`);
    console.log(`\nEnriched Data (in investor_notes):`);
    console.log(updatedContact.investor_notes || 'None');
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (command === 'search') {
  const name = args[1] || 'Marc Andreessen';
  const company = args[2] || 'Andreessen Horowitz';
  testWebSearch(name, company);
} else if (command === 'research') {
  const contactId = args[1];
  if (!contactId) {
    console.error('Usage: npx tsx scripts/test-enhanced-research.ts research <contact_id>');
    process.exit(1);
  }
  testContactResearch(contactId);
} else {
  console.log(`
🧪 Enhanced Research Test Script

Usage:
  # Test web search (no Supabase needed)
  npx tsx scripts/test-enhanced-research.ts search "Marc Andreessen" "Andreessen Horowitz"
  
  # Test full research on a contact
  npx tsx scripts/test-enhanced-research.ts research <contact_id>

Examples:
  npx tsx scripts/test-enhanced-research.ts search
  npx tsx scripts/test-enhanced-research.ts research 1b936619-68af-42c6-a959-3ff73ddcaf74
  `);
}
