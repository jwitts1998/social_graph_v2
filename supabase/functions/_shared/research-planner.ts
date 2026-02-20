/**
 * Research Planner
 *
 * AI-powered research strategy that determines which search queries to run,
 * which URLs to prioritize, and what gaps remain after each iteration.
 * Uses GPT-4o-mini to plan and adapt the research strategy.
 */

export interface ContactSeed {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  isInvestor?: boolean;
  bio?: string | null;
  education?: any[];
  personalInterests?: string[];
  expertiseAreas?: string[];
  portfolioCompanies?: string[];
}

export interface ResearchPlan {
  queries: string[];
  priorityUrls: string[];
  focusFields: string[];
  strategy: string;
}

export interface ProfileGaps {
  missingFields: string[];
  weakFields: string[];
  completenessEstimate: number;
}

// Fields we track for completeness
const ALL_FIELDS = [
  'title', 'bio', 'company', 'location', 'linkedin_url', 'email',
  'education', 'career_history', 'expertise_areas', 'personal_interests',
  'portfolio_companies', 'company_url',
] as const;

const INVESTOR_FIELDS = ['portfolio_companies', 'check_size', 'thesis'] as const;

/**
 * Analyze what data is missing or weak for a contact profile.
 */
export function analyzeGaps(contact: ContactSeed): ProfileGaps {
  const missing: string[] = [];
  const weak: string[] = [];

  if (!contact.title) missing.push('title');
  else if (contact.title.length < 5) weak.push('title');

  if (!contact.bio) missing.push('bio');
  else if (contact.bio.length < 50) weak.push('bio');

  if (!contact.company) missing.push('company');
  if (!contact.location) missing.push('location');
  if (!contact.linkedinUrl) missing.push('linkedin_url');
  if (!contact.email) missing.push('email');

  if (!contact.education || contact.education.length === 0) missing.push('education');
  if (!contact.expertiseAreas || contact.expertiseAreas.length === 0) missing.push('expertise_areas');
  if (!contact.personalInterests || contact.personalInterests.length === 0) missing.push('personal_interests');

  if (contact.isInvestor) {
    if (!contact.portfolioCompanies || contact.portfolioCompanies.length === 0) {
      missing.push('portfolio_companies');
    }
  }

  const totalFields = contact.isInvestor
    ? ALL_FIELDS.length + INVESTOR_FIELDS.length
    : ALL_FIELDS.length;
  const filledCount = totalFields - missing.length - weak.length;
  const completenessEstimate = Math.round((filledCount / totalFields) * 100);

  return { missingFields: missing, weakFields: weak, completenessEstimate };
}

/**
 * Generate the initial research plan based on known contact data and gaps.
 * This is a deterministic planner (no AI call) for the first iteration.
 */
export function planInitialResearch(contact: ContactSeed): ResearchPlan {
  const gaps = analyzeGaps(contact);
  const queries: string[] = [];
  const priorityUrls: string[] = [];
  const focusFields = [...gaps.missingFields, ...gaps.weakFields];

  const nameQuery = contact.company
    ? `"${contact.name}" "${contact.company}"`
    : `"${contact.name}"`;

  // Core identity query -- LinkedIn is almost always the best single source
  queries.push(`${nameQuery} LinkedIn`);

  // Bio / career query
  if (focusFields.includes('bio') || focusFields.includes('career_history')) {
    queries.push(`${nameQuery} biography OR about OR profile`);
  }

  // Investor-specific queries
  if (contact.isInvestor) {
    queries.push(`${nameQuery} Crunchbase investor portfolio`);
    queries.push(`${nameQuery} investment thesis OR fund`);
  }

  // Education query
  if (focusFields.includes('education')) {
    queries.push(`${nameQuery} education OR university OR alumni`);
  }

  // Content / expertise query
  if (focusFields.includes('expertise_areas') || focusFields.includes('personal_interests')) {
    queries.push(`${nameQuery} speaker OR podcast OR blog OR interview`);
  }

  // Company query (to find company_url, title confirmation)
  if (contact.company && (focusFields.includes('title') || focusFields.includes('company_url'))) {
    queries.push(`"${contact.company}" team OR leadership ${contact.name}`);
  }

  // Known LinkedIn URL goes to priority
  if (contact.linkedinUrl) {
    priorityUrls.push(contact.linkedinUrl);
  }

  const strategy = contact.isInvestor
    ? 'investor-deep: LinkedIn + Crunchbase + portfolio analysis + thesis extraction'
    : 'professional-deep: LinkedIn + company page + content/speaking + education';

  return { queries, priorityUrls, focusFields, strategy };
}

