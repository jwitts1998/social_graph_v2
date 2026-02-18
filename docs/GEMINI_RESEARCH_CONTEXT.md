# Research Context: Social Graph Matching Algorithm

Use this document as grounding context for deep research into improving our contact-conversation matching system. Everything below describes the production system as it exists today.

---

## What the product does

Social Graph is a tool for venture capital / startup networking. Users record conversations (meetings, calls), and the system automatically suggests **which contacts in their network** are relevant to that conversation — e.g. "you just discussed raising a $2M biotech seed round; here are 5 investors from your contacts who match."

The core matching problem: **given a conversation (with extracted entities, rich context, and an embedding) and a set of contacts (with profiles, investment theses, and embeddings), rank the contacts by relevance and surface the top 20.**

This is a **ranking / retrieval** problem, not classification. The output is a scored, ordered list with star ratings (1-3 stars) and AI-generated explanations.

---

## Architecture (pipeline)

```
Transcript → extract-entities (GPT-4o-mini)
  → conversation_entities (sector, stage, geo, check_size, person_name + confidence)
  → conversation JSON (target_person, goals_and_needs, domains_and_topics, matching_intent)
  → embed-conversation (text-embedding-3-small, 1536-d) → context_embedding

Contacts (static):
  → embed-contact → bio_embedding (from bio + title + company + interests + expertise + portfolio)
  → embed-contact → thesis_embedding (from investor_notes)
  → theses table: sectors[], stages[], geos[]
  → profile: education[], personal_interests[], expertise_areas[], portfolio_companies[]
  → investor fields: check_size_min, check_size_max, is_investor, contact_type[]

Matching:
  → generate-matches: loads entities + rich context + embedding + all contacts
  → scores each contact with weighted sum of 8 components + additive name boost
  → star thresholds → top 20 → AI explanations for top 5 (2+ star)
```

---

## Scoring formula (v1.2-signals)

### With embeddings available

```
rawScore =
    0.25 × embeddingScore        // cosine(conv_embedding, max(bio_embedding, thesis_embedding))
  + 0.10 × semanticScore         // keyword overlap: conv tags vs contact bio/title/notes text
  + 0.20 × tagOverlapScore       // confidence-weighted Jaccard(conv tags, contact tags)
  + 0.10 × roleMatchScore        // contact role/type matches hiring or investor-type need
  + 0.05 × geoMatchScore         // geographic overlap (conv geos vs contact location/thesis geos)
  + 0.10 × relationshipScore     // relationship_strength / 100 (0-100 → 0-1)
  + 0.15 × personalAffinityScore // education, interests, expertise, portfolio overlap
  + 0.05 × checkSizeScore        // range overlap: conv fundraising amount vs contact check size

  + 0.30 × nameMatchScore        // ADDITIVE BOOST (not weighted — added on top if person mentioned)
```

Then clamp to [0, 1].

### Without embeddings (fallback mode)

Same formula minus `embeddingScore` term. Remaining weights are redistributed:

```
semantic 15%, tagOverlap 25%, roleMatch 15%, geoMatch 5%,
relationship 15%, personalAffinity 20%, checkSize 5%
```

### Star thresholds

```
rawScore >= 0.40 → 3 stars
rawScore >= 0.20 → 2 stars
rawScore >= 0.05 → 1 star
rawScore <  0.05 → excluded
```

Only contacts with >= 1 star are returned. Top 20, sorted by (stars desc, rawScore desc).

---

## Component details

### Embedding score (25%)
- Model: OpenAI `text-embedding-3-small` (1536 dimensions)
- Conversation embedding: built from rich context text (target person, goals, domains, matching intent)
- Contact embeddings: `bio_embedding` (bio + title + company + interests + expertise + portfolio) and `thesis_embedding` (investor_notes)
- Score = `max(cosine(conv, bio_embedding), cosine(conv, thesis_embedding))`
- Vectors stored as pgvector columns in PostgreSQL; returned as strings by PostgREST; parsed with `embeddingToArray()`

