# Testing the Deep Research / Contact Enrichment System

## Deploy checklist (before going live)

- [ ] **Deploy Edge Functions**  
  Deploy the new function and any updated ones:
  ```bash
  npx supabase functions deploy deep-research-contact
  npx supabase functions deploy research-contact   # optional, still used by PipelineContext
  ```
- [ ] **Secrets** (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
  - `OPENAI_API_KEY` (required)
  - `SERPER_API_KEY` (required for web search)
  - `FIRECRAWL_API_KEY` (optional; improves scraping for JS-heavy pages)
  - `PDL_API_KEY` / `APOLLO_API_KEY` (optional; structured data waterfall)
- [ ] **Frontend**  
  Build and deploy the client (Vite build). No extra env vars needed for enrichment; the app calls Edge Functions with the user’s auth.
- [ ] **Smoke test**  
  After deploy: upload a CSV with ~10 contacts (name + company or LinkedIn best). Confirm the flow goes Upload → Parsing → Importing → **Enriching** (progress and “X enriched”) → Complete. Then open a contact and confirm enriched fields (bio, education, etc.).

---

## 1. Unit tests (Vitest) — run always

From the project root:

```bash
npm run test
```

This runs all client and shared tests (e.g. `supabaseHelpers`, `RecordingDrawer`, `MatchScoreBreakdown`). **All 28 tests should pass** before merging.

- **Watch mode**: `npm run test:watch`
- **UI**: `npm run test:ui`
- **Coverage**: `npm run test:coverage`

---

## 2. Edge function shared module tests (Deno) — optional

The Supabase Edge Functions use Deno. Shared logic under `supabase/functions/_shared/` has Deno tests. Run them **only if you have Deno installed**:

```bash
# From project root, with Deno installed
deno test supabase/functions/_shared/matching-utils.test.ts
deno test supabase/functions/_shared/enrichment-validation.test.ts
deno test supabase/functions/_shared/data-quality.test.ts
deno test supabase/functions/_shared/investor-sources.test.ts
```

If you don’t have Deno, you can skip these; CI or local Deno runs can cover them.

---

## 3. Manual test: Deep Research via UI (recommended)

End-to-end test with the Firecrawl key in Edge Function secrets:

1. **Start the app**  
   - `npm run dev` (or your usual dev command).

2. **Sign in** and open **Contacts**.

3. **Pick a contact** that has at least a name (and ideally company) but is missing bio, education, etc.

4. **Open Enrichment**  
   - Click the sparkles (✨) button on the contact card, or open the contact profile and click **Enrich**.

5. **Confirm Deep Research runs**  
   - Dialog shows “Deep researching [Name]…”  
   - Steps like: “Searching across Google, LinkedIn, Crunchbase” → “Crawling and scraping discovered web pages” → “Extracting structured data with AI” → “Following leads and synthesizing profile”.  
   - Can take **20–40 seconds** (up to ~12 pages, 3 iterations).

6. **Check the result**  
   - “Contact updated!” with list of updated fields.  
   - **Deep Research** badge and stats: “X pages crawled”, “Y searches”, “Z iterations”.  
   - Profile completeness % and which fields were updated (bio, education, expertise, etc.).

7. **Verify data**  
   - Open the contact again and confirm new fields (bio, education, career, interests, etc.) look correct and are attributed to real sources.

**If Firecrawl is configured**: more pages will be scraped successfully (including JS-heavy sites). Without it, Jina Reader and native fetch are used and some pages may fail or return less content.

---

## 4. Manual test: Deep Research via Supabase CLI

Useful to test the Edge Function in isolation (e.g. after changing secrets or function code):

1. **Get a real contact ID** from your DB (e.g. Supabase dashboard → `contacts` table).

2. **Invoke the function** (replace `CONTACT_ID` and use your Supabase project ref and anon key for auth):

   ```bash
   npx supabase functions invoke deep-research-contact \
     --body '{"contactId":"CONTACT_ID"}' \
     --project-ref YOUR_PROJECT_REF
   ```

   Or with a local Supabase stack and logged-in user JWT:

   ```bash
   supabase functions invoke deep-research-contact \
     --body '{"contactId":"CONTACT_ID"}' \
     --env-file ./supabase/.env.local
   ```

3. **Check response**  
   - `success: true`, `updated: true/false`, `fields: [...]`, `deepResearch: { pagesScraped, iterations, ... }`.  
   - Inspect the contact in the DB to confirm new fields and `enrichment_source` (e.g. `pdl+deep-research` or `deep-research`).

---

## 5. Checklist before release

- [ ] `npm run test` passes (Vitest).
- [ ] Manual UI test: EnrichmentDialog → Deep Research completes and shows pages crawled + updated fields.
- [ ] At least one contact enriched and spot-checked for correctness (bio, education, LinkedIn URL, etc.).
- [ ] Edge Function secrets set in Supabase: `OPENAI_API_KEY`, `SERPER_API_KEY`; optional: `FIRECRAWL_API_KEY`, `PDL_API_KEY`, `APOLLO_API_KEY`.
- [ ] Hunter.io (if used) is non-blocking: no API key or no credits should not break the flow; batch can return `skipped: true`.

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| “Deep research failed” / 400 | Auth (valid user, contact owned by user), contact has a name, `OPENAI_API_KEY` and `SERPER_API_KEY` set. |
| 0 pages crawled | Serper returning no results for the name/company, or all scrape attempts failing (try with Firecrawl key). |
| Timeout (~60s) | Reduce budget in code (e.g. `maxPages` / `maxIterations`) or use a contact that resolves in fewer steps. |
| Wrong person’s data | Disambiguation issue (common name, weak company/linkedin signal). Add company or LinkedIn URL to the contact and re-run. |
