# Research Context: Contact Enrichment & Scraping System

Use this document as grounding context for deep research into improving our contact enrichment pipeline. Everything below describes the production system as it exists today.

---

## What the product does

Social Graph is a tool for venture capital / startup networking. Users import contacts (from CSV, Google Contacts, or manual entry) and the system automatically **enriches** those contacts with professional profiles, social media insights, and investment thesis data scraped from the web.

The core enrichment problem: **given a contact with minimal data (name, maybe company/title), produce a rich professional profile (bio, education, career history, expertise areas, personal interests, portfolio companies, investment thesis) that powers downstream matching, relationship management, and warm introductions.**

This is a **web research + information extraction** problem. The system searches the web for public information about the person and uses LLMs to extract structured data from unstructured search results.

---

## Architecture (enrichment pipeline)

```
Contact Created/Imported
  → research-contact (primary enrichment)
       → Step 1a: Waterfall enrichment (PDL → Apollo structured lookup)
            If sufficiently complete (3+ core fields), skip web search
       → Step 1b: Serper API (Google Search) + GPT-4o-mini extraction (fallback)
            - Per-field source citations and confidence levels
            - Two-step prompt: identify relevant results, then extract
            - Disambiguation via LinkedIn URL, company, conflict detection
            - Temperature 0 for factual extraction
       → Step 2: Investor thesis (multi-strategy)
            - Strategy 1: Extract from Crunchbase/OpenVC structured data
            - Strategy 2: Extract from search snippets (temp 0)
            - Strategy 3: Derive from portfolio companies
            - Strategy 4: Minimal factual fallback (no fabrication)
       → Auto-detects contact_type (GP, LP, Angel, Family Office, Startup, PE)
       → Cross-validates waterfall vs GPT data (prefer structured for core fields)
       → LinkedIn URL validation (slug must match name parts)
       → Respects verified_fields (never overwrites user edits)
       → Calculates data_completeness_score (0-100) + stores enrichment_confidence
       → Updates contact in database

  → enrich-social (optional, social media enrichment)
       → Step 0: Check PDL for existing social handles (Twitter, GitHub)
       → Step 1: Serper API targeted queries (site:twitter.com, site:medium.com, github)
       → Step 2: GPT-4o-mini: extracts social insights
       → Respects verified_fields
       → Merges personal_interests and expertise_areas with existing data

  → enrich-contact (optional, email/phone enrichment)
       → Hunter.io: email finder + domain search
       → People Data Labs: comprehensive B2B profile lookup
       → Returns enriched data (does not auto-update — user reviews)

  → schedule-reenrichment (cron / manual)
       → Selects stale contacts (>6mo + low score, or >12mo any score)
       → Sorts by priority (investors, low completeness first)
       → Invokes research-contact with daily budget cap

  → embed-contact (post-enrichment)
       → OpenAI text-embedding-3-small (1536-d)
       → bio_embedding: "Professional profile for networking and introductions: " + bio + title + company + interests + expertise + portfolio
       → thesis_embedding: "Investment thesis and focus areas: " + investor_notes
       → Stored as pgvector columns for semantic matching
```

---

## `research-contact` — Primary Enrichment Function

**File**: `supabase/functions/research-contact/index.ts` (610 lines)
**Runtime**: Supabase Edge Function (Deno), ~10s budget
**Cost**: ~$0.02 per contact (2 Serper searches + 1 GPT-4o-mini call)

### Step 1: Web Search (Serper API)

Two targeted Google searches per contact:

```
Query 1: "[name]" "[company]" LinkedIn profile
Query 2: "[name]" "[company]" Crunchbase investor portfolio   (if investor)
    OR   "[name]" "[company]" biography                       (if not investor)
```

Each query returns top 10 organic results. Top 5 per query are formatted as structured text for GPT.

### Step 2: GPT Extraction

GPT-4o-mini is given the search result snippets and asked to extract structured JSON:

```json
{
  "title": "Current job title from sources",
  "bio": "2-3 sentence professional summary",
  "company": "Their company",
  "location": "City, State",
  "linkedin_url": "LinkedIn URL if found in search results",
  "company_url": "Company website if found",
  "education": [{"school": "Stanford", "degree": "PhD", "field": "CS", "year": 2012}],
  "career_history": [{"company": "Google", "role": "PM", "years": "2015-2020", "description": "..."}],
  "expertise_areas": ["marketplaces", "PLG", "growth"],
  "personal_interests": ["rock climbing", "jazz", "Boston Celtics"],
  "portfolio_companies": ["Stripe", "Coinbase"],
  "found": true
}
```

Settings: `temperature: 0.2`, `max_tokens: 1500`, model: `gpt-4o-mini`

GPT is instructed to ONLY extract information explicitly stated in search results — no fabrication.

### Step 3: Investor Thesis Generation (investors only)

If contact is an investor and `investor_notes` is missing or short (<50 chars), a separate GPT call generates:

```json
{
  "thesis_summary": "2-3 sentence thesis description",
  "sectors": ["SaaS", "Fintech"],
  "stages": ["Seed", "Series A"],
  "check_sizes": ["$500K-2M"],
  "geographic_focus": ["US"],
  "found": true
}
```

Settings: `temperature: 0.7`, `max_tokens: 500`

**Note**: This thesis generation uses `temperature: 0.7` — it's more generative than factual since it infers thesis from patterns rather than extracting from sources.

### Step 4: Contact Type Detection

Regex-based classification from title + bio text:

```
GP:           "general partner", "managing partner", "venture partner", "partner at ...capital"
LP:           "limited partner", "institutional investor", "endowment", "pension fund"
Angel:        "angel investor", "individual investor", "super angel"
Family Office: "family office", "private wealth"
Startup:      "founder", "co-founder", "ceo...startup", "entrepreneur"
PE:           "private equity", "buyout", "growth equity"
```

Detected types are merged with existing `contact_type[]` (no overwrites).

### Step 5: Conditional Update Logic

- Only enriches if `bio` or `title` is missing or `bio.length < 50`
- Only generates thesis if investor AND `investor_notes` missing or `< 50 chars`
- New data is **merged** with existing — never overwrites populated fields
- Updates `last_enriched_at`, `enrichment_source`, `data_completeness_score`

---

## `enrich-social` — Social Media Enrichment

**File**: `supabase/functions/enrich-social/index.ts` (385 lines)
**Cost**: ~$0.04 per contact (3 Serper searches + 1 GPT-4o-mini call)

### Search Queries

Three Google searches via Serper:

```
1. "[name]" "[company]" Twitter bio interests
2. "[name]" "[company]" Instagram about
3. "[name]" recent posts topics social media
```

### GPT Extraction

Extracts from search snippets:

```json
{
  "personal_interests": ["hiking", "jazz", "climate action"],
  "content_topics": ["AI", "venture capital", "SaaS"],
  "social_activity_level": "high" | "medium" | "low" | "none",
  "social_tone": "professional" | "casual" | "thought_leader" | "unknown",
  "social_handles": {
    "twitter": "@username",
    "instagram": "@username"
  }
}
```

### Smart Merging

- `personal_interests`: merged with existing (deduplicated via Set)
- `content_topics`: merged into `expertise_areas` (deduplicated)
- `twitter`: updated if found
- `enrichment_source`: appended as `"+social"` (e.g., `"serper+social"`)
- Recalculates `data_completeness_score` after merge

---

## `enrich-contact` — Email/Phone Enrichment

**File**: `supabase/functions/enrich-contact/index.ts` (384 lines)
**Providers**: Hunter.io, People Data Labs (PDL)

### Hunter.io

- **Email Finder**: Given name + company domain, finds professional email
- **Domain Search**: Given company domain, finds all contacts
- Returns: email, LinkedIn, title, confidence score

