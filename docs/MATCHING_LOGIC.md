# Contact Matching Logic - Technical Documentation

This document describes the matching algorithms used in the Social Graph Connector application.

---

## Table of Contents

1. [CSV Import Column Mapping](#1-csv-import-column-mapping)
2. [Conversation-to-Contact Matching](#2-conversation-to-contact-matching)
3. [Fuzzy Name Matching](#3-fuzzy-name-matching)
4. [Utility Functions](#4-utility-functions)

---

## 1. CSV Import Column Mapping

**File:** `client/src/components/CsvUploadDialog.tsx`

When importing contacts from CSV, the system uses flexible column name matching. For each field, it checks multiple common naming conventions in priority order.

### Field Mapping Table

| Field | Accepted Column Names (checked in order) |
|-------|------------------------------------------|
| **First Name** | `First Name`, `first_name`, `firstName` |
| **Last Name** | `Last Name`, `last_name`, `lastName` |
| **Full Name** | `name`, `Name`, `full_name`, `Full Name`, `contact_name` |
| **Email** | `email`, `Email`, `email_address` |
| **Title** | `title`, `Title`, `position`, `Position` |
| **Company** | `company`, `Company`, `Company Name`, `organization`, `Organization` |
| **LinkedIn** | `linkedin`, `LinkedIn`, `Linkedin`, `linkedin_url`, `LinkedIn URL` |
| **Location** | `location`, `Location` |
| **Phone** | `phone`, `Phone` |
| **Category** | `category`, `Category`, `Catagory`, `catagory` |
| **Twitter** | `twitter`, `Twitter` |
| **AngelList** | `angellist`, `Angellist`, `Angel List`, `angel_list` |
| **Bio** | `bio`, `Bio`, `about`, `About`, `description`, `Description`, `summary`, `Summary`, `Company Description`, `company_description`, `Company About`, `company_about`, `Person Summary`, `person_summary`, `Profile`, `profile` |
| **Company Address** | `Company Address`, `company_address`, `Address`, `address`, `Company Street`, `company_street`, `HQ Address`, `hq_address` |
| **Company Employees** | `Company # of Employees`, `company_employees`, `Employees`, `employees`, `Company Size`, `company_size` |
| **Company Founded** | `Company Founded`, `company_founded`, `Founded`, `founded`, `Year Founded`, `year_founded` |
| **Company URL** | `Company URL`, `company_url`, `Website`, `website`, `Company Website`, `company_website`, `URL`, `url` |
| **Company LinkedIn** | `Company Linkedin`, `Company LinkedIn`, `company_linkedin` |
| **Company Twitter** | `Company Twitter`, `company_twitter` |
| **Company Facebook** | `Company Facebook`, `company_facebook` |

### Name Construction Logic

```javascript
const firstName = row['First Name'] || row.first_name || row.firstName || '';
const lastName = row['Last Name'] || row.last_name || row.lastName || '';

// Combine first + last if both exist, otherwise fall back to full name fields
const name = firstName && lastName 
  ? `${firstName} ${lastName}`.trim() 
  : row.name || row.Name || row.full_name || row['Full Name'] || row.contact_name || firstName || '';
```

### Validation Rules

#### Email Validation
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = emailRegex.test(email);
```

#### URL Validation
```javascript
function isValidUrl(str: string): boolean {
  if (!str || str.trim() === '') return false;
  try {
    const url = new URL(str.startsWith('http') ? str : `https://${str}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Applied to company URL field
const companyUrlRaw = row['Company URL'] || row.company_url || ...;
const companyUrl = isValidUrl(companyUrlRaw) ? companyUrlRaw : '';
```

#### LinkedIn URL Normalization
```javascript
function normalizeLinkedInUrl(url: string): string {
  if (!url) return '';
  
  // Extract the profile ID/username from various formats
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (match) {
    return `https://www.linkedin.com/in/${match[1]}`;
  }
  
  // If it's just a username, construct the full URL
  if (!url.includes('linkedin.com') && !url.includes('/')) {
    return `https://www.linkedin.com/in/${url}`;
  }
  
  return url;
}
```

---

## 2. Conversation-to-Contact Matching

**File:** `supabase/functions/generate-matches/index.ts`

This system matches contacts from the user's network against conversation content to suggest potential introductions.

### Weighted Scoring Algorithm (v1.3-coldstart)

The algorithm uses **adaptive weights** that change based on data availability:

#### With Embeddings Available (Preferred - v1.2)
When conversation and contact embeddings exist, the system uses semantic AI matching:

```javascript
const WEIGHTS = {
  embedding: 0.25,         // Semantic similarity via embeddings (bio + thesis)
  semantic: 0.10,          // Keyword fallback
  tagOverlap: 0.20,        // Tag/thesis overlap (confidence-weighted Jaccard)
  roleMatch: 0.10,         // Role/investor type matching
  geoMatch: 0.05,          // Geographic matching
  relationship: 0.10,      // Relationship strength
  personalAffinity: 0.15,  // Education, interests, expertise overlap
  checkSize: 0.05,         // Check-size range fit (investors)
};
```

#### Without Embeddings (Fallback)
When embeddings are unavailable, falls back to keyword matching:

```javascript
const WEIGHTS = {
  semantic: 0.15,          // Keyword matching
  tagOverlap: 0.25,        // Tag/thesis overlap (confidence-weighted Jaccard)
  roleMatch: 0.15,         // Role/investor type matching
  geoMatch: 0.05,          // Geographic matching
  relationship: 0.15,      // Relationship strength
  personalAffinity: 0.20,  // Education, interests, expertise overlap
  checkSize: 0.05,         // Check-size range fit (investors)
};
```

**Key Improvement**: Embedding-based matching captures semantic meaning, not just keywords. For example:
- "AI-powered drug discovery" matches "therapeutics platform" (semantic)
- vs. only matching exact keyword "drug discovery" (keyword)

### Score Calculation (v1.3 — cold-start normalization)

```javascript
// Determine which scoring components have data backing them
const dataAvailable = {
  embedding: !!(contactBioEmb || contactThesisEmb),
  semantic: true,
  tagOverlap: contactTags.length > 0,
  roleMatch: true,
  geoMatch: true,
  relationship: contact.relationship_strength != null && contact.relationship_strength !== 50,
  personalAffinity: !!(contact.education?.length || contact.personal_interests?.length
    || contact.expertise_areas?.length || contact.portfolio_companies?.length),
  checkSize: !!(contact.is_investor && (contact.check_size_min || contact.check_size_max)),
};

// Renormalize weights to only sum over available components
const activeComponents = Object.keys(WEIGHTS).filter(k => dataAvailable[k]);
const activeWeightSum = activeComponents.reduce((s, k) => s + WEIGHTS[k], 0);
const scale = activeWeightSum > 0 ? 1.0 / activeWeightSum : 1.0;

let rawScore = 0;
for (const k of activeComponents) {
  rawScore += WEIGHTS[k] * scale * componentScores[k];
}

// NAME MATCH BOOST - Add up to 0.3 to raw score for name mentions
if (matchDetails.nameMatch) {
  rawScore += 0.3 * matchDetails.nameMatchScore;
}

// Clamp raw score to 0-1
rawScore = Math.min(Math.max(rawScore, 0), 1);
```

This ensures a contact missing embeddings, tags, and check-size data isn't penalized for missing 50%+ of the weight budget. Instead, available components are rescaled to use the full [0, 1] range.

### Star Rating Thresholds

```javascript
let starScore = 0;
if (rawScore >= 0.40) {
  starScore = 3;  // ⭐⭐⭐
} else if (rawScore >= 0.20) {
  starScore = 2;  // ⭐⭐
} else if (rawScore >= 0.05) {
  starScore = 1;  // ⭐
}

// Only include matches with score >= 1 star
if (starScore >= 1) {
  // Include in results
}
```

### Individual Scoring Components

#### 2.0 Embedding Score (25% weight - v1.2)

Deep semantic similarity using OpenAI text-embedding-3-small (1536 dimensions). Uses the **best** of bio and thesis embeddings:

```javascript
const contactBioEmb = embeddingToArray(contact.bio_embedding);
const contactThesisEmb = embeddingToArray(contact.thesis_embedding);

if (hasEmbeddings && conversationEmbedding) {
  let bioSim = 0, thesisSim = 0;
  if (contactBioEmb) bioSim = cosineSimilarity(conversationEmbedding, contactBioEmb);
  if (contactThesisEmb) thesisSim = cosineSimilarity(conversationEmbedding, contactThesisEmb);
  matchDetails.embeddingScore = Math.max(bioSim, thesisSim);
}
```

**Embedding generation (with instruction prefixes for asymmetric retrieval):**
- Contact embeddings: `embed-contact` edge function (single + batch mode)
  - `bio_embedding`: `"Professional profile for networking and introductions: "` + bio, title, company, personal_interests, expertise_areas, portfolio_companies
  - `thesis_embedding`: `"Investment thesis and focus areas: "` + investor_notes
  - Model: `text-embedding-3-small` (1536 dimensions)
- Conversation embeddings: `embed-conversation` edge function
  - `"Search query for finding relevant professional contacts: "` + context from target_person, goals_and_needs, domains_and_topics, matching_intent
- Client wrappers: `embedContact()`, `embedContactBatch()`, `embedConversation()` in `edgeFunctions.ts`
- **Re-embedding required** when prefixes change — use the "Embed All" UI button or run a one-time batch.

**When embeddings are available**:
- Captures semantic meaning beyond keywords
- "AI drug discovery" matches "therapeutics platform"
- Thesis embedding allows investor-specific matching (investor_notes content)

**When embeddings are not available**:
- Falls back to keyword matching (semantic score)
- System continues to work with degraded quality

#### 2.1 Semantic Score (10-20% weight)

Keyword matching between conversation entities and contact profile text (fallback when embeddings unavailable):

```javascript
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
```

#### 2.2 Tag Overlap Score (20% weight)

Uses confidence-weighted Jaccard similarity between conversation tags and contact tags. Entity confidence from extraction weights each tag's contribution:

```javascript
// Build weighted entities from conversation_entities (with confidence)
const weightedEntities = entities
  .filter(e => ['sector', 'stage', 'geo'].includes(e.entity_type))
  .map(e => ({ value: e.value, weight: parseFloat(e.confidence) || 0.5 }));

// Rich-context keywords get default confidence of 0.7
for (const kw of richKeywords) {
  weightedEntities.push({ value: kw, weight: 0.7 });
}

// Scoring uses weightedJaccardSimilarity when confidence data available
matchDetails.tagOverlapScore = weightedEntities.length > 0
  ? weightedJaccardSimilarity(weightedEntities, contactTags)
  : jaccardSimilarity(conversationTags, contactTags);
```

Contact tags are built from theses (sectors, stages, geos), contact_type, and investment keywords extracted from bio/title/notes.

#### 2.3 Role Match Score (15% weight)

Matches investor types from conversation against contact's role:

```javascript
// If conversation mentions looking for specific investor types
// and contact has matching investor type tags (GP, Angel, LP, etc.)
// Score is 1.0 for match, 0 for no match
```

#### 2.4 Geographic Match Score (10% weight)

Matches geographic focus areas:

```javascript
// Compares conversation geos (e.g., "Bay Area", "NYC", "Europe")
// against contact's geographic tags from their thesis
// Score is 1.0 for match, 0 for no match
```

#### 2.5 Relationship Strength Score (20% weight)

Uses the `relationship_strength` field (0-100) from the contacts table:

```javascript
matchDetails.relationshipScore = (contact.relationship_strength || 0) / 100;
```

### AI Explanation Generation

For 2+ star matches, the system generates AI explanations using GPT-4o-mini:

```javascript
const openai = new OpenAI({ apiKey: openaiKey });
const matchesToExplain = topMatches.filter(m => m.score >= 2).slice(0, 5);

for (const match of matchesToExplain) {
  const prompt = `You are an expert connector who helps facilitate warm introductions...
  
CONVERSATION CONTEXT:
${transcriptSummary}
Topics discussed: ${conversationTags.slice(0, 10).join(', ')}
${fundraisingContext}
${hiringContext}

POTENTIAL CONNECTION:
Name: ${match.contact_name}
Role: ${match.contactInfo?.title}
Company: ${match.contactInfo?.company}
About: ${match.contactInfo?.bio}
Match reasons: ${match.reasons.join(', ')}

Write a warm, professional explanation (1-2 sentences)...`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7,
  });
  
  match.ai_explanation = response.choices[0]?.message?.content?.trim();
}
```

---

## 3. Fuzzy Name Matching

**File:** `supabase/functions/generate-matches/index.ts`

The `fuzzyNameMatch` function provides flexible name matching with similarity scoring.

### Match Types and Scores

| Match Type | Score | Description |
|------------|-------|-------------|
| `exact` | 1.00 | Exact string match |
| `contains` | 0.95 | One name contains the other (e.g., "Roy Bahat" in "Roy E. Bahat") |
| `full` | 0.90 | First + last name match exactly |
| `nickname-full` | 0.85 | First name is nickname + last name matches |
| `first-only` | 0.70 | Only first name mentioned, exact match |
| `first-nickname` | 0.65 | Only first name mentioned, nickname match |
| `levenshtein` | 0.60 | Close spelling (Levenshtein distance ≤ 2) |
| `partial` | 0.50 | First or last name matches |
| `none` | 0.00 | No match |

### Nickname Mapping

```javascript
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
  'dan': ['daniel', 'danny'],
  'daniel': ['dan', 'danny'],
  'tom': ['thomas', 'tommy'],
  'thomas': ['tom', 'tommy'],
  'joe': ['joseph', 'joey'],
  'joseph': ['joe', 'joey'],
  'alex': ['alexander', 'alexandra', 'alexis'],
  'alexander': ['alex'],
  'chris': ['christopher', 'christine', 'christina'],
  'christopher': ['chris'],
  'nick': ['nicholas', 'nicolas'],
  'nicholas': ['nick'],
  'sam': ['samuel', 'samantha'],
  'samuel': ['sam'],
  'ben': ['benjamin', 'benny'],
  'benjamin': ['ben', 'benny'],
  'steve': ['steven', 'stephen'],
  'steven': ['steve'],
  'stephen': ['steve'],
  'dave': ['david'],
  'david': ['dave'],
  'tony': ['anthony'],
  'anthony': ['tony'],
  'ed': ['edward', 'edwin', 'eddie'],
  'edward': ['ed', 'eddie'],
  'rick': ['richard', 'ricky', 'dick'],
  'richard': ['rick', 'ricky', 'dick'],
  'andy': ['andrew'],
  'andrew': ['andy'],
  'pat': ['patrick', 'patricia'],
  'patrick': ['pat'],
  'jen': ['jennifer', 'jenny'],
  'jennifer': ['jen', 'jenny'],
  'kate': ['katherine', 'catherine', 'kathy'],
  'katherine': ['kate', 'kathy'],
  'liz': ['elizabeth', 'beth', 'lizzy'],
  'elizabeth': ['liz', 'beth', 'lizzy'],
};
```

### Full Implementation

```javascript
function fuzzyNameMatch(mentionedName: string, contactName: string): { 
  match: boolean; 
  score: number; 
  type: string 
} {
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
    if (nicknames[singleName]?.includes(contactFirst) || 
        nicknames[contactFirst]?.includes(singleName)) {
      return { match: true, score: 0.65, type: 'first-nickname' };
    }
    
    return { match: false, score: 0, type: 'none' };
  }
  
  // Need at least 2 parts for mentioned and 1 for contact
  if (mentionedParts.length < 2 || contactParts.length < 1) {
    return { match: false, score: 0, type: 'none' };
  }
  
  const mentionedFirst = mentionedParts[0];
  const mentionedLast = mentionedParts[mentionedParts.length - 1];
  const contactFirst = contactParts[0];
  const contactLast = contactParts[contactParts.length - 1];
  
  // Check for full name match (first + last)
  const firstMatches = mentionedFirst === contactFirst || 
    nicknames[mentionedFirst]?.includes(contactFirst) || 
    nicknames[contactFirst]?.includes(mentionedFirst);
  const lastMatches = mentionedLast === contactLast;
  
  if (firstMatches && lastMatches) {
    const isNickname = mentionedFirst !== contactFirst;
    return { 
      match: true, 
      score: isNickname ? 0.85 : 0.90, 
      type: isNickname ? 'nickname-full' : 'full' 
    };
  }
  
  // Levenshtein distance for close matches
  const distance = levenshteinDistance(mentioned, contact);
  if (distance <= 2 && mentioned.length > 4) {
    return { match: true, score: 0.60, type: 'levenshtein' };
  }
  
  // Partial match (first OR last matches)
  if (firstMatches || lastMatches) {
    return { match: true, score: 0.50, type: 'partial' };
  }
  
  return { match: false, score: 0, type: 'none' };
}
```

---

## 4. Utility Functions

### Levenshtein Distance

Calculates edit distance between two strings:

```javascript
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
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}
```

### Jaccard Similarity

Calculates set overlap for tag matching:

```javascript
function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 0;
  
  const s1 = new Set(set1.map(s => s.toLowerCase()));
  const s2 = new Set(set2.map(s => s.toLowerCase()));
  
  const intersection = [...s1].filter(x => s2.has(x)).length;
  const union = new Set([...s1, ...s2]).size;
  
  return union > 0 ? intersection / union : 0;
}
```

### Check Size Parsing

Converts check size strings to numbers:

```javascript
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

