import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';
import { PerformanceMonitor } from '../_shared/monitoring.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fuzzy name matching with similarity scoring
function fuzzyNameMatch(mentionedName: string, contactName: string): { match: boolean; score: number; type: string } {
  const mentioned = mentionedName.toLowerCase().trim();
  const contact = contactName.toLowerCase().trim();
  
  // Exact match
  if (mentioned === contact) {
    return { match: true, score: 1.0, type: 'exact' };
  }
  
  // One contains the other (e.g., "Roy Bahat" in "Roy E. Bahat")
  if (contact.includes(mentioned) || mentioned.includes(contact)) {
    return { match: true, score: 0.95, type: 'contains' };
  }
  
  // Split into parts
  const mentionedParts = mentioned.split(/\s+/).filter(p => p.length > 1);
  const contactParts = contact.split(/\s+/).filter(p => p.length > 1);
  
  // Handle single-word names (first name only match)
  if (mentionedParts.length === 1 && contactParts.length >= 1) {
    const singleName = mentionedParts[0];
    const contactFirst = contactParts[0];
    
    // Exact first name match
    if (singleName === contactFirst) {
      return { match: true, score: 0.7, type: 'first-only' };
    }
    
    // Nickname match for first name
    const nicknames: Record<string, string[]> = {
      'matt': ['matthew', 'mat'],
      'matthew': ['matt', 'mat'],
      'rob': ['robert', 'bob', 'bobby'],
      'robert': ['rob', 'bob', 'bobby'],
      'mike': ['michael', 'mick'],
      'michael': ['mike', 'mick'],
    };
    
    if (nicknames[singleName]?.includes(contactFirst) || nicknames[contactFirst]?.includes(singleName)) {
      return { match: true, score: 0.65, type: 'first-nickname' };
    }
    
    return { match: false, score: 0, type: 'none' };
  }
  
  if (mentionedParts.length < 2 || contactParts.length < 1) {
    return { match: false, score: 0, type: 'none' };
  }
  
  const mentionedFirst = mentionedParts[0];
  const mentionedLast = mentionedParts[mentionedParts.length - 1];
  const contactFirst = contactParts[0];
  const contactLast = contactParts[contactParts.length - 1];
  
  // Check for nickname matches (Matt/Matthew, Rob/Robert, etc.)
  const nicknames: Record<string, string[]> = {
    'matt': ['matthew', 'mat'],
    'matthew': ['matt', 'mat'],
    'rob': ['robert', 'bob', 'bobby'],
    'robert': ['rob', 'bob', 'bobby'],
    'bob': ['robert', 'rob', 'bobby'],
    'mike': ['michael', 'mick'],
    'michael': ['mike', 'mick'],
    'jim': ['james', 'jimmy'],
    'james': ['jim', 'jimmy'],
    'bill': ['william', 'will', 'billy'],
    'william': ['bill', 'will', 'billy'],
    'tom': ['thomas', 'tommy'],
    'thomas': ['tom', 'tommy'],
    'joe': ['joseph', 'joey'],
    'joseph': ['joe', 'joey'],
    'dan': ['daniel', 'danny'],
    'daniel': ['dan', 'danny'],
    'chris': ['christopher', 'kristopher'],
    'christopher': ['chris'],
    'alex': ['alexander', 'alexandra'],
    'alexander': ['alex'],
    'sam': ['samuel', 'samantha'],
    'samuel': ['sam'],
    'nick': ['nicholas', 'nicolas'],
    'nicholas': ['nick', 'nicolas'],
    'steve': ['steven', 'stephen'],
    'steven': ['steve', 'stephen'],
    'stephen': ['steve', 'steven'],
    'tony': ['anthony'],
    'anthony': ['tony'],
    'dave': ['david'],
    'david': ['dave'],
    'ed': ['edward', 'eddie'],
    'edward': ['ed', 'eddie'],
    'sara': ['sarah'],
    'sarah': ['sara'],
    'kate': ['katherine', 'catherine', 'kathy'],
    'katherine': ['kate', 'kathy', 'katie'],
    'liz': ['elizabeth', 'beth', 'lizzy'],
    'elizabeth': ['liz', 'beth', 'lizzy'],
    'jen': ['jennifer', 'jenny'],
    'jennifer': ['jen', 'jenny'],
  };
  
  // Check first name match (exact or nickname)
  let firstNameMatch = false;
  if (mentionedFirst === contactFirst) {
    firstNameMatch = true;
  } else if (contactFirst.startsWith(mentionedFirst) || mentionedFirst.startsWith(contactFirst)) {
    firstNameMatch = true;
  } else if (nicknames[mentionedFirst]?.includes(contactFirst) || nicknames[contactFirst]?.includes(mentionedFirst)) {
    firstNameMatch = true;
  }
  
  // Check last name match (exact or close)
  let lastNameMatch = false;
  if (mentionedLast === contactLast) {
    lastNameMatch = true;
  } else if (levenshteinDistance(mentionedLast, contactLast) <= 2) {
    lastNameMatch = true;
  }
  
  // Both first and last match
  if (firstNameMatch && lastNameMatch) {
    return { match: true, score: 0.9, type: 'fuzzy-both' };
  }
  
  // Only last name matches exactly (common for formal references)
  if (mentionedLast === contactLast && mentionedParts.length === 1) {
    return { match: true, score: 0.7, type: 'last-only' };
  }
  
  // Levenshtein distance for close spelling
  const fullDistance = levenshteinDistance(mentioned, contact);
  const maxLen = Math.max(mentioned.length, contact.length);
  const similarity = 1 - (fullDistance / maxLen);
  
  if (similarity >= 0.8) {
    return { match: true, score: similarity, type: 'levenshtein' };
  }
  
  return { match: false, score: 0, type: 'none' };
}

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Check if a value matches any item in an array (case-insensitive, partial match)
function matchesAny(value: string, items: string[]): boolean {
  const valueLower = value.toLowerCase();
  return items.some(item => {
    const itemLower = item.toLowerCase();
    return valueLower.includes(itemLower) || itemLower.includes(valueLower);
  });
}