### Tag overlap (20%)
- Conversation tags: entities (sectors, stages, geos) + rich-context keywords (product_keywords, technology_keywords)
- Contact tags: theses (sectors, stages, geos) + contact_type + investment keywords extracted from bio/title/notes
- Uses `weightedJaccardSimilarity()`: each conversation tag is weighted by its entity extraction confidence (0-1). Rich-context keywords default to 0.7 confidence.
- Falls back to plain Jaccard if no confidence data

### Semantic / keyword score (10%)
- Counts how many conversation tags appear (substring match) in the contact's bio+title+notes+company text
- Score = matches / total_search_terms, capped at 1.0
- This is keyword overlap, NOT vector similarity (that's the embedding score)

### Role match (10%)
- Checks if contact's title or contact_type matches hiring roles or investor types mentioned in the conversation
- Binary per-match; combined into 0-1 score

### Geographic match (5%)
- Checks if conversation geos overlap with contact location or thesis geos
- Uses `matchesAny()` (case-insensitive substring match)

### Relationship strength (10%)
- `contact.relationship_strength` (0-100 integer set by user) / 100

### Personal affinity (15%)
- Education overlap: conversation target_person.education.school vs contact.education[].school
- Interest overlap: conversation personal_interests vs contact.personal_interests
- Portfolio overlap: conversation companies_mentioned vs contact.portfolio_companies
- Expertise overlap: conversation technology_keywords vs contact.expertise_areas
- Each sub-component adds to a running score, capped at 1.0

### Check-size fit (5%)
- Only applies when `contact.is_investor` AND conversation has check_size entities
- `checkSizeFit(convMin, convMax, contactMin, contactMax)` → 0-1
  - 1.0 if conv range fits within contact range
  - 0.5+ for partial overlap (proportional)
  - Exponential decay for no overlap (capped at 0.3)
  - 0 if either side has no data

### Name match boost (+0.3 additive)
- If conversation mentions a `person_name` entity matching the contact via `fuzzyNameMatch()`
- Supports: exact, substring, first-name only, nickname (Bob↔Robert, Matt↔Matthew, etc.), Levenshtein
- Adds `0.3 × nameMatchScore` to rawScore before clamping

---

## Data schema (relevant tables)

### contacts
```
id, name, first_name, last_name, title, company, bio, location,
contact_type[] (LP, GP, Angel, FamilyOffice, Startup, PE),
is_investor, check_size_min, check_size_max, investor_notes,
relationship_strength (0-100),
bio_embedding (vector 1536), thesis_embedding (vector 1536),
education (jsonb[]), personal_interests[], expertise_areas[], portfolio_companies[]
```

### theses (per-contact investment thesis)
```
contact_id, sectors[], stages[], geos[], check_sizes[], personas[], intents[], notes
```

### conversations
```
id, title, owned_by_profile, status, recorded_at,
target_person (jsonb), goals_and_needs (jsonb), domains_and_topics (jsonb), matching_intent (jsonb),
context_embedding (vector 1536)
```

### conversation_entities
```
conversation_id, entity_type (sector|stage|geo|check_size|person_name), value, confidence (decimal)
```

### match_suggestions
```
conversation_id, contact_id, score (1-3 stars), raw_score (float),
reasons[], justification, ai_explanation,
score_breakdown (jsonb: {embedding, semantic, tagOverlap, roleMatch, geoMatch, relationship, personalAffinity, checkSize, nameMatch}),
confidence_scores (jsonb), match_version, status (pending|promised|intro_made|dismissed|maybe)
```

### match_feedback
```
suggestion_id, profile_id, feedback (thumbs_up|thumbs_down|saved|intro_sent), feedback_reason, created_at
```

---

## What we've built for evaluation

- **Golden set** (`scripts/eval/golden-set.json`): 15 labelled (conversation, contact, positive/negative) pairs across 4 test scenarios (biotech fundraising, fintech with name mention, office logistics / negative control, AI startup with personal affinity)
- **Eval script** (`npm run eval`): computes precision@5, precision@10, hit-rate@1 per conversation and macro-averages; exits non-zero if below threshold (default 40% precision@5)
- **Feedback label export** (`npm run eval:feedback`): reads match_feedback + match_suggestions.status to derive binary labels
- **Weight tuning** (`npm run eval:tune`): grid search over embedding, tagOverlap, personalAffinity weights; maximizes precision@5; outputs suggested weight vector

---

## Constraints and environment

- **Runtime**: Supabase Edge Functions (Deno), ~10s budget per invocation
- **Scale**: Typically 50-500 contacts per user; scoring is O(contacts × components), no GPU
- **Embedding model**: OpenAI text-embedding-3-small (cannot fine-tune; can switch models)
- **LLM**: GPT-4o-mini for entity extraction and AI explanations
- **Database**: PostgreSQL + pgvector on Supabase
- **No real-time training**: any learning must be offline (script-based), then weights baked into code

---

## What I want to research

Given the system described above, I want deep research into:

1. **Ranking algorithm improvements**: Are there better ways to combine these 8 signals than a fixed weighted sum? What does the IR/recommendation systems literature say about learning-to-rank (LTR) approaches that work well with small labeled datasets (tens to low hundreds of examples)? Specifically:
   - Pairwise vs pointwise vs listwise LTR and which is practical at our scale
   - Whether a simple linear model (logistic regression on component scores) outperforms hand-tuned weights
   - RankNet, LambdaMART, or simpler approaches that work with <500 training examples

2. **Embedding strategy**: We use a single general-purpose embedding model (text-embedding-3-small) for both conversations and contacts. Research:
   - Whether asymmetric / bi-encoder approaches (different representations for query vs document) improve retrieval quality
   - Matryoshka embeddings or dimensionality reduction for speed
   - Whether instruction-tuned embedding models (e.g. with task prefixes like "search_query:" vs "search_document:") improve matching
   - Cross-encoder reranking on the top-N candidates as a second pass

3. **Evaluation methodology**: We have precision@5/10 and hit-rate@1. Research:
   - NDCG, MRR, MAP — which metrics are most appropriate for this "find the best intro" use case
   - How to build evaluation sets efficiently with limited labeled data (active learning, inter-annotator agreement)
   - Statistical significance testing for algorithm comparisons with small eval sets

4. **Feedback loop design**: We collect thumbs_up/down, saved, intro_sent, and status (intro_made, dismissed). Research:
   - Implicit vs explicit feedback signals for ranking — which are most reliable
   - Position bias correction (users see top-ranked results, so "not clicked" is biased)
   - Online learning vs periodic batch retraining for this scale
   - Bayesian optimization for weight tuning vs grid search

5. **Cold start and data sparsity**: Many contacts have no embeddings, sparse profiles, or no thesis. Research:
   - How to handle missing features in ranking (vs imputation vs separate models)
   - Content-based fallback strategies when collaborative filtering isn't available
   - How professional networking recommender systems (LinkedIn, etc.) handle sparse professional profiles

6. **Diversity and exploration in results**: Currently we return a pure top-20 by score. Research:
   - MMR (Maximal Marginal Relevance) or DPP (Determinantal Point Processes) for diverse results
   - Exploration-exploitation tradeoffs in recommendation (epsilon-greedy, Thompson sampling)
   - Whether diversity improves long-term user satisfaction in networking/matching contexts

7. **Domain-specific innovations**: This is a "warm introduction" matching product for venture capital networking. Research:
   - How existing matching/recommendation systems in recruiting (LinkedIn Recruiter), dating (Hinge, Bumble), and marketplace matching differ in their signal combination
   - Whether there are published approaches for "connector" or "matchmaker" recommendation (A should meet B because of C)
   - Knowledge graph approaches for professional network matching

Please focus on **practical, implementable approaches** that work at our scale (hundreds of contacts, tens of conversations, <500 labeled examples). We're a small team running on Supabase Edge Functions — we need methods that can be implemented in TypeScript/Deno without heavy ML infrastructure. Prefer approaches with clear evidence of working at small scale over theoretically optimal methods that require millions of training examples.