// Examples:
// "$5M" → 5000000
// "500k" → 500000
// "$2.5 million" → 2500000
// "10,000" → 10000
```

### Partial String Matching

Checks if a value matches any item in an array:

```javascript
function matchesAny(value: string, items: string[]): boolean {
  const valueLower = value.toLowerCase();
  return items.some(item => {
    const itemLower = item.toLowerCase();
    return valueLower.includes(itemLower) || itemLower.includes(valueLower);
  });
}
```

---

## Database Schema References

### Contacts Table (relevant fields)

```sql
contacts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  company TEXT,
  bio TEXT,
  location TEXT,
  contact_type TEXT[],        -- ['GP', 'Angel', 'LP', 'Startup', etc.]
  is_investor BOOLEAN,
  investor_notes TEXT,
  relationship_strength INTEGER,  -- 0-100
  ...
)
```

### Investment Theses Table

```sql
investment_theses (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts,
  sectors TEXT[],             -- ['SaaS', 'Fintech', 'AI']
  stages TEXT[],              -- ['Seed', 'Series A']
  geos TEXT[],                -- ['Bay Area', 'NYC']
  check_size_min INTEGER,
  check_size_max INTEGER,
  keywords TEXT[],
  ...
)
```

### Match Suggestions Table

```sql
match_suggestions (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations,
  contact_id UUID REFERENCES contacts,
  score INTEGER,              -- Star rating 1-3
  raw_score FLOAT,            -- 0.0-1.0 weighted score
  reasons TEXT[],
  ai_explanation TEXT,
  score_breakdown JSONB,      -- Individual component scores
  confidence_scores JSONB,    -- Confidence per component (0-1)
  match_version TEXT,         -- Algorithm version tag
  ...
)
```

### Score Breakdown (JSONB)

Persisted per match and shown in the UI breakdown component:

| Field | Type | Description |
|-------|------|-------------|
| `embedding` | float (optional) | Embedding-based semantic similarity — max of bio and thesis (when available) |
| `semantic` | float | Keyword matching score |
| `tagOverlap` | float | Confidence-weighted Jaccard similarity of tags |
| `roleMatch` | float | Role/type alignment |
| `geoMatch` | float | Geographic proximity |
| `relationship` | float | Existing relationship strength |
| `personalAffinity` | float | Shared education, interests, portfolio, expertise |
| `checkSize` | float | Check-size range fit (investors only) |
| `nameMatch` | float (optional) | Name mention boost |
| `_available` | object | Map of component → boolean indicating which components had data (for cold-start debugging) |

### Confidence Scores (JSONB)

Persisted alongside `score_breakdown`; each value 0-1:

| Field | Description |
|-------|-------------|
| `semantic` | Confidence in keyword match (based on # of keywords matched) |
| `tagOverlap` | Confidence in tag comparison (based on tag count) |
| `roleMatch` | Confidence in role alignment |
| `geoMatch` | Confidence in location data |
| `relationship` | Confidence in relationship data |
| `overall` | Weighted overall confidence |

---

## Version History

- **v1.0** - Initial implementation with weighted scoring
- **v1.1** - Added fuzzy name matching with nicknames
- **v1.2** - Increased tag overlap weight, added AI explanations
- **v1.3** - Added URL validation for CSV imports
- **v1.1-transparency** - Added score_breakdown, confidence_scores, match_version, personalAffinity factor
- **v1.2-signals** - Added thesis_embedding in scoring (max of bio + thesis), checkSizeFit (5% weight), entity confidence weighting for tag overlap via weightedJaccardSimilarity, offline evaluation pipeline (golden set, precision@k, weight tuning)
- **v1.3-coldstart** - Cold-start weight normalization (renormalize weights per-contact for missing data), instruction prefixes for asymmetric embedding retrieval, MRR and NDCG@5 eval metrics with 90% bootstrap CIs, pairwise logistic regression ranker in tune-weights

---

*Last updated: February 2026*
