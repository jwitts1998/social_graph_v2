# Serper API Setup Instructions

**Status**: ⚠️ API Key needs activation
**Issue**: Got 403 error when testing

---

## Setup Steps

### 1. Sign Up / Verify API Key

The API key you provided might not be activated yet. Please:

1. **Go to**: https://serper.dev/
2. **Sign in** or **Create account** (Google login works)
3. **Go to Dashboard**: https://serper.dev/dashboard
4. **Check your API key**:
   - Look for "API Key" section
   - Verify it matches: `45aeecae352d63b5bd42a25be93e11b4759bcf4b91dbff96d73a34df65490783`
   - If different, use the new one

5. **Check usage limits**:
   - Free tier: 2,500 searches/month
   - Make sure you're on free or paid plan

### 2. Add to Supabase

Once verified, add to Supabase Edge Functions:

1. **Go to**: https://supabase.com/dashboard/project/mtelyxosqqaeadrrrtgk/settings/functions
2. **Click "Manage secrets"**
3. **Add secret**:
   - Name: `SERPER_API_KEY`
   - Value: `<your-active-api-key-from-serper-dashboard>`
4. **Save**

### 3. Test Locally

After activating, test it works:

```bash
cd /Users/jacksonwittenberg/dev/projects/social_graph_v2
npx tsx scripts/test-enhanced-research.ts search
```

**Expected output**:
```
🔍 Testing Web Search
Target: Marc Andreessen at Andreessen Horowitz
Query: "Marc Andreessen" "Andreessen Horowitz" LinkedIn profile

✅ Found 5 search results:

1. Marc Andreessen - Andreessen Horowitz
   https://a16z.com/author/marc-andreessen/
   Marc Andreessen is a cofounder and general partner at Andreessen Horowitz...

2. Marc Andreessen | LinkedIn
   https://www.linkedin.com/in/pmarca
   Experience: Andreessen Horowitz · Location: San Francisco Bay Area...
```

---

## Alternative: Get New API Key

If the provided key doesn't work, create a fresh one:

### Step-by-Step:

1. **Go to**: https://serper.dev/
2. **Click "Get Started Free"** or **"Sign In"**
3. **Sign up with Google** (easiest)
4. **Go to Dashboard**: https://serper.dev/dashboard
5. **Copy your API key**
6. **Add to Supabase** (see step 2 above)

---

## What Happens Without Serper?

If you don't add the Serper API key:

### Without Serper (Current):
- ❌ ChatGPT generates "realistic" bios (hallucinations)
- ❌ No real data from LinkedIn, Crunchbase
- ❌ Generic, shallow profiles

### With Serper (Enhanced):
- ✅ Real Google search results
- ✅ ChatGPT extracts from actual web pages
- ✅ LinkedIn profiles, Crunchbase data, company bios
- ✅ Education, career history, portfolio companies
- ✅ Personal interests from About sections

**Impact**: 10x better matching because contacts have rich, real data

---

## Pricing Reference

### Serper.dev:
- **Free**: 2,500 searches/month ($0)
- **Paid**: $50/month = 5,000 searches
- **Per search**: ~$0.01

### Usage:
- **2-3 searches per contact** (LinkedIn, Crunchbase, bio)
- **Free tier = ~1,000 contacts/month**
- **More than enough for most users**

---

## Quick Test Once Set Up

After adding SERPER_API_KEY to Supabase:

### Test in Your App:

1. Go to: http://localhost:3001/contacts
2. Create test contact:
   - Name: "Marc Andreessen"
   - Company: "Andreessen Horowitz"
   - Title: "Co-founder & General Partner"
3. Click **"Research Contact"** button
4. Wait 10-15 seconds
5. Refresh page
6. Check bio and investor_notes

**Expected Bio**:
> "Marc Andreessen is co-founder and general partner of venture capital firm Andreessen Horowitz. He co-created the Mosaic web browser and co-founded Netscape. Prior to a16z, he served on the boards of Facebook, eBay, and Hewlett-Packard."

**Expected Enhanced Data** (in investor_notes):
```json
{
  "education": [
    {"school": "University of Illinois", "degree": "BS", "field": "Computer Science"}
  ],
  "career_history": [
    {"company": "Netscape", "role": "Co-founder", "years": "1994-1999"},
    {"company": "Opsware", "role": "Co-founder & CEO", "years": "1999-2007"},
    {"company": "Andreessen Horowitz", "role": "Co-founder & GP", "years": "2009-present"}
  ],
  "portfolio_companies": [
    "Facebook", "Coinbase", "Airbnb", "Lyft", "Pinterest", "Twitter"
  ],
  "expertise_areas": [
    "consumer internet", "cryptocurrency", "artificial intelligence", "web3"
  ]
}
```

---

## Troubleshooting

### 403 Error:
- ✅ Check API key is activated at serper.dev
- ✅ Verify you're logged in and have free/paid plan
- ✅ Try generating new API key

### 429 Error (Rate Limit):
- ⚠️ Hit 2,500 search limit (free tier)
- ✅ Upgrade to paid plan or wait for monthly reset

### Empty Results:
- ⚠️ Search query might be too specific
- ✅ Check contact has name + company filled in
- ✅ Try with well-known person (e.g., Marc Andreessen)

---

## Next Steps

1. ✅ **Activate Serper API** at serper.dev
2. ✅ **Copy API key** from dashboard
3. ✅ **Add to Supabase** Edge Function secrets
4. ✅ **Test with Marc Andreessen** contact
5. ✅ **Verify real data** is being extracted
6. ✅ **Research your actual contacts**

---

**Once working, you'll see 10x improvement in contact data quality!** 🚀

Let me know when you've activated the key and I'll help test it.