### People Data Labs

- Lookup by LinkedIn URL, email, or name+company
- Returns comprehensive profile: name, email, LinkedIn, Twitter, GitHub, phone, location, title, company details (website, address, employees, founded, industry), education, career history
- 1.5B+ profiles in database

### Behavior

Unlike `research-contact`, this function **returns enriched data without auto-updating** the contact — the caller decides what to apply. This is used primarily during CSV import where bulk enrichment happens.

---

## Data Quality Scoring

**File**: `supabase/functions/_shared/data-quality.ts` (130 lines)

### Completeness Score (0-100)

Weighted field presence check:

| Field | Weight | Notes |
|-------|--------|-------|
| name | 5 | |
| email | 10 | |
| phone | 5 | |
| linkedin_url | 10 | |
| bio | 15 | Most important for matching |
| title | 10 | |
| company | 10 | |
| location | 5 | |
| education | 10 | JSONB array, needs >= 1 entry |
| career_history | 10 | JSONB array, needs >= 1 entry |
| personal_interests | 5 | Text array, needs >= 1 item |
| expertise_areas | 5 | Text array, needs >= 1 item |
| portfolio_companies | 5 | For investors only |

Arrays must have at least one item; strings must be non-empty after trim.

### Priority Classification

- Score < 40: **high** priority (needs enrichment)
- Score 40-69: **medium** priority
- Score >= 70: **low** priority (well-enriched)

### Composite Quality Score

Beyond completeness, quality is now measured across three dimensions:

- **Completeness** (40%): weighted field presence check as above
- **Confidence** (30%): aggregate of per-field confidence from extraction (high=100, medium=65, low=30)
- **Freshness** (30%): decays ~8 points/month from `last_enriched_at`

Formula: `0.4 * completeness + 0.3 * confidence + 0.3 * freshness`

### Enrichment Priority Score (for batch ordering)

Contacts are enriched in priority order: `(100 - completeness) + (is_investor ? 20 : 0) + (has_linkedin ? 10 : 0) + (has_company ? 5 : 0) + (has_email ? 5 : 0)`

### Thesis Confidence Tiers

Investor notes include a source label:
- **Extracted from public sources**: thesis data found verbatim in search results or Crunchbase/OpenVC
- **Portfolio-derived**: thesis patterns inferred from known portfolio companies
- **Limited data**: minimal factual fallback (no fabricated specifics)

---

## Contact Data Schema

### Core fields

```
id, name, first_name, last_name, email, phone,
title, company, bio, location,
linkedin_url, twitter, angellist,
company_url, company_address, company_employees, company_founded,
company_linkedin, company_twitter, company_facebook, company_crunchbase
```

### Enrichment fields (v1.2)

```
education            JSONB     [{school, degree, field, year}]
career_history       JSONB     [{company, role, years, description}]
personal_interests   TEXT[]    ["rock climbing", "jazz"]
expertise_areas      TEXT[]    ["marketplaces", "PLG"]
portfolio_companies  TEXT[]    ["Stripe", "Coinbase"]
```

### Enrichment metadata

```
last_enriched_at           TIMESTAMPTZ
enrichment_source          TEXT         'pdl', 'apollo', 'serper', 'pdl+serper', 'social', 'manual'
data_completeness_score    INTEGER      0-100
enrichment_confidence      JSONB        {title: "high", bio: "medium", ...}
thesis_source              TEXT         'extracted', 'portfolio-inferred', 'minimal'
verified_fields            TEXT[]       Fields manually edited by user (protected from overwrite)
```

### Investor fields

```
contact_type[]        TEXT[]    ['GP', 'LP', 'Angel', 'FamilyOffice', 'Startup', 'PE']
is_investor           BOOLEAN
check_size_min        INTEGER
check_size_max        INTEGER
investor_notes        TEXT       Free-text thesis + AI-appended summaries
```

### Embedding fields

