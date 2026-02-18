import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateCompletenessScore } from '../_shared/data-quality.ts';
import { runWaterfallEnrichment } from '../_shared/enrichment-waterfall.ts';
import type { WaterfallResult } from '../_shared/enrichment-waterfall.ts';
import { fetchInvestorData, analyzePortfolio } from '../_shared/investor-sources.ts';
import { crossReferenceResults, validateLinkedInUrl } from '../_shared/enrichment-validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contact type detection patterns
const CONTACT_TYPE_PATTERNS: Record<string, RegExp[]> = {
  'GP': [
    /\bgeneral partner\b/i,
    /\bmanaging partner\b/i,
    /\bventure partner\b/i,
    /\bpartner at .*(capital|ventures|partners|vc)\b/i,
    /\b(vc|venture capital)\s*(partner|gp)\b/i,
  ],
  'LP': [
    /\blimited partner\b/i,
    /\blp\b.*\b(fund|investor|allocation)\b/i,
    /\binstitutional investor\b/i,
    /\bendowment\b/i,
    /\bpension fund\b/i,
  ],
  'Angel': [
    /\bangel investor\b/i,
    /\bangel\b.*\binvest/i,
    /\bindividual investor\b/i,
    /\bsuper angel\b/i,
  ],
  'Family Office': [
    /\bfamily office\b/i,
    /\bsingle family office\b/i,
    /\bmulti.?family office\b/i,
    /\bprivate wealth\b/i,
  ],
  'Startup': [
    /\bfounder\b/i,
    /\bco-?founder\b/i,
    /\bceo\b.*\b(startup|early.?stage)\b/i,
    /\bstartup founder\b/i,
    /\bentrepreneur\b/i,
  ],
  'PE': [
    /\bprivate equity\b/i,
    /\bpe fund\b/i,
    /\bgrowth equity\b/i,
    /\bbuyout\b/i,
    /\bturnaround\b/i,
  ],
};

function detectContactTypes(title: string | null, bio: string | null, existingTypes: string[] | null): string[] {
  const combinedText = `${title || ''} ${bio || ''}`.toLowerCase();
  const detectedTypes = new Set<string>(existingTypes || []);
  
  for (const [type, patterns] of Object.entries(CONTACT_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        detectedTypes.add(type);
        break;
      }
    }
  }
  
  return Array.from(detectedTypes);
}

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
      console.error('[Search] Serper error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.organic || [];
  } catch (error) {
    console.error('[Search] Error:', error);
    return null;
  }
}

// --- Extraction result helpers ---

function extractFieldValue(field: any): any {
  if (field === null || field === undefined) return null;
  if (typeof field === 'object' && !Array.isArray(field) && 'value' in field) {
    return field.value;
  }
  return field;
}

function extractFieldConfidence(field: any): string | null {
  if (field && typeof field === 'object' && !Array.isArray(field) && 'confidence' in field) {
    return field.confidence;
  }
  return null;
}

// Normalize GPT response from nested {value, source, confidence} to flat format
function normalizeExtractionResult(parsed: any): any {
  const confidences: Record<string, string> = {};
  const result: any = { found: parsed.found ?? true };

  for (const key of ['title', 'bio', 'company', 'location', 'linkedin_url', 'company_url']) {
    result[key] = extractFieldValue(parsed[key]);
    const conf = extractFieldConfidence(parsed[key]);
    if (conf) confidences[key] = conf;
  }

  for (const key of ['expertise_areas', 'personal_interests', 'portfolio_companies']) {
    const val = extractFieldValue(parsed[key]);
    result[key] = Array.isArray(val) ? val : [];
    const conf = extractFieldConfidence(parsed[key]);
    if (conf) confidences[key] = conf;
  }

  if (Array.isArray(parsed.education)) {
    result.education = parsed.education.map((e: any) => {
      const { source: _s, ...rest } = e;
      return rest;
    });
  } else {
    result.education = [];
  }

  if (Array.isArray(parsed.career_history)) {
    result.career_history = parsed.career_history.map((e: any) => {
      const { source: _s, ...rest } = e;
      return rest;
    });
  } else {
    result.career_history = [];
  }

  result.disambiguation_note = parsed.disambiguation_note || null;
  result._confidences = confidences;

  return result;
}

