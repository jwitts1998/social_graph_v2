# Research Context: [SYSTEM NAME]

<!-- INSTRUCTIONS
     Copy this template, fill in every [BRACKETED] placeholder, and delete
     all HTML comments before pasting into Gemini Deep Research (or similar).
     Each section has guidance on what to include and why it matters.
-->

Use this document as grounding context for deep research into improving our [SYSTEM NAME] system. Everything below describes the production system as it exists today.

---

## What the product does

<!-- Describe the product in 2-3 sentences, then state the core technical
     problem in bold. Frame it as a well-known CS/ML problem type so the
     research model can anchor on relevant literature.

     Examples of good problem framings:
       "This is a **ranking / retrieval** problem."
       "This is a **web research + information extraction** problem."
       "This is a **real-time classification** problem."
       "This is a **scheduling and constraint satisfaction** problem."
-->

[PRODUCT NAME] is a [brief product description — what it does and who it's for]. Users [primary user action], and the system [what the system does in response].

The core [SYSTEM NAME] problem: **[one-sentence problem statement framing the input, output, and challenge].**

This is a **[CS/ML problem category]** problem. The output is [describe the system's output format and how it's consumed].

---

## Architecture (pipeline)

<!-- Draw an ASCII diagram showing the end-to-end data flow for this system.
     Include: triggers, processing steps, external API calls, data stores,
     and outputs. Name the actual functions/services involved.

     Keep it scannable — the research model uses this to understand
     which components exist and how they connect.
-->

```
[Trigger event]
  → [Step 1: function/service name] ([what it does])
       → [External API or model call if any]
       → [Data store read/write]
       → [Output artifact]

  → [Step 2: function/service name] ([what it does])
       → ...

  → [Step N: function/service name] ([what it does])
       → [Final output: what gets stored or returned]
```

---

## Component deep-dives

<!-- For each major component in the pipeline above, create a subsection.
     Include:
       - File path and line count (helps the researcher gauge complexity)
       - Runtime environment and time budget
       - Cost per invocation (if external APIs are involved)
       - Step-by-step logic with code snippets for key configs, prompts,
         thresholds, or formulas
       - Any important settings (model, temperature, token limits, etc.)

     Be concrete — the research model produces better recommendations when
     it can see exactly how things work today, not just a summary.
-->

### [Component 1 Name]

**File**: `[path/to/file]` ([N] lines)
**Runtime**: [runtime environment], ~[N]s budget
**Cost**: ~$[N] per [unit] ([breakdown of API calls])

#### Step 1: [Step Name]

[Describe what happens, with code snippets for any prompts, configs, or formulas:]

```
[Code snippet, prompt template, config, or formula]
```

#### Step 2: [Step Name]

[Continue for each step...]

<!-- Repeat this subsection for each component. -->

### [Component 2 Name]

**File**: `[path/to/file]` ([N] lines)
**Cost**: ~$[N] per [unit]

[Steps...]

---

## Core algorithm / logic

<!-- If this system has a scoring formula, ranking algorithm, classification
     rules, or other core logic, detail it here with the actual formula
     and all constants/weights/thresholds.

     If this doesn't apply (e.g., the system is purely a pipeline with no
     scoring), delete this section.
-->

### [Algorithm Name] (v[VERSION])

```
[The actual formula, with all weights and thresholds]
```

### Thresholds / classification boundaries

```
[Any threshold values that determine output categories]
```

---

## Data schema

<!-- List every database table/model this system reads from or writes to.
     Include field names, types, and brief notes for non-obvious fields.
     Use the compact format below — it's dense but scannable.
-->

### [Table/Model 1]

```
[field_name]    [TYPE]    [Brief note if non-obvious]
[field_name]    [TYPE]
...
```

### [Table/Model 2]

```
...
```

---

## How this system connects to others

<!-- Explain how this subsystem's outputs are consumed by other parts of
     the product. This helps the researcher understand why quality matters
     and what downstream effects their recommendations would have.

     Use a numbered list mapping outputs to consumers with the impact.
-->

The [SYSTEM NAME] system's output feeds into:

