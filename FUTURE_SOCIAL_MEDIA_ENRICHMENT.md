# Future Feature: Social Media Enrichment

## 📝 Context

**Date Created:** January 27, 2025
**Status:** For exploration after current enrichment feature testing
**Priority:** Medium-High (good for understanding personal interests and network connections)

## 🎯 Goal

Enrich contact profiles with social media data to better understand:
- **Personal interests** (what they post about, engage with)
- **Network connections** (mutual connections, who they follow)
- **Content expertise** (topics they share, thought leadership)
- **Activity patterns** (how active, engagement levels)
- **Personality indicators** (tone, style, values)

## 🔍 Data Sources

### 1. Twitter/X (Easiest to Access)

**Official API (Paid):**
- **Twitter API v2** - https://developer.twitter.com/en/docs/twitter-api
- **Basic tier:** $100/month - 10K tweets/month
- **Pro tier:** $5K/month - 1M tweets/month
- **What you get:**
  - Recent tweets (last 7 days basic, 30 days pro)
  - Profile info (bio, followers, following)
  - Engagement metrics (likes, retweets)
  - Who they follow, who follows them

**Unofficial alternatives:**
- **Apify Twitter Scraper** - $49/month for moderate use
  - No API limits, scrapes directly
  - Can get full tweet history
  - Risk: Against Twitter TOS, could break
- **Bright Data** - Social media scraping proxy
  - $500+/month enterprise solution
  - Legal compliance handling

### 2. Instagram (More Restricted)

**Official API (Very Limited):**
- **Instagram Graph API** - Requires business accounts
- Only works for accounts that authorize your app
- **Not useful** for general contact enrichment

**Unofficial alternatives:**
- **Bright Data Instagram Scraper** - $500+/month
  - Public profile data only
  - Against Instagram TOS
  - High risk of blocks/bans
- **Apify Instagram Scraper** - $49+/month
  - Requires rotating proxies
  - Brittle, breaks frequently

### 3. LinkedIn (Already Covered)

**Status:** You already have this via Serper (searches for public LinkedIn data)

**Better alternatives:**
- **People Data Labs** (already integrated!) - Has social profile URLs
- **Proxycurl alternative: ScrapingBee** - $49+/month
  - NOT for LinkedIn specifically (shut down like Proxycurl)
  - General web scraping proxy

### 4. Modern Alternatives (Recommended)

**A. Use Existing APIs (Legal & Reliable):**

1. **People Data Labs** (you have this!)
   - Returns social profile URLs for contacts
   - Twitter handles, LinkedIn, GitHub, etc.
   - Then use official APIs to get details

2. **Clearbit Enrichment**
   - $99+/month
   - Includes social profiles and employment data
   - More focused on B2B contacts

3. **FullContact**
   - $99+/month
   - Person enrichment with social profiles
   - Good for consumer-facing contacts

**B. AI-Powered Analysis (Modern Approach):**

Instead of scraping, use **AI to analyze public content**:

1. **Perplexity AI API**
   - $20/month for 1K API calls
   - Ask: "What are [person's name] recent interests based on their public social media?"
   - Gets data from indexed social content (legal)
   - Returns structured insights

2. **Serper + GPT (what you have now)**
   - Search: "[person name] Twitter recent posts"
   - Search: "[person name] Instagram interests"
   - GPT extracts insights from search results
   - Legal, works today, very cheap

## ⚖️ Legal & Ethical Considerations

### What's Legal:
✅ Accessing public profiles via official APIs
✅ Analyzing publicly available search results
✅ Using enrichment services that comply with data laws
✅ Storing data users have consented to share

### What's Risky:
⚠️ Scraping without API (violates Terms of Service)
⚠️ Bypassing rate limits or blocks
⚠️ Storing data without consent notices
⚠️ Selling or sharing scraped data

### What's Illegal:
❌ Accessing private profiles without authorization
❌ Ignoring GDPR/CCPA data rights requests
❌ Using data for discrimination (housing, credit, employment)
❌ Violating Computer Fraud and Abuse Act (CFAA)

### Best Practices:
1. **Always use official APIs when available**
2. **Add privacy policy** explaining data collection
3. **Provide opt-out mechanisms** for contacts
4. **Store minimal data** (just insights, not full histories)
5. **Respect robots.txt and rate limits**
6. **Get user consent** before enriching their contacts

## 🏗️ Recommended Architecture (Legal & Modern)

```
User clicks Enrich
    ↓
Step 1: Get Social Handles (via People Data Labs or Serper)
    - Twitter: @username
    - Instagram: @username
    - LinkedIn: /in/profile
    ↓
Step 2: Analyze Public Content (Pick ONE approach)
    
    OPTION A: Official APIs (Best for Twitter)
    - Twitter API → Get recent tweets
    - Analyze with GPT → Extract interests, tone, topics
    - Cost: $100/month + $0.01 per GPT analysis
    
    OPTION B: Search + AI Analysis (Works for ALL)
    - Serper: "[name] Twitter recent posts"
    - Serper: "[name] Instagram bio"
    - GPT analyzes search results
    - Cost: $0.01 per search + $0.01 per analysis
    
    OPTION C: Perplexity AI (Easiest)
    - One API call: "What are [name]'s interests from social media?"
    - Returns summarized insights
    - Cost: $0.02 per query
    ↓
Step 3: Store Insights (not raw data)
    - Personal interests: ["hiking", "jazz", "AI/ML"]
    - Content topics: ["venture capital", "climate tech"]
    - Tone: "professional", "casual", "thought leader"
    - Activity level: "high" / "medium" / "low"
    ↓
Step 4: Use in Matching
    - Personal affinity scoring (already built!)
    - Conversation icebreakers
    - Intro email personalization
```