// --- Bio extraction with per-field citations and disambiguation ---

async function generateBioWithChatAPI(
  openaiApiKey: string,
  serperApiKey: string | null,
  name: string,
  company: string | null,
  title: string | null,
  location: string | null,
  linkedinUrl: string | null,
  isInvestor: boolean
) {
  console.log('[Research] Using Chat API with web search for:', name);

  let searchContext = '';

  if (serperApiKey) {
    console.log('[Research] Performing web searches...');

    const queries = [
      `"${name}" ${company ? `"${company}"` : ''} LinkedIn profile`,
      isInvestor
        ? `"${name}" ${company ? `"${company}"` : ''} Crunchbase investor portfolio`
        : `"${name}" ${company ? `"${company}"` : ''} biography`,
    ];

    const searchResults = await Promise.all(
      queries.map(q => searchGoogle(q, serperApiKey))
    );

    const validResults = searchResults.filter(r => r && r.length > 0);
    if (validResults.length > 0) {
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
      searchContext = '\n\nWEB SEARCH RESULTS:\n' + formattedSnippets.join('\n\n');
      console.log('[Research] Found', snippetIdx, 'indexed search results');
    }
  }

  if (!searchContext) {
    return await generateBasicBio(openaiApiKey, name, company, title);
  }

  // Build disambiguation instructions based on available signals
  let disambiguationBlock = '';
  if (linkedinUrl) {
    disambiguationBlock += `\nDISAMBIGUATION: The target person's LinkedIn URL is ${linkedinUrl}. Prioritize results referencing this URL. Ignore results about other people with the same name.`;
  }
  if (company) {
    disambiguationBlock += `\nDISAMBIGUATION: Only extract from results that mention "${company}" in connection with "${name}". If a result mentions "${name}" at a different company, ignore it unless describing career history.`;
  }
  if (!linkedinUrl && !company) {
    disambiguationBlock += `\nDISAMBIGUATION: Multiple people may share this name. Only extract data if you are confident all selected results refer to the same person. If uncertain, set found to false and include a disambiguation_note explaining the ambiguity.`;
  }
  disambiguationBlock += `\nCONFLICT CHECK: If results disagree on core facts (e.g. different companies or titles for the same name), do not merge conflicting data. Prefer the result that matches the known company/title, or set found to false.`;

  const prompt = `You are a professional researcher extracting FACTUAL information from web search results.

TARGET PERSON:
Name: ${name}
${company ? `Company: ${company}` : ''}
${title ? `Title: ${title}` : ''}
${location ? `Location: ${location}` : ''}
${disambiguationBlock}
${searchContext}

TASK (two steps):

Step 1: Review all search results above. Identify which result numbers (e.g. [1], [3], [5]) are about the target person "${name}"${company ? ` at "${company}"` : ''}. If results disagree on core facts and you cannot determine which is correct, set found to false.

Step 2: Using ONLY the results identified in Step 1, extract the following fields. For each field, include the value, which result(s) support it, and your confidence level.

Return a JSON object with this exact structure:

{
  "relevant_results": [1, 3, 5],
  "title": { "value": "Current job title", "source": "[3]", "confidence": "high" },
  "bio": { "value": "2-3 sentence professional summary", "source": "[1], [3]", "confidence": "medium" },
  "company": { "value": "Company name", "source": "[3]", "confidence": "high" },
  "location": { "value": "City, State or Country", "source": "[1]", "confidence": "medium" },
  "linkedin_url": { "value": "LinkedIn URL extracted from result URLs", "source": "[1]", "confidence": "high" },
  "company_url": { "value": "Company website", "source": "[5]", "confidence": "medium" },
  "education": [
    {"school": "University", "degree": "PhD/MBA/BS", "field": "CS", "year": 2015, "source": "[3]"}
  ],
  "career_history": [
    {"company": "Google", "role": "PM", "years": "2015-2020", "description": "Led growth...", "source": "[1]"}
  ],
  "expertise_areas": { "value": ["specific domains"], "source": "[1], [3]", "confidence": "medium" },
  "personal_interests": { "value": ["hobbies, sports"], "source": "[5]", "confidence": "low" },
  "portfolio_companies": { "value": ["Company1"], "source": "[3]", "confidence": "high" },
  "found": true,
  "disambiguation_note": null
}

CRITICAL RULES:
- If a field CANNOT be determined from the search results, set its value to null (or [] for arrays).
- Do NOT infer, guess, or generate information not explicitly stated in the results. It is far better to return null than incorrect information.
- Confidence levels: "high" = found verbatim in results and corroborated; "medium" = found in one source; "low" = loosely supported; use null value when not found.
- For linkedin_url: extract from the URL field of search results, not from snippet text.
- For education/career_history: only include entries explicitly mentioned in results.

Return valid JSON only.`;

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
            content: 'You are a factual information extractor. Extract ONLY what is explicitly stated in provided search results. Never fabricate, infer, or guess. Return valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Research] Chat API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    console.log('[Research] Chat API response:', content?.substring(0, 200));

    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const normalized = normalizeExtractionResult(parsed);
        normalized._searchContext = searchContext;
        return normalized;
      }
    }
    return null;
  } catch (error) {
    console.error('[Research] Chat API error:', error);
    return null;
  }
}

