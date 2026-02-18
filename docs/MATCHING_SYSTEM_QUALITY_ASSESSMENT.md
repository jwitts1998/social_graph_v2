# Matching System Quality Assessment

**Role:** Senior ML/AI Engineer  
**Scope:** End-to-end quality of the contact–conversation matching system as an intelligent, proprietary product.  
**Date:** February 2026

---

## Executive Summary

The system is a **multi-signal ranking pipeline**: entity extraction (GPT) → rich context + legacy entities → optional embeddings → weighted scoring (embedding, semantic, tag, role, geo, relationship, personal affinity, name boost) → star bands → top-20 + AI explanations. It is **production-viable and differentiated** by the combination of signals and domain modeling (theses, check sizes, relationship, intent), but it is **not yet “learned” or optimized from data**. To be both **intelligent** and **proprietary**, the main gaps are: no learning from user feedback, no offline evaluation, unused signals (thesis embedding, check size, entity confidence), and fixed hand-set weights.

**Verdict:** Strong foundation; needs a closed-loop evaluation and learning strategy to qualify as a defensible, proprietary matching product.

---

## 1. Architecture Overview

| Stage | Component | Role |
|-------|-----------|------|
| 1 | **extract-entities** | GPT-4o-mini extracts target_person, goals_and_needs, domains_and_topics, matching_intent + legacy_entities (sector, stage, check_size, geo, person_name). Writes to `conversations` (rich JSON) and `conversation_entities`. |
| 2 | **embed-conversation** | Builds text from rich context → OpenAI text-embedding-3-small → `context_embedding` (1536-d). |
| 3 | **embed-contact** | Bio + title + company + interests + expertise + portfolio → `bio_embedding`; investor_notes → `thesis_embedding` (both 1536-d). |
| 4 | **generate-matches** | Loads entities, rich context, conversation embedding, all user contacts. Scores each contact with weighted sum; name-match boost; star thresholds; top 20; AI explanations for top 5 (2+ star). |

**Data flow:** Transcript → segments → extract-entities (one LLM call) → conversation_entities + conversation JSON. Separately, contacts get bio/thesis embeddings. generate-matches uses **only** `conversation_entities` for sectors/stages/geos/check_size/person_names and **conversation** JSON for tags and affinity; it uses **only** `bio_embedding` for semantic similarity (not thesis_embedding).

---

## 2. Strengths

### 2.1 Multi-signal design

- **Seven (or six) components** with distinct roles: embedding (semantic), keyword semantic, tag Jaccard, role, geo, relationship, personal affinity, plus name boost.
- **Two weight regimes** (with vs without embeddings) keep the system usable when embeddings are missing.
- **Personal affinity** (education, interests, portfolio, expertise) is domain-specific and hard to replicate with a generic recommender.

### 2.2 Extraction and context

- **Structured extraction** (target person, goals, domains, matching intent) is well-suited to “who should I intro?” and feeds both embedding text and tag construction.
- **Legacy entities** are derived from the same extraction (sectors, stages, geos, check_size, person names), so matching stays aligned with what was extracted.

### 2.3 Name handling

- **Fuzzy name matching** with nicknames (Bob/Robert, Matt/Matthew, etc.) and Levenshtein is implemented in a dedicated, tested module (`matching-utils.ts`).
- **Name boost** (+0.3 × name score) correctly surfaces “person mentioned by name” without fully overriding other signals.

### 2.4 Transparency and observability

- **Score breakdown and confidence scores** are stored and shown in the UI, which supports trust and debugging.
- **PerformanceMonitor** in generate-matches gives timing by phase (auth, fetch-entities, fetch-contacts, scoring, ai-explanations).
- **match_version** (e.g. v1.1-transparency) allows tracking algorithm changes.

### 2.5 Embedding pipeline

- **Single embedding model** (text-embedding-3-small, 1536-d) for both conversation and contact keeps similarity comparable.
- **embeddingToArray()** correctly normalizes PostgREST vector-as-string so semantic scoring is actually used.

---

## 3. Gaps and Risks

### 3.1 No learning from feedback (critical for “intelligent” and “proprietary”)

- **match_feedback** is written (thumbs_up, thumbs_down, saved, intro_sent) from the RecordingDrawer but **never read** by any matching or training path.
- **No weight tuning, no ranking model, no fine-tuning** from this data.
- **Risk:** The system cannot improve from usage and is easy to replicate; “intelligent” and “proprietary” require a closed loop.

**Recommendation:** Use match_feedback (and optional status: intro_made, dismissed) to:  
(1) define a binary or graded label (e.g. positive = thumbs_up / intro_made, negative = thumbs_down / dismissed);  
(2) build an offline eval set and metrics (e.g. precision@5, NDCG, or binary accuracy at rank 1);  
(3) tune weights or train a small ranking layer (e.g. linear combination or LTR) on historical matches + feedback.

### 3.2 Unused signals

- **thesis_embedding:** Computed and stored for contacts but **not used** in generate-matches. Conversation context is compared only to `bio_embedding`. Thesis (investor focus) is often more predictive for “investor intro” than general bio.
- **Check size:** `minCheckSize` / `maxCheckSize` are parsed from entities but **not used** to filter or score. Investor fit by check size (e.g. “raising $2M” vs contact’s check_size_min/max) would strengthen relevance.
- **Entity confidence:** Extracted entities have a confidence value; in generate-matches all entities are treated equally. Weighting tags or sectors by confidence would reduce noise from low-confidence extractions.

**Recommendation:**  
- Use thesis_embedding: e.g. score = max(cosine(context_embedding, bio_embedding), cosine(context_embedding, thesis_embedding)) or a weighted blend.  
- Add a check-size fit score (e.g. overlap of [minCheckSize, maxCheckSize] with contact’s range) and a small weight.  
- Optionally weight tag/sector contribution by entity confidence in tag construction or in a separate term.

