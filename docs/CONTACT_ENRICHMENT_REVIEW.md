# Contact Enrichment Pipeline Review

**Date**: 2026-01-20
**Issue**: Contact records lack rich personal and business context needed for quality matching

---

## Current State Analysis

### What We Have (Basic)

**Professional Fields**:
- `name`, `email`, `company`, `title`, `linkedin_url`
- `bio` - Generic 2-3 sentence professional bio
- `contact_type` - LP, GP, Angel, FamilyOffice, Startup, PE
- `investor_notes` - Investment preferences

**Investment Thesis** (separate table):
- `sectors` - Industry focus (e.g., "Biotech", "Fintech")
- `stages` - Investment stages (e.g., "Seed", "Series A")
- `geos` - Geographic preferences
- `check_sizes` - Investment amounts
- `notes` - Free-form thesis notes

**Relationship**:
- `relationship_strength` - 0-100 score

### What's Missing (Critical Gaps)

#### 1. Personal Context
- ❌ **Personal interests** - Reading, travel, art, music
- ❌ **Hobbies** - Skiing, golf, sailing, photography
- ❌ **Sports** - Teams they follow, sports they play
- ❌ **Causes/Values** - Nonprofits, social causes, activism
- ❌ **Family context** - Parents, children interests (relevant for connection building)
- ❌ **Geographic ties** - Hometown, places lived, connection to regions

#### 2. Professional Depth
- ❌ **Education** - Schools, degrees, academic affiliations
- ❌ **Career path** - Previous companies, roles, progression
- ❌ **Industry expertise** - Specific domains beyond sectors (e.g., "supply chain", "marketplaces", "PLG")
- ❌ **Notable achievements** - Exits, awards, recognition
- ❌ **Thought leadership** - Blog posts, podcasts, speaking, publications
- ❌ **Board seats** - Current and past board memberships
- ❌ **Advisory roles** - Companies they advise
- ❌ **Operator experience** - Built X to $Y revenue, scaled Z team

#### 3. Network Context
- ❌ **Key connections** - Who they invest with, refer to
- ❌ **Portfolio overlap** - Common portfolio companies
- ❌ **Shared experiences** - Same firm alumni, same school

#### 4. Behavioral Signals
- ❌ **Investment velocity** - How active are they?
- ❌ **Decision-making style** - Quick vs thorough, thesis-driven vs opportunistic
- ❌ **Value-add areas** - What can they help with specifically?
- ❌ **Deal preferences** - Warm intro only? Cold outreach okay?

---

## Why This Matters for Matching

### Example: Current Match (Weak)

**Conversation**: "Looking for biotech investor for seed round"

**Contact**: Sarah Chen
- Bio: "Early-stage biotech investor"
- Thesis: Biotech, Healthcare, Seed
- **Match Score**: 65% (2 stars)
- **Match Reason**: "Sector and stage match"

### Example: Rich Match (Strong)

**Conversation**: "Looking for biotech investor for seed round. Company is MIT spinout focused on drug discovery. Founder was research scientist at Genentech."

**Contact**: Sarah Chen (Enriched)
- Bio: "Early-stage biotech investor"
- **Education**: PhD Molecular Biology, MIT
- **Career**: Former VP R&D at Genentech (10 years)
- **Expertise**: Drug discovery, therapeutics, FDA approval process
- **Personal**: Rock climbing, follows Boston Celtics, supports STEM education
- **Thought Leadership**: Writes "Drug Discovery Digest" newsletter
- **Board Seats**: 3 current (all biotech)
- **Value-Add**: Can help with CMC strategy, FDA submissions, SAB recruitment
- **Match Score**: 92% (3 stars)
- **Match Reason**: 
  - Sector/stage match
  - MIT connection (school tie)
  - Genentech connection (career overlap)
  - Drug discovery expertise (specific domain match)
  - Active in space (newsletter shows engagement)

---

## Root Cause: Shallow Enrichment

### Current Enrichment Flow

1. **Manual Entry** → User adds name, email, company
2. **Auto-Research** (`research-contact` function):
   - Uses OpenAI to generate 2-3 sentence bio
   - Detects contact type from title
   - Basic info only
3. **Thesis Extraction** (`extract-thesis` function):
   - Parses investor thesis from `investor_notes`
   - Extracts sectors, stages, geos
4. **Done** ✅ (but insufficient!)

### What's Missing

- No scraping of LinkedIn for full profile
- No extraction of education, career history
- No capture of personal interests
- No tracking of portfolio companies
- No monitoring of social media, blog posts, podcasts
- No extraction of speaking engagements, board seats
- No analysis of writing style, communication preferences

---

## Proposed Enrichment Enhancements

### Phase 1: Expand Core Fields (Immediate)

#### Add New Database Fields

