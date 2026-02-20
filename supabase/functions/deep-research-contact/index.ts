import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateCompletenessScore } from '../_shared/data-quality.ts';
import { runWaterfallEnrichment } from '../_shared/enrichment-waterfall.ts';
import type { WaterfallResult } from '../_shared/enrichment-waterfall.ts';
import { validateLinkedInUrl } from '../_shared/enrichment-validation.ts';
import { scrapePage, scrapePages } from '../_shared/page-scraper.ts';
import type { ScrapedPage, ScraperOptions } from '../_shared/page-scraper.ts';
import {
  planInitialResearch,
  planFollowUpResearch,
  analyzeGaps,
  rankUrls,
} from '../_shared/research-planner.ts';
import type { ContactSeed, ResearchPlan } from '../_shared/research-planner.ts';
import { extractFromPage } from '../_shared/page-extractor.ts';
import type { PageExtraction } from '../_shared/page-extractor.ts';
import {
  synthesizeProfile,
  mergeIntoProfile,
  isProfileComplete,
} from '../_shared/profile-synthesizer.ts';
import type { SynthesizedProfile } from '../_shared/profile-synthesizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Contact type detection (reused from research-contact)
// ---------------------------------------------------------------------------

const CONTACT_TYPE_PATTERNS: Record<string, RegExp[]> = {
  'GP': [
    /\bgeneral partner\b/i, /\bmanaging partner\b/i, /\bventure partner\b/i,
    /\bpartner at .*(capital|ventures|partners|vc)\b/i, /\b(vc|venture capital)\s*(partner|gp)\b/i,
  ],
  'LP': [
    /\blimited partner\b/i, /\blp\b.*\b(fund|investor|allocation)\b/i,
    /\binstitutional investor\b/i, /\bendowment\b/i, /\bpension fund\b/i,
  ],
  'Angel': [
    /\bangel investor\b/i, /\bangel\b.*\binvest/i, /\bindividual investor\b/i, /\bsuper angel\b/i,
  ],
  'Family Office': [
    /\bfamily office\b/i, /\bsingle family office\b/i, /\bmulti.?family office\b/i, /\bprivate wealth\b/i,
  ],
  'Startup': [
    /\bfounder\b/i, /\bco-?founder\b/i, /\bceo\b.*\b(startup|early.?stage)\b/i,
    /\bstartup founder\b/i, /\bentrepreneur\b/i,
  ],
  'PE': [
    /\bprivate equity\b/i, /\bpe fund\b/i, /\bgrowth equity\b/i, /\bbuyout\b/i, /\bturnaround\b/i,
  ],
};

function detectContactTypes(title: string | null, bio: string | null, existing: string[] | null): string[] {
  const text = `${title || ''} ${bio || ''}`.toLowerCase();
  const types = new Set<string>(existing || []);
  for (const [type, patterns] of Object.entries(CONTACT_TYPE_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(text)) { types.add(type); break; }
    }
  }
  return Array.from(types);
}

// ---------------------------------------------------------------------------
// Serper search
// ---------------------------------------------------------------------------