### 3.3 No offline evaluation

- **No labeled test set** of (conversation, contact, good/bad match).
- **No metrics** (precision@k, recall@k, NDCG, MRR, or binary accuracy).
- **No regression testing** for algorithm changes; only unit tests for pure helpers (matching-utils).

**Risk:** Changes to weights or logic are not measured for impact on match quality; “improvements” are subjective.

**Recommendation:**  
- Curate a small golden set (e.g. 20–50 conversations with 3–5 “good” and 3–5 “bad” contacts each) from product usage or internal review.  
- Run generate-matches on these; compute precision@5/10 and NDCG (or a simple hit rate).  
- Add a script or CI step that runs this eval and fails if metrics drop below a threshold.

### 3.4 Fixed, hand-set weights

- Weights are **constants** in code (e.g. embedding 0.25, tagOverlap 0.25, …).  
- No search, no Bayesian tuning, no learning from data.

**Recommendation:** After you have labels (from feedback or golden set), run grid search or a small optimizer over weight vectors (with sum = 1) to maximize your chosen metric; then bake the best weights into code or load from config. Later, replace with a learned combiner (e.g. small MLP or LTR) if needed.

### 3.5 Semantic score is keyword-only

- “Semantic” in the code is **keyword overlap** (conversation tags vs. contact bio/title/notes), not vector similarity. The **embedding** term is the true semantic component.
- Naming is slightly misleading; otherwise the split (embedding vs keyword) is fine.

**Recommendation:** Rename to “keyword” in docs/code for clarity, or keep “semantic” but document that it’s keyword-based when embeddings are absent.

### 3.6 Context and embedding text construction

- **Conversation:** buildContextText() is a fixed template (target_person, goals, domains, matching_intent).  
- **Contact:** Bio text is a fixed concatenation of bio, title, company, interests, expertise, portfolio.  
- Both are **hand-crafted** and not optimized (e.g. no prompt tuning or separate encoders for “intent” vs “profile”).

**Assessment:** Adequate for v1. To deepen proprietary value, consider:  
- Slightly different prompts or prefixes for conversation vs contact when calling the embedding API.  
- Or training a small domain-specific encoder later (larger lift).

### 3.7 Confidence scores not calibrated

- **confidenceScores** (semantic, tagOverlap, roleMatch, etc.) are heuristic (e.g. “has rich profile” → higher semantic confidence).  
- They are **not calibrated** against actual outcomes (e.g. probability that this match is accepted).

**Recommendation:** Once feedback exists, treat confidence as a predictor and calibrate (e.g. Platt scaling or isotonic regression) so “0.8” means ~80% chance of positive feedback.

### 3.8 No explicit diversity or exploration

- Top 20 are **sorted only by score**.  
- No diversity (e.g. by sector or role) or exploration (e.g. sometimes promote a slightly lower-scoring contact to improve long-term learning).

**Recommendation:** Optional: add a diversity pass (e.g. max 2–3 per sector in top 10) or an exploration slot (e.g. one slot for “maybe relevant” by embedding only). Lower priority until the core ranking is tuned.

---

## 4. Proprietary Value Assessment

| Dimension | Current state | To be “proprietary” |
|-----------|----------------|---------------------|
| **Data** | Transcripts, contacts, theses, embeddings, match_feedback (unused) | Use feedback + outcomes to build a unique training/eval set. |
| **Signals** | Rich combination (intent, affinity, relationship, embedding, tags) | Keep; add thesis_embedding and check-size fit; optionally confidence-weighted entities. |
| **Model** | Fixed weighted sum + star bands | Learn weights or a small ranking model from your data. |
| **Evaluation** | None | Golden set + precision/NDCG + regression tests. |
| **Learning** | None | Feedback loop: log → labels → tune or train → deploy. |

**Summary:** The **combination of signals and domain modeling** (theses, relationship, matching intent, personal affinity) is already differentiated. The **missing piece** is using your own data (feedback and outcomes) to **evaluate and improve** the system. Closing that loop is what makes it both intelligent and hard to copy.

---

## 5. Recommendations (Prioritized)

1. **High – Use match_feedback for evaluation and tuning**  
   - Define labels from feedback (and status).  
   - Build an offline eval and a small golden set.  
   - Tune weights (or train a simple ranking model) and re-evaluate.

2. **High – Add thesis_embedding to scoring**  
   - Combine or max with bio_embedding so investor-thesis alignment is reflected.

3. **High – Use check size in scoring**  
   - Add a “check size fit” score from conversation range vs contact check_size_min/max and give it a small weight.

4. **Medium – Offline eval pipeline**  
   - Script that runs generate-matches on golden conversations and computes precision@5/10 (and optionally NDCG).  
   - Run on algorithm changes to avoid regressions.

5. **Medium – Optional entity confidence**  
   - Weight tag/sector contribution by extracted confidence so low-confidence entities matter less.

6. **Lower – Calibrate confidence scores**  
   - After feedback is in use, calibrate UI confidence to predicted probability of positive outcome.

7. **Lower – Diversity / exploration**  
   - Consider light diversity or exploration in top-20 for product and learning.

---

## 6. Conclusion

The matching system is **architecturally sound**, **transparent**, and **domain-aware**. Its main limitations relative to “intelligent and proprietary” are: **no learning from user feedback**, **no offline evaluation**, and **underuse of existing signals** (thesis_embedding, check size, entity confidence). Addressing feedback-driven evaluation and weight (or model) learning, plus full use of thesis and check size, will materially improve both quality and defensibility as a product.