// Fallback bio generation when no search results are available
async function generateBasicBio(
  openaiApiKey: string,
  name: string,
  company: string | null,
  title: string | null
) {
  const prompt = `Generate a professional bio for this person based on their available information.

Person: ${name}
${company ? `Company: ${company}` : ''}
${title ? `Title: ${title}` : ''}

Create a realistic, professional 2-3 sentence bio based on this information.
Return ONLY a valid JSON object:
{
  "title": "Their job title (use provided or infer from company)",
  "bio": "A 2-3 sentence professional bio",
  "company": "${company || ''}",
  "education": [],
  "career_history": [],
  "expertise_areas": [],
  "personal_interests": [],
  "portfolio_companies": [],
  "found": true
}`;

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
          { role: 'system', content: 'You are a professional researcher. Generate realistic professional bios. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed._confidences = { bio: 'low', title: 'low' };
        parsed._searchContext = null;
        return parsed;
      }
    }
    return null;
  } catch (error) {
    console.error('[Research] Basic bio error:', error);
    return null;
  }
}

// --- Multi-strategy thesis generation (extract > portfolio > minimal) ---

async function generateThesisWithChatAPI(
  openaiApiKey: string,
  name: string,
  company: string | null,
  title: string | null,
  searchContext: string | null,
  portfolioCompanies: string[]
) {
  console.log('[Research] Generating investor thesis for:', name);

  // Strategy 1: Extract thesis from search snippets (factual, temp 0)
  if (searchContext) {
    const extracted = await extractThesisFromSnippets(openaiApiKey, name, company, searchContext);
    if (extracted?.found && extracted.thesis_summary) {
      console.log('[Research] Thesis extracted from search results');
      extracted.thesis_source = 'extracted';
      return extracted;
    }
  }

  // Strategy 2: Derive thesis from known portfolio companies (temp 0)
  if (portfolioCompanies && portfolioCompanies.length >= 2) {
    const derived = await deriveThesisFromPortfolio(openaiApiKey, name, company, portfolioCompanies);
    if (derived?.found && derived.thesis_summary) {
      console.log('[Research] Thesis derived from portfolio of', portfolioCompanies.length, 'companies');
      derived.thesis_source = 'portfolio-inferred';
      return derived;
    }
  }

  // Strategy 3: Minimal factual fallback (no fabricated specifics)
  if (company || title) {
    const roleDesc = title || 'investor';
    const orgDesc = company ? ` at ${company}` : '';
    console.log('[Research] Using minimal thesis fallback');
    return {
      thesis_summary: `${name} is a ${roleDesc}${orgDesc}. Specific investment thesis details not available from public sources.`,
      sectors: [],
      stages: [],
      check_sizes: [],
      geographic_focus: [],
      found: true,
      thesis_source: 'minimal',
    };
  }

  return null;
}