// Parse check size from string (e.g., "$5,000,000" -> 5000000)
function parseCheckSize(value: string): number | null {
  const cleaned = value.replace(/[$,]/g, '').toLowerCase();
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(k|m|million|thousand)?/);
  if (!match) return null;
  
  let num = parseFloat(match[1]);
  const suffix = match[2];
  
  if (suffix === 'k' || suffix === 'thousand') num *= 1000;
  if (suffix === 'm' || suffix === 'million') num *= 1000000;
  
  return num;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const monitor = new PerformanceMonitor('generate-matches');
  monitor.start('total');

  try {
    monitor.start('auth');
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Directly use Supabase-provided key
    );
    
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    monitor.end('auth');

    const { conversationId } = await req.json();
    console.log('=== GENERATE MATCHES START ===');
    console.log('Conversation ID:', conversationId);
    
    const { data: conversation } = await supabaseUser
      .from('conversations')
      .select('owned_by_profile')
      .eq('id', conversationId)
      .single();

    if (!conversation || conversation.owned_by_profile !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get entities
    monitor.start('fetch-entities');
    const { data: entities } = await supabaseService
      .from('conversation_entities')
      .select('*')
      .eq('conversation_id', conversationId);
    monitor.end('fetch-entities');
    
    console.log('=== ENTITIES RECEIVED ===');
    console.log('Total entities:', entities?.length || 0);
    entities?.forEach(e => console.log(`  - ${e.entity_type}: "${e.value}"`));
    
    if (!entities || entities.length === 0) {
      console.log('NO ENTITIES - returning empty matches');
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Also fetch rich context from conversation for better matching
    const { data: conversationContext } = await supabaseService
      .from('conversations')
      .select('target_person, matching_intent, goals_and_needs, domains_and_topics')
      .eq('id', conversationId)
      .single();
    
    console.log('Rich context available:', !!conversationContext?.matching_intent);
    
    // Get contacts with theses and relationship_strength (bio for AI explanations)
    monitor.start('fetch-contacts', { userId: user.id });
    const { data: contacts, error: contactsError } = await supabaseService
      .from('contacts')
      .select(`
        id, name, first_name, last_name, title, company, location, bio,
        category, contact_type, check_size_min, check_size_max, is_investor,
        relationship_strength, bio_embedding, thesis_embedding, investor_notes,
        theses (id, sectors, stages, geos)
      `)
      .eq('owned_by_profile', user.id);
    monitor.end('fetch-contacts');
    
    if (contactsError) {
      console.error('=== CONTACTS QUERY ERROR ===');
      console.error('Error:', contactsError);
      console.error('User ID:', user.id);
      console.error('SERVICE_ROLE_KEY configured:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    }
    
    console.log('=== CONTACTS LOADED ===');
    console.log('Total contacts:', contacts?.length || 0);
    console.log('Investors only:', contacts?.filter(c => c.is_investor).length || 0);
    console.log('Sample contacts with theses:');
    contacts?.slice(0, 3).forEach(c => {
      console.log(`  - ${c.name} (${c.company}): thesis=${!!c.theses}, sectors=${c.theses?.sectors?.length || 0}`);
    });
    
    if (!contacts || contacts.length === 0) {
      console.log('NO CONTACTS - returning empty matches');
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse entities by type
    const sectors = entities.filter(e => e.entity_type === 'sector').map(e => e.value);
    const stages = entities.filter(e => e.entity_type === 'stage').map(e => e.value);
    const checkSizes = entities.filter(e => e.entity_type === 'check_size').map(e => e.value);
    const geos = entities.filter(e => e.entity_type === 'geo').map(e => e.value);
    const personNames = entities.filter(e => e.entity_type === 'person_name').map(e => e.value);
    
    console.log('=== PARSED ENTITIES ===');
    console.log('Sectors:', sectors);
    console.log('Stages:', stages);
    console.log('Check sizes:', checkSizes);
    console.log('Geos:', geos);
    console.log('Person names:', personNames);
    
    // Parse check size values
    const parsedCheckSizes = checkSizes.map(cs => parseCheckSize(cs)).filter(v => v !== null) as number[];
    const minCheckSize = parsedCheckSizes.length > 0 ? Math.min(...parsedCheckSizes) : null;
    const maxCheckSize = parsedCheckSizes.length > 0 ? Math.max(...parsedCheckSizes) : null;
    console.log('Parsed check size range:', minCheckSize, '-', maxCheckSize);

    // Get conversation embedding if available
    const { data: conversationData } = await supabaseService
      .from('conversations')
      .select('context_embedding')
      .eq('id', conversationId)
      .single();
    
    const conversationEmbedding = conversationData?.context_embedding;
    const hasEmbeddings = conversationEmbedding && conversationEmbedding.length === 1536;
    
    // Weighted scoring formula with embeddings
    // When embeddings are available, we use them for semantic matching
    const WEIGHTS = hasEmbeddings ? {
      embedding: 0.30,      // NEW: Semantic similarity via embeddings
      semantic: 0.10,       // REDUCED: Keyword fallback
      tagOverlap: 0.30,     // REDUCED: Still important
      roleMatch: 0.10,      // REDUCED: Still relevant
      geoMatch: 0.10,       // SAME: Geographic matching
      relationship: 0.10,   // REDUCED: Relationship strength
    } : {
      semantic: 0.2,        // Original weight
      tagOverlap: 0.35,     // Original weight
      roleMatch: 0.15,      // Original weight
      geoMatch: 0.1,        // Original weight
      relationship: 0.2,    // Original weight
    };
    
    console.log('Embeddings available:', hasEmbeddings);
    console.log('Using weights:', WEIGHTS);
    
    // Helper: Cosine similarity for embeddings
    function cosineSimilarity(vec1: number[], vec2: number[]): number {
      if (vec1.length !== vec2.length) return 0;
      
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;
      
      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
      }
      
      const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
      return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
    
    // Helper: Jaccard similarity for tag overlap
    function jaccardSimilarity(set1: string[], set2: string[]): number {
      if (set1.length === 0 && set2.length === 0) return 0;
      const s1 = new Set(set1.map(s => s.toLowerCase()));
      const s2 = new Set(set2.map(s => s.toLowerCase()));
      const intersection = [...s1].filter(x => s2.has(x)).length;
      const union = new Set([...s1, ...s2]).size;
      return union > 0 ? intersection / union : 0;
    }
    
    // Helper: Check role/title match for hiring needs
    function roleMatchScore(contactTitle: string | null, neededRoles: string[]): number {
      if (!contactTitle || neededRoles.length === 0) return 0;
      const titleLower = contactTitle.toLowerCase();
      for (const role of neededRoles) {
        if (titleLower.includes(role.toLowerCase())) return 1;
      }
      return 0;
    }
    
    // Extract what kind of contacts to find from matching_intent
    const whatToFind = conversationContext?.matching_intent?.what_kind_of_contacts_to_find || [];
    const hiringRoles = conversationContext?.goals_and_needs?.hiring?.roles_needed || [];
    const investorTypes = conversationContext?.goals_and_needs?.fundraising?.investor_types || [];
    
    console.log('What to find:', whatToFind);
    console.log('Hiring roles:', hiringRoles);
    console.log('Investor types:', investorTypes);
    
    // Build search tags from conversation context
    const conversationTags: string[] = [
      ...sectors,
      ...stages,
      ...geos,
      ...(conversationContext?.domains_and_topics?.product_keywords || []),
      ...(conversationContext?.domains_and_topics?.technology_keywords || []),
    ];
    
    // Helper: Calculate confidence scores for each component
    function calculateConfidenceScores(
      matchDetails: any,
      contact: any,
      conversationTags: string[],
      allSearchTerms: string[]
    ): any {
      const confidence: any = {};
      
      // Semantic confidence: based on data quality and match strength
      const hasRichProfile = (contact.bio || '').length > 50;
      const searchTermsQuality = allSearchTerms.length > 2 ? 1.0 : 0.5;
      confidence.semantic = matchDetails.semanticScore > 0.3 
        ? (hasRichProfile ? 0.8 : 0.6) * searchTermsQuality
        : 0.3;
      
      // Tag overlap confidence: based on tag count and match quality
      const contactHasTheses = (contact.theses || []).length > 0;
      const conversationHasTags = conversationTags.length > 2;
      confidence.tagOverlap = matchDetails.tagOverlapScore > 0.2
        ? (contactHasTheses && conversationHasTags ? 0.9 : 0.6)
        : 0.4;
      
      // Role match confidence: binary confidence
      confidence.roleMatch = matchDetails.roleMatchScore > 0.5 ? 0.9 : 0.5;
      
      // Geo match confidence: based on location specificity
      const hasSpecificLocation = (contact.location || '').split(',').length > 1;
      confidence.geoMatch = matchDetails.geoMatchScore > 0
        ? (hasSpecificLocation ? 0.8 : 0.6)
        : 0.5;
      
      // Relationship confidence: based on whether score is set
      const hasRelationshipData = contact.relationship_strength != null && contact.relationship_strength !== 50;
      confidence.relationship = hasRelationshipData ? 0.9 : 0.4;
      
      // Overall confidence: weighted average
      confidence.overall = (
        confidence.semantic * 0.2 +
        confidence.tagOverlap * 0.35 +
        confidence.roleMatch * 0.15 +
        confidence.geoMatch * 0.1 +
        confidence.relationship * 0.2
      );
      
      // Name match boosts overall confidence significantly
      if (matchDetails.nameMatch) {
        confidence.overall = Math.min(confidence.overall + 0.2, 1.0);
      }
      
      return confidence;
    }
    
    // Score each contact
    interface Match {
      contact_id: string;
      contact_name: string;
      score: number;
      rawScore: number; // 0-1 normalized score
      reasons: string[];
      justification: string;
      ai_explanation?: string;
      matchDetails: {
        semanticScore: number;
        tagOverlapScore: number;
        roleMatchScore: number;
        geoMatchScore: number;
        relationshipScore: number;
        nameMatch: boolean;
        nameMatchScore: number;
        nameMatchType: string;
      };
      scoreBreakdown?: {
        semantic: number;
        tagOverlap: number;
        roleMatch: number;
        geoMatch: number;
        relationship: number;
        nameMatch?: number;
      };
      confidenceScores?: any;
      contactInfo?: {
        title: string | null;
        company: string | null;
        bio: string | null;
      };
    }
    
    const matches: Match[] = [];
    
    console.log('=== SCORING CONTACTS (Weighted Formula) ===');
    monitor.start('scoring-contacts', { contactCount: contacts.length });
    
    for (const contact of contacts) {
      const reasons: string[] = [];
      const matchDetails: any = {
        embeddingScore: 0,
        semanticScore: 0,
        tagOverlapScore: 0,
        roleMatchScore: 0,
        geoMatchScore: 0,
        relationshipScore: 0,
        nameMatch: false,
        nameMatchScore: 0,
        nameMatchType: 'none',
      };
      
      // Build contact tags from theses and profile
      const contactTags: string[] = [];
      const theses = contact.theses || [];
      
      for (const thesis of theses) {
        contactTags.push(...(thesis.sectors || []));
        contactTags.push(...(thesis.stages || []));
        contactTags.push(...(thesis.geos || []));
      }
      
      // Add contact type tags
      if (contact.contact_type) {
        contactTags.push(...contact.contact_type);
      }
      if (contact.is_investor) {
        contactTags.push('investor');
      }
      
      // Extract keywords from bio/title/investor_notes for better matching
      const bioText = (contact.bio || '').toLowerCase();
      const titleText = (contact.title || '').toLowerCase();
      const notesText = (contact.investor_notes || '').toLowerCase();
      
      // Common investment terms to look for
      const investmentTerms = ['venture', 'capital', 'seed', 'series a', 'series b', 'pre-seed', 
        'biotech', 'fintech', 'healthtech', 'saas', 'ai', 'ml', 'deep tech', 'climate',
        'enterprise', 'b2b', 'b2c', 'consumer', 'healthcare', 'life sciences'];
      for (const term of investmentTerms) {
        if (bioText.includes(term) || titleText.includes(term) || notesText.includes(term)) {
          contactTags.push(term);
        }
      }
      
      // 0. EMBEDDING SIMILARITY (30% weight when available) - Semantic matching via embeddings
      if (hasEmbeddings && contact.bio_embedding && contact.bio_embedding.length === 1536) {
        matchDetails.embeddingScore = cosineSimilarity(conversationEmbedding, contact.bio_embedding);
        // Normalize to 0-1 range (cosine similarity is already -1 to 1, but typically 0-1 for similar vectors)
        matchDetails.embeddingScore = Math.max(0, Math.min(1, matchDetails.embeddingScore));
      }
      
      // 1. SEMANTIC SIMILARITY (10-20% weight) - Keyword matching fallback
      // Extract keywords from contact bio/title/investor_notes and match against conversation
      const contactText = [
        contact.bio || '',
        contact.title || '',
        contact.investor_notes || '',
        contact.company || ''
      ].join(' ').toLowerCase();
      
      // Check for sector keyword matches in contact text
      let keywordMatches = 0;
      const allSearchTerms = [...sectors, ...stages, ...conversationTags];
      for (const term of allSearchTerms) {
        if (contactText.includes(term.toLowerCase())) {
          keywordMatches++;
        }
      }
      matchDetails.semanticScore = allSearchTerms.length > 0 
        ? Math.min(keywordMatches / Math.max(allSearchTerms.length, 1), 1)
        : 0;
      
      // 2. TAG OVERLAP (20% weight) - Jaccard similarity
      matchDetails.tagOverlapScore = jaccardSimilarity(conversationTags, contactTags);
      if (matchDetails.tagOverlapScore > 0.1) {
        const matchedTags = conversationTags.filter(t => 
          contactTags.some(ct => ct.toLowerCase().includes(t.toLowerCase()))
        );
        if (matchedTags.length > 0) {
          reasons.push(`Matches: ${matchedTags.slice(0, 3).join(', ')}`);
        }
      }
      
      // 3. ROLE MATCH (10% weight) - Check if contact's role fits needs
      matchDetails.roleMatchScore = roleMatchScore(contact.title, hiringRoles);
      
      // Also check if contact type matches investor types needed
      if (investorTypes.length > 0 && contact.contact_type) {
        for (const iType of investorTypes) {
          const iTypeLower = iType.toLowerCase();
          for (const cType of contact.contact_type) {
            if (cType.toLowerCase().includes(iTypeLower) || iTypeLower.includes(cType.toLowerCase())) {
              matchDetails.roleMatchScore = Math.max(matchDetails.roleMatchScore, 0.8);
              reasons.push(`${cType} investor`);
              break;
            }
          }
        }
      }
      
      // 4. GEO MATCH (10% weight)
      if (geos.length > 0 && contact.location) {
        for (const geo of geos) {
          if (matchesAny(geo, [contact.location])) {
            matchDetails.geoMatchScore = 1;
            reasons.push(`Location: ${contact.location}`);
            break;
          }
        }
      }
      
      // 5. RELATIONSHIP STRENGTH (10% weight) - Normalized 0-1
      const relStrength = contact.relationship_strength ?? 50;
      matchDetails.relationshipScore = relStrength / 100;
      
      // NAME MATCH - Major boost for explicit mentions
      const namesToCheck: string[] = [];
      if (contact.name) namesToCheck.push(contact.name);
      if (contact.first_name && contact.last_name) {
        namesToCheck.push(`${contact.first_name} ${contact.last_name}`);
      }
      
      if (personNames.length > 0 && namesToCheck.length > 0) {
        for (const personName of personNames) {
          for (const contactNameToCheck of namesToCheck) {
            const nameResult = fuzzyNameMatch(personName, contactNameToCheck);
            if (nameResult.match && nameResult.score > matchDetails.nameMatchScore) {
              matchDetails.nameMatch = true;
              matchDetails.nameMatchScore = nameResult.score;
              matchDetails.nameMatchType = nameResult.type;
              console.log(`  Name match found: "${personName}" ~ "${contactNameToCheck}" (${nameResult.type}, ${Math.round(nameResult.score * 100)}%)`);
            }
          }
        }
      }
      
      // CALCULATE WEIGHTED SCORE (0-1 range)
      let rawScore = hasEmbeddings
        ? WEIGHTS.embedding * matchDetails.embeddingScore +
          WEIGHTS.semantic * matchDetails.semanticScore +
          WEIGHTS.tagOverlap * matchDetails.tagOverlapScore +
          WEIGHTS.roleMatch * matchDetails.roleMatchScore +
          WEIGHTS.geoMatch * matchDetails.geoMatchScore +
          WEIGHTS.relationship * matchDetails.relationshipScore
        : WEIGHTS.semantic * matchDetails.semanticScore +
          WEIGHTS.tagOverlap * matchDetails.tagOverlapScore +
          WEIGHTS.roleMatch * matchDetails.roleMatchScore +
          WEIGHTS.geoMatch * matchDetails.geoMatchScore +
          WEIGHTS.relationship * matchDetails.relationshipScore;
      
      // NAME MATCH BOOST - Add 0.3 to raw score for name mentions
      if (matchDetails.nameMatch) {
        rawScore += 0.3 * matchDetails.nameMatchScore;
        if (matchDetails.nameMatchScore >= 0.95) {
          reasons.unshift(`Name mentioned: "${contact.name}"`);
        } else {
          reasons.unshift(`Similar name: "${contact.name}" (${Math.round(matchDetails.nameMatchScore * 100)}%)`);
        }
      }
      
      // Clamp raw score to 0-1
      rawScore = Math.min(Math.max(rawScore, 0), 1);
      
      // MAP TO 3-STAR RATING
      // Lowered thresholds: 0.05 = 1 star, 0.20 = 2 stars, 0.40 = 3 stars
      let starScore = 0;
      if (rawScore >= 0.40) {
        starScore = 3;
      } else if (rawScore >= 0.20) {
        starScore = 2;
      } else if (rawScore >= 0.05) {
        starScore = 1;
      }
      
      // Only include if score >= 1 star
      if (starScore >= 1) {
        const justification = reasons.length > 0 
          ? `${contact.name}: ${reasons.join('; ')}`
          : `${contact.name} is a potential match.`;
        
        // Calculate confidence scores for transparency
        const confidenceScores = calculateConfidenceScores(
          matchDetails,
          contact,
          conversationTags,
          allSearchTerms
        );
        
        // Build score breakdown for UI display
        const scoreBreakdown: any = {
          semantic: matchDetails.semanticScore,
          tagOverlap: matchDetails.tagOverlapScore,
          roleMatch: matchDetails.roleMatchScore,
          geoMatch: matchDetails.geoMatchScore,
          relationship: matchDetails.relationshipScore,
        };
        
        if (hasEmbeddings) {
          scoreBreakdown.embedding = matchDetails.embeddingScore;
        }
        
        if (matchDetails.nameMatch) {
          scoreBreakdown.nameMatch = matchDetails.nameMatchScore;
        }
        
        matches.push({
          contact_id: contact.id,
          contact_name: contact.name,
          score: starScore,
          rawScore,
          reasons,
          justification,
          matchDetails,
          scoreBreakdown,
          confidenceScores,
          contactInfo: {
            title: contact.title,
            company: contact.company,
            bio: contact.bio,
          },
        });
        
        console.log(`MATCH: ${contact.name} (${starScore}★, raw: ${rawScore.toFixed(3)}, conf: ${confidenceScores.overall.toFixed(2)})`);
      }
    }
    
    monitor.end('scoring-contacts');
    
    // Sort by star score (highest first), then by raw score for finer ranking
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.rawScore - a.rawScore;
    });
    
    // Take top 20 matches
    const topMatches = matches.slice(0, 20);
    
    console.log('=== MATCHING COMPLETE ===');
    console.log('Total matches found:', matches.length);
    console.log('Returning top:', topMatches.length);
    topMatches.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.contact_name} (score: ${m.score}, name: ${m.matchDetails.nameMatch ? 'YES' : 'NO'})`);
    });
    
    if (topMatches.length === 0) {
      console.log('NO MATCHES met minimum score threshold');
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate AI explanations for top 5 matches (3-star and 2-star only)
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      monitor.start('ai-explanations');
      const openai = new OpenAI({ apiKey: openaiKey });
      const matchesToExplain = topMatches.filter(m => m.score >= 2).slice(0, 5);
      
      console.log('=== GENERATING AI EXPLANATIONS ===');
      console.log('Generating explanations for:', matchesToExplain.length, 'matches');
      
      // Get transcript summary for context
      const { data: segments } = await supabaseService
        .from('conversation_segments')
        .select('text')
        .eq('conversation_id', conversationId)
        .order('timestamp_ms', { ascending: true })
        .limit(20);
      
      const transcriptSummary = segments?.map(s => s.text).join(' ').slice(0, 1000) || '';
      
      for (const match of matchesToExplain) {
        try {
          const prompt = `You are an expert connector who helps facilitate warm introductions between professionals. 

Given this conversation context and a potential connection, write a brief, compelling 1-2 sentence explanation of why this introduction would be valuable for both parties.

CONVERSATION CONTEXT:
${transcriptSummary ? `Recent discussion: "${transcriptSummary.slice(0, 500)}..."` : 'General business meeting'}
Topics discussed: ${conversationTags.slice(0, 10).join(', ') || 'various business topics'}
${conversationContext?.goals_and_needs?.fundraising ? `Fundraising: Looking for ${conversationContext.goals_and_needs.fundraising.investor_types?.join(', ') || 'investors'}` : ''}
${hiringRoles.length > 0 ? `Hiring: Looking for ${hiringRoles.join(', ')}` : ''}

POTENTIAL CONNECTION:
Name: ${match.contact_name}
${match.contactInfo?.title ? `Role: ${match.contactInfo.title}` : ''}
${match.contactInfo?.company ? `Company: ${match.contactInfo.company}` : ''}
${match.contactInfo?.bio ? `About: ${match.contactInfo.bio.slice(0, 200)}` : ''}
Match reasons: ${match.reasons.join(', ')}

Write a warm, professional explanation (1-2 sentences) of why connecting these parties would be mutually beneficial. Focus on specific value, not generic statements. Do not use phrases like "perfect fit" or "ideal match".`;

          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
            temperature: 0.7,
          });
          
          match.ai_explanation = response.choices[0]?.message?.content?.trim() || null;
          console.log(`AI explanation for ${match.contact_name}:`, match.ai_explanation?.slice(0, 50) + '...');
        } catch (aiError) {
          console.error(`Failed to generate AI explanation for ${match.contact_name}:`, aiError);
        }
      }
      monitor.end('ai-explanations');
    }
    
    // Upsert matches to database
    monitor.start('database-upsert', { matchCount: topMatches.length });
    const insertedMatches: any[] = [];
    for (const match of topMatches) {
      const upsertData: any = {
        conversation_id: conversationId,
        contact_id: match.contact_id,
        score: match.score,
        reasons: match.reasons,
        justification: match.justification,
        status: 'pending',
        score_breakdown: match.scoreBreakdown || {},
        match_version: 'v1.1-transparency',
      };
      
      // Add AI explanation if available
      if (match.ai_explanation) {
        upsertData.ai_explanation = match.ai_explanation;
      }
      
      const { data, error } = await supabaseService
        .from('match_suggestions')
        .upsert(upsertData, { 
          onConflict: 'conversation_id,contact_id',
          ignoreDuplicates: false 
        })
        .select(`
          id, conversation_id, contact_id, score, reasons, justification, ai_explanation, status, created_at,
          score_breakdown, match_version,
          contacts:contact_id ( name )
        `)
        .single();
      
      if (!error && data) {
        insertedMatches.push(data);
      } else if (error) {
        console.error('Error upserting match:', error);
      }
    }
    
    monitor.end('database-upsert');
    
    console.log('=== DATABASE UPSERT ===');
    console.log('Matches saved:', insertedMatches.length);
    
    const matchesWithNames = insertedMatches.map((m: any) => ({
      ...m,
      contact_name: m.contacts?.name ?? null
    }));
    
    monitor.end('total', true);
    monitor.logSummary();
    
    console.log('=== GENERATE MATCHES END ===');
    
    return new Response(
      JSON.stringify({ 
        matches: matchesWithNames,
        performance: monitor.getSummary()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    monitor.end('total', false, error.message || String(error));
    monitor.logSummary();
    
    console.error('=== GENERATE MATCHES ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
