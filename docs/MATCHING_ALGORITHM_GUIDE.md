# How the Matching Algorithm Works

A practical guide to how we score and rank contact suggestions for a conversation.

---

## 1. High-level flow

1. **Input**: A conversation (with transcript, entities, and optional rich context).
2. **Entities**: We use extracted entities (sectors, stages, geos, check sizes, person names) and optional rich context (goals, domains, matching intent). Entity confidence scores weight each tag's contribution.
3. **Candidates**: All contacts owned by the user (with theses, bios, embeddings when available).
4. **Scoring**: Each contact gets a weighted score from several components; name mentions get an extra boost.
5. **Stars**: Raw score (0–1) is mapped to 1–3 stars; only contacts with ≥1 star are returned.
6. **Output**: Top 20 matches, sorted by stars then raw score; top 5 get AI explanations.

No entities → we return **no matches** (we need at least sectors, stages, or other tags to compare).

---

## 2. Where it lives

| What | Where |
|------|--------|
| Main logic | `supabase/functions/generate-matches/index.ts` |
| Pure helpers (cosine, Jaccard, weighted Jaccard, name match, checkSizeFit, etc.) | `supabase/functions/_shared/matching-utils.ts` |
| Tests for helpers | `supabase/functions/_shared/matching-utils.test.ts` |
| Detailed technical doc | `docs/MATCHING_LOGIC.md` |
| Performance monitoring | `supabase/functions/_shared/monitoring.ts` (PerformanceMonitor) |
| Evaluation pipeline | `scripts/eval/` (golden-set.json, run-matching-eval.ts, tune-weights.ts, export-feedback-labels.ts) |

---

## 3. Weights (two modes)

We use **different weight sets** depending on whether we have **embeddings** for the conversation and contacts.

**Embeddings** = conversation has `context_embedding` (1536-dim vector) and at least one contact has `bio_embedding` or `thesis_embedding` (1536-dim). PostgREST returns vectors as strings; we parse them in `generate-matches` with `embeddingToArray()`.

### With embeddings (preferred)

| Component | Weight | What it measures |
|-----------|--------|-------------------|
| **embedding** | 25% | Best of cosine similarity between conversation embedding and contact bio_embedding / thesis_embedding. Uses `max(bioSim, thesisSim)` when thesis_embedding exists. |
| semantic | 10% | Keyword overlap: conversation sectors/stages/tags vs. contact bio/title/notes. |
| tagOverlap | 20% | Confidence-weighted Jaccard similarity between conversation tags and contact tags (theses + profile keywords). Entity extraction confidence weights each tag's contribution via `weightedJaccardSimilarity()`. |
| roleMatch | 10% | Does contact's role/title match hiring roles or investor types from the conversation? |
| geoMatch | 5% | Overlap of conversation geos with contact location/thesis geos. |
| relationship | 10% | Normalized `relationship_strength` (0–100 → 0–1). |
| personalAffinity | 15% | Overlap of education, interests, expertise, portfolio with conversation's target person / context. |
| checkSize | 5% | Overlap between conversation's fundraising range and investor's check-size range via `checkSizeFit()`. Only active for investors with check_size data. |

### Without embeddings (fallback)

| Component | Weight | What it measures |
|-----------|--------|----------------------------------------|
| semantic | 15% | Slightly higher to compensate. |
| tagOverlap | 25% | Slightly higher. |
| roleMatch | 15% | Slightly higher. |
| geoMatch | 5% | Same. |
| relationship | 15% | Slightly higher. |
| personalAffinity | 20% | Slightly higher. |
| checkSize | 5% | Same as with embeddings. |

All component scores are in **[0, 1]** before weighting.

### Cold-start weight normalization (v1.3)

If a contact is missing data for a component (e.g. no embeddings, no tags, default relationship strength), that component is flagged as *unavailable*. The remaining available component weights are **renormalized to sum to 1.0** so sparse-profile contacts compete fairly with fully-profiled ones. The `_available` map is stored in `scoreBreakdown` for debugging.

The **raw score** is the renormalized weighted sum, then clamped to [0, 1].

---

## 4. Name-match boost (additive)

If the conversation mentions a **person name** (entity type `person_name`) and it matches the contact (exact, nickname, contains, etc.) via `fuzzyNameMatch()`:

- We **add** `0.3 × nameMatchScore` to the raw score (before clamping).
- So a strong name match can push a contact over a star threshold even if other components are modest.

Name match types (see `matching-utils.ts`): exact, contains, first-only, first-nickname (e.g. Bob ↔ Robert), full name, nickname-full, levenshtein, partial.

---

## 5. Star thresholds

- **Raw score ≥ 0.40** → 3 stars
- **Raw score ≥ 0.20** → 2 stars
- **Raw score ≥ 0.05** → 1 star
- **Raw score < 0.05** → not included

We only return contacts with **≥ 1 star**. Then we sort by (star score descending, raw score descending) and take the **top 20**.

---

## 6. Where each component comes from