async function extractThesisFromSnippets(
  openaiApiKey: string,
  name: string,
  company: string | null,
  searchContext: string
) {
  const prompt = `Extract investment thesis information for "${name}"${company ? ` at "${company}"` : ''} from these search results.
${searchContext}

Extract ONLY information explicitly stated in the results. Do NOT infer or fabricate.
Return JSON:
{
  "thesis_summary": "2-3 sentence thesis from sources, or null if not found",
  "sectors": ["sectors explicitly mentioned"],
  "stages": ["investment stages explicitly mentioned"],
  "check_sizes": ["check size ranges explicitly mentioned"],
  "geographic_focus": ["geographic areas explicitly mentioned"],
  "found": true
}

If the search results do NOT contain investment thesis, sector focus, stage preference, or portfolio information for this person, set found to false and return empty arrays. Do NOT guess.`;

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
          { role: 'system', content: 'You are a factual information extractor for investment data. Extract only what is explicitly stated. Never fabricate. Return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('[Research] Thesis extraction error:', error);
    return null;
  }
}

async function deriveThesisFromPortfolio(
  openaiApiKey: string,
  name: string,
  company: string | null,
  portfolioCompanies: string[]
) {
  const prompt = `"${name}"${company ? ` at "${company}"` : ''} has invested in these companies: ${portfolioCompanies.join(', ')}.

Based on these KNOWN investments, summarize their likely investment thesis. Only derive patterns clearly supported by the portfolio.

Return JSON:
{
  "thesis_summary": "2-3 sentence thesis derived from portfolio patterns",
  "sectors": ["sectors the portfolio companies operate in"],
  "stages": ["investment stages if determinable"],
  "check_sizes": [],
  "geographic_focus": [],
  "found": true
}

Do NOT fabricate check sizes or geographic focus unless clearly implied. Focus on sector patterns.`;

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
          { role: 'system', content: 'You are an investment analyst. Derive thesis patterns from known portfolio data. Be factual and conservative. Return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('[Research] Portfolio thesis error:', error);
    return null;
  }
}

// --- Main handler ---