```sql
-- Personal Context
ALTER TABLE contacts ADD COLUMN education JSONB; -- [{school, degree, year, field}]
ALTER TABLE contacts ADD COLUMN personal_interests TEXT[]; -- ["skiing", "jazz", "Celtics"]
ALTER TABLE contacts ADD COLUMN hobbies TEXT[]; -- ["golf", "photography"]
ALTER TABLE contacts ADD COLUMN causes TEXT[]; -- ["STEM education", "climate"]
ALTER TABLE contacts ADD COLUMN geographic_ties JSONB; -- {hometown, places_lived, regions}

-- Professional Depth
ALTER TABLE contacts ADD COLUMN career_history JSONB; -- [{company, role, years}]
ALTER TABLE contacts ADD COLUMN expertise_areas TEXT[]; -- ["supply chain", "PLG", "marketplaces"]
ALTER TABLE contacts ADD COLUMN achievements TEXT[]; -- ["3 exits", "Forbes 30u30"]
ALTER TABLE contacts ADD COLUMN thought_leadership JSONB; -- {blog, podcast, newsletter, speaking}
ALTER TABLE contacts ADD COLUMN board_seats TEXT[]; -- ["Acme Corp", "Beta Inc"]
ALTER TABLE contacts ADD COLUMN operator_background TEXT; -- "Built ZenDesk to $100M ARR"

-- Network & Signals
ALTER TABLE contacts ADD COLUMN portfolio_companies TEXT[]; -- ["Stripe", "Coinbase"]
ALTER TABLE contacts ADD COLUMN investment_velocity TEXT; -- "3-5 deals/year"
ALTER TABLE contacts ADD COLUMN value_add_areas TEXT[]; -- ["go-to-market", "hiring"]
ALTER TABLE contacts ADD COLUMN referral_preferences TEXT; -- "Warm intro preferred"
```

#### Enhance `research-contact` Function

**Current** (lines 70-100):
```typescript
const prompt = `Generate a professional bio for this person...
Create a realistic, professional 2-3 sentence bio based on this information.`;
```

**Proposed**:
```typescript
const prompt = `You are an expert researcher. Extract ALL available information about this person from their LinkedIn, social profiles, and public information.

Person: ${name}
Company: ${company}
Title: ${title}
LinkedIn: ${linkedinUrl}

Extract and return a comprehensive JSON profile:
{
  "bio": "2-3 sentence professional summary",
  "education": [{"school": "MIT", "degree": "PhD", "field": "CS", "year": 2015}],
  "career_history": [{"company": "Google", "role": "PM", "years": "2015-2020"}],
  "expertise_areas": ["marketplaces", "two-sided networks", "SEO"],
  "personal_interests": ["rock climbing", "jazz music", "Boston Celtics"],
  "hobbies": ["photography", "cooking"],
  "causes": ["STEM education", "climate tech"],
  "geographic_ties": {
    "hometown": "Boston",
    "places_lived": ["SF", "NYC", "Boston"],
    "current_location": "San Francisco"
  },
  "achievements": ["Led product to $50M ARR", "3 successful exits"],
  "thought_leadership": {
    "blog": "URL or null",
    "podcast": "Appears on TechCrunch Live",
    "newsletter": "Marketplace Mondays",
    "speaking": ["SaaStr", "Web Summit"]
  },
  "board_seats": ["Acme Corp (Chair)", "Beta Inc"],
  "portfolio": ["Stripe", "Coinbase", "Airtable"] // if investor
}

