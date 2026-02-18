# Contact Profile – Design for Relationship Builders

## Primary user

The account holder is **one person** whose work centers on:

- **Making connections** – intros, warm referrals, matching people to opportunities
- **Building relationships** – staying close to LPs, founders, operators, investors
- **Creating companies** – founding, advising, investing; often moving between those roles

The profile is built so that opening a contact answers: *“Who is this person, how are we connected, and what’s the next best move?”*

---

## Design principles

1. **Context over raw data** – Lead with relationship and usage context, not every field.
2. **Insights, not just facts** – Use existing data (matches, conversations, theses) to surface “why this contact matters right now.”
3. **Action-oriented** – One-click paths to email, LinkedIn, enrich, edit, and (later) “prepare for meeting” or “add to intro.”
4. **Scannable** – Clear sections, short blocks, so the user can grasp the person in seconds.
5. **Single-user** – No sharing/permissions; everything is “my contact, my view.”

---

## Profile structure

### 1. Hero (top of page)

- **Name** – Primary heading.
- **Role / company** – “Title at Company” (or “Company” if no title).
- **Role badges** – LP, GP, Angel, Startup, etc., from `contact_type` or inferred from title.
- **Relationship strength** – If we have it (e.g. `relationship_strength` or `relationship_scores`), show a simple indicator (e.g. “Strong” / “Medium” / “Light” or 1–5).
- **Data completeness** – Optional badge like “72% complete” from `data_completeness_score` to nudge enrichment.

Purpose: instant “who they are and how close we are.”

### 2. Quick actions (always visible)

- **Email** – `mailto:` when email exists.
- **LinkedIn** – External link when `linkedin_url` exists.
- **Enrich** – Opens existing Enrichment flow.
- **Edit** – Opens existing ContactDialog.

Purpose: no hunting for next step.

### 3. Smart insights (computed, high value)

These are **derived from existing product data**, not new backend logic:

| Insight | Source | Example copy |
|--------|--------|---------------|
| **Suggested in N conversations** | `match_suggestions` where `contact_id = this contact` | “Suggested in 3 conversations” |
| **In N recorded conversations** | `conversation_participants` where `contact_id = this contact` | “In 2 recorded conversations” |
| **Last suggested for** | Same matches, join to `conversations.title` / `recorded_at` | “Last suggested for: Fundraising with Founders (Jan 15)” |
| **Consider reconnecting** | `relationship_scores.last_interaction_at` or `updated_at` heuristics | “Last touch ~6 months ago — good time to reconnect” |
| **Top match for** | Match suggestions with `score >= 2`, conversation title | “Strong match for: Hiring – eng lead (Dec 2024)” |

Rules:

- Show only insights we can back with real data.
- If we have no data for an insight, hide that block instead of showing “0” or empty.
- Link “suggested in” / “in N conversations” to the corresponding conversation detail pages.

Purpose: turn “this is a contact” into “this is a contact **who has shown up in my workflow in these ways**.”

### 4. At a glance (short, structured)

- **Location** – From `location`.
- **Focus / thesis** – If we have `theses`: sectors, stages, check sizes, geos as compact tags or one line.
- **Expertise** – From `expertise_areas` (enrichment).
- **Portfolio** – From `portfolio_companies` (enrichment), e.g. “Portfolio: Stripe, Coinbase, …”.
- **Personal interests** – From `personal_interests` (enrichment), 2–3 items.

Purpose: “what they care about and where they play” in a few seconds.

### 5. Shared context (relationship evidence)

- **Conversations they’re in** – From `conversation_participants` → `conversations`: title, date, link to `/conversation/:id`.
- **Conversations they were suggested for** – From `match_suggestions` → `conversations`: title, date, match score, link to conversation.

Group or sort by date. Make each row clickable to the conversation.

Purpose: “where have we actually interacted or could have used them.”

### 6. Deeper context (expand / scroll)

- **Bio** – `bio` (e.g. LinkedIn “About”).
- **Investor thesis** – Full `theses` (sectors, stages, check sizes, geos, personas, notes) when present.
- **Education** – From `education` (enrichment): school, degree, year.
- **Career** – From `career_history` (enrichment): company, role, years.
- **Investor details** – Check size range, `investor_notes`, preferred stages when `is_investor` or type suggests it.
- **Company details** – Company URL, employees, founded, Crunchbase, etc., in a compact “Company” subsection.

Purpose: full picture when the user drills in, without crowding the top.

---

## Data sources (existing schema)

- **Contact** – `contacts` (all fields, including enrichment and relationship).
- **Thesis** – `theses` where `contact_id = id`.
- **Match suggestions** – `match_suggestions` where `contact_id = id`, with `conversation_id`; join to `conversations` for title and date.
- **Conversation participation** – `conversation_participants` where `contact_id = id`; join to `conversations`.
- **Relationship** – `relationship_scores` / `relationship_events` by `contact_id` and current user’s profile, when we use them.

No new tables required for v1.

---

## UX details

- **Entry** – Clicking a contact record (card or row) goes to `/contacts/:id`. Edit/Enrich remain secondary actions (buttons on card or in profile header).
- **Back** – “Contacts” or back arrow returns to `/contacts` without losing list state (e.g. scroll, search) where possible.
- **Empty states** – “No conversations yet”, “No match suggestions yet”, “Add enrichment to see expertise and portfolio” instead of blank sections.
- **Loading** – Skeleton or inline spinners for hero + insights; shared-context lists can load after.
- **Responsive** – Same sections on mobile; hero and quick actions stay on top; insights and shared context stack vertically.

---

## Out of scope for v1

- Multiple users per account or shared contact views.
- “Prepare for meeting” or “Add to intro” flows (placeholders or disabled buttons ok).
- Relationship strength from a dedicated scoring pipeline (use existing fields or simple heuristics).
- Inline editing on the profile (Edit opens the existing dialog).

---

## Success criteria

- Opening a contact answers “who they are” and “how they’ve shown up in my workflow” in one view.
- Next actions (email, LinkedIn, enrich, edit) are obvious.
- Smart insights use only current schema and feel truthful, not decorative.
