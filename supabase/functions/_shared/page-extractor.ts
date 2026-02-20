/**
 * Page Extractor
 *
 * Per-page structured extraction using GPT-4o-mini on full page content.
 * Unlike the snippet-based approach in research-contact, this processes
 * entire page text (up to ~12K chars) and returns:
 *   - Extracted fields with per-field confidence
 *   - Source provenance (URL + page section)
 *   - Follow-up leads (links or names worth investigating)
 */

export interface ExtractedFields {
  title: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  linkedin_url: string | null;
  company_url: string | null;
  email: string | null;
  phone: string | null;
  education: Array<{ school: string; degree?: string; field?: string; year?: number }>;
  career_history: Array<{ company: string; role: string; years?: string; description?: string }>;
  expertise_areas: string[];
  personal_interests: string[];
  portfolio_companies: string[];
  thesis_summary: string | null;
  sectors: string[];
  stages: string[];
  check_sizes: string[];
  geographic_focus: string[];
}

export interface FieldConfidence {
  [field: string]: 'high' | 'medium' | 'low';
}

export interface PageExtraction {
  url: string;
  fields: ExtractedFields;
  confidence: FieldConfidence;
  followUpUrls: string[];
  summary: string;
  relevanceScore: number;
}

interface ExtractionContext {
  name: string;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  isInvestor?: boolean;
  focusFields?: string[];
}

const EMPTY_FIELDS: ExtractedFields = {
  title: null,
  bio: null,
  company: null,
  location: null,
  linkedin_url: null,
  company_url: null,
  email: null,
  phone: null,
  education: [],
  career_history: [],
  expertise_areas: [],
  personal_interests: [],
  portfolio_companies: [],
  thesis_summary: null,
  sectors: [],
  stages: [],
  check_sizes: [],
  geographic_focus: [],
};

function buildExtractionPrompt(
  pageContent: string,
  pageUrl: string,
  context: ExtractionContext,
): string {
  const disambig = context.linkedinUrl
    ? `The target person's LinkedIn URL is ${context.linkedinUrl}. Only extract data about THIS person.`
    : context.company
      ? `Only extract data about "${context.name}" associated with "${context.company}".`
      : `Be careful about disambiguation — only extract data you are confident refers to "${context.name}".`;

  const investorBlock = context.isInvestor
    ? `
INVESTOR FIELDS (extract if found):
- thesis_summary: Investment thesis or strategy description
- sectors: Industry sectors they invest in
- stages: Investment stages (seed, Series A, etc.)
- check_sizes: Typical check size ranges
- geographic_focus: Geographic regions they focus on
- portfolio_companies: Companies they have invested in`
    : '';

  const focusHint = context.focusFields?.length
    ? `\nPRIORITY: We especially need: ${context.focusFields.join(', ')}`
    : '';

  return `You are a precision data extractor. Extract FACTUAL information about a specific person from a web page.

TARGET PERSON:
Name: ${context.name}
${context.company ? `Company: ${context.company}` : ''}
${context.title ? `Title: ${context.title}` : ''}
${context.location ? `Location: ${context.location}` : ''}

${disambig}
${focusHint}

PAGE URL: ${pageUrl}

PAGE CONTENT:
${pageContent}

EXTRACT these fields (set to null/[] if not found — NEVER fabricate):

CORE FIELDS:
- title: Current job title
- bio: 2-4 sentence professional summary
- company: Current company/organization
- location: City, State/Country
- linkedin_url: LinkedIn profile URL (only if explicitly on the page)
- company_url: Company website URL
- email: Professional email address (only if explicitly shown)
- phone: Phone number (only if explicitly shown)

ENRICHMENT FIELDS:
- education: Array of {school, degree, field, year}
- career_history: Array of {company, role, years, description}
- expertise_areas: Professional domains, skills, technologies
- personal_interests: Hobbies, causes, sports, personal passions
${investorBlock}

ALSO EXTRACT:
- follow_up_urls: Up to 5 URLs on this page worth visiting for more info about this person (team pages, personal blogs, portfolio pages, etc.)
- relevance: 0-100 score for how relevant this page is to the target person
- summary: One sentence describing what this page tells us about the person

Return JSON:
{
  "fields": {
    "title": {"value": "...", "confidence": "high|medium|low"},
    "bio": {"value": "...", "confidence": "..."},
    "company": {"value": "...", "confidence": "..."},
    "location": {"value": "...", "confidence": "..."},
    "linkedin_url": {"value": "...", "confidence": "..."},
    "company_url": {"value": "...", "confidence": "..."},
    "email": {"value": "...", "confidence": "..."},
    "phone": {"value": "...", "confidence": "..."},
    "education": [{"school": "...", "degree": "...", "field": "...", "year": 2020}],
    "career_history": [{"company": "...", "role": "...", "years": "...", "description": "..."}],
    "expertise_areas": ["..."],
    "personal_interests": ["..."],
    "portfolio_companies": ["..."],
    "thesis_summary": {"value": "...", "confidence": "..."},
    "sectors": ["..."],
    "stages": ["..."],
    "check_sizes": ["..."],
    "geographic_focus": ["..."]
  },
  "follow_up_urls": ["https://..."],
  "relevance": 75,
  "summary": "This LinkedIn profile shows..."
}

RULES:
- Extract ONLY information explicitly on this page. Do NOT infer or guess.
- Use null for missing scalar fields, [] for missing array fields.
- Confidence: "high" = verbatim on page, "medium" = clearly implied, "low" = loosely supported.
- For arrays (education, career_history), include only entries explicitly mentioned.
- If the page is NOT about the target person, set relevance to 0 and return empty fields.`;
}