Deno.serve(async (req) => {
  console.log('=== FUNCTION INVOKED ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== STARTING RESEARCH ===');
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('Service client configured with SUPABASE_SERVICE_ROLE_KEY');
    
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    console.log('User ID:', user.id);

    const { contactId } = await req.json();
    console.log('=== RESEARCH CONTACT START ===');
    console.log('Contact ID:', contactId);
    
    const { data: contactCheck, error: checkError } = await supabaseService
      .from('contacts')
      .select('id, name, owned_by_profile')
      .eq('id', contactId)
      .single();
    
    console.log('Contact check:', contactCheck);
    console.log('Contact check error:', checkError);
    
    if (checkError) {
      throw new Error(`Contact query failed: ${checkError.message}`);
    }
    
    if (!contactCheck) {
      throw new Error('Contact not found');
    }
    
    if (contactCheck.owned_by_profile !== user.id) {
      throw new Error(`Access denied: contact owned by ${contactCheck.owned_by_profile}, user is ${user.id}`);
    }
    
    const { data: contact, error: contactError } = await supabaseService
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found or access denied');
    }

    console.log('Contact:', contact.name);
    console.log('Company URL:', contact.company_url);
    console.log('Company:', contact.company);
    
    if (!contact.name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Contact needs a name to research' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    if (serperApiKey) {
      console.log('[Research] Serper API available - will use web search');
    } else {
      console.log('[Research] No Serper key - will use basic generation');
    }

    const investorTypes = ['GP', 'Angel', 'Family Office', 'PE', 'VC'];
    const isInvestor = contact.contact_type?.some((t: string) => investorTypes.includes(t)) || 
                       contact.is_investor === true;

    let bioResult: any = null;
    let thesisResult: any = null;
    let enrichmentSource = 'none';
    let waterfallResult: WaterfallResult | null = null;
    
    const needsBioOrTitle = !contact.bio || !contact.title || contact.bio?.length < 50;
    
    if (needsBioOrTitle) {
      // Step 1a: Try structured data providers first (waterfall: PDL → Apollo)
      const pdlApiKey = Deno.env.get('PDL_API_KEY');
      const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
      
      if (pdlApiKey || apolloApiKey) {
        console.log('[Research] Step 1a: Trying waterfall enrichment (PDL → Apollo)');
        waterfallResult = await runWaterfallEnrichment(
          {
            name: contact.name,
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email,
            company: contact.company,
            linkedinUrl: contact.linkedin_url,
            title: contact.title,
            location: contact.location,
            phone: contact.phone,
          },
          pdlApiKey,
          apolloApiKey
        );
        
        if (waterfallResult.data) {
          enrichmentSource = waterfallResult.source;
          console.log('[Research] Waterfall found data from:', waterfallResult.source,
            'sufficient:', waterfallResult.isSufficientlyComplete);
        }
      }
      
      // Step 1b: Fall back to Serper+GPT if waterfall didn't produce sufficient data
      if (!waterfallResult?.isSufficientlyComplete) {
        console.log('[Research] Step 1b: Researching with web search:', contact.name);
        bioResult = await generateBioWithChatAPI(
          openaiApiKey, 
          serperApiKey,
          contact.name, 
          contact.company, 
          contact.title,
          contact.location,
          contact.linkedin_url,
          isInvestor
        );
        console.log('[Research] Bio result:', bioResult ? 'SUCCESS' : 'FAILED');
        
        if (bioResult && !bioResult.found && bioResult.disambiguation_note) {
          console.log('[Research] Disambiguation issue:', bioResult.disambiguation_note);
        }
        
        if (bioResult && enrichmentSource === 'none') {
          enrichmentSource = 'serper';
        } else if (bioResult && enrichmentSource !== 'none') {
          enrichmentSource = enrichmentSource + '+serper';
        }
      }
    } else {
      console.log('[Research] Skipping enrichment - already has bio and title');
    }
    
    // Step 2: Generate investment thesis using grounded multi-strategy approach
    if (isInvestor && (!contact.investor_notes || contact.investor_notes.length < 50)) {
      console.log('[Research] Step 2: Generating thesis for investor:', contact.name);
      
      // 2a: Try structured investor data sources (Crunchbase + OpenVC)
      const crunchbaseApiKey = Deno.env.get('CRUNCHBASE_API_KEY');
      const existingPortfolio = bioResult?.portfolio_companies || contact.portfolio_companies || [];
      
      let investorData = null;
      if (crunchbaseApiKey || contact.company) {
        investorData = await fetchInvestorData(
          contact.name, contact.company, crunchbaseApiKey, existingPortfolio
        );
        
        // If structured sources found portfolio, update the contact's portfolio_companies
        if (investorData.portfolioCompanies.length > existingPortfolio.length) {
          updates.portfolio_companies = investorData.portfolioCompanies.map(co => co.name);
          console.log('[Research] Updated portfolio to', updates.portfolio_companies.length, 'companies');
        }
        
        // If firm profile has check sizes, apply them
        if (investorData.firmProfile?.checkSizeMin && !contact.check_size_min) {
          updates.check_size_min = investorData.firmProfile.checkSizeMin;
        }
        if (investorData.firmProfile?.checkSizeMax && !contact.check_size_max) {
          updates.check_size_max = investorData.firmProfile.checkSizeMax;
        }
      }
      
      // 2b: Build thesis — use structured data if available, then search snippets, then minimal
      let searchContextForThesis = bioResult?._searchContext || null;
      
      if (!searchContextForThesis && serperApiKey) {
        const query = `"${contact.name}" ${contact.company ? `"${contact.company}"` : ''} investor portfolio thesis`;
        const results = await searchGoogle(query, serperApiKey);
        if (results && results.length > 0) {
          let idx = 0;
          searchContextForThesis = '\n\nWEB SEARCH RESULTS:\n' + results.slice(0, 5).map((r: any) => {
            idx++;
            return `[${idx}] ${r.title}\n    Snippet: ${r.snippet}\n    URL: ${r.link}`;
          }).join('\n\n');
        }
      }
      
      // Use structured firm profile for thesis if available
      if (investorData?.firmProfile?.sectors?.length || investorData?.firmProfile?.stages?.length) {
        const fp = investorData.firmProfile!;
        const summaryParts = [];
        if (fp.description) summaryParts.push(fp.description);
        if (fp.sectors?.length) summaryParts.push(`Focus areas: ${fp.sectors.join(', ')}`);
        if (fp.stages?.length) summaryParts.push(`Stages: ${fp.stages.join(', ')}`);
        
        thesisResult = {
          thesis_summary: summaryParts.join('. ') || `${contact.name} invests in ${fp.sectors?.join(', ') || 'various sectors'}`,
          sectors: fp.sectors || [],
          stages: fp.stages || [],
          check_sizes: fp.checkSizeMin && fp.checkSizeMax
            ? [`$${fp.checkSizeMin.toLocaleString()}-${fp.checkSizeMax.toLocaleString()}`] : [],
          geographic_focus: fp.geographicFocus || [],
          found: true,
          thesis_source: 'extracted',
        };
        console.log('[Research] Thesis from structured firm profile (source: extracted)');
      }
      // Else if we have enough portfolio companies, derive thesis from portfolio analysis
      else if (investorData?.portfolioCompanies && investorData.portfolioCompanies.length >= 3) {
        const analysis = analyzePortfolio(investorData.portfolioCompanies);
        const allPortfolio = updates.portfolio_companies || existingPortfolio;
        thesisResult = await generateThesisWithChatAPI(
          openaiApiKey, contact.name, contact.company, contact.title,
          searchContextForThesis, allPortfolio
        );
        // Override with portfolio analysis for sectors/stages if GPT didn't find enough
        if (thesisResult && analysis.sectors.length > 0 && (!thesisResult.sectors || thesisResult.sectors.length === 0)) {
          thesisResult.sectors = analysis.sectors;
          thesisResult.stages = analysis.stages.length > 0 ? analysis.stages : thesisResult.stages;
          thesisResult.thesis_source = 'portfolio-inferred';
        }
      }
      // Standard GPT-based thesis with search context
      else {
        const allPortfolio = updates.portfolio_companies || existingPortfolio;
        thesisResult = await generateThesisWithChatAPI(
          openaiApiKey, contact.name, contact.company, contact.title,
          searchContextForThesis, allPortfolio
        );
      }
      
      console.log('[Research] Thesis result:', thesisResult ? 'SUCCESS' : 'FAILED',
        thesisResult?.thesis_source ? `(source: ${thesisResult.thesis_source})` : '');
    } else if (isInvestor) {
      console.log('[Research] Skipping thesis - already has investor_notes');
    }
    
    // Cross-reference waterfall and GPT results for validation
    if (waterfallResult?.data && bioResult?.found) {
      const validation = crossReferenceResults(waterfallResult.data, bioResult, contact.name);
      if (!validation.isValid) {
        console.log('[Research] Data discrepancies found between sources — preferring waterfall for core fields');
        // For discrepant fields, the waterfall data wins (applied first below)
      }
      if (validation.linkedinUrlValid === false && bioResult.linkedin_url) {
        console.log('[Research] GPT-extracted LinkedIn URL failed name validation, discarding');
        bioResult.linkedin_url = null;
      }
    }
    
    // Validate GPT LinkedIn URL independently if no waterfall
    if (!waterfallResult?.data && bioResult?.linkedin_url && contact.name) {
      if (!validateLinkedInUrl(bioResult.linkedin_url, contact.name)) {
        console.log('[Research] GPT LinkedIn URL slug does not match contact name, discarding');
        bioResult.linkedin_url = null;
      }
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    // Fields the user has manually verified — never overwrite these
    const verifiedFields = new Set<string>(contact.verified_fields || []);
    const isVerified = (field: string) => verifiedFields.has(field);
    
    // Apply waterfall data first (structured providers, higher trust)
    if (waterfallResult?.data) {
      const wd = waterfallResult.data;
      if (wd.title && (!contact.title || contact.title.length < 5) && !isVerified('title')) updates.title = wd.title;
      if (wd.bio && (!contact.bio || contact.bio.length < 50) && !isVerified('bio')) updates.bio = wd.bio;
      if (wd.company && !contact.company && !isVerified('company')) updates.company = wd.company;
      if (wd.location && !contact.location && !isVerified('location')) updates.location = wd.location;
      if (wd.linkedinUrl && !contact.linkedin_url && !isVerified('linkedin_url')) updates.linkedin_url = wd.linkedinUrl;
      if (wd.email && !contact.email && !isVerified('email')) updates.email = wd.email;
      if (wd.phone && !contact.phone && !isVerified('phone')) updates.phone = wd.phone;
      if (wd.firstName && !contact.first_name) updates.first_name = wd.firstName;
      if (wd.lastName && !contact.last_name) updates.last_name = wd.lastName;
      if (wd.twitter && !contact.twitter && !isVerified('twitter')) updates.twitter = wd.twitter;
      if (wd.companyUrl && !contact.company_url) updates.company_url = wd.companyUrl;
      if (wd.companyAddress && !contact.company_address) updates.company_address = wd.companyAddress;
      if (wd.companyEmployees && !contact.company_employees) updates.company_employees = wd.companyEmployees;
      if (wd.companyFounded && !contact.company_founded) updates.company_founded = wd.companyFounded;
      if (wd.companyLinkedin && !contact.company_linkedin) updates.company_linkedin = wd.companyLinkedin;
      if (wd.companyTwitter && !contact.company_twitter) updates.company_twitter = wd.companyTwitter;
      if (wd.companyFacebook && !contact.company_facebook) updates.company_facebook = wd.companyFacebook;
      console.log('[Research] Applied waterfall data fields:', Object.keys(updates).filter(k => k !== 'updated_at'));
    }
    
    // Then overlay GPT extraction results (only fills gaps not covered by waterfall, respects verified)
    if (bioResult?.found) {
      if (bioResult.title && !updates.title && (!contact.title || contact.title.length < 5) && !isVerified('title')) {
        updates.title = bioResult.title;
      }
      if (bioResult.bio && !updates.bio && (!contact.bio || contact.bio.length < 50) && !isVerified('bio')) {
        updates.bio = bioResult.bio;
      }
      if (bioResult.company && !updates.company && !contact.company && !isVerified('company')) {
        updates.company = bioResult.company;
      }
      if (bioResult.location && !updates.location && !contact.location && !isVerified('location')) {
        updates.location = bioResult.location;
      }
      if (bioResult.linkedin_url && !updates.linkedin_url && !contact.linkedin_url && !isVerified('linkedin_url')) {
        updates.linkedin_url = bioResult.linkedin_url;
      }
      
      if (bioResult.company_url && !updates.company_url && !contact.company_url) {
        const url = bioResult.company_url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
          updates.company_url = url;
          console.log('Found company URL:', url);
        }
      }
      
      if (bioResult.education && bioResult.education.length > 0) {
        updates.education = bioResult.education;
        console.log('[Research] Added education:', bioResult.education.length, 'entries');
      }
      if (bioResult.career_history && bioResult.career_history.length > 0) {
        updates.career_history = bioResult.career_history;
        console.log('[Research] Added career history:', bioResult.career_history.length, 'entries');
      }
      if (bioResult.expertise_areas && bioResult.expertise_areas.length > 0) {
        updates.expertise_areas = bioResult.expertise_areas;
        console.log('[Research] Added expertise areas:', bioResult.expertise_areas.length, 'items');
      }
      if (bioResult.personal_interests && bioResult.personal_interests.length > 0) {
        updates.personal_interests = bioResult.personal_interests;
        console.log('[Research] Added personal interests:', bioResult.personal_interests.length, 'items');
      }
      if (bioResult.portfolio_companies && bioResult.portfolio_companies.length > 0) {
        updates.portfolio_companies = bioResult.portfolio_companies;
        console.log('[Research] Added portfolio companies:', bioResult.portfolio_companies.length, 'items');
      }
      
      // Persist confidence metadata
      if (bioResult._confidences && Object.keys(bioResult._confidences).length > 0) {
        updates.enrichment_confidence = bioResult._confidences;
        console.log('[Research] Field confidences:', JSON.stringify(bioResult._confidences));
      }
    }
    
    // Auto-detect contact types from title and bio
    const newTitle = updates.title || contact.title;
    const newBio = updates.bio || contact.bio;
    const detectedTypes = detectContactTypes(newTitle, newBio, contact.contact_type);
    
    if (detectedTypes.length > 0) {
      const existingTypes = contact.contact_type || [];
      const hasNewTypes = detectedTypes.some(t => !existingTypes.includes(t));
      
      if (hasNewTypes) {
        updates.contact_type = detectedTypes;
        console.log('Auto-detected contact types:', detectedTypes);
        
        const investorTypesList = ['GP', 'LP', 'Angel', 'Family Office', 'PE'];
        if (detectedTypes.some(t => investorTypesList.includes(t)) && !contact.is_investor) {
          updates.is_investor = true;
        }
      }
    }
    
    if (thesisResult?.found && thesisResult.thesis_summary) {
      const noteParts = [thesisResult.thesis_summary];
      
      if (thesisResult.sectors?.length > 0) {
        noteParts.push(`Sectors: ${thesisResult.sectors.join(', ')}`);
      }
      if (thesisResult.stages?.length > 0) {
        noteParts.push(`Stages: ${thesisResult.stages.join(', ')}`);
      }
      if (thesisResult.check_sizes?.length > 0) {
        noteParts.push(`Check sizes: ${thesisResult.check_sizes.join(', ')}`);
      }
      if (thesisResult.geographic_focus?.length > 0) {
        noteParts.push(`Geographic focus: ${thesisResult.geographic_focus.join(', ')}`);
      }
      
      const investorNotes = noteParts.join('\n');
      
      const sourceLabel = thesisResult.thesis_source === 'extracted' ? 'Extracted from public sources'
        : thesisResult.thesis_source === 'portfolio-inferred' ? 'Inferred from portfolio analysis'
        : thesisResult.thesis_source === 'minimal' ? 'Limited public information'
        : 'AI Research';
      
      updates.thesis_source = thesisResult.thesis_source || null;
      
      if (!contact.investor_notes || contact.investor_notes.length < 50) {
        updates.investor_notes = investorNotes;
      } else {
        updates.investor_notes = contact.investor_notes + `\n\n--- ${sourceLabel} ---\n` + investorNotes;
      }
    }
    
    // Add enrichment metadata
    if (enrichmentSource !== 'none') {
      updates.last_enriched_at = new Date().toISOString();
      updates.enrichment_source = enrichmentSource;
    }
    
    // Calculate data completeness score
    const contactWithUpdates = { ...contact, ...updates };
    updates.data_completeness_score = calculateCompletenessScore(contactWithUpdates);
    console.log('[Research] Data completeness score:', updates.data_completeness_score);
    
    // Apply updates if we found anything
    const hasUpdates = Object.keys(updates).length > 1;
    
    if (hasUpdates) {
      const { error: updateError } = await supabaseService
        .from('contacts')
        .update(updates)
        .eq('id', contactId);
      
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      console.log('Contact updated with:', Object.keys(updates));
      console.log('Enrichment source:', enrichmentSource);
    }
    
    console.log('=== RESEARCH CONTACT END ===');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        updated: hasUpdates,
        fields: Object.keys(updates).filter(k => k !== 'updated_at'),
        bioFound: bioResult?.found || false,
        thesisFound: thesisResult?.found || false,
        thesisSource: thesisResult?.thesis_source || null,
        companyUrlFound: !!updates.company_url,
        detectedTypes: updates.contact_type || null,
        disambiguationNote: bioResult?.disambiguation_note || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('=== RESEARCH CONTACT ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