/**
 * Plan follow-up research using AI, based on what was found so far and what's still missing.
 */
export async function planFollowUpResearch(
  openaiApiKey: string,
  contact: ContactSeed,
  currentProfile: Record<string, any>,
  previousFindings: Array<{ url: string; summary: string }>,
): Promise<ResearchPlan> {
  const gaps = analyzeGaps({
    ...contact,
    title: currentProfile.title || contact.title,
    bio: currentProfile.bio || contact.bio,
    company: currentProfile.company || contact.company,
    location: currentProfile.location || contact.location,
    linkedinUrl: currentProfile.linkedin_url || contact.linkedinUrl,
    email: currentProfile.email || contact.email,
    education: currentProfile.education || contact.education,
    expertiseAreas: currentProfile.expertise_areas || contact.expertiseAreas,
    personalInterests: currentProfile.personal_interests || contact.personalInterests,
    portfolioCompanies: currentProfile.portfolio_companies || contact.portfolioCompanies,
  });

  if (gaps.missingFields.length === 0 && gaps.weakFields.length === 0) {
    return { queries: [], priorityUrls: [], focusFields: [], strategy: 'complete' };
  }

  const prompt = `You are a research strategist planning follow-up web searches to fill gaps in a person's profile.

PERSON: ${contact.name}${contact.company ? ` at ${contact.company}` : ''}${contact.title ? `, ${contact.title}` : ''}

MISSING FIELDS: ${gaps.missingFields.join(', ') || 'none'}
WEAK FIELDS: ${gaps.weakFields.join(', ') || 'none'}

PAGES ALREADY VISITED:
${previousFindings.map(f => `- ${f.url}: ${f.summary}`).join('\n')}

Generate 2-4 NEW search queries that would help fill the missing/weak fields. Focus on queries that are DIFFERENT from what we already searched. Think about:
- Alternative sources (personal blogs, conference talks, press releases, university pages)
- Social media profiles (Twitter/X, GitHub, Medium, Substack)
- Company pages (team/about/leadership sections)
- Industry publications or interviews

Also suggest any specific URLs from the previous findings that should be followed (linked pages worth visiting).

Return JSON:
{
  "queries": ["query 1", "query 2"],
  "priorityUrls": ["https://..."],
  "reasoning": "brief explanation of strategy"
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
          { role: 'system', content: 'You are a research strategist. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('[Planner] OpenAI error:', response.status);
      return { queries: [], priorityUrls: [], focusFields: gaps.missingFields, strategy: 'fallback' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { queries: [], priorityUrls: [], focusFields: gaps.missingFields, strategy: 'fallback' };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { queries: [], priorityUrls: [], focusFields: gaps.missingFields, strategy: 'fallback' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      queries: Array.isArray(parsed.queries) ? parsed.queries : [],
      priorityUrls: Array.isArray(parsed.priorityUrls) ? parsed.priorityUrls : [],
      focusFields: gaps.missingFields,
      strategy: parsed.reasoning || 'ai-planned',
    };
  } catch (error) {
    console.error('[Planner] Follow-up planning error:', error);
    return { queries: [], priorityUrls: [], focusFields: gaps.missingFields, strategy: 'fallback' };
  }
}

/**
 * Deduplicate and rank URLs from search results.
 * Prioritizes LinkedIn, company pages, and known high-quality sources.
 */
export function rankUrls(
  searchResults: Array<{ link: string; title?: string; snippet?: string }>,
  priorityUrls: string[],
  visitedUrls: Set<string>,
): string[] {
  const scored: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();

  for (const url of priorityUrls) {
    if (!visitedUrls.has(url) && !seen.has(url)) {
      scored.push({ url, score: 100 });
      seen.add(url);
    }
  }

  for (const result of searchResults) {
    const url = result.link;
    if (visitedUrls.has(url) || seen.has(url)) continue;
    seen.add(url);

    let score = 10;
    const hostname = safeHostname(url);

    if (hostname.includes('linkedin.com')) score += 40;
    else if (hostname.includes('crunchbase.com')) score += 35;
    else if (hostname.includes('github.com')) score += 20;
    else if (hostname.includes('twitter.com') || hostname.includes('x.com')) score += 15;
    else if (hostname.includes('medium.com') || hostname.includes('substack.com')) score += 15;
    else if (hostname.includes('techcrunch.com') || hostname.includes('forbes.com')) score += 15;
    else if (hostname.includes('bloomberg.com')) score += 15;

    // Boost results that mention the target in the title
    if (result.title && result.snippet) {
      const combinedLen = result.title.length + result.snippet.length;
      if (combinedLen > 200) score += 5;
    }

    scored.push({ url, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.url);
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}