## 💰 Cost Comparison

| Approach | Setup Cost | Per Contact | Monthly (1K contacts) | Pros | Cons |
|----------|-----------|-------------|---------------------|------|------|
| **Twitter API + GPT** | $100/mo base | $0.02 | $120 | Official, reliable | Twitter only, expensive |
| **Serper + GPT** | $0 | $0.02 | $20 | Works for all platforms | Limited depth |
| **Perplexity AI** | $20/mo base | $0.02 | $40 | Easiest, works for all | Less structured data |
| **People Data Labs** | $0 | $0.03 | $30 | Verified social handles | No content analysis |
| **Apify Scraper** | $49/mo | $0.01 | $59 | Cheap, full history | Against TOS, breaks |

**Recommended:** Start with **Serper + GPT** (you already have this!)

## 🚀 Implementation Plan (Phase 1 - MVP)

### Step 1: Enhance Current Research Function

Add social media search to existing `research-contact`:

```typescript
// In research-contact/index.ts
const socialQueries = [
  `"${name}" Twitter bio interests`,
  `"${name}" Instagram about`,
  `"${name}" recent posts topics`
];

// Search and analyze
const socialContext = await searchAndAnalyzeSocial(socialQueries);

// Extract insights
const insights = {
  personal_interests: socialContext.interests,  // ["hiking", "photography"]
  content_topics: socialContext.topics,         // ["AI", "startups"]
  social_tone: socialContext.tone,              // "professional"
  activity_level: socialContext.activity        // "high"
};
```

**Cost:** $0.03 per contact (3 searches + 1 GPT analysis)
**Time:** +5-7 seconds per enrichment
**Quality:** Good for public figures, limited for private users

### Step 2: Add Social Insights Display

Update ContactCard to show:
- 📱 **Social Activity**: High/Medium/Low
- 💬 **Content Topics**: ["AI", "Climate Tech", "Venture Capital"]
- 🎨 **Tone**: Professional, Casual, Thought Leader

### Step 3: Use in Matching

Already built! Personal affinity scoring will use:
- `personal_interests` (already implemented)
- `content_topics` (can map to expertise_areas)

## 🔬 Testing Plan

1. **Test with public figures** (VCs, founders with active Twitter)
2. **Measure quality** - Do extracted interests match reality?
3. **Check costs** - Is $0.03 per contact worth it?
4. **Evaluate ROI** - Do social insights improve match quality?

## 📊 Success Metrics

- **Data Coverage**: % of contacts with social insights (target: 40%+)
- **Interest Accuracy**: Do interests match manual review? (target: 70%+)
- **Match Improvement**: Does personal affinity score increase? (target: +20%)
- **User Value**: Do users find social insights helpful? (qualitative)

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API rate limits | High | Implement queuing, respect limits |
| TOS violations | High | Only use official APIs or search |
| Poor data quality | Medium | Validate with multiple sources |
| Privacy concerns | High | Add opt-out, clear privacy policy |
| Cost overruns | Medium | Set monthly budget caps, monitor usage |

## 🎯 Future Enhancements (Phase 2)

1. **Official Twitter API Integration**
   - For high-value contacts only
   - Get full tweet history, follower analysis
   - Network overlap detection (mutual follows)

2. **Network Analysis**
   - Who do they follow? (industry signals)
   - Who follows them? (influence level)
   - Mutual connections with user

3. **Content Analysis**
   - Sentiment analysis on recent posts
   - Topic modeling (what do they tweet about most?)
   - Engagement patterns (when are they active?)

4. **Real-time Monitoring**
   - Alert when contact posts about relevant topics
   - Track when they follow new people in your network
   - Identify "warm up" opportunities before intro

## 🔗 Resources

- Twitter API Pricing: https://developer.twitter.com/en/pricing
- Instagram API Docs: https://developers.facebook.com/docs/instagram-api
- People Data Labs: https://www.peopledatalabs.com/
- Perplexity AI API: https://docs.perplexity.ai/
- GDPR Compliance Guide: https://gdpr.eu/
- CCPA Compliance: https://oag.ca.gov/privacy/ccpa

## 📋 Next Steps (After Current Testing)

1. [ ] Complete testing of current enrichment (education, career, interests)
2. [ ] Measure baseline match quality without social data
3. [ ] Review this document and refine approach
4. [ ] Decide: Serper+GPT vs Perplexity vs Twitter API
5. [ ] Implement Phase 1 MVP (add social search to research-contact)
6. [ ] Test on 20 contacts with active social media
7. [ ] Measure improvement in match quality
8. [ ] Decide if ROI justifies continuing

## 💡 Key Takeaway

**Start simple, legal, and cheap:**
- Use what you have (Serper + GPT)
- Focus on public figures (VCs, founders)
- Extract insights, not raw data
- Measure value before investing in expensive APIs

**Don't:**
- Scrape without APIs (legal risk)
- Store full social media histories (privacy risk)
- Use for private individuals (ethical issue)
- Spend $5K/month on Twitter API yet (cost risk)

---

**Status:** Ready to implement after current feature testing
**Estimated effort:** 2-3 days for Phase 1 MVP
**Expected ROI:** Medium-High (better personal context for matches)