Important:
- Extract REAL information if available from LinkedIn/web
- If not available, return null or empty array (don't make up data)
- Focus on details that help understand WHO they are beyond job title
- Personal interests are crucial for building rapport`;
```

### Phase 2: LinkedIn Integration (High Value)

**Options**:

1. **LinkedIn API** (Official, requires partnership)
   - Pros: Official, structured data
   - Cons: Expensive, limited access, approval process

2. **LinkedIn Scraping** (via Proxycurl, ScrapingBee, etc.)
   - Pros: Comprehensive data, affordable ($0.02-0.10/profile)
   - Cons: Terms of Service gray area
   - **Recommended**: Proxycurl API

3. **Manual Enrichment UI**
   - User pastes LinkedIn URL
   - System scrapes or asks user to fill in key fields
   - Progressive enrichment over time

**Proxycurl Integration Example**:
```typescript
// In research-contact function
const enrichFromLinkedIn = async (linkedinUrl: string) => {
  const response = await fetch(`https://nubela.co/proxycurl/api/v2/linkedin`, {
    headers: {
      'Authorization': `Bearer ${PROXYCURL_API_KEY}`
    },
    params: {
      url: linkedinUrl,
      skills: 'include',
      personal_interests: 'include'
    }
  });
  
  return response.json(); // Comprehensive profile data
};
```

### Phase 3: Continuous Enrichment (Automated)

**Daily/Weekly Jobs**:
1. **Monitor Social Media** - Track tweets, blog posts, podcast appearances
2. **Portfolio Updates** - Check Crunchbase for new investments
3. **Speaking Circuit** - Scrape conference websites for speaker lists
4. **Newsletter Scraping** - Extract from email newsletters (if available)
5. **Board Seat Tracking** - Monitor press releases, company sites

**Implementation**:
- Create `enrich-contacts` scheduled Edge Function
- Runs daily/weekly for all contacts
- Updates fields incrementally
- Tracks "last_enriched_at" timestamp

---

## Matching Algorithm Improvements

### Current Matching Components

1. **Embedding Similarity** (30%) - Semantic matching via embeddings
2. **Semantic Score** (20%) - Keyword matching fallback
3. **Tag Overlap** (35%) - Jaccard similarity on sectors/stages
4. **Role Match** (15%) - Job title matching
5. **Geographic Match** (10%) - Location matching
6. **Relationship Score** (20%) - Strength of relationship

### Proposed New Matching Components

#### 1. Personal Affinity Score (15% weight)

Match personal interests, hobbies, causes:

```typescript
// Check for shared personal context
const personalAffinityScore = (): number => {
  const sharedInterests = intersection(
    conversation.personMentions, 
    contact.personal_interests
  );
  
  const sharedEducation = conversation.schoolMentioned && 
    contact.education.some(e => e.school === conversation.schoolMentioned);
  
  const sharedCauses = intersection(
    conversation.causes,
    contact.causes
  );
  
  return (sharedInterests.length * 0.4 +
          sharedEducation * 0.3 +
          sharedCauses.length * 0.3) / 3;
};
```

**Example**:
- Conversation: "Looking for investor, ideally MIT alum who understands STEM education"
- Contact: Sarah Chen (MIT PhD, supports STEM causes)
- **Personal Affinity**: 90% → Strong connection point!

#### 2. Expertise Depth Score (10% weight)

Match specific expertise beyond broad sectors:

```typescript
const expertiseDepthScore = (): number => {
  // Check if contact has deep expertise in specific areas mentioned
  const domainMatch = intersection(
    conversation.specific_domains, // e.g., ["drug discovery", "FDA approval"]
    contact.expertise_areas
  );
  
  const operatorMatch = conversation.needs_operator_experience &&
    contact.operator_background !== null;
  
  return (domainMatch.length * 0.7 + operatorMatch * 0.3);
};
```

#### 3. Value-Add Alignment (5% weight)

Match what founder needs help with to what contact offers:

```typescript
const valueAddScore = (): number => {
  const helpNeeded = conversation.help_areas; // ["hiring", "go-to-market"]
  const helpOffered = contact.value_add_areas;
  
  return jaccardSimilarity(helpNeeded, helpOffered);
};
```

---

## Implementation Priority

### 🔴 **Critical (Week 1-2)**

1. ✅ Add new database fields for personal/professional depth
2. ✅ Enhance `research-contact` prompt to extract richer data
3. ✅ Update matching algorithm to use new fields
4. ✅ Add personal affinity and expertise depth scoring

### 🟡 **High Value (Week 3-4)**

5. ✅ Integrate Proxycurl for LinkedIn enrichment
6. ✅ Build manual enrichment UI for users to add details
7. ✅ Add "Enrich Contact" button in UI
8. ✅ Progressive enrichment flow

### 🟢 **Nice to Have (Month 2+)**

9. ✅ Scheduled enrichment jobs (daily/weekly updates)
10. ✅ Social media monitoring
11. ✅ Portfolio tracking from Crunchbase
12. ✅ Newsletter/podcast scraping

---

## Expected Impact

### Before (Current)
- Average match quality: 60-70%
- Match reasons: Generic ("Sector match")
- Conversion rate: Low (founder doesn't see value)

### After (Rich Enrichment)
- Average match quality: 80-90%
- Match reasons: Specific ("MIT alum, Genentech overlap, drug discovery expert")
- Conversion rate: 3-5x higher (founder excited about intro)

---

## Next Steps

1. **Review & Approve** this enhancement plan
2. **Create database migration** for new fields
3. **Update research-contact** with enhanced prompts
4. **Test enrichment** on 5-10 real contacts
5. **Update matching algorithm** to use new data
6. **Build enrichment UI** for manual input
7. **Integrate Proxycurl** (or alternative)
8. **Roll out** to production

---

## Questions for Discussion

1. **Budget**: Can we allocate $50-100/month for Proxycurl API?
2. **Manual vs Automated**: How much manual enrichment are users willing to do?
3. **Privacy**: What personal data is appropriate to store/match on?
4. **Priorities**: Which fields are most important to add first?
5. **Data Sources**: Beyond LinkedIn, what other sources should we tap?

---

**Recommendation**: Start with Phase 1 (database + prompt enhancement) this week. This gives immediate value with minimal cost. Then evaluate Phase 2 (LinkedIn) based on early results.