function parseExtractionResponse(raw: any): { fields: ExtractedFields; confidence: FieldConfidence } {
  const fields: ExtractedFields = { ...EMPTY_FIELDS };
  const confidence: FieldConfidence = {};

  if (!raw?.fields) return { fields, confidence };

  const f = raw.fields;

  for (const scalar of ['title', 'bio', 'company', 'location', 'linkedin_url', 'company_url', 'email', 'phone', 'thesis_summary'] as const) {
    const val = f[scalar];
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && 'value' in val) {
      (fields as any)[scalar] = val.value || null;
      if (val.confidence) confidence[scalar] = val.confidence;
    } else if (typeof val === 'string') {
      (fields as any)[scalar] = val || null;
    }
  }

  for (const arrayField of ['expertise_areas', 'personal_interests', 'portfolio_companies', 'sectors', 'stages', 'check_sizes', 'geographic_focus'] as const) {
    const val = f[arrayField];
    if (Array.isArray(val)) {
      (fields as any)[arrayField] = val.filter((v: any) => typeof v === 'string' && v.length > 0);
    }
  }

  if (Array.isArray(f.education)) {
    fields.education = f.education
      .filter((e: any) => e && typeof e === 'object' && e.school)
      .map((e: any) => ({
        school: e.school,
        degree: e.degree || undefined,
        field: e.field || undefined,
        year: typeof e.year === 'number' ? e.year : undefined,
      }));
  }

  if (Array.isArray(f.career_history)) {
    fields.career_history = f.career_history
      .filter((e: any) => e && typeof e === 'object' && (e.company || e.role))
      .map((e: any) => ({
        company: e.company || '',
        role: e.role || '',
        years: e.years || undefined,
        description: e.description || undefined,
      }));
  }

  return { fields, confidence };
}

/**
 * Extract structured contact data from a single scraped page.
 */
export async function extractFromPage(
  openaiApiKey: string,
  pageContent: string,
  pageUrl: string,
  context: ExtractionContext,
): Promise<PageExtraction> {
  const prompt = buildExtractionPrompt(pageContent, pageUrl, context);

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
            content: 'You are a precision data extractor. Extract ONLY factual information from the provided page content. Never fabricate. Return valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      console.error(`[Extractor] OpenAI error ${response.status} for ${pageUrl}`);
      return emptyExtraction(pageUrl);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error(`[Extractor] Empty response for ${pageUrl}`);
      return emptyExtraction(pageUrl);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[Extractor] Could not parse JSON for ${pageUrl}`);
      return emptyExtraction(pageUrl);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const { fields, confidence } = parseExtractionResponse(parsed);

    const followUpUrls = Array.isArray(parsed.follow_up_urls)
      ? parsed.follow_up_urls.filter((u: any) => typeof u === 'string' && u.startsWith('http'))
      : [];

    return {
      url: pageUrl,
      fields,
      confidence,
      followUpUrls,
      summary: parsed.summary || '',
      relevanceScore: typeof parsed.relevance === 'number' ? parsed.relevance : 50,
    };
  } catch (error) {
    console.error(`[Extractor] Error for ${pageUrl}:`, error);
    return emptyExtraction(pageUrl);
  }
}

function emptyExtraction(url: string): PageExtraction {
  return {
    url,
    fields: { ...EMPTY_FIELDS },
    confidence: {},
    followUpUrls: [],
    summary: '',
    relevanceScore: 0,
  };
}

/**
 * Extract data from multiple pages in parallel with concurrency control.
 */
export async function extractFromPages(
  openaiApiKey: string,
  pages: Array<{ content: string; url: string }>,
  context: ExtractionContext,
  concurrency = 3,
): Promise<PageExtraction[]> {
  const results: PageExtraction[] = [];

  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(page => extractFromPage(openaiApiKey, page.content, page.url, context)),
    );
    results.push(...batchResults);
  }

  return results;
}