```
bio_embedding         VECTOR(1536)    From bio + title + company + interests + expertise + portfolio
thesis_embedding      VECTOR(1536)    From investor_notes
```

---

## How enrichment data feeds the matching algorithm

The matching algorithm uses enriched contact data in several components:

1. **Embedding score (25%)**: `bio_embedding` and `thesis_embedding` are generated from enriched text — richer profiles produce better embeddings
2. **Tag overlap (20%)**: `expertise_areas` and `portfolio_companies` become contact tags for Jaccard similarity
3. **Personal affinity (15%)**: `education`, `personal_interests`, `expertise_areas`, `portfolio_companies` are compared against conversation context
4. **Role match (10%)**: `contact_type` (auto-detected during enrichment) drives role matching
5. **Check-size fit (5%)**: `check_size_min`/`check_size_max` from investor thesis
6. **Semantic/keyword (10%)**: `bio`, `title`, `investor_notes` text is searched for keyword matches

**Bottom line**: Enrichment quality directly determines matching quality. A contact with a bare name gets minimal match scores; a contact with a rich bio, education, expertise, and interests can match on many dimensions.

---

## Frontend Integration

### EnrichmentDialog

- Auto-triggers `researchContact(contactId)` when opened
- Shows loading state with progress indicators
- Displays badges for fields found (bio, thesis, education, etc.)
- Invalidates React Query cache to refresh contact display

### Contact Profile

- "At a glance" section: expertise badges, portfolio companies, personal interests
- "Deeper context" section: full bio, education list, career history with descriptions
- Enrichment metadata: completeness score badge, last enriched timestamp

### CSV Import

- After import, automatically enriches contacts that have email, LinkedIn URL, or company
- Rate limits to max 10 concurrent enrichments
- Tracks progress and failures

---

## Current Limitations and Known Issues

1. **Search quality**: Serper returns Google results but snippets are short (~150 chars). For less-known people, results are sparse or wrong-person matches.
2. **Wrong person**: No robust disambiguation when multiple people share the same name and company is missing. GPT may combine data from different people.
3. **Stale data**: Web search results may be outdated. No freshness signal or re-enrichment scheduling.
4. **Thesis hallucination**: The investor thesis generation uses `temperature: 0.7` and infers from patterns rather than extracting from real data. This can produce plausible-sounding but inaccurate theses.
5. **No LinkedIn scraping**: We search for LinkedIn profiles but don't scrape them directly (ToS restrictions). We only get the snippet from Google's index, which is often truncated.
6. **Social media gaps**: Twitter/Instagram search is indirect (via Google) — we don't use the Twitter API or Instagram API. Results are inconsistent.
7. **No batch prioritization**: When enriching many contacts (e.g., after CSV import), there's no intelligent ordering — contacts are enriched in insertion order, not by data quality priority.
8. **No validation/verification**: Extracted data is not cross-referenced or verified against multiple sources. A single bad search result can introduce errors.
9. **No incremental re-enrichment**: Once enriched, contacts aren't automatically re-enriched when new information becomes available.
10. **Hunter.io/PDL dependency**: Email enrichment requires paid API keys that may not always be configured. No graceful feature degradation in the UI.

---

## Constraints and Environment

- **Runtime**: Supabase Edge Functions (Deno), ~10s budget per invocation
- **APIs**: Serper (Google Search, $50/5000 searches), OpenAI GPT-4o-mini (~$0.01 per extraction), Hunter.io (optional), People Data Labs (optional)
- **Scale**: Typically 50-500 contacts per user; batch enrichment during CSV import
- **Database**: PostgreSQL on Supabase, JSONB for structured data, text arrays for lists
- **No browser automation**: Can't use Playwright/Puppeteer in Edge Functions
- **No direct API access**: Can't call LinkedIn API (no partnership), limited Twitter API access
- **Budget constraint**: Small team, cost-per-contact matters — must stay under ~$0.10/contact total

---

## What I want to research

