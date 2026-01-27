# Research Contact Enhancement - Implementation Options

**Current Problem**: We're asking GPT to "generate" bios when we should be **searching** for real data.

---

## Option 1: Perplexity AI (Recommended - Easiest) ⭐

**Why**: Perplexity has built-in web search, returns sources, very accurate.

**Cost**: $5/1M tokens (vs OpenAI $0.15/1M) - Actually cheaper!

**Implementation**:

```typescript
async function enrichContactWithPerplexity(
  name: string,
  company: string | null,
  location: string | null,
  linkedinUrl: string | null
) {
  const prompt = `Research this person and extract comprehensive factual information:

Name: ${name}
${company ? `Company: ${company}` : ''}
${location ? `Location: ${location}` : ''}
${linkedinUrl ? `LinkedIn: ${linkedinUrl}` : ''}

Search for their LinkedIn profile, company bio, Crunchbase, AngelList, and recent interviews.

Extract this structured data (return ONLY factual info found, use null if not found):
- Bio (2-3 sentences from real sources)
- Education (schools, degrees, years)
- Career history (previous companies, roles)
- Expertise areas (specific domains)
- Personal interests (hobbies, sports teams, causes)
- Investment focus (if investor: sectors, stages, portfolio companies)
- Thought leadership (blog, podcast, speaking)
- Board seats and advisory roles

Return as structured JSON with sources for each field.`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',  // Their web-search model
      messages: [
        { role: 'system', content: 'You are a professional researcher. Always cite sources and return factual information only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,  // Low temp for factual accuracy
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**Pros**:
- ✅ Built-in web search (no separate API needed)
- ✅ Returns sources/citations
- ✅ More accurate than GPT hallucinations
- ✅ Actually cheaper than GPT-4
- ✅ Easy to implement (just swap API endpoint)

**Cons**:
- ⚠️ Need to sign up for Perplexity API key
- ⚠️ Less well-known than OpenAI

---

## Option 2: GPT-4 + Serper API (Google Search)

**Why**: Combines OpenAI with real Google search results.

**Cost**: OpenAI $0.15/1M tokens + Serper $50/month (5K searches)

**Implementation**:

```typescript
async function searchWeb(query: string) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: 10,
    }),
  });
  
  const data = await response.json();
  return data.organic; // Array of search results
}

async function enrichContactWithSearch(name: string, company: string | null) {
  // Step 1: Do actual web searches
  const queries = [
    `${name} ${company || ''} LinkedIn profile`,
    `${name} ${company || ''} investor portfolio`,
    `${name} ${company || ''} biography`,
  ];
  
  const searchResults = await Promise.all(
    queries.map(q => searchWeb(q))
  );
  
  // Step 2: Feed search results to GPT for extraction
  const prompt = `You are analyzing web search results about an investor.

SEARCH RESULTS:
${JSON.stringify(searchResults, null, 2)}

Extract structured information from these REAL search results:
{
  "bio": "2-3 sentences from actual sources",
  "education": [...],
  "portfolio_companies": [...],
  "personal_interests": [...]
}

Only include information actually found in the search results above.`;

  const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });
  
  return await gptResponse.json();
}
```

**Pros**:
- ✅ Uses Google search (most comprehensive)
- ✅ GPT-4 for extraction (proven model)
- ✅ More control over search queries

**Cons**:
- ❌ More complex (two API calls)
- ❌ More expensive ($50/month + OpenAI costs)
- ❌ Need to manage two services

---

## Option 3: GPT-4 with Function Calling (Built-in)

**Why**: Use OpenAI's function calling feature to trigger searches.

**Cost**: Just OpenAI costs ($0.15/1M tokens)

**Implementation**:

```typescript
const tools = [{
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web for information about a person",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        }
      },
      required: ["query"]
    }
  }
}];

// GPT will request searches, we execute them, GPT extracts data
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "user", content: `Research ${name} at ${company} and extract structured data` }
  ],
  tools: tools,
  tool_choice: "auto",
});

