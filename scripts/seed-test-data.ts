/**
 * Seed script: clears previous test data, inserts contacts (with embeddings)
 * and realistic two-person dialogue conversations (segments only — no entities,
 * no rich context, no embeddings, no matches).
 *
 * The user can then open the UI, click into a conversation, and press
 * "Regenerate Matches" to trigger extract-entities -> embed-conversation ->
 * generate-matches manually.
 *
 * Usage:
 *   npx tsx scripts/seed-test-data.ts
 *
 * Prerequisites:
 *   - .env with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   - A user account (email/password auth) — set TEST_USER_EMAIL and
 *     TEST_USER_PASSWORD in .env, or the script defaults to
 *     jack@thewittenbergs.net.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Auth ──────────────────────────────────────────────────────────────────────

const email = process.env.TEST_USER_EMAIL || 'jack@thewittenbergs.net';
const password = process.argv[2] || process.env.TEST_USER_PASSWORD || process.env.USER_PASSWORD || '';

let userId: string;

if (password) {
  console.log(`Signing in as ${email} with password...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) {
    console.error('Auth failed:', authError?.message);
    process.exit(1);
  }
  userId = authData.user.id;
} else {
  console.log(`No password provided. Using admin API to find ${email}...`);
  if (!SERVICE_ROLE_KEY) {
    console.error('Need either a password or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) { console.error('Admin listUsers failed:', listErr.message); process.exit(1); }

  const targetUser = userList.users.find((u: any) => u.email === email);
  if (!targetUser) { console.error(`User ${email} not found`); process.exit(1); }

  userId = targetUser.id;

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkErr || !linkData) {
    console.error('Failed to generate session link:', linkErr?.message);
    console.error('Falling back to data-only mode (no edge-function calls).');
  } else {
    const token = linkData.properties?.hashed_token;
    if (token) {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: token,
      });
      if (verifyErr) {
        console.warn('OTP verify failed, edge functions will be called with admin headers:', verifyErr.message);
      }
    }
  }
}

console.log(`User id: ${userId}\n`);

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function invokeEdgeFunction(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    console.error(`  Edge function ${name} error:`, error.message || error);
    return null;
  }
  return data;
}

function log(msg: string) {
  console.log(msg);
}

// ─── Clean up previous seed data ──────────────────────────────────────────────

log('Cleaning up previous seed data...');

const { data: existingConvs } = await supabaseAdmin
  .from('conversations')
  .select('id')
  .eq('owned_by_profile', userId)
  .like('title', '%[SEED]%');

if (existingConvs && existingConvs.length > 0) {
  const ids = existingConvs.map((c: any) => c.id);
  await supabaseAdmin.from('conversations').delete().in('id', ids);
  log(`  Deleted ${ids.length} previous seed conversations`);
}

const { data: existingContacts } = await supabaseAdmin
  .from('contacts')
  .select('id')
  .eq('owned_by_profile', userId)
  .like('investor_notes', '%[SEED]%');

if (existingContacts && existingContacts.length > 0) {
  const ids = existingContacts.map((c: any) => c.id);
  await supabaseAdmin.from('theses').delete().in('contact_id', ids);
  await supabaseAdmin.from('contacts').delete().in('id', ids);
  log(`  Deleted ${ids.length} previous seed contacts`);
}

log('');

// ─── Contacts ──────────────────────────────────────────────────────────────────

log('=== INSERTING TEST CONTACTS ===\n');

interface TestContact {
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  bio: string;
  location: string;
  email: string;
  contact_type: string[];
  is_investor: boolean;
  check_size_min?: number;
  check_size_max?: number;
  investor_notes: string;
  relationship_strength: number;
  education?: any[];
  personal_interests?: string[];
  expertise_areas?: string[];
  portfolio_companies?: string[];
  thesis?: { sectors: string[]; stages: string[]; geos: string[] };
}

const testContacts: TestContact[] = [
  {
    name: 'Dr. Elena Rodriguez',
    first_name: 'Elena',
    last_name: 'Rodriguez',
    title: 'Partner',
    company: 'BioVentures Capital',
    bio: 'Early-stage biotech investor specializing in AI-powered drug discovery and precision medicine. Former research scientist at Genentech with 15 years of therapeutics experience. Led investments in CRISPR-based therapeutics, mRNA platforms, and computational biology startups. Deep expertise in preclinical through Phase II clinical development. Looking for founding teams with novel therapeutic modalities and strong scientific advisors.',
    location: 'San Francisco, CA',
    email: 'elena@bioventures-seed.test',
    contact_type: ['GP'],
    is_investor: true,
    check_size_min: 500000,
    check_size_max: 3000000,
    investor_notes: '[SEED] Biotech seed specialist. Prefers companies with IP moat and experienced CSO. Strong network in pharma for partnerships.',
    relationship_strength: 80,
    education: [{ school: 'Stanford', degree: 'PhD', field: 'Biochemistry', year: 2008 }],
    personal_interests: ['precision medicine', 'hiking', 'scientific conferences'],
    expertise_areas: ['drug discovery', 'CRISPR', 'mRNA', 'precision medicine', 'biotech'],
    portfolio_companies: ['ModernaTx', 'Recursion Pharma', 'Insitro'],
    thesis: { sectors: ['Biotech', 'Healthcare', 'AI/ML', 'Drug Discovery'], stages: ['Pre-Seed', 'Seed'], geos: ['San Francisco', 'Boston', 'United States'] },
  },
  {
    name: 'Marcus Chen',
    first_name: 'Marcus',
    last_name: 'Chen',
    title: 'Managing Director',
    company: 'Pacific Growth Partners',
    bio: 'Real estate and proptech investor with 20 years in commercial property development. Manages a $200M fund focused on urban mixed-use developments and smart building technology. Previously led acquisitions at Brookfield Asset Management.',
    location: 'New York, NY',
    email: 'marcus@pacificgrowth-seed.test',
    contact_type: ['GP'],
    is_investor: true,
    check_size_min: 2000000,
    check_size_max: 10000000,
    investor_notes: '[SEED] Tags overlap with fintech via thesis but bio diverges significantly.',
    relationship_strength: 55,
    expertise_areas: ['real estate', 'proptech', 'smart buildings'],
    thesis: { sectors: ['FinTech', 'InsurTech', 'Real Estate Tech'], stages: ['Series A', 'Series B'], geos: ['New York', 'United States'] },
  },
  {
    name: 'Robert Smith',
    first_name: 'Robert',
    last_name: 'Smith',
    title: 'Angel Investor & Advisor',
    company: 'Independent',
    bio: 'Former fintech founder. Built a payments company that was acquired in 2020. Now angel investing in early-stage fintech and marketplace startups. Typical check size $50-250K. Can help with product strategy, fundraising, and customer introductions.',
    location: 'Austin, TX',
    email: 'bob@smithangel-seed.test',
    contact_type: ['Angel'],
    is_investor: true,
    check_size_min: 50000,
    check_size_max: 250000,
    investor_notes: '[SEED] Tests name matching — "Bob Smith" in transcript should match "Robert Smith".',
    relationship_strength: 70,
    personal_interests: ['angel investing', 'mentoring founders', 'golf'],
    expertise_areas: ['payments', 'marketplace', 'fintech'],
    thesis: { sectors: ['FinTech', 'Marketplace'], stages: ['Pre-Seed', 'Seed'], geos: ['United States'] },
  },
  {
    name: 'Dr. Priya Mehta',
    first_name: 'Priya',
    last_name: 'Mehta',
    title: 'Venture Partner',
    company: 'Nexus Ventures',
    bio: 'AI/ML venture investor and former Google Brain researcher. Focuses on enterprise AI, NLP applications, and autonomous systems. Published 40+ papers in top ML conferences. Invests primarily in deep tech with strong research foundations.',
    location: 'Palo Alto, CA',
    email: 'priya@nexus-seed.test',
    contact_type: ['GP'],
    is_investor: true,
    check_size_min: 1000000,
    check_size_max: 5000000,
    investor_notes: '[SEED] Personal affinity test — shares Stanford background and AI interests with conversation target.',
    relationship_strength: 65,
    education: [{ school: 'Stanford', degree: 'PhD', field: 'Computer Science', year: 2012 }],
    personal_interests: ['machine learning research', 'rock climbing', 'science fiction'],
    expertise_areas: ['artificial intelligence', 'NLP', 'deep learning', 'autonomous systems'],
    portfolio_companies: ['Anthropic', 'Scale AI', 'Cohere'],
    thesis: { sectors: ['AI/ML', 'Deep Tech', 'Enterprise Software'], stages: ['Seed', 'Series A'], geos: ['Bay Area', 'United States'] },
  },
  {
    name: 'James Patterson',
    first_name: 'James',
    last_name: 'Patterson',
    title: 'Founding Partner',
    company: 'GreenHorizon Capital',
    bio: 'Climate technology investor focused on carbon capture, grid-scale energy storage, and sustainable agriculture. Environmental engineering background from MIT. Portfolio includes solar manufacturers, EV charging networks, and carbon credit platforms. Zero interest in healthcare or biotech — exclusively clean energy and sustainability.',
    location: 'Denver, CO',
    email: 'james@greenhorizon-seed.test',
    contact_type: ['GP'],
    is_investor: true,
    check_size_min: 3000000,
    check_size_max: 15000000,
    investor_notes: '[SEED] Negative control — should NOT match biotech/fintech conversations. Climate-only focus.',
    relationship_strength: 40,
    expertise_areas: ['carbon capture', 'renewable energy', 'sustainability', 'clean tech'],
    thesis: { sectors: ['Climate Tech', 'Clean Energy', 'Sustainable Agriculture'], stages: ['Series A', 'Series B'], geos: ['United States', 'Europe'] },
  },
  {
    name: 'Alex Kumar',
    first_name: 'Alex',
    last_name: 'Kumar',
    title: 'VP of Engineering',
    company: 'Stripe',
    bio: '15 years building distributed payment systems at scale. Led infrastructure team at Stripe processing $500B+ annually. Expert in Kubernetes, Go, Python, and real-time transaction processing. Previously at Google Cloud building financial services APIs. Open to CTO opportunities at growth-stage fintech companies.',
    location: 'San Francisco, CA',
    email: 'alex@kumar-seed.test',
    contact_type: ['Startup'],
    is_investor: false,
    investor_notes: '[SEED] Hiring match test — strong CTO candidate for fintech companies.',
    relationship_strength: 85,
    education: [{ school: 'MIT', degree: 'MS', field: 'Computer Science', year: 2009 }],
    personal_interests: ['distributed systems', 'open source', 'mentoring'],
    expertise_areas: ['payments infrastructure', 'distributed systems', 'Kubernetes', 'fintech engineering'],
  },
];

const contactIds: Record<string, string> = {};

for (const tc of testContacts) {
  const { thesis, ...contactData } = tc;
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert({ ...contactData, owned_by_profile: userId })
    .select('id')
    .single();

  if (error) {
    console.error(`  Failed to insert ${tc.name}:`, error.message);
    continue;
  }

  contactIds[tc.name] = data.id;
  log(`  + ${tc.name} (${data.id})`);

  if (thesis) {
    const { error: thesisErr } = await supabaseAdmin
      .from('theses')
      .insert({
        contact_id: data.id,
        sectors: thesis.sectors,
        stages: thesis.stages,
        geos: thesis.geos,
      });
    if (thesisErr) {
      console.error(`    thesis insert failed for ${tc.name}:`, thesisErr.message);
    }
  }
}

log(`\nInserted ${Object.keys(contactIds).length} contacts\n`);

// ─── Embed contacts ────────────────────────────────────────────────────────────

log('=== GENERATING EMBEDDINGS FOR CONTACTS ===\n');

log('  Calling embed-contact (batch mode)...');
const embedBatchResult = await invokeEdgeFunction('embed-contact', { mode: 'batch' });
if (embedBatchResult) {
  log(`  Batch result: processed ${embedBatchResult.processed ?? 0} contacts`);
  if (embedBatchResult.errors?.length > 0) {
    log(`  Errors: ${embedBatchResult.errors.join(', ')}`);
  }
} else {
  log('  Batch embedding failed — continuing with individual embeds...');
  for (const [name, id] of Object.entries(contactIds)) {
    log(`  Embedding ${name}...`);
    const result = await invokeEdgeFunction('embed-contact', { contactId: id, mode: 'single' });
    if (result) {
      log(`    -> bio: ${result.hasBioEmbedding ? 'yes' : 'no'}, thesis: ${result.hasThesisEmbedding ? 'yes' : 'no'}`);
    }
  }
}

// ─── Conversations (segments only — no entities, no rich context) ──────────────

log('\n=== INSERTING TEST CONVERSATIONS ===\n');

interface TestConversation {
  title: string;
  segments: { text: string; speaker: string; timestamp_ms: number }[];
}

const testConversations: TestConversation[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // CONV 1: Coffee chat with a biotech founder
  // Should trigger: biotech, AI, drug discovery, seed fundraising entities
  // Expected matches: Elena Rodriguez, Priya Mehta
  // ────────────────────────────────────────────────────────────────────────────
  {
    title: '[SEED] Coffee with Sarah — Biotech Founder',
    segments: [
      { text: "Hey Sarah, thanks for making the time. How's everything going?", speaker: 'Theron', timestamp_ms: 0 },
      { text: "Things are good! A little hectic — we just moved into a bigger lab space in the Mission. The team is growing fast.", speaker: 'Sarah', timestamp_ms: 4000 },
      { text: "That's awesome. You're still based in San Francisco then? I feel like half the biotech world moved to Boston.", speaker: 'Theron', timestamp_ms: 9000 },
      { text: "Yeah, we thought about it but honestly the Bay Area is so much better for us. We're close to Stanford Medical Center which is huge because we have a collaboration with their oncology department.", speaker: 'Sarah', timestamp_ms: 14000 },
      { text: "Okay tell me what you're actually building. Last time we talked you were still at Genentech.", speaker: 'Theron', timestamp_ms: 22000 },
      { text: "Right, so I left Genentech about eighteen months ago to start this company. We're building an AI-powered drug discovery platform — basically using deep learning to screen millions of molecular compounds and identify novel therapeutic targets for precision medicine.", speaker: 'Sarah', timestamp_ms: 27000 },
      { text: "That's incredible. How's the deep learning component different from what other computational biology companies are doing?", speaker: 'Theron', timestamp_ms: 38000 },
      { text: "Great question. Most comp bio startups do structure-based drug design. We're going after a fundamentally different approach — we use transformer models trained on CRISPR screening data to predict which targets are actually druggable. It's not just about finding the target, it's about finding targets you can actually build a drug around.", speaker: 'Sarah', timestamp_ms: 43000 },
      { text: "So you need investors who actually understand the biology, not just AI investors who think everything is a transformer problem.", speaker: 'Theron', timestamp_ms: 58000 },
      { text: "Exactly. We need people who've seen preclinical data before, who understand what an IND filing looks like, who have connections into pharma for eventual partnerships. We have preclinical data in oncology that's really promising and we're planning to file our IND next year.", speaker: 'Sarah', timestamp_ms: 63000 },
      { text: "What are you raising?", speaker: 'Theron', timestamp_ms: 76000 },
      { text: "Two million dollar seed round. We've got about 800K in soft commits from a couple of angels but we really want a lead who brings domain expertise in biotech investing. Ideally someone who's been in therapeutics, who can help us navigate the FDA pathway.", speaker: 'Sarah', timestamp_ms: 79000 },
      { text: "I might know some people. Let me think on it and get back to you. How's your daughter doing by the way? She must be in school now.", speaker: 'Theron', timestamp_ms: 92000 },
      { text: "She's in first grade! Absolutely loves it. She told me the other day she wants to be a scientist like mommy. Made my whole week.", speaker: 'Sarah', timestamp_ms: 98000 },
      { text: "That's the best. Alright, let me dig through my contacts and I'll send over some intros this week. I'm thinking of a couple people who'd be perfect for this.", speaker: 'Theron', timestamp_ms: 105000 },
      { text: "Thank you so much, I really appreciate it. And let's do dinner soon — we haven't caught up properly in ages.", speaker: 'Sarah', timestamp_ms: 112000 },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // CONV 2: Dinner with a VC friend who mentions "Bob Smith" and fintech deals
  // Should trigger: fintech, payments, person_name "Bob Smith", embedded finance
  // Expected matches: Robert Smith (name match), Marcus Chen (tag overlap)
  // ────────────────────────────────────────────────────────────────────────────
  {
    title: '[SEED] Dinner with Mike — VC Catch-up',
    segments: [
      { text: "Mike! Good to see you man. How's the new fund going?", speaker: 'Theron', timestamp_ms: 0 },
      { text: "Dude, it's been a ride. We just closed Fund III — two hundred and fifty million. Took about eight months which is actually fast for this market.", speaker: 'Mike', timestamp_ms: 5000 },
      { text: "Congrats. What are you guys focused on these days?", speaker: 'Theron', timestamp_ms: 12000 },
      { text: "Mostly fintech and embedded finance. We're seeing so many vertical SaaS companies that want to add payments and lending features but don't want to build the infrastructure from scratch. That's where the interesting companies are right now.", speaker: 'Mike', timestamp_ms: 16000 },
      { text: "That makes sense. Are you doing seed or later stage?", speaker: 'Theron', timestamp_ms: 28000 },
      { text: "Mostly Series A and B. But funny you mention seed — I was talking to Bob Smith last week. You know Bob, right? Used to run that payments company that got acquired?", speaker: 'Mike', timestamp_ms: 32000 },
      { text: "Oh yeah, Bob. I haven't talked to him in a while. What's he up to?", speaker: 'Theron', timestamp_ms: 42000 },
      { text: "He's been angel investing pretty actively in fintech. He told me he's done like twelve deals in the past year, mostly pre-seed and seed stage payments and marketplace companies. Small checks, fifty to two-fifty K, but he's super active.", speaker: 'Mike', timestamp_ms: 47000 },
      { text: "That's interesting. I actually have a company in my pipeline that might be a fit for him. They're building embedded finance APIs for vertical SaaS — processing about a hundred million in monthly volume across fifty platform partners.", speaker: 'Theron', timestamp_ms: 58000 },
      { text: "Oh that sounds right up his alley. They raising?", speaker: 'Mike', timestamp_ms: 70000 },
      { text: "Yeah, looking to raise five million at Series A. They need investors who really understand payments infrastructure though. It's a technical sell.", speaker: 'Theron', timestamp_ms: 74000 },
      { text: "You should definitely connect them with Bob. And actually you should probably talk to him anyway — he's got great deal flow in fintech right now. Very plugged into the Austin startup scene.", speaker: 'Mike', timestamp_ms: 82000 },
      { text: "Good idea. How's Jen doing? I heard you guys just got back from Japan.", speaker: 'Theron', timestamp_ms: 92000 },
      { text: "Oh man, Japan was unreal. We spent two weeks — Tokyo, Kyoto, Osaka. Best food of my life. Jen is already planning the next trip.", speaker: 'Mike', timestamp_ms: 97000 },
      { text: "Jealous. Alright, let me reach out to Bob this week. And send me the names of any fintech founders you're excited about — I'd love to compare notes.", speaker: 'Theron', timestamp_ms: 108000 },
      { text: "Will do. This was great — let's not wait another six months to do this again.", speaker: 'Mike', timestamp_ms: 115000 },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // CONV 3: Walk-and-talk with a startup operator about AI, Stanford, and hiring
  // Should trigger: AI/ML, enterprise software, NLP, Stanford, hiring/CTO
  // Expected matches: Priya Mehta (AI/Stanford affinity), Alex Kumar (CTO/hiring)
  // ────────────────────────────────────────────────────────────────────────────
  {
    title: '[SEED] Walk with Raj — AI Startup & Hiring',
    segments: [
      { text: "Beautiful day for a walk. Thanks for getting out of the office with me, I needed this.", speaker: 'Theron', timestamp_ms: 0 },
      { text: "Same here, I've been staring at screens all week. So much going on right now.", speaker: 'Raj', timestamp_ms: 5000 },
      { text: "Tell me what's happening. Last time we talked you'd just spun out of Stanford.", speaker: 'Theron', timestamp_ms: 10000 },
      { text: "Yeah, so the Stanford spinout is going well. We're building enterprise NLP tools for legal document analysis — basically a fine-tuned large language model that can parse contracts, extract terms, flag risks. Our co-founder did her PhD at Stanford CS under Andrew Ng's lab, so the research foundation is really solid.", speaker: 'Raj', timestamp_ms: 15000 },
      { text: "How's the product doing in market?", speaker: 'Theron', timestamp_ms: 32000 },
      { text: "We have twelve paying enterprise customers. Three law firms and nine corporate legal teams. Revenue is about 80K MRR which is solid for where we are. But we need to build faster — our customers keep asking for features and our engineering team is too small.", speaker: 'Raj', timestamp_ms: 36000 },
      { text: "What do you need on the team?", speaker: 'Theron', timestamp_ms: 48000 },
      { text: "Honestly, we need a CTO. I've been doing double duty as CEO and head of engineering and it's killing me. We need someone who's built distributed systems at scale, ideally someone who's worked at a company like Stripe or Google Cloud. Someone who can own the infrastructure layer while I focus on product and customers.", speaker: 'Raj', timestamp_ms: 52000 },
      { text: "That's a big hire. What about funding — are you raising?", speaker: 'Theron', timestamp_ms: 66000 },
      { text: "We're starting to talk to investors. Looking for seed funding from people who really understand deep tech and AI research. Not just generalist VCs who think AI is a buzzword — people who know what it means to fine-tune models, who understand NLP at a technical level.", speaker: 'Raj', timestamp_ms: 71000 },
      { text: "Makes sense. I know a few AI-focused investors who might be a fit. And on the CTO front I might know someone too — let me think about that.", speaker: 'Theron', timestamp_ms: 85000 },
      { text: "That would be amazing. We've been talking to Anthropic and Scale AI about potential partnerships too, so having investors connected to that ecosystem would be a plus.", speaker: 'Raj', timestamp_ms: 92000 },
      { text: "Oh interesting. Hey, random question — are you still doing the rock climbing thing on weekends?", speaker: 'Theron', timestamp_ms: 102000 },
      { text: "Yes! It's become our whole team's thing now. We go to the climbing gym in Palo Alto every Saturday morning. It started as just me and my co-founder and now the whole team comes. It's great for bonding.", speaker: 'Raj', timestamp_ms: 107000 },
      { text: "I love that. Alright, let me work my network this week. I'll get back to you with some names for both the investor and CTO sides.", speaker: 'Theron', timestamp_ms: 118000 },
      { text: "You're the best. Seriously, this is so helpful. Let me know if there's anything I can do for you too.", speaker: 'Raj', timestamp_ms: 125000 },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // CONV 4: Casual life chat with a friend — low business signal
  // Should trigger: minimal entities, maybe weak climate/sustainability mention
  // Expected matches: weak or none (tests low-signal case)
  // ────────────────────────────────────────────────────────────────────────────
  {
    title: '[SEED] Weekend Chat with Dana — Life Stuff',
    segments: [
      { text: "Dana! It's been forever. How are you?", speaker: 'Theron', timestamp_ms: 0 },
      { text: "I know, right? I've been meaning to text you. Life just got so busy with the kids going back to school and the house renovation.", speaker: 'Dana', timestamp_ms: 5000 },
      { text: "Oh that's right, you're redoing the kitchen. How's that going?", speaker: 'Theron', timestamp_ms: 12000 },
      { text: "It's a nightmare. Three months over schedule, way over budget. But the new countertops are beautiful so I guess it's worth it? Ask me again when I get the final bill.", speaker: 'Dana', timestamp_ms: 16000 },
      { text: "Ha. So what else is going on? You were talking about maybe going to Portugal.", speaker: 'Theron', timestamp_ms: 26000 },
      { text: "We booked it! Two weeks in October. Lisbon for a few days, then the Algarve coast. I've been reading this book about the history of Portuguese exploration — makes me want to see all the old port cities.", speaker: 'Dana', timestamp_ms: 30000 },
      { text: "That sounds incredible. I've been wanting to go to Europe again. Maybe next spring.", speaker: 'Theron', timestamp_ms: 42000 },
      { text: "You should! Oh, and I started volunteering at the community garden on Saturdays. It's so nice just being outside, getting my hands in the dirt. Makes me think about sustainability and how disconnected we all are from where our food comes from.", speaker: 'Dana', timestamp_ms: 48000 },
      { text: "That's cool. I've been trying to be more intentional about that kind of stuff too. Less screen time, more real life.", speaker: 'Theron', timestamp_ms: 60000 },
      { text: "Exactly. My neighbor was telling me about this carbon offset program she signed up for — apparently you can track your family's carbon footprint and invest in offset projects. Kind of interesting but I don't fully understand how it works.", speaker: 'Dana', timestamp_ms: 65000 },
      { text: "I've heard about those. Seems like the whole climate space is booming right now. Anyway, have you read anything good lately? I need a new book.", speaker: 'Theron', timestamp_ms: 78000 },
      { text: "I just finished this amazing novel — it's called 'The Ministry for the Future' by Kim Stanley Robinson. It's about climate change but written as fiction. Totally gripping. And I'm starting a memoir by a woman who walked the Camino de Santiago. Much lighter.", speaker: 'Dana', timestamp_ms: 83000 },
      { text: "I'll add those to my list. Alright, I should run — I have a call in twenty minutes. But let's get the families together for dinner soon.", speaker: 'Theron', timestamp_ms: 96000 },
      { text: "Yes please! Saturday night works for us. I'll text you. So good to catch up.", speaker: 'Dana', timestamp_ms: 103000 },
    ],
  },
];

const conversationIds: { title: string; id: string }[] = [];

for (const tc of testConversations) {
  const { data: conv, error: convErr } = await supabaseAdmin
    .from('conversations')
    .insert({
      title: tc.title,
      owned_by_profile: userId,
      status: 'completed',
      recorded_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (convErr || !conv) {
    console.error(`  Failed to insert conversation "${tc.title}":`, convErr?.message);
    continue;
  }

  conversationIds.push({ title: tc.title, id: conv.id });
  log(`  + "${tc.title}" (${conv.id})`);

  if (tc.segments.length > 0) {
    const segmentRows = tc.segments.map((s) => ({
      conversation_id: conv.id,
      text: s.text,
      speaker: s.speaker,
      timestamp_ms: s.timestamp_ms,
    }));
    const { error: segErr } = await supabaseAdmin
      .from('conversation_segments')
      .insert(segmentRows);
    if (segErr) console.error(`    segments insert failed:`, segErr.message);
  }
}

log(`\nInserted ${conversationIds.length} conversations\n`);

// ─── Summary ───────────────────────────────────────────────────────────────────

log('══════════════════════════════════════');
log('  SEED COMPLETE');
log('══════════════════════════════════════\n');

log('Contacts created:');
for (const [name, id] of Object.entries(contactIds)) {
  log(`  ${name} — ${id}`);
}

log('\nConversations created (view in UI):');
for (const conv of conversationIds) {
  log(`  ${conv.title}`);
  log(`    -> /conversation/${conv.id}`);
}

log('\nNext steps:');
log('  1. Open the app and log in');
log('  2. Click into a conversation');
log('  3. Press "Regenerate Matches" to process');
log('     (extract-entities -> embed-conversation -> generate-matches)');
log('  4. View the match suggestions that appear');

log('\nExpected outcomes after processing:');
log('  1. "Coffee with Sarah"   -> Elena Rodriguez (biotech/drug discovery), Priya Mehta (AI)');
log('  2. "Dinner with Mike"    -> Robert Smith (name match "Bob Smith"), Marcus Chen (fintech tags)');
log('  3. "Walk with Raj"       -> Priya Mehta (AI/Stanford/rock climbing), Alex Kumar (CTO hire)');
log('  4. "Weekend Chat — Dana" -> Weak or no matches (low business signal)');

log('\nDone.');
process.exit(0);