Given the system described above, I want deep research into:

1. **Better data sources and scraping strategies**: What are the best publicly available data sources for professional profile enrichment in 2025/2026? Research:
   - Alternatives to Google Search snippets for extracting professional data (Bing API, DuckDuckGo, specialized people-search engines)
   - Whether structured data sources (Wikidata, OpenCorporates, SEC filings, Crunchbase API) can supplement or replace unstructured web search
   - Legal and ToS implications of various scraping approaches for professional profiles
   - How companies like Apollo, ZoomInfo, Clearbit, and Clay approach contact enrichment at scale
   - Proxy-based LinkedIn scraping services (Proxycurl, Nubela, etc.) — reliability, cost, and legal landscape

2. **LLM extraction accuracy and hallucination reduction**: Our GPT-4o-mini extraction sometimes fabricates data. Research:
   - Prompt engineering techniques for factual extraction from web snippets (chain-of-thought, cite-your-sources, confidence scores)
   - Whether smaller/specialized models (fine-tuned extractors) outperform general LLMs for structured data extraction
   - Grounding and attribution techniques — forcing the model to quote the source snippet for each extracted field
   - Verification/cross-referencing strategies (extract from multiple sources, compare, take consensus)
   - Confidence scoring for extracted fields — how to assign and use reliability scores per-field

3. **Person disambiguation**: Multiple people can share the same name. Research:
   - Entity resolution and disambiguation techniques in professional networking contexts
   - Using multiple weak signals (company, location, title, LinkedIn URL) for disambiguation
   - Active disambiguation — when to ask the user "is this the right person?" vs auto-resolving
   - How professional data providers (LinkedIn, Google Knowledge Graph) handle disambiguation

4. **Enrichment prioritization and scheduling**: We enrich contacts in insertion order. Research:
   - Smart prioritization: which contacts should be enriched first based on matching potential, relationship strength, data sparsity, or recent conversation mentions
   - Incremental re-enrichment: when and how to refresh stale profiles (time-based, event-triggered, quality-score-based)
   - Batch vs real-time enrichment tradeoffs and cost optimization
   - Budget-aware enrichment: allocating a fixed enrichment budget across contacts optimally

5. **Data quality and validation**: We have no verification layer. Research:
   - Multi-source cross-referencing for accuracy (e.g., compare Serper extraction with PDL data)
   - Automated fact-checking for extracted professional claims
   - Data decay detection — identifying when enriched data has likely become stale
   - Quality metrics beyond completeness score — accuracy, freshness, consistency
   - How to build a "data quality flywheel" where user corrections improve extraction over time

6. **Social media enrichment**: Our social enrichment via Google is inconsistent. Research:
   - Best approaches for extracting Twitter/X, LinkedIn, GitHub, and other social handles in 2025/2026
   - Content analysis of social media for professional context (topic modeling from tweets, identifying thought leaders)
   - Privacy-first approaches to social enrichment — what data is ethically appropriate to collect
   - Whether social activity signals (post frequency, engagement, topics) correlate with valuable professional connections

7. **Investor-specific enrichment**: For our VC networking use case, investment thesis data is critical. Research:
   - Best data sources for investor portfolio companies, check sizes, stage preferences, and sector focus
   - Crunchbase API vs PitchBook vs alternative sources for investment data
   - How to infer investment thesis from portfolio analysis (reverse-engineer preferences from known investments)
   - Building a "thesis confidence score" — when is the extracted thesis reliable vs speculative

Please focus on **practical, implementable approaches** that work at our scale (hundreds of contacts, Supabase Edge Functions, Deno runtime, <$0.10 per contact). We need methods that can be implemented in TypeScript/Deno without heavy infrastructure. Prefer approaches with clear cost/benefit tradeoffs and real-world evidence of working for professional contact enrichment. We are particularly interested in approaches that improve enrichment accuracy (reduce hallucinations) and discover better data sources for the VC/startup networking domain.
