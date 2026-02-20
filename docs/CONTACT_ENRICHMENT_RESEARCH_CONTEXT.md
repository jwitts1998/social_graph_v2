# Research Context: Contact Enrichment System

Use this document as grounding context for deep research into improving our contact enrichment system. Everything below describes the production system as it exists today.

---

## What the product does

Social Graph is a social graph connector application that helps users make warm introductions by matching conversation content with contacts in their network. Users record conversations, and the system extracts entities (people, companies, needs) then scores contacts from the user's network as potential warm introductions.

The core contact enrichment problem: **Given only a person's name and optionally a company/email, build a comprehensive professional profile by discovering and scraping public web sources.**

This is a **multi-source data fusion** problem. The output is a structured contact record with 20+ fields (bio, education, career, interests, expertise, portfolio, thesis) consumed by the matching algorithm to score introduction quality.

---

## Architecture (pipeline)

```
User triggers enrichment (EnrichmentDialog or batch import)
  → deep-research-contact Edge Function (Deno)
       → runWaterfallEnrichment (PDL → Apollo structured APIs)
       → planInitialResearch (deterministic query planning)

       → [Agentic Loop, max 3 iterations]
            → searchGoogle (Serper API, up to 8 queries)
            → rankUrls (priority scoring of discovered URLs)
            → scrapePages (Firecrawl → Jina Reader → native fetch)
            → extractFromPage (GPT-4o-mini per-page extraction)
            → synthesizeProfile (merge + conflict resolution)
            → isProfileComplete? → break or planFollowUpResearch (GPT-4o-mini)

       → Final synthesis: merge waterfall + deep research data
       → Apply updates to contacts table (respects verified_fields)
       → calculateCompletenessScore → store metadata
```

---

## Component deep-dives

### deep-research-contact (Main Edge Function)

**File**: `supabase/functions/deep-research-contact/index.ts` (~350 lines)
**Runtime**: Deno (Supabase Edge Functions), ~30-60s budget
**Cost**: ~$0.07-$0.10 per contact (Serper + Firecrawl + GPT-4o-mini + PDL/Apollo)

#### Step 1: Waterfall Enrichment (PDL → Apollo)

Tries structured data providers first for core fields (title, company, email, LinkedIn):

```
PDL API → person/enrich endpoint → name/email/linkedin lookup
  → if sufficiently complete (3+ core fields): stop
Apollo API → people/match endpoint → fallback
  → if sufficiently complete: stop
```

Completeness check: title + company + bio + email + LinkedIn (3+ filled = sufficient).

#### Step 2: Agentic Research Loop (max 3 iterations, max 12 pages)

```
planInitialResearch(contact) → generates 4-7 targeted search queries
  → "name company LinkedIn"
  → "name company biography OR about"
  → "name Crunchbase investor portfolio" (if investor)
  → "name education OR university OR alumni"
  → "name speaker OR podcast OR blog"

for each iteration:
  searchGoogle(queries) → discover URLs
  rankUrls(results) → score by domain quality (LinkedIn=40, Crunchbase=35, etc.)
  scrapePages(top URLs) → Firecrawl > Jina > native fetch
  extractFromPage(each page) → GPT-4o-mini structured extraction
  synthesizeProfile(all extractions) → merge with conflict resolution
  if complete or budget exhausted: break
  planFollowUpResearch(gaps) → GPT-4o-mini generates new queries
```

#### Step 3: Database Update

Merge waterfall + deep research profile into contact record:
- Waterfall wins for core fields (higher trust from structured DBs)
- Deep research fills enrichment fields (education, career, interests, portfolio)
- Verified fields are never overwritten
- Auto-detects contact types from title/bio patterns
- Recalculates data_completeness_score

### Page Scraper Module

**File**: `supabase/functions/_shared/page-scraper.ts` (~270 lines)
**Cost**: Firecrawl ~$0.001/page, Jina free, native free

Three-tier fallback:
- **Firecrawl**: JS rendering, clean markdown. Best for LinkedIn, SPAs.
- **Jina Reader**: Free `r.jina.ai/{url}` proxy. Good for blogs, news.
- **Native fetch**: Raw HTML stripped to text. Last resort.

Max content per page: 12,000 chars. Blocked domains: Facebook, Instagram, TikTok, Pinterest.

### Research Planner

