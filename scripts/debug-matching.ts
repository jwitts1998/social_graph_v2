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

const CONVERSATION_ID = 'e1b8f1a5-6ad3-4c3f-bf3f-87bd926e655f';
const SARAH_CHEN_ID = '1b936619-68af-42c6-a959-3ff73ddcaf74';

async function debugMatching() {
  console.log('🔍 Debug Matching Algorithm\n');
  
  // Get conversation entities
  const { data: entities } = await supabase
    .from('conversation_entities')
    .select('*')
    .eq('conversation_id', CONVERSATION_ID);
  
  console.log('📊 Conversation Entities:');
  entities?.forEach(e => console.log(`  - ${e.entity_type}: ${e.value}`));
  
  const sectors = entities?.filter(e => e.entity_type === 'sector').map(e => e.value) || [];
  const stages = entities?.filter(e => e.entity_type === 'stage').map(e => e.value) || [];
  const personNames = entities?.filter(e => e.entity_type === 'person_name').map(e => e.value) || [];
  
  console.log('\n🎯 Parsed:');
  console.log(`  Sectors: [${sectors.join(', ')}]`);
  console.log(`  Stages: [${stages.join(', ')}]`);
  console.log(`  Person Names: [${personNames.join(', ') || 'NONE'}]`);
  
  // Get conversation rich context
  const { data: conv } = await supabase
    .from('conversations')
    .select('target_person, matching_intent, goals_and_needs, domains_and_topics')
    .eq('id', CONVERSATION_ID)
    .single();
  
  console.log('\n💎 Rich Context:');
  console.log(`  Investor Types: ${conv?.goals_and_needs?.fundraising?.investor_types?.join(', ') || 'none'}`);
  console.log(`  Product Keywords: ${conv?.domains_and_topics?.product_keywords?.join(', ') || 'none'}`);
  console.log(`  Name Mentioned: ${conv?.target_person?.name_mentioned || 'NONE'}`);
  
  // Build conversation tags
  const conversationTags = [
    ...sectors,
    ...stages,
    ...(conv?.domains_and_topics?.product_keywords || []),
  ];
  console.log(`\n🏷️  Conversation Tags: [${conversationTags.join(', ')}]`);
  
  // Get Sarah Chen contact
  const { data: contact } = await supabase
    .from('contacts')
    .select(`
      *, 
      theses (*)
    `)
    .eq('id', SARAH_CHEN_ID)
    .single();
  
  console.log('\n👤 Sarah Chen Contact:');
  console.log(`  Name: ${contact?.first_name} ${contact?.last_name}`);
  console.log(`  Contact Type: ${contact?.contact_type?.join(', ')}`);
  console.log(`  Is Investor: ${contact?.is_investor}`);
  console.log(`  Relationship: ${contact?.relationship_strength}/100`);
  
  if (contact?.theses && contact.theses.length > 0) {
    const thesis = contact.theses[0];
    console.log(`  Thesis Sectors: [${thesis.sectors?.join(', ')}]`);
    console.log(`  Thesis Stages: [${thesis.stages?.join(', ')}]`);
  }
  
  // Build contact tags
  const contactTags: string[] = [];
  if (contact?.theses) {
    for (const thesis of contact.theses) {
      contactTags.push(...(thesis.sectors || []));
      contactTags.push(...(thesis.stages || []));
    }
  }
  if (contact?.contact_type) {
    contactTags.push(...contact.contact_type);
  }
  if (contact?.is_investor) {
    contactTags.push('investor');
  }
  
  // Extract keywords from bio
  const bioText = (contact?.bio || '').toLowerCase();
  const investmentTerms = ['venture', 'capital', 'seed', 'series a', 'series b', 'pre-seed', 
    'biotech', 'fintech', 'healthtech', 'saas', 'ai', 'ml', 'deep tech', 'climate',
    'enterprise', 'b2b', 'b2c', 'consumer', 'healthcare', 'life sciences'];
  for (const term of investmentTerms) {
    if (bioText.includes(term)) {
      contactTags.push(term);
    }
  }
  
  console.log(`\n🏷️  Contact Tags: [${contactTags.slice(0, 10).join(', ')}...]`);
  
  // Calculate tag overlap (Jaccard)
  const convTagsSet = new Set(conversationTags.map(s => s.toLowerCase()));
  const contactTagsSet = new Set(contactTags.map(s => s.toLowerCase()));
  const intersection = [...convTagsSet].filter(x => contactTagsSet.has(x));
  const union = new Set([...convTagsSet, ...contactTagsSet]);
  const jaccardScore = intersection.length / union.size;
  
  console.log('\n🔗 Tag Overlap (Jaccard):');
  console.log(`  Intersection: [${intersection.join(', ')}]`);
  console.log(`  Union size: ${union.size}`);
  console.log(`  Jaccard Score: ${(jaccardScore * 100).toFixed(1)}%`);
  
  // Calculate semantic (keyword) score
  const contactText = [
    contact?.bio || '',
    contact?.title || '',
    contact?.investor_notes || '',
    contact?.company || ''
  ].join(' ').toLowerCase();
  
  const allSearchTerms = [...sectors, ...stages, ...conversationTags];
  let keywordMatches = 0;
  const matchedTerms: string[] = [];
  for (const term of allSearchTerms) {
    if (contactText.includes(term.toLowerCase())) {
      keywordMatches++;
      matchedTerms.push(term);
    }
  }
  const semanticScore = allSearchTerms.length > 0 
    ? keywordMatches / allSearchTerms.length
    : 0;
  
  console.log('\n📝 Semantic (Keyword) Matching:');
  console.log(`  Search Terms: [${allSearchTerms.join(', ')}]`);
  console.log(`  Matched Terms: [${matchedTerms.join(', ')}]`);
  console.log(`  Semantic Score: ${(semanticScore * 100).toFixed(1)}%`);
  
  // Calculate role match
  const investorTypes = conv?.goals_and_needs?.fundraising?.investor_types || [];
  let roleMatchScore = 0;
  if (investorTypes.length > 0 && contact?.contact_type) {
    for (const iType of investorTypes) {
      const iTypeLower = iType.toLowerCase();
      for (const cType of contact.contact_type) {
        if (cType.toLowerCase().includes(iTypeLower) || iTypeLower.includes(cType.toLowerCase())) {
          roleMatchScore = 0.8;
          break;
        }
      }
    }
  }
  
  console.log('\n🎭 Role Matching:');
  console.log(`  Needed Types: [${investorTypes.join(', ')}]`);
  console.log(`  Contact Types: [${contact?.contact_type?.join(', ')}]`);
  console.log(`  Role Match Score: ${(roleMatchScore * 100).toFixed(1)}%`);
  
  // Calculate weighted score (no embeddings)
  const WEIGHTS = {
    semantic: 0.2,
    tagOverlap: 0.35,
    roleMatch: 0.15,
    geoMatch: 0.1,
    relationship: 0.2,
  };
  
  const relationshipScore = (contact?.relationship_strength || 50) / 100;
  const geoMatchScore = 0; // No geo matching in this case
  
  const rawScore = 
    WEIGHTS.semantic * semanticScore +
    WEIGHTS.tagOverlap * jaccardScore +
    WEIGHTS.roleMatch * roleMatchScore +
    WEIGHTS.geoMatch * geoMatchScore +
    WEIGHTS.relationship * relationshipScore;
  
  console.log('\n⚖️  Weighted Score Calculation:');
  console.log(`  Semantic:     ${WEIGHTS.semantic} × ${(semanticScore * 100).toFixed(1)}% = ${(WEIGHTS.semantic * semanticScore).toFixed(3)}`);
  console.log(`  Tag Overlap:  ${WEIGHTS.tagOverlap} × ${(jaccardScore * 100).toFixed(1)}% = ${(WEIGHTS.tagOverlap * jaccardScore).toFixed(3)}`);
  console.log(`  Role Match:   ${WEIGHTS.roleMatch} × ${(roleMatchScore * 100).toFixed(1)}% = ${(WEIGHTS.roleMatch * roleMatchScore).toFixed(3)}`);
  console.log(`  Geo Match:    ${WEIGHTS.geoMatch} × 0% = 0.000`);
  console.log(`  Relationship: ${WEIGHTS.relationship} × ${(relationshipScore * 100).toFixed(1)}% = ${(WEIGHTS.relationship * relationshipScore).toFixed(3)}`);
  console.log(`  ---`);
  console.log(`  RAW SCORE: ${rawScore.toFixed(3)} (${(rawScore * 100).toFixed(1)}%)`);
  
  // Star rating
  let stars = 0;
  if (rawScore >= 0.40) stars = 3;
  else if (rawScore >= 0.20) stars = 2;
  else if (rawScore >= 0.05) stars = 1;
  
  console.log(`\n⭐ Star Rating: ${stars} ${stars >= 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : stars === 1 ? '⭐' : '(below threshold)'}`);
  
  if (rawScore < 0.05) {
    console.log('\n❌ RESULT: Would NOT appear in matches (below 0.05 threshold)');
  } else {
    console.log('\n✅ RESULT: Should appear in matches!');
  }
  
  console.log('\n🔍 ROOT CAUSE ANALYSIS:');
  if (personNames.length === 0) {
    console.log('  ⚠️  No person name extracted → No name boost (+0.3)');
  }
  if (jaccardScore < 0.3) {
    console.log(`  ⚠️  Low tag overlap (${(jaccardScore * 100).toFixed(1)}%) → Tags don't match exactly`);
    console.log(`     Problem: "biotechnology" ≠ "Biotech", "pre-revenue" ≠ "Pre-seed"`);
  }
  if (semanticScore < 0.5) {
    console.log(`  ⚠️  Low semantic score (${(semanticScore * 100).toFixed(1)}%) → Keywords don't match`);
  }
  if (roleMatchScore === 0) {
    console.log(`  ⚠️  No role match → "biotech investors" doesn't match "GP"`);
  }
}

debugMatching().catch(console.error);
