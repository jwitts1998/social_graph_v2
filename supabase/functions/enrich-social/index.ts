import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateCompletenessScore } from '../_shared/data-quality.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web search using Serper API
async function searchGoogle(query: string, serperApiKey: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (!response.ok) {
      console.error('[Social Search] Serper error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.organic || [];
  } catch (error) {
    console.error('[Social Search] Error:', error);
    return null;
  }
}

// Check if PDL/Apollo already have social handles for this contact
async function checkStructuredProviders(contact: any): Promise<{
  twitter?: string;
  github?: string;
  found: boolean;
}> {
  const pdlApiKey = Deno.env.get('PDL_API_KEY');
  if (!pdlApiKey) return { found: false };

  try {
    const url = new URL('https://api.peopledatalabs.com/v5/person/enrich');
    if (contact.linkedin_url) {
      url.searchParams.set('profile', contact.linkedin_url);
    } else if (contact.email) {
      url.searchParams.set('email', contact.email);
    } else if (contact.name && contact.company) {
      url.searchParams.set('name', contact.name);
      url.searchParams.set('company', contact.company);
    } else {
      return { found: false };
    }

    const resp = await fetch(url.toString(), {
      headers: { 'X-API-Key': pdlApiKey },
    });

    if (!resp.ok) return { found: false };
    const data = await resp.json();
    const result: any = { found: false };

    if (data.data?.twitter_url) {
      const handle = data.data.twitter_url.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '@').replace(/\/$/, '');
      result.twitter = handle;
      result.found = true;
    }
    if (data.data?.github_url) {
      result.github = data.data.github_url;
      result.found = true;
    }

    if (result.found) {
      console.log('[Social Enrichment] PDL found social handles');
    }
    return result;
  } catch (error) {
    console.error('[Social Enrichment] PDL social lookup error:', error);
    return { found: false };
  }
}

// Search for social media content with targeted queries
async function searchSocialMedia(name: string, company: string | null, serperApiKey: string) {
  console.log('[Social Enrichment] Searching social media for:', name);
  
  const queries = [
    `"${name}" site:twitter.com OR site:x.com`,
    `"${name}" ${company ? `"${company}"` : ''} site:medium.com OR substack OR speaker conference`,
    `"${name}" ${company ? `"${company}"` : ''} github`,
  ];
  
  const searchResults = await Promise.all(
    queries.map(q => searchGoogle(q, serperApiKey))
  );
  
  const validResults = searchResults.filter(r => r && r.length > 0);
  if (validResults.length === 0) {
    console.log('[Social Enrichment] No social media search results found');
    return null;
  }
  
  let snippetIdx = 0;
  const formattedSnippets: string[] = [];
  for (const results of validResults) {
    for (const r of results.slice(0, 5)) {
      snippetIdx++;
      formattedSnippets.push(
        `[${snippetIdx}] ${r.title}\n    Snippet: ${r.snippet}\n    URL: ${r.link}`
      );
    }
  }

  const searchContext = formattedSnippets.join('\n\n');
  console.log('[Social Enrichment] Found', snippetIdx, 'indexed search results');
  return searchContext;
}