1. **[Downstream system 1] ([impact %])**: [How the output is used and why it matters]
2. **[Downstream system 2] ([impact %])**: [...]
3. **[Downstream system 3]**: [...]

**Bottom line**: [One sentence summarizing why this system's quality is critical to the overall product.]

---

## Frontend / UI integration

<!-- Describe how this system surfaces to users. Include the key UI
     components, user interactions, and any feedback mechanisms.
     This grounds the researcher's recommendations in real UX context.
-->

### [UI Component 1]

- [What it shows / what triggers it]
- [User interactions available]
- [How data refreshes]

### [UI Component 2]

- [...]

---

## Current limitations and known issues

<!-- Numbered list of concrete problems. Be honest — this is the most
     important section for getting useful research. The more specific you
     are about what's broken, the better the recommendations will be.

     Good: "Search returns wrong-person results when company field is empty"
     Bad:  "Search could be better"
-->

1. **[Issue name]**: [Specific description of the problem and its impact]
2. **[Issue name]**: [...]
3. **[Issue name]**: [...]
4. **[Issue name]**: [...]
5. **[Issue name]**: [...]

---

## Constraints and environment

<!-- Hard limits the researcher must respect. Any recommendation that
     violates these constraints isn't useful to you.
-->

- **Runtime**: [environment, time budget per invocation]
- **Language**: [language/framework — what code must be written in]
- **APIs**: [list external APIs with cost info]
- **Scale**: [typical data volumes — e.g., "50-500 contacts per user"]
- **Database**: [database type and any extensions]
- **Budget**: [cost ceiling per unit of work]
- **Hard limits**: [anything that's absolutely off the table — e.g., "no browser automation", "no GPU", "no fine-tuning"]

---

## Evaluation (if applicable)

<!-- If you have an evaluation pipeline, metrics, or test data, describe
     them here. If not, delete this section or note that building
     evaluation is one of the research questions.
-->

- **Test data**: [description of any golden set, labeled data, or test fixtures]
- **Metrics**: [what you measure — e.g., precision@5, MRR, accuracy, latency]
- **Current baseline**: [current metric values if known]
- **How to run**: [command or process to run evaluation]

---

## What I want to research

<!-- This is where you ask your specific questions. Aim for 5-7 questions,
     each with 3-5 sub-bullets that narrow the scope.

     Structure each question as:
       1. **[Topic area]**: [One-sentence framing]. Research:
          - [Specific sub-question 1]
          - [Specific sub-question 2]
          - [Specific sub-question 3]

     Tips for good questions:
       - Tie each question to a limitation from the section above
       - Ask about alternatives, tradeoffs, and evidence
       - Reference specific components/patterns in your system
       - Ask about how comparable products solve the same problem
-->

Given the system described above, I want deep research into:

1. **[Research area 1]**: [One-sentence framing of what you want to learn]. Research:
   - [Sub-question about alternatives or approaches]
   - [Sub-question about tradeoffs or comparisons]
   - [Sub-question about evidence or case studies]
   - [Sub-question about implementation specifics]

2. **[Research area 2]**: [One-sentence framing]. Research:
   - [...]
   - [...]
   - [...]

3. **[Research area 3]**: [One-sentence framing]. Research:
   - [...]
   - [...]
   - [...]

4. **[Research area 4]**: [One-sentence framing]. Research:
   - [...]
   - [...]
   - [...]

5. **[Research area 5]**: [One-sentence framing]. Research:
   - [...]
   - [...]
   - [...]

<!-- Add more questions as needed. 5-7 is the sweet spot — fewer than 5
     under-utilizes the research session, more than 7 tends to produce
     shallow answers. -->

Please focus on **practical, implementable approaches** that work at our scale ([describe your scale constraints]). We're a [team size] team running on [infrastructure] — we need methods that can be implemented in [language/runtime] without [excluded infrastructure]. Prefer approaches with clear evidence of working at [your scale descriptor] over theoretically optimal methods that require [what you can't afford — e.g., "millions of training examples", "GPU clusters", "dedicated ML infrastructure"].