**File**: `supabase/functions/_shared/research-planner.ts` (~230 lines)
**Cost**: ~$0.003 per follow-up plan (GPT-4o-mini)

- Initial plan: deterministic (no AI call), generates 4-7 queries based on contact data and gaps
- Follow-up plan: GPT-4o-mini generates 2-4 new queries targeting missing fields
- URL ranking: LinkedIn (+40), Crunchbase (+35), GitHub (+20), Twitter (+15), Medium/Substack (+15), news sites (+15)

### Page Extractor

**File**: `supabase/functions/_shared/page-extractor.ts` (~280 lines)
**Cost**: ~$0.005 per page (GPT-4o-mini, ~3K input tokens avg)

Extracts from full page content (not snippets):
- Core: title, bio, company, location, linkedin_url, company_url, email, phone
- Enrichment: education[], career_history[], expertise_areas[], personal_interests[]
- Investor: thesis_summary, sectors[], stages[], check_sizes[], geographic_focus[], portfolio_companies[]
- Meta: per-field confidence (high/medium/low), follow-up URLs, relevance score (0-100)

### Profile Synthesizer

**File**: `supabase/functions/_shared/profile-synthesizer.ts` (~260 lines)

- Filters pages with relevance < 20
- Scalar fields: picks highest-confidence value across all sources
- Array fields: merges and deduplicates across sources
- Education: deduplicates by school name, fills missing sub-fields
- Career history: deduplicates by company+role key
- Completeness check: bio + title + 2 enrichment fields = "complete enough"

### Legacy System (research-contact)

**File**: `supabase/functions/research-contact/index.ts` (~1016 lines)
**Runtime**: Deno, ~10-15s budget
**Cost**: ~$0.01-$0.03 per contact

Still used for batch operations (CSV import, pipeline). Uses Serper snippets only (no page crawling).
Includes investor thesis generation with multi-strategy approach (extract → portfolio-inferred → minimal).

---

## Core algorithm / logic

### Enrichment Waterfall (v2)

```
1. PDL API (linkedin_url || email || name+company) → structured profile
2. Apollo API (email || name+company || linkedin_url) → structured profile
3. Deep Research Crawler (Serper + Firecrawl + GPT) → rich profile from web pages
4. Hunter.io (last resort, email-only) → email finding via company domain
```

### Data Quality Scoring

```
Completeness Score (0-100):
  name: 5, email: 10, phone: 5, linkedin_url: 10, bio: 15,
  title: 10, company: 10, location: 5, education: 10,
  career_history: 10, personal_interests: 5, expertise_areas: 5,
  portfolio_companies: 5

Composite Quality = 0.4 * completeness + 0.3 * confidence + 0.3 * freshness
Freshness decays ~8 points per month from last_enriched_at
```

### URL Priority Scoring

```
LinkedIn: +40, Crunchbase: +35, GitHub: +20,
Twitter/X: +15, Medium/Substack: +15, TechCrunch/Forbes/Bloomberg: +15
Priority URLs (from planner): +100
Base score for any result: +10
Boost for long snippets (>200 chars): +5
```

---

## Data schema

### contacts (main table)

```
id                      UUID        Primary key
name                    TEXT        Full name
first_name              TEXT        Parsed first name
last_name               TEXT        Parsed last name
email                   TEXT        Professional email
phone                   TEXT        Phone number
company                 TEXT        Current company
title                   TEXT        Current job title
location                TEXT        City, State/Country
linkedin_url            TEXT        LinkedIn profile URL
bio                     TEXT        Professional summary (2-4 sentences)
company_url             TEXT        Company website
company_address         TEXT        Company address
company_employees       TEXT        Company size
company_founded         TEXT        Company founding year
company_linkedin        TEXT        Company LinkedIn URL
company_twitter         TEXT        Company Twitter URL
company_facebook        TEXT        Company Facebook URL
twitter                 TEXT        Personal Twitter handle
education               JSONB       [{school, degree, field, year}]
career_history          JSONB       [{company, role, years, description}]
personal_interests      TEXT[]      ["hiking", "jazz"]
expertise_areas         TEXT[]      ["AI", "venture capital"]
portfolio_companies     TEXT[]      ["Stripe", "Coinbase"]
is_investor             BOOLEAN     Investor flag
contact_type            TEXT[]      ["GP", "Angel", "Startup"]
investor_notes          TEXT        Investment thesis + details
check_size_min          INTEGER     Min check size
check_size_max          INTEGER     Max check size
preferred_stages        TEXT[]      ["Seed", "Series A"]
thesis_source           TEXT        'extracted'|'portfolio-inferred'|'minimal'
relationship_strength   INTEGER     0-100 relationship score
last_enriched_at        TIMESTAMP   Last enrichment time
enrichment_source       TEXT        'pdl'|'apollo'|'deep-research'|combined
enrichment_confidence   JSONB       {title: "high", bio: "medium", ...}
data_completeness_score INTEGER     0-100 completeness score
verified_fields         TEXT[]      User-verified fields (never overwritten)
bio_embedding           VECTOR      Embedding for semantic matching
thesis_embedding        VECTOR      Embedding for thesis matching
owned_by_profile        UUID        User who owns this contact
```