// If GPT requests a search, execute it
if (response.choices[0].message.tool_calls) {
  const searchQuery = response.choices[0].message.tool_calls[0].function.arguments;
  const searchResults = await searchWeb(JSON.parse(searchQuery).query);
  
  // Send results back to GPT for extraction
  // ... follow-up call with results
}
```

**Pros**:
- ✅ Structured approach with GPT deciding what to search
- ✅ More intelligent (GPT chooses search strategy)

**Cons**:
- ❌ Complex multi-step flow
- ❌ Still needs search API (Serper/similar)
- ❌ More tokens used (multiple calls)

---

## Option 4: Proxycurl (LinkedIn Specific) 💰

**Why**: Specialized LinkedIn scraping API with structured data.

**Cost**: $0.02-0.10 per profile lookup

**Implementation**:

```typescript
async function enrichFromLinkedIn(linkedinUrl: string) {
  const response = await fetch('https://nubela.co/proxycurl/api/v2/linkedin', {
    headers: {
      'Authorization': `Bearer ${PROXYCURL_API_KEY}`
    },
    params: {
      url: linkedinUrl,
      skills: 'include',
      inferred_salary: 'include',
      personal_email: 'include',
      personal_contact_number: 'include',
      twitter_profile_id: 'include',
      facebook_profile_id: 'include',
      github_profile_id: 'include',
      extra: 'include',
    }
  });
  
  return response.json();
  // Returns: education, experiences, skills, accomplishments, etc.
}
```

**Pros**:
- ✅ Highest quality LinkedIn data
- ✅ Structured, reliable format
- ✅ Includes email, phone, social profiles
- ✅ Education, experience, skills all parsed

**Cons**:
- ❌ Costs per lookup ($0.02-0.10 each)
- ❌ LinkedIn only (no portfolio, interests beyond LinkedIn)
- ❌ Need LinkedIn URL

---

## Recommended Implementation Strategy

### Phase 1: Quick Win (This Week)

**Use Perplexity AI** for initial enrichment:

```typescript
// In research-contact/index.ts
import { enrichWithPerplexity } from './perplexity-enrichment.ts';

// Replace current generateBioWithChatAPI with:
const enrichedData = await enrichWithPerplexity(
  contact.name,
  contact.company,
  contact.location,
  contact.linkedin_url
);

// Parse structured data and update contact
```

**Cost**: ~$5/month for 1000 enrichments
**Effort**: 2-3 hours
**Value**: 10x better data quality

### Phase 2: LinkedIn Integration (Next Week)

Add Proxycurl for contacts with LinkedIn URLs:

```typescript
if (contact.linkedin_url) {
  const linkedinData = await enrichFromProxycurl(contact.linkedin_url);
  // Merge with Perplexity data
}
```

**Cost**: $20-100/month (depends on usage)
**Effort**: 4-6 hours
**Value**: Most accurate professional data

### Phase 3: Continuous Enrichment (Month 2)

Build scheduled jobs to re-enrich contacts weekly:
- Check for new portfolio investments
- Monitor social media for interests
- Track speaking engagements

---

## Sample Enhanced Output

### Before (Current):
```json
{
  "name": "Sarah Chen",
  "title": "Partner",
  "company": "BioVentures Capital",
  "bio": "Early-stage biotech investor with experience in therapeutics.",
  "investor_notes": "Focuses on seed and Series A biotech companies."
}
```

### After (Perplexity):
```json
{
  "name": "Sarah Chen",
  "title": "Partner",
  "company": "BioVentures Capital",
  "bio": "Former VP R&D at Genentech (2008-2018) turned biotech investor. Led development of 3 FDA-approved therapeutics. Focuses on AI-driven drug discovery and precision medicine.",
  
  "education": [
    {"school": "MIT", "degree": "PhD", "field": "Molecular Biology", "year": 2008}
  ],
  
  "career_history": [
    {"company": "Genentech", "role": "VP R&D", "years": "2008-2018"},
    {"company": "BioVentures Capital", "role": "Partner", "years": "2018-present"}
  ],
  
  "expertise_areas": [
    "drug discovery",
    "FDA regulatory",
    "clinical trials",
    "AI/ML in biotech"
  ],
  
  "personal_interests": [
    "rock climbing",
    "jazz music",
    "Boston Celtics"
  ],
  
  "causes": [
    "STEM education",
    "women in biotech"
  ],
  
  "portfolio_companies": [
    "Recursion Pharmaceuticals",
    "Insitro",
    "Generate Biomedicines"
  ],
  
  "thought_leadership": {
    "newsletter": "Drug Discovery Digest (weekly)",
    "podcast": "Monthly guest on a16z Bio podcast",
    "speaking": ["JPM Healthcare Conference 2024", "Bio-IT World"]
  },
  
  "board_seats": [
    "Recursion Pharmaceuticals (Board Observer)",
    "MIT Biology Alumni Association (Board Member)"
  ],
  
  "value_add": [
    "FDA submission strategy",
    "CMC expertise",
    "Scientific advisory board recruitment"
  ]
}
```

---

## Cost Comparison (1000 contacts/month)

| Solution | Cost | Quality | Effort |
|----------|------|---------|--------|
| Current (fake data) | $2 | ⭐ | Done |
| Perplexity | $5 | ⭐⭐⭐⭐ | 2-3 hrs |
| GPT + Serper | $60 | ⭐⭐⭐⭐ | 6-8 hrs |
| Proxycurl only | $20-100 | ⭐⭐⭐⭐⭐ | 4-6 hrs |
| Perplexity + Proxycurl | $25-105 | ⭐⭐⭐⭐⭐ | 6-8 hrs |

---

## Next Steps

1. **Sign up for Perplexity API** (https://perplexity.ai/api)
2. **Update research-contact function** with enhanced prompts
3. **Test on 5-10 contacts** to verify data quality
4. **Evaluate if Proxycurl** is worth adding
5. **Roll out to production**

**Want me to implement Option 1 (Perplexity) right now?** It's the fastest path to 10x better data.