- **Conversation tags**: Entities (sectors, stages, geos) + rich context `domains_and_topics` (product_keywords, technology_keywords) and `matching_intent`. Each entity carries a confidence score from extraction.
- **Contact tags**: Theses (sectors, stages, geos), `contact_type`, plus keywords scraped from bio/title/investor_notes (e.g. venture, seed, biotech, fintech, SaaS).
- **Embeddings**: Conversation → `embed-conversation` (builds text from target_person, goals_and_needs, domains_and_topics, matching_intent, prefixed with `"Search query for finding relevant professional contacts: "`). Contact → `embed-contact` (bio + title + company + interests + expertise + portfolio for `bio_embedding`, prefixed with `"Professional profile for networking and introductions: "`; investor_notes for `thesis_embedding`, prefixed with `"Investment thesis and focus areas: "`). Model: `text-embedding-3-small` (1536 dims). Instruction prefixes implement asymmetric retrieval to align the different semantic spaces of conversations vs. contact profiles. Embedding score uses `max(bioSim, thesisSim)`. **Note**: After changing prefixes, existing embeddings should be re-generated via the "Embed All" UI button.
- **Personal affinity**: Compares conversation `target_person` (education, interests, companies_mentioned) to contact's education, personal_interests, expertise_areas, portfolio_companies.
- **Check-size fit**: Conversation check sizes (from entities) are parsed via `parseCheckSize()`. Contact check sizes come from `check_size_min`/`check_size_max`. The `checkSizeFit()` helper computes range overlap (1.0 = perfect fit, 0.3 = close, 0 = no data). Only applies to investors.
- **Tag confidence weighting**: Entity confidence from `conversation_entities.confidence` is used to weight each tag's contribution to the tag overlap score via `weightedJaccardSimilarity()`. High-confidence entities (0.9+) contribute fully; low-confidence entities (0.3) contribute proportionally less.

---

## 7. Performance and monitoring

- **PerformanceMonitor** in `generate-matches`: times auth, fetch-entities, fetch-contacts, scoring-contacts, ai-explanations, total.
- **Logs**: Console logs per step; at the end a performance summary can be printed (see `monitoring.ts`).
- **Limits**: Only top 20 matches returned; AI explanations only for top 5 with score ≥ 2 stars.

For deeper performance management (metrics, weight tuning, A/B tests), use the **Matching Algorithm Manager** agent (see `.cursor/agents/matching-algorithm-manager.md`).

---

## 8. Evaluation and tuning

### Offline evaluation pipeline (`scripts/eval/`)

| Script | Purpose |
|--------|---------|
| `golden-set.json` | Labelled conversation-contact pairs (1=positive, 0=negative) for quality measurement. |
| `run-matching-eval.ts` | Computes precision@5, precision@10, hit-rate@1, MRR, and NDCG@5 against the golden set. Reports 90% bootstrap confidence intervals. Exits non-zero if mean MRR is below threshold (default 0.40). |
| `export-feedback-labels.ts` | Exports labels from `match_feedback` and `match_suggestions.status` into a JSON file for evaluation. |
| `tune-weights.ts` | Optimizes weights via grid search (embedding, tagOverlap, personalAffinity) and a pairwise logistic regression ranker. Optimizes MRR. Reports bootstrap CIs and only recommends changes when improvement is statistically significant. |

### Metrics

| Metric | What it measures |
|--------|-----------------|
| **Precision@K** | Fraction of top-K results that are positive. |
| **Hit-rate@1** | Did the top-1 result land on a positive? |
| **MRR** | Mean Reciprocal Rank — 1/rank of first positive result, averaged across conversations. Sensitive to rank order. |
| **NDCG@5** | Normalized Discounted Cumulative Gain at 5 — rewards positives at higher positions with log discount. |

### Workflow

1. Seed test data: `npm run seed:test`
2. Run evaluation: `npm run eval`
3. Export user feedback labels: `npm run eval:feedback`
4. Tune weights: `npm run eval:tune`
5. Apply tuned weights to code and docs, bump `match_version`.

---

## 9. Changing the algorithm

1. **Weights**: Edit the `WEIGHTS` objects in `generate-matches/index.ts` (one for `hasEmbeddings`, one for fallback). Keep weights summing to 1.0 (cold-start normalization will rescale per-contact based on data availability).
2. **Star thresholds**: Edit the thresholds (0.05, 0.20, 0.40) and the minimum star (1) in the same file.
3. **New scoring components**: Add a new score in the per-contact loop, add it to `matchDetails` and `scoreBreakdown`, and add a weight for it in both WEIGHTS objects.
4. **Helpers**: Add or change pure functions in `_shared/matching-utils.ts` and cover them in `matching-utils.test.ts`.
5. **Embedding handling**: Conversation and contact embeddings must be 1536-dimensional arrays; PostgREST returns vectors as strings, so we always normalize with `embeddingToArray()` before use.
6. **Evaluation**: After any weight/formula change, run `npm run eval` against the golden set to verify precision doesn't regress. Optionally run `npm run eval:tune` to find optimal weights.

After any change, run `deno test functions/_shared/matching-utils.test.ts` and the generate-matches pipeline on a few test conversations to confirm behavior.

---

## 10. Version history

- **v1.0** — Initial weighted scoring (keyword + Jaccard)
- **v1.1-transparency** — Added score_breakdown, confidence_scores, match_version, personalAffinity
- **v1.2-signals** — Added thesis_embedding (max of bio + thesis), checkSizeFit (5% weight), entity confidence weighting for tag overlap via `weightedJaccardSimilarity()`, offline evaluation pipeline
- **v1.3-coldstart** — Cold-start weight normalization (renormalizes weights for contacts with missing data), instruction prefixes for asymmetric embedding retrieval, MRR and NDCG@5 eval metrics, bootstrap confidence intervals, pairwise logistic regression weight tuner

*Current version: v1.3-coldstart*