### theses (keyword-extracted investment criteria)

```
id                      UUID
contact_id              UUID        FK to contacts
sectors                 TEXT[]      Industry sectors
stages                  TEXT[]      Investment stages
geos                    TEXT[]      Geographic preferences
personas                TEXT[]      Target personas
```

### match_suggestions (matching output)

```
id                      UUID
conversation_id         UUID        FK to conversations
contact_id              UUID        FK to contacts
score                   FLOAT       Weighted match score (0-1)
star_rating             INTEGER     1-3 stars
match_details           JSONB       Per-factor score breakdown
reasons                 TEXT[]      Human-readable match reasons
```

---

## How this system connects to others

The contact enrichment system's output feeds into:

1. **Matching Algorithm (primary, ~60% impact)**: Enriched contact fields directly power the scoring weights. Embedding similarity (25%), tag overlap (20%), personal affinity (15%) all depend on rich contact profiles. Without enrichment, contacts rely only on basic fields.

2. **Thesis Extraction (20% impact)**: Enriched bio and investor_notes feed into `extract-thesis` which generates the sectors/stages/geos used for tag overlap scoring (20-25% weight in matching).

3. **Embedding Generation (15% impact)**: Enriched bio generates `bio_embedding` and thesis generates `thesis_embedding`, enabling semantic matching (25% weight when available).

4. **UI Display (5% impact)**: ContactCard, ContactProfile show enriched data to users. Completeness badges visible.

**Bottom line**: Contact enrichment quality directly determines match quality. A contact with a rich profile (bio, education, expertise, portfolio) will match 3-5x better than one with only name and company.

---

## Frontend / UI integration

### EnrichmentDialog

- Triggered from ContactCard (sparkles icon) or ContactProfile ("Enrich" button)
- Calls `deepResearchContact(contactId)` edge function
- Shows crawl progress: pages scraped, searches run, iterations completed
- Displays updated fields list and research summary on completion
- Invalidates React Query cache for immediate data refresh

### ContactCard

- Shows enriched fields: education, career, expertise, interests, portfolio
- Data completeness badge (percentage)
- Contact type badges auto-detected from enrichment

### ContactProfile

- Full detail view of all enriched data
- Background re-enrichment for stale contacts (>3 months)
- Buttons for "Enrich Social" and "Generate Embedding"

### CsvUploadDialog

- Batch enrichment after CSV import (uses lighter `researchContact`, not deep research)
- Rate-limited: max 3 concurrent enrichments
- Shows progress counter

---

## Current limitations and known issues

1. **LinkedIn scraping reliability**: LinkedIn blocks unauthenticated scraping. Firecrawl handles some of this but results vary. PDL/Apollo are more reliable for LinkedIn data but cost more per lookup.

2. **Name disambiguation**: Common names produce ambiguous search results. The system uses company/LinkedIn URL as disambiguation signals, but can still extract data about wrong people.

3. **Investor thesis quality**: Thesis extraction works well when portfolio data exists (Crunchbase) but falls back to minimal stubs when public data is limited. ~40% of investors get "minimal" thesis quality.

4. **Cost scaling for batch operations**: Deep research at $0.10/contact is fine for individual enrichment but expensive for batch operations (500 contacts = $50). Batch flows still use the lighter snippet-based system.

5. **Edge function timeout**: Supabase Edge Functions have a ~60s timeout. Deep research with 12 pages and 3 iterations can approach this limit. Need to manage budget carefully.