// Extract social insights using GPT
async function extractSocialInsights(
  openaiApiKey: string,
  name: string,
  company: string | null,
  searchContext: string
) {
  console.log('[Social Enrichment] Extracting insights with GPT for:', name);
  
  const prompt = `You are a social media analyst extracting FACTUAL insights from web search results.

TARGET PERSON:
Name: ${name}
${company ? `Company: ${company}` : ''}

SEARCH RESULTS:
${searchContext}

Extract social media insights from the REAL search results above. Only include information explicitly mentioned:

{
  "personal_interests": ["specific hobbies, sports, causes, teams - e.g., 'hiking', 'jazz', 'Boston Celtics', 'climate action'"],
  "content_topics": ["professional topics they post about - e.g., 'AI', 'venture capital', 'climate tech', 'SaaS'"],
  "social_activity_level": "high" | "medium" | "low" | "none",
  "social_tone": "professional" | "casual" | "thought_leader" | "unknown",
  "social_handles": {
    "twitter": "@username or null",
    "instagram": "@username or null"
  }
}

EXTRACTION GUIDELINES:
1. ONLY extract information explicitly stated in search results - don't make up data
2. personal_interests: Look for hobbies, sports teams, causes, personal passions mentioned
3. content_topics: Extract professional topics they frequently post about
4. social_activity_level: Based on presence in results - "high" if many mentions, "low" if few, "none" if no social presence
5. social_tone: Infer from how they're described in results
6. social_handles: Extract Twitter/Instagram handles from URLs in search results
7. If no social media presence found, return empty arrays and "none"/"unknown" for levels
8. Prioritize factual accuracy over completeness

Return ONLY valid JSON, nothing else.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a social media analyst. Extract factual information from web sources. Always return valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Social Enrichment] OpenAI error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[Social Enrichment] No content in OpenAI response');
      return null;
    }
    
    console.log('[Social Enrichment] GPT response:', content.substring(0, 200));
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      console.log('[Social Enrichment] Successfully extracted insights');
      return extracted;
    }
    
    console.error('[Social Enrichment] Could not parse JSON from response');
    return null;
  } catch (error) {
    console.error('[Social Enrichment] GPT extraction error:', error);
    return null;
  }
}

// Update contact with social data
async function updateContactWithSocialData(
  supabaseClient: any,
  contactId: string,
  existingContact: any,
  socialInsights: any
) {
  console.log('[Social Enrichment] Updating contact:', contactId);
  
  // User-verified fields that should never be overwritten
  const verifiedFields = new Set<string>(existingContact.verified_fields || []);
  
  // Merge new interests with existing (avoid duplicates)
  const existingInterests = existingContact.personal_interests || [];
  const newInterests = socialInsights.personal_interests || [];
  const mergedInterests = [...new Set([...existingInterests, ...newInterests])];
  
  // Merge content topics into expertise areas
  const existingExpertise = existingContact.expertise_areas || [];
  const newTopics = socialInsights.content_topics || [];
  const mergedExpertise = [...new Set([...existingExpertise, ...newTopics])];
  
  // Prepare update data
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  if (mergedInterests.length > 0 && !verifiedFields.has('personal_interests')) {
    updates.personal_interests = mergedInterests;
  }
  
  if (mergedExpertise.length > 0 && !verifiedFields.has('expertise_areas')) {
    updates.expertise_areas = mergedExpertise;
  }
  
  // Add social handles if found
  if (socialInsights.social_handles?.twitter && !verifiedFields.has('twitter')) {
    updates.twitter = socialInsights.social_handles.twitter;
  }
  
  // Update enrichment metadata
  const previousSource = existingContact.enrichment_source || '';
  updates.last_enriched_at = new Date().toISOString();
  updates.enrichment_source = previousSource ? `${previousSource}+social` : 'social';
  
  // Recalculate completeness score
  const contactWithUpdates = { ...existingContact, ...updates };
  updates.data_completeness_score = calculateCompletenessScore(contactWithUpdates);
  
  console.log('[Social Enrichment] Updating fields:', Object.keys(updates));
  console.log('[Social Enrichment] New completeness score:', updates.data_completeness_score);
  
  const { error: updateError } = await supabaseClient
    .from('contacts')
    .update(updates)
    .eq('id', contactId);
  
  if (updateError) {
    console.error('[Social Enrichment] Update error:', updateError);
    throw updateError;
  }
  
  return {
    personal_interests: mergedInterests,
    expertise_areas: mergedExpertise,
    social_activity_level: socialInsights.social_activity_level,
    social_tone: socialInsights.social_tone,
    social_handles: socialInsights.social_handles,
    data_completeness_score: updates.data_completeness_score,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== SOCIAL ENRICHMENT START ===');
    
    // Get request body
    const { contactId } = await req.json();
    
    if (!contactId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'contactId is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('[Social Enrichment] Contact ID:', contactId);
    
    // Get API keys
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!serperApiKey) {
      throw new Error('SERPER_API_KEY not configured');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch contact data
    const { data: contact, error: fetchError } = await supabaseClient
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    
    if (fetchError || !contact) {
      console.error('[Social Enrichment] Contact fetch error:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Contact not found' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('[Social Enrichment] Contact:', contact.name);
    
    // Step 0: Check structured providers for existing social handles
    const structuredHandles = await checkStructuredProviders(contact);
    
    // Step 1: Search for social media content
    const searchContext = await searchSocialMedia(
      contact.name,
      contact.company,
      serperApiKey
    );
    
    if (!searchContext) {
      console.log('[Social Enrichment] No social media presence found');
      return new Response(
        JSON.stringify({
          success: true,
          contactId,
          message: 'No social media presence found',
          enrichedFields: {
            personal_interests: [],
            content_topics: [],
            social_activity_level: 'none',
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Step 2: Extract insights with GPT
    const socialInsights = await extractSocialInsights(
      openaiApiKey,
      contact.name,
      contact.company,
      searchContext
    );
    
    if (!socialInsights) {
      console.error('[Social Enrichment] Failed to extract insights');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to extract social insights',
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Prefer structured provider handles over search-extracted ones
    if (structuredHandles.twitter && !socialInsights.social_handles?.twitter) {
      socialInsights.social_handles = socialInsights.social_handles || {};
      socialInsights.social_handles.twitter = structuredHandles.twitter;
    }
    
    // Step 3: Update contact with social data
    const enrichedFields = await updateContactWithSocialData(
      supabaseClient,
      contactId,
      contact,
      socialInsights
    );
    
    console.log('=== SOCIAL ENRICHMENT END ===');
    
    return new Response(
      JSON.stringify({
        success: true,
        contactId,
        enrichedFields,
        enrichmentSource: 'serper-social',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('[Social Enrichment] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