async function searchGoogle(query: string, serperApiKey: string): Promise<any[]> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!response.ok) {
      console.error('[Search] Serper error:', response.status);
      return [];
    }
    const data = await response.json();
    return data.organic || [];
  } catch (error) {
    console.error('[Search] Error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Budget tracking
// ---------------------------------------------------------------------------

interface CrawlBudget {
  maxPages: number;
  maxIterations: number;
  pagesScraped: number;
  extractionCalls: number;
  searchCalls: number;
}

function budgetExhausted(budget: CrawlBudget): boolean {
  return budget.pagesScraped >= budget.maxPages;
}

// ---------------------------------------------------------------------------
// Core agentic research loop
// ---------------------------------------------------------------------------

interface DeepResearchResult {
  profile: SynthesizedProfile;
  waterfallResult: WaterfallResult | null;
  budget: CrawlBudget;
  iterations: number;
  pagesVisited: string[];
}

async function deepResearch(
  contact: any,
  openaiApiKey: string,
  serperApiKey: string | null,
  scraperOptions: ScraperOptions,
  isInvestor: boolean,
): Promise<DeepResearchResult> {
  const budget: CrawlBudget = {
    maxPages: 12,
    maxIterations: 3,
    pagesScraped: 0,
    extractionCalls: 0,
    searchCalls: 0,
  };

  const visitedUrls = new Set<string>();
  const allExtractions: PageExtraction[] = [];
  let currentProfile: SynthesizedProfile | null = null;

  // Build contact seed for the planner
  const contactSeed: ContactSeed = {
    name: contact.name,
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    company: contact.company,
    title: contact.title,
    location: contact.location,
    linkedinUrl: contact.linkedin_url,
    isInvestor,
    bio: contact.bio,
    education: contact.education,
    personalInterests: contact.personal_interests,
    expertiseAreas: contact.expertise_areas,
    portfolioCompanies: contact.portfolio_companies,
  };

  // Step 1: Try structured providers first (PDL -> Apollo waterfall)
  let waterfallResult: WaterfallResult | null = null;
  const pdlApiKey = Deno.env.get('PDL_API_KEY');
  const apolloApiKey = Deno.env.get('APOLLO_API_KEY');

  if (pdlApiKey || apolloApiKey) {
    console.log('[DeepResearch] Step 1: Trying waterfall enrichment (PDL -> Apollo)');
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
      apolloApiKey,
    );
    if (waterfallResult.data) {
      console.log('[DeepResearch] Waterfall found data from:', waterfallResult.source,
        'sufficient:', waterfallResult.isSufficientlyComplete);
      // Update contactSeed with waterfall findings for better search planning
      if (waterfallResult.data.linkedinUrl && !contactSeed.linkedinUrl) {
        contactSeed.linkedinUrl = waterfallResult.data.linkedinUrl;
      }
      if (waterfallResult.data.company && !contactSeed.company) {
        contactSeed.company = waterfallResult.data.company;
      }
      if (waterfallResult.data.title && !contactSeed.title) {
        contactSeed.title = waterfallResult.data.title;
      }
    }
  }

  // Step 2: If no Serper key, return waterfall-only results
  if (!serperApiKey) {
    console.log('[DeepResearch] No Serper key — skipping web crawl');
    return {
      profile: synthesizeProfile([], isInvestor),
      waterfallResult,
      budget,
      iterations: 0,
      pagesVisited: [],
    };
  }

  // Step 3: Plan initial research strategy
  console.log('[DeepResearch] Step 2: Planning initial research strategy');
  let plan = planInitialResearch(contactSeed);
  console.log('[DeepResearch] Strategy:', plan.strategy);
  console.log('[DeepResearch] Queries:', plan.queries.length, '| Priority URLs:', plan.priorityUrls.length);

  // Step 4: Agentic research loop
  let iteration = 0;
  for (; iteration < budget.maxIterations; iteration++) {
    console.log(`[DeepResearch] === Iteration ${iteration + 1}/${budget.maxIterations} ===`);

    if (budgetExhausted(budget)) {
      console.log('[DeepResearch] Budget exhausted, stopping');
      break;
    }

    // 4a: Execute search queries
    const allSearchResults: any[] = [];
    for (const query of plan.queries) {
      if (budget.searchCalls >= 8) break;
      console.log(`[DeepResearch] Searching: "${query}"`);
      const results = await searchGoogle(query, serperApiKey);
      allSearchResults.push(...results);
      budget.searchCalls++;
    }

    // 4b: Rank and select URLs to scrape
    const rankedUrls = rankUrls(allSearchResults, plan.priorityUrls, visitedUrls);
    const urlsToScrape = rankedUrls.slice(0, budget.maxPages - budget.pagesScraped);

    if (urlsToScrape.length === 0) {
      console.log('[DeepResearch] No new URLs to scrape');
      break;
    }

    console.log(`[DeepResearch] Scraping ${urlsToScrape.length} pages...`);

    // 4c: Scrape pages in parallel (batches of 3)
    const scrapedPages: ScrapedPage[] = [];
    for (let i = 0; i < urlsToScrape.length; i += 3) {
      if (budgetExhausted(budget)) break;
      const batch = urlsToScrape.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(url => scrapePage(url, scraperOptions)),
      );
      for (let j = 0; j < results.length; j++) {
        visitedUrls.add(batch[j]);
        budget.pagesScraped++;
        if (results[j]) {
          scrapedPages.push(results[j]!);
          console.log(`[DeepResearch] Scraped: ${batch[j]} (${results[j]!.scraper}, ${results[j]!.contentLength} chars)`);
        } else {
          console.log(`[DeepResearch] Failed to scrape: ${batch[j]}`);
        }
      }
    }

    if (scrapedPages.length === 0) {
      console.log('[DeepResearch] No pages scraped in this iteration');
      continue;
    }

    // 4d: Extract structured data from each page (parallel batches of 3)
    const iterationExtractions: PageExtraction[] = [];
    for (let i = 0; i < scrapedPages.length; i += 3) {
      const batch = scrapedPages.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(page =>
          extractFromPage(openaiApiKey, page.content, page.url, {
            name: contactSeed.name,
            company: contactSeed.company,
            title: contactSeed.title,
            location: contactSeed.location,
            linkedinUrl: contactSeed.linkedinUrl,
            isInvestor,
            focusFields: plan.focusFields,
          }),
        ),
      );
      iterationExtractions.push(...results);
      budget.extractionCalls += batch.length;
    }

    // Log extraction results
    for (const ext of iterationExtractions) {
      console.log(`[DeepResearch] Extracted from ${ext.url}: relevance=${ext.relevanceScore}, summary="${ext.summary.slice(0, 80)}"`);
    }

    allExtractions.push(...iterationExtractions);

    // 4e: Synthesize profile from all extractions so far
    if (currentProfile) {
      currentProfile = mergeIntoProfile(currentProfile, iterationExtractions, isInvestor);
    } else {
      currentProfile = synthesizeProfile(allExtractions, isInvestor);
    }

    console.log(`[DeepResearch] Profile completeness: ${currentProfile.completenessScore}%, pages used: ${currentProfile.pagesUsed}`);

    // 4f: Check if profile is complete enough
    if (isProfileComplete(currentProfile.fields)) {
      console.log('[DeepResearch] Profile is sufficiently complete');
      break;
    }

    // 4g: Collect follow-up URLs from extractions
    const followUpUrls = iterationExtractions
      .flatMap(e => e.followUpUrls)
      .filter(url => !visitedUrls.has(url));

    // 4h: Plan follow-up research if more iterations remain
    if (iteration < budget.maxIterations - 1 && !budgetExhausted(budget)) {
      console.log('[DeepResearch] Planning follow-up research...');
      const previousFindings = allExtractions
        .filter(e => e.relevanceScore >= 20)
        .map(e => ({ url: e.url, summary: e.summary }));

      plan = await planFollowUpResearch(
        openaiApiKey,
        contactSeed,
        currentProfile.fields as any,
        previousFindings,
      );

      // Add follow-up URLs from page extractions to the plan
      plan.priorityUrls = [...followUpUrls, ...plan.priorityUrls];

      if (plan.queries.length === 0 && plan.priorityUrls.length === 0) {
        console.log('[DeepResearch] No follow-up actions planned, stopping');
        break;
      }

      console.log(`[DeepResearch] Follow-up: ${plan.queries.length} queries, ${plan.priorityUrls.length} priority URLs`);
    }
  }

  const finalProfile = currentProfile || synthesizeProfile(allExtractions, isInvestor);
  console.log(`[DeepResearch] Completed after ${iteration + 1} iterations, ${budget.pagesScraped} pages scraped`);

  return {
    profile: finalProfile,
    waterfallResult,
    budget,
    iterations: iteration + 1,
    pagesVisited: Array.from(visitedUrls),
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== DEEP RESEARCH CONTACT START ===');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { contactId } = await req.json();
    if (!contactId) throw new Error('contactId is required');

    // Ownership check
    const { data: contactCheck, error: checkError } = await supabaseService
      .from('contacts')
      .select('id, name, owned_by_profile')
      .eq('id', contactId)
      .single();

    if (checkError) throw new Error(`Contact query failed: ${checkError.message}`);
    if (!contactCheck) throw new Error('Contact not found');
    if (contactCheck.owned_by_profile !== user.id) {
      throw new Error(`Access denied: contact owned by ${contactCheck.owned_by_profile}, user is ${user.id}`);
    }

    // Fetch full contact
    const { data: contact, error: contactError } = await supabaseService
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) throw new Error('Contact not found');

    if (!contact.name) {
      return new Response(
        JSON.stringify({ success: false, message: 'Contact needs a name to research' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[DeepResearch] Contact:', contact.name, '| Company:', contact.company);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

    const serperApiKey = Deno.env.get('SERPER_API_KEY') || null;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY') || null;

    const investorTypes = ['GP', 'Angel', 'Family Office', 'PE', 'VC'];
    const isInvestor = contact.contact_type?.some((t: string) => investorTypes.includes(t)) ||
      contact.is_investor === true;

    // Run the deep research agentic loop
    const result = await deepResearch(
      contact,
      openaiApiKey,
      serperApiKey,
      { firecrawlApiKey },
      isInvestor,
    );

    // Build database updates
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const verifiedFields = new Set<string>(contact.verified_fields || []);
    const isVerified = (field: string) => verifiedFields.has(field);

    // Apply waterfall data first (structured providers, higher trust)
    if (result.waterfallResult?.data) {
      const wd = result.waterfallResult.data;
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
    }

    // Overlay deep research profile (fills gaps not covered by waterfall, respects verified)
    const profile = result.profile.fields;

    if (profile.title && !updates.title && (!contact.title || contact.title.length < 5) && !isVerified('title')) {
      updates.title = profile.title;
    }
    if (profile.bio && !updates.bio && (!contact.bio || contact.bio.length < 50) && !isVerified('bio')) {
      updates.bio = profile.bio;
    }
    if (profile.company && !updates.company && !contact.company && !isVerified('company')) {
      updates.company = profile.company;
    }
    if (profile.location && !updates.location && !contact.location && !isVerified('location')) {
      updates.location = profile.location;
    }
    if (profile.email && !updates.email && !contact.email && !isVerified('email')) {
      updates.email = profile.email;
    }
    if (profile.phone && !updates.phone && !contact.phone && !isVerified('phone')) {
      updates.phone = profile.phone;
    }

    // LinkedIn URL: validate before applying
    if (profile.linkedin_url && !updates.linkedin_url && !contact.linkedin_url && !isVerified('linkedin_url')) {
      if (validateLinkedInUrl(profile.linkedin_url, contact.name)) {
        updates.linkedin_url = profile.linkedin_url;
      } else {
        console.log('[DeepResearch] LinkedIn URL failed name validation, discarding');
      }
    }

    if (profile.company_url && !updates.company_url && !contact.company_url) {
      const url = profile.company_url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        updates.company_url = url;
      }
    }

    // Enrichment arrays: always apply if we found new data
    if (profile.education.length > 0 && (!contact.education || contact.education.length === 0)) {
      updates.education = profile.education;
    }
    if (profile.career_history.length > 0 && (!contact.career_history || contact.career_history.length === 0)) {
      updates.career_history = profile.career_history;
    }
    if (profile.expertise_areas.length > 0) {
      const existing = contact.expertise_areas || [];
      const merged = [...new Set([...existing, ...profile.expertise_areas])];
      if (merged.length > existing.length) updates.expertise_areas = merged;
    }
    if (profile.personal_interests.length > 0) {
      const existing = contact.personal_interests || [];
      const merged = [...new Set([...existing, ...profile.personal_interests])];
      if (merged.length > existing.length) updates.personal_interests = merged;
    }
    if (profile.portfolio_companies.length > 0) {
      const existing = contact.portfolio_companies || [];
      const merged = [...new Set([...existing, ...profile.portfolio_companies])];
      if (merged.length > existing.length) updates.portfolio_companies = merged;
    }

    // Investor thesis from deep research
    if (isInvestor && profile.thesis_summary && (!contact.investor_notes || contact.investor_notes.length < 50)) {
      const noteParts = [profile.thesis_summary];
      if (profile.sectors.length > 0) noteParts.push(`Sectors: ${profile.sectors.join(', ')}`);
      if (profile.stages.length > 0) noteParts.push(`Stages: ${profile.stages.join(', ')}`);
      if (profile.check_sizes.length > 0) noteParts.push(`Check sizes: ${profile.check_sizes.join(', ')}`);
      if (profile.geographic_focus.length > 0) noteParts.push(`Geographic focus: ${profile.geographic_focus.join(', ')}`);
      updates.investor_notes = noteParts.join('\n');
      updates.thesis_source = 'extracted';
    }

    // Confidence metadata
    if (Object.keys(result.profile.confidence).length > 0) {
      updates.enrichment_confidence = result.profile.confidence;
    }

    // Auto-detect contact types
    const newTitle = updates.title || contact.title;
    const newBio = updates.bio || contact.bio;
    const detectedTypes = detectContactTypes(newTitle, newBio, contact.contact_type);
    if (detectedTypes.length > 0) {
      const existingTypes = contact.contact_type || [];
      if (detectedTypes.some((t: string) => !existingTypes.includes(t))) {
        updates.contact_type = detectedTypes;
        const investorTypesList = ['GP', 'LP', 'Angel', 'Family Office', 'PE'];
        if (detectedTypes.some(t => investorTypesList.includes(t)) && !contact.is_investor) {
          updates.is_investor = true;
        }
      }
    }

    // Enrichment metadata
    let enrichmentSource = result.waterfallResult?.source || 'none';
    if (result.budget.pagesScraped > 0) {
      enrichmentSource = enrichmentSource === 'none' ? 'deep-research' : `${enrichmentSource}+deep-research`;
    }
    if (enrichmentSource !== 'none') {
      updates.last_enriched_at = new Date().toISOString();
      updates.enrichment_source = enrichmentSource;
    }

    // Recalculate completeness
    const contactWithUpdates = { ...contact, ...updates };
    updates.data_completeness_score = calculateCompletenessScore(contactWithUpdates);

    // Apply updates
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
      console.log('[DeepResearch] Contact updated with:', Object.keys(updates).filter(k => k !== 'updated_at'));
    }

    console.log('=== DEEP RESEARCH CONTACT END ===');

    return new Response(
      JSON.stringify({
        success: true,
        updated: hasUpdates,
        fields: Object.keys(updates).filter(k => k !== 'updated_at'),
        bioFound: !!profile.bio,
        thesisFound: !!profile.thesis_summary,
        thesisSource: updates.thesis_source || null,
        detectedTypes: updates.contact_type || null,
        completenessScore: updates.data_completeness_score,
        deepResearch: {
          pagesScraped: result.budget.pagesScraped,
          pagesVisited: result.pagesVisited,
          iterations: result.iterations,
          extractionCalls: result.budget.extractionCalls,
          searchCalls: result.budget.searchCalls,
          profileCompleteness: result.profile.completenessScore,
          sources: result.profile.sources,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('=== DEEP RESEARCH CONTACT ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
