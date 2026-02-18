/**
 * E2E Enrichment Pipeline Evaluation
 *
 * Creates temporary test contacts for well-known people, invokes the
 * research-contact Edge Function, then grades enriched data against
 * known ground truth. Cleans up after itself.
 *
 * Usage:
 *   npx tsx scripts/eval/test-enrichment-pipeline.ts
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Golden set ───────────────────────────────────────────────────────────────

interface GoldenEntry {
  name: string;
  company: string;
  expected: {
    title?: RegExp;
    hasBio?: boolean;
    hasLinkedIn?: boolean;
    locationContains?: string;
    educationSchools?: string[];
    hasCareerHistory?: boolean;
    isInvestor?: boolean;
    hasPortfolio?: boolean;
    thesisNotMinimal?: boolean;
    hasExpertiseAreas?: boolean;
  };
}

const GOLDEN_SET: GoldenEntry[] = [
  {
    name: 'Marc Andreessen',
    company: 'Andreessen Horowitz',
    expected: {
      title: /general partner|co-?founder|partner/i,
      hasBio: true,
      hasLinkedIn: true,
      educationSchools: ['Illinois'],
      isInvestor: true,
      hasPortfolio: true,
      thesisNotMinimal: true,
    },
  },
  {
    name: 'Satya Nadella',
    company: 'Microsoft',
    expected: {
      title: /ceo|chairman|chief executive/i,
      hasBio: true,
      hasLinkedIn: true,
      locationContains: 'Washington',
      hasCareerHistory: true,
      isInvestor: false,
    },
  },
  {
    name: 'Sam Altman',
    company: 'OpenAI',
    expected: {
      title: /ceo|chief executive/i,
      hasBio: true,
      hasLinkedIn: true,
      hasCareerHistory: true,
    },
  },
  {
    name: 'Reshma Saujani',
    company: 'Girls Who Code',
    expected: {
      title: /founder|ceo/i,
      hasBio: true,
      hasLinkedIn: true,
      isInvestor: false,
    },
  },
  {
    name: 'Reid Hoffman',
    company: 'Greylock Partners',
    expected: {
      title: /partner|co-?founder|board/i,
      hasBio: true,
      hasLinkedIn: true,
      isInvestor: true,
      hasPortfolio: true,
    },
  },
  {
    name: 'Sarah Guo',
    company: 'Conviction',
    expected: {
      title: /founder|general partner|managing partner|partner/i,
      hasBio: true,
      hasLinkedIn: true,
      isInvestor: true,
    },
  },
];

// ─── Evaluation helpers ───────────────────────────────────────────────────────

interface FieldResult {
  field: string;
  pass: boolean;
  detail: string;
}

function evaluateContact(contact: Record<string, any>, expected: GoldenEntry['expected']): FieldResult[] {
  const results: FieldResult[] = [];

  if (expected.title) {
    const title = contact.title || '';
    const pass = expected.title.test(title);
    results.push({ field: 'Title', pass, detail: pass ? `"${title}"` : `GOT "${title}" EXPECTED ${expected.title}` });
  }

  if (expected.hasBio !== undefined) {
    const bio = contact.bio || '';
    const pass = expected.hasBio ? bio.length > 20 : true;
    results.push({ field: 'Bio', pass, detail: pass ? `Found (${bio.length} chars)` : `Missing or too short (${bio.length} chars)` });
  }

  if (expected.hasLinkedIn !== undefined) {
    const url = contact.linkedin_url || '';
    const pass = expected.hasLinkedIn ? url.includes('linkedin.com') : true;
    results.push({ field: 'LinkedIn', pass, detail: pass ? (url || 'N/A') : `Missing` });
  }

  if (expected.locationContains) {
    const loc = (contact.location || '').toLowerCase();
    const pass = loc.includes(expected.locationContains.toLowerCase());
    results.push({ field: 'Location', pass, detail: pass ? `"${contact.location}"` : `GOT "${contact.location}" EXPECTED contains "${expected.locationContains}"` });
  }

  if (expected.educationSchools) {
    const edu: any[] = contact.education || [];
    const schools = edu.map((e: any) => JSON.stringify(e).toLowerCase());
    const pass = expected.educationSchools.every(s =>
      schools.some(sch => sch.includes(s.toLowerCase()))
    );
    results.push({ field: 'Education', pass, detail: pass ? `Found ${edu.length} entries` : `Missing expected schools: ${expected.educationSchools.join(', ')}` });
  }

  if (expected.hasCareerHistory !== undefined) {
    const career: any[] = contact.career_history || [];
    const pass = expected.hasCareerHistory ? career.length > 0 : true;
    results.push({ field: 'Career', pass, detail: pass ? `Found ${career.length} entries` : `No career history found` });
  }

  if (expected.isInvestor !== undefined) {
    const isInv = contact.is_investor === true;
    const contactTypes: string[] = contact.contact_type || [];
    const investorTypes = ['GP', 'LP', 'Angel', 'FamilyOffice', 'PE'];
    const hasInvestorType = contactTypes.some(t => investorTypes.includes(t));
    const detected = isInv || hasInvestorType;
    const pass = expected.isInvestor === detected;
    results.push({ field: 'Investor', pass, detail: pass ? (detected ? 'Correctly detected' : 'Correctly not investor') : `Expected ${expected.isInvestor}, got ${detected}` });
  }

  if (expected.hasPortfolio !== undefined) {
    const portfolio: string[] = contact.portfolio_companies || [];
    const pass = expected.hasPortfolio ? portfolio.length > 0 : true;
    results.push({ field: 'Portfolio', pass, detail: pass ? `Found ${portfolio.length} companies` : `No portfolio companies` });
  }

  if (expected.thesisNotMinimal !== undefined) {
    const thesis = contact.investor_notes || '';
    const thesisSource = contact.thesis_source || '';
    const pass = expected.thesisNotMinimal
      ? thesis.length > 30 && thesisSource !== 'minimal'
      : true;
    results.push({
      field: 'Thesis',
      pass,
      detail: pass
        ? `Source: "${thesisSource}", ${thesis.length} chars`
        : `Thesis too short (${thesis.length} chars) or minimal source "${thesisSource}"`,
    });
  }

  if (expected.hasExpertiseAreas !== undefined) {
    const areas: string[] = contact.expertise_areas || [];
    const pass = expected.hasExpertiseAreas ? areas.length > 0 : true;
    results.push({ field: 'Expertise', pass, detail: pass ? `Found ${areas.length} areas` : `No expertise areas` });
  }

  // Always check completeness score
  const completeness = contact.data_completeness_score ?? 0;
  results.push({ field: 'Completeness', pass: completeness > 20, detail: `${completeness}/100` });

  // Check confidence metadata
  const conf = contact.enrichment_confidence;
  const hasConf = conf && typeof conf === 'object' && Object.keys(conf).length > 0;
  results.push({ field: 'Confidence', pass: !!hasConf, detail: hasConf ? `${Object.keys(conf).length} fields scored` : 'No confidence metadata' });

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n========================================');
  console.log('  Enrichment Pipeline E2E Evaluation');
  console.log('========================================\n');

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create a temporary test user
  const testEmail = `eval-test-${Date.now()}@eval.local`;
  const testPassword = `EvalTest!${Date.now()}`;

  console.log('Creating temporary test user...');
  const { data: newUser, error: userErr } = await serviceClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Eval Test User' },
  });
  if (userErr || !newUser?.user) {
    console.error('Failed to create test user:', userErr);
    process.exit(1);
  }
  const testUserId = newUser.user.id;
  console.log(`  User ID: ${testUserId}`);

  // Sign in as the test user to get a JWT
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signInErr || !signInData.session) {
    console.error('Failed to sign in as test user:', signInErr);
    await cleanup(serviceClient, [], testUserId);
    process.exit(1);
  }
  const accessToken = signInData.session.access_token;
  console.log('  Signed in successfully\n');

  // Create authenticated client for Edge Function calls
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const contactIds: string[] = [];
  const allResults: Array<{ entry: GoldenEntry; fields: FieldResult[]; error?: string }> = [];

  try {
    // Create test contacts
    console.log('Creating test contacts...\n');
    for (const entry of GOLDEN_SET) {
      const { data: contact, error } = await serviceClient
        .from('contacts')
        .insert({ name: entry.name, company: entry.company, owned_by_profile: testUserId })
        .select('id')
        .single();

      if (error || !contact) {
        console.error(`  Failed to create contact for ${entry.name}:`, error);
        continue;
      }
      contactIds.push(contact.id);
      console.log(`  Created: ${entry.name} (${contact.id})`);
    }

    console.log(`\nEnriching ${contactIds.length} contacts...\n`);

    // Enrich each contact sequentially (to avoid rate limits)
    for (let i = 0; i < contactIds.length; i++) {
      const entry = GOLDEN_SET[i];
      const contactId = contactIds[i];
      if (!contactId) continue;

      const startTime = Date.now();
      console.log(`[${i + 1}/${contactIds.length}] Enriching ${entry.name}...`);

      try {
        const { data, error } = await authedClient.functions.invoke('research-contact', {
          body: { contactId },
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (error) {
          console.log(`  ERROR (${elapsed}s): ${error.message}`);
          allResults.push({ entry, fields: [], error: error.message });
          continue;
        }

        console.log(`  Done (${elapsed}s) - fields updated: ${data?.fields?.join(', ') || 'none'}`);

        // Fetch enriched contact
        const { data: enriched } = await serviceClient
          .from('contacts')
          .select('*')
          .eq('id', contactId)
          .single();

        if (!enriched) {
          allResults.push({ entry, fields: [], error: 'Could not fetch enriched contact' });
          continue;
        }

        const fieldResults = evaluateContact(enriched, entry.expected);
        allResults.push({ entry, fields: fieldResults });

      } catch (err: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  EXCEPTION (${elapsed}s): ${err.message}`);
        allResults.push({ entry, fields: [], error: err.message });
      }
    }

    // Print scorecards
    console.log('\n\n========================================');
    console.log('  RESULTS');
    console.log('========================================\n');

    let totalChecks = 0;
    let totalPassed = 0;
    const thesisSources: string[] = [];
    const completenessScores: number[] = [];

    for (const result of allResults) {
      console.log(`=== ${result.entry.name} (${result.entry.company}) ===`);

      if (result.error) {
        console.log(`  ERROR: ${result.error}\n`);
        continue;
      }

      for (const f of result.fields) {
        const icon = f.pass ? 'PASS' : 'FAIL';
        console.log(`  ${f.field.padEnd(14)} ${icon}  ${f.detail}`);
        totalChecks++;
        if (f.pass) totalPassed++;
      }

      const thesis = result.fields.find(f => f.field === 'Thesis');
      if (thesis) {
        const srcMatch = thesis.detail.match(/Source: "([^"]+)"/);
        if (srcMatch) thesisSources.push(srcMatch[1]);
      }

      const comp = result.fields.find(f => f.field === 'Completeness');
      if (comp) {
        const scoreMatch = comp.detail.match(/^(\d+)\//);
        if (scoreMatch) completenessScores.push(parseInt(scoreMatch[1]));
      }

      const passed = result.fields.filter(f => f.pass).length;
      console.log(`  ${'─'.repeat(40)}`);
      console.log(`  Score: ${passed}/${result.fields.length} fields\n`);
    }

    // Overall summary
    console.log('========================================');
    console.log('  SUMMARY');
    console.log('========================================\n');
    console.log(`Total checks:    ${totalPassed}/${totalChecks} passed (${totalChecks > 0 ? Math.round(100 * totalPassed / totalChecks) : 0}%)`);
    console.log(`Contacts tested: ${allResults.length}`);
    console.log(`Errors:          ${allResults.filter(r => r.error).length}`);
    if (completenessScores.length > 0) {
      const avg = Math.round(completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length);
      console.log(`Avg completeness: ${avg}/100`);
    }
    if (thesisSources.length > 0) {
      const dist: Record<string, number> = {};
      for (const s of thesisSources) dist[s] = (dist[s] || 0) + 1;
      console.log(`Thesis sources:  ${JSON.stringify(dist)}`);
    }

    const failures = allResults.flatMap(r =>
      r.fields.filter(f => !f.pass).map(f => `${r.entry.name} → ${f.field}: ${f.detail}`)
    );
    if (failures.length > 0) {
      console.log(`\nFailed checks:`);
      for (const f of failures) console.log(`  - ${f}`);
    }
    console.log('');

  } finally {
    await cleanup(serviceClient, contactIds, testUserId);
  }
}

async function cleanup(
  serviceClient: SupabaseClient,
  contactIds: string[],
  userId: string,
) {
  console.log('Cleaning up...');
  if (contactIds.length > 0) {
    await serviceClient.from('contacts').delete().in('id', contactIds);
    console.log(`  Deleted ${contactIds.length} test contacts`);
  }
  // Deleting the user cascades to the profile (via FK)
  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) {
    console.error('  Failed to delete test user:', error);
  } else {
    console.log('  Deleted test user');
  }
  console.log('Done.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
