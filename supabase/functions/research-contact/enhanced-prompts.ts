// Enhanced Research Contact Prompts
// These leverage web search and real data gathering

export const ENHANCED_BIO_PROMPT = (
  name: string, 
  company: string | null, 
  title: string | null,
  location: string | null,
  linkedinUrl: string | null
) => `You are an expert researcher with access to the internet. Research this person and extract comprehensive, FACTUAL information.

TARGET PERSON:
- Name: ${name}
${company ? `- Company: ${company}` : ''}
${title ? `- Title: ${title}` : ''}
${location ? `- Location: ${location}` : ''}
${linkedinUrl ? `- LinkedIn: ${linkedinUrl}` : ''}

RESEARCH INSTRUCTIONS:
1. Search for "${name}" ${company ? `at "${company}"` : ''} ${location ? `in ${location}` : ''}
2. Look for their LinkedIn profile, company website bio, Crunchbase, AngelList, press mentions
3. If they're an investor, check their firm's website for portfolio and focus areas
4. Extract REAL information - do not make up or infer details

EXTRACT ALL AVAILABLE DATA:
{
  "bio": "2-3 sentence factual professional summary based on real data found",
  "title": "Their actual job title (or best guess if unclear)",
  "company": "Their current company/firm",
  "location": "Their location (city/region)",
  "linkedin_url": "Their LinkedIn URL if found",
  "company_url": "Company/firm website URL if found",
  
  "education": [
    {"school": "MIT", "degree": "PhD", "field": "Computer Science", "year": 2015}
  ],
  
  "career_history": [
    {"company": "Google", "role": "Product Manager", "years": "2015-2020"},
    {"company": "Facebook", "role": "Senior PM", "years": "2020-2023"}
  ],
  
  "expertise_areas": ["marketplaces", "consumer tech", "growth"],
  
  "personal_interests": ["rock climbing", "jazz music", "photography"],
  "hobbies": ["skiing", "cooking", "travel"],
  "sports_teams": ["Boston Celtics", "New England Patriots"],
  "causes": ["STEM education", "climate tech", "mental health"],
  
  "achievements": [
    "Led product to $50M ARR",
    "3 successful exits as early employee"
  ],
  
  "thought_leadership": {
    "blog": "https://example.com/blog",
    "podcast": "Appears monthly on TechCrunch Live",
    "newsletter": "Growth Tactics Weekly",
    "speaking": ["SaaStr Annual", "Web Summit 2023"]
  },
  
  "board_seats": ["Acme Corp (Board Member)", "Beta Inc (Advisor)"],
  
  "geographic_ties": {
    "hometown": "Boston, MA",
    "places_lived": ["San Francisco", "New York", "Boston"],
    "current_location": "San Francisco, CA"
  },
  
  "found": true
}

CRITICAL RULES:
- Extract ONLY factual information you can verify from search results
- If information is not available, use null or empty array []
- Do NOT make up or infer personal details
- Focus on publicly available professional information
- LinkedIn is usually the best source - prioritize that
- Personal interests should come from "About" sections, social media, or interviews
- Return valid JSON only`;

export const ENHANCED_INVESTOR_PROMPT = (
  name: string,
  company: string | null,
  title: string | null,
  location: string | null,
  linkedinUrl: string | null
) => `You are a VC industry expert researcher. Research this investor and extract comprehensive, FACTUAL investment data.

TARGET INVESTOR:
- Name: ${name}
${company ? `- Fund/Firm: ${company}` : ''}
${title ? `- Title: ${title}` : ''}
${location ? `- Location: ${location}` : ''}
${linkedinUrl ? `- LinkedIn: ${linkedinUrl}` : ''}

RESEARCH INSTRUCTIONS:
1. Search for "${name}" ${company ? `at "${company}"` : ''} ${location ? `in ${location}` : ''}
2. Check: Firm website, Crunchbase, PitchBook, AngelList, LinkedIn, personal website
3. Look for portfolio companies, investment thesis, past investments
4. Extract their actual investment focus and preferences

EXTRACT INVESTMENT PROFILE:
{
  "thesis_summary": "2-3 sentence factual description of their investment focus",
  
  "sectors": ["Fintech", "B2B SaaS", "Healthcare"],
  "stages": ["Seed", "Series A"],
  "check_sizes": ["$500K-$2M"],
  "geographic_focus": ["US", "UK"],
  
  "investment_criteria": {
    "minimum_arr": "$500K",
    "team_size": "5-15 people",
    "founder_background": "Technical founders preferred",
    "special_requirements": ["Must have product-market fit"]
  },
  
  "portfolio_companies": [
    "Stripe",
    "Plaid", 
    "Rippling"
  ],
  
  "notable_exits": [
    "Twilio (IPO 2016)",
    "Segment (acquired by Twilio)"
  ],
  
  "investment_velocity": "3-5 deals per year",
  "typical_ownership": "10-15%",
  
  "value_add": [
    "Go-to-market strategy",
    "Engineering hiring",
    "Follow-on fundraising"
  ],
  
  "decision_process": {
    "solo_check": false,
    "committee_vote": true,
    "typical_timeline": "2-4 weeks",
    "warm_intro_required": true
  },
  
  "fund_size": "$100M",
  "fund_vintage": "2022",
  "fund_number": "Fund III",
  "aum": "$250M",
  
  "operator_background": {
    "was_founder": true,
    "companies_built": ["Acme Corp (sold to Google)"],
    "expertise": "Scaled from 0 to $50M ARR"
  },
  
  "found": true
}

CRITICAL RULES:
- Extract ONLY factual information you can verify from search results
- Portfolio companies should be verifiable (check Crunchbase/firm website)
- Investment criteria should be from firm website or interviews
- If information is not available, use null or empty array []
- Do NOT make up portfolio companies or investment amounts
- Prioritize recent information (last 2-3 years)
- Return valid JSON only`;

export const WEB_SEARCH_PROMPT = (name: string, company: string | null, focusArea: string) => `Search the web for comprehensive information about this person:

Name: ${name}
${company ? `Company: ${company}` : ''}
Focus: ${focusArea}

Recommended searches:
1. "${name}" ${company ? `"${company}"` : ''} LinkedIn
2. "${name}" ${company ? `"${company}"` : ''} Crunchbase
3. "${name}" ${company ? `"${company}"` : ''} interview
4. "${name}" ${company ? `"${company}"` : ''} portfolio
5. "${name}" bio about

Extract all relevant professional and personal information found.`;