6. **No email verification**: Emails found via web scraping or pattern guessing are not verified. Hunter.io provides confidence scores but is now last-resort only.

7. **Stale data**: Contact data from web sources can be outdated. Career changes, company moves, etc. The freshness scoring helps prioritize re-enrichment but doesn't prevent stale data from being used.

---

## Constraints and environment

- **Runtime**: Deno (Supabase Edge Functions), ~60s timeout per invocation
- **Language**: TypeScript (Deno for backend, React+Vite for frontend)
- **APIs**: Serper ($0.001/query), Firecrawl ($0.001/page), GPT-4o-mini (~$0.005/call), PDL ($0.01-$0.03/lookup), Apollo ($0.01-$0.03/lookup), Hunter.io (credit-based, deprioritized)
- **Scale**: 50-500 contacts per user, 1-50 enrichments per session
- **Database**: PostgreSQL (Supabase) with pgvector extension for embeddings
- **Budget**: ~$0.10 per contact for deep research, ~$0.03 per contact for light research
- **Hard limits**: No browser automation in Edge Functions (Firecrawl/Jina handle JS rendering externally), no GPU, no fine-tuning

---

## Evaluation

- **Test data**: Manual testing with known contacts across roles (investors, founders, executives). No automated golden set yet.
- **Metrics**: data_completeness_score improvement (pre vs post enrichment), field fill rate, disambiguation accuracy (manual spot-check)
- **Current baseline**: Light research (snippet-only) averages 45-55% completeness. Deep research targets 70-85%.
- **How to run**: Trigger enrichment from UI (EnrichmentDialog) or call edge function directly via `supabase functions invoke deep-research-contact --body '{"contactId": "..."}'`

---

## What I want to research

Given the system described above, I want deep research into:

1. **Improving scraping depth and reliability**: How can we extract more data from protected or JS-heavy pages? Research:
   - Firecrawl vs ScrapingBee vs Browserless vs Crawl4AI for JS rendering
   - Techniques for extracting structured data from LinkedIn public profiles without login
   - Handling anti-bot measures (CAPTCHAs, rate limiting, IP blocking) in Deno Edge Functions
   - Cost/quality tradeoffs of different scraping services at our scale (50-500 contacts)

2. **Enhancing name disambiguation**: How can we reduce false matches when common names produce ambiguous search results? Research:
   - Entity resolution techniques for person disambiguation
   - Using knowledge graphs or entity linking (Wikidata, Google Knowledge Graph API)
   - Multi-signal disambiguation (company + title + location + education as joint identity)
   - Approaches used by data enrichment companies (Clearbit, ZoomInfo, Apollo)

3. **Email discovery without Hunter.io**: What are the best alternatives for finding professional email addresses? Research:
   - Email pattern guessing + SMTP verification approaches
   - Alternatives: Snov.io, FindThatEmail, Voila Norbert, Clearbit
   - Building an in-house email pattern guesser (firstname.lastname@domain, etc.)
   - Email verification APIs (NeverBounce, ZeroBounce) to validate discovered emails
   - Cost comparison of email discovery services

4. **Agentic research improvements**: How can we make the AI research loop smarter and more efficient? Research:
   - Multi-agent research systems (AutoGPT patterns applied to person research)
   - Using LLM tool-calling for dynamic research strategy (search, scrape, analyze)
   - Retrieval-augmented generation for person profiles
   - Caching and incremental enrichment (don't re-scrape pages we visited recently)
   - Quality-aware stopping criteria (when to stop researching vs when to keep going)

5. **Scaling to cross-project reusability**: How should we architect the scraping/enrichment system for use across multiple projects? Research:
   - Extracting the page-scraper + research-planner + page-extractor as a standalone package
   - Configurable extraction schemas (different fields for different use cases)
   - Shared URL cache / page content cache across projects
   - API design for a generic "research a person" service
   - Open-source person enrichment tools and frameworks

Please focus on **practical, implementable approaches** that work at our scale (50-500 contacts per user, $0.10/contact budget). We're a solo developer running on Supabase Edge Functions — we need methods that can be implemented in TypeScript/Deno without dedicated infrastructure. Prefer approaches with clear evidence of working at small-to-medium scale over theoretically optimal methods that require large training datasets, GPU clusters, or dedicated ML infrastructure.
