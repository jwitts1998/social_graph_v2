import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import {
  calculateCompletenessScore,
  getEnrichmentPriority,
  getMissingCriticalFields,
  assessEnrichmentQuality,
  calculateFreshnessScore,
  calculateConfidenceScore,
  calculateCompositeQualityScore,
  getEnrichmentPriorityScore,
} from "./data-quality.ts";

// ─── calculateCompletenessScore ───────────────────────────────────────────────

Deno.test("calculateCompletenessScore - empty contact scores 0", () => {
  assertEquals(calculateCompletenessScore({}), 0);
});

Deno.test("calculateCompletenessScore - full contact scores 100", () => {
  const contact = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    linkedin_url: "https://linkedin.com/in/johndoe",
    bio: "A professional",
    title: "CEO",
    company: "Acme",
    location: "San Francisco",
    education: [{ school: "MIT" }],
    career_history: [{ company: "Acme", title: "CEO" }],
    personal_interests: ["hiking"],
    expertise_areas: ["leadership"],
    portfolio_companies: ["Startup A"],
  };
  assertEquals(calculateCompletenessScore(contact), 100);
});

Deno.test("calculateCompletenessScore - name only scores 5", () => {
  assertEquals(calculateCompletenessScore({ name: "John" }), 5);
});

Deno.test("calculateCompletenessScore - empty string does not count", () => {
  assertEquals(calculateCompletenessScore({ name: "John", email: "  " }), 5);
});

Deno.test("calculateCompletenessScore - empty array does not count", () => {
  assertEquals(calculateCompletenessScore({ name: "John", education: [] }), 5);
});

Deno.test("calculateCompletenessScore - partial contact matches expected sum", () => {
  // name(5) + email(10) + title(10) + company(10) = 35
  const contact = {
    name: "Jane",
    email: "jane@co.com",
    title: "VP",
    company: "Corp",
  };
  assertEquals(calculateCompletenessScore(contact), 35);
});

// ─── getEnrichmentPriority ────────────────────────────────────────────────────

Deno.test("getEnrichmentPriority - 0 is high", () => {
  assertEquals(getEnrichmentPriority(0), "high");
});

Deno.test("getEnrichmentPriority - 39 is high", () => {
  assertEquals(getEnrichmentPriority(39), "high");
});

Deno.test("getEnrichmentPriority - 40 is medium", () => {
  assertEquals(getEnrichmentPriority(40), "medium");
});

Deno.test("getEnrichmentPriority - 69 is medium", () => {
  assertEquals(getEnrichmentPriority(69), "medium");
});

Deno.test("getEnrichmentPriority - 70 is low", () => {
  assertEquals(getEnrichmentPriority(70), "low");
});

Deno.test("getEnrichmentPriority - 100 is low", () => {
  assertEquals(getEnrichmentPriority(100), "low");
});

// ─── getMissingCriticalFields ─────────────────────────────────────────────────

Deno.test("getMissingCriticalFields - all missing", () => {
  const missing = getMissingCriticalFields({});
  assertEquals(missing, ["email", "linkedin_url", "bio", "title", "company"]);
});

Deno.test("getMissingCriticalFields - none missing", () => {
  const contact = {
    email: "a@b.com",
    linkedin_url: "https://linkedin.com/in/a",
    bio: "A bio",
    title: "CEO",
    company: "Inc",
  };
  assertEquals(getMissingCriticalFields(contact), []);
});

Deno.test("getMissingCriticalFields - whitespace-only fields counted as missing", () => {
  const missing = getMissingCriticalFields({ email: "  ", title: "CEO" });
  assertEquals(missing.includes("email"), true);
  assertEquals(missing.includes("title"), false);
});

// ─── assessEnrichmentQuality ──────────────────────────────────────────────────

Deno.test("assessEnrichmentQuality - hasRichData true with education", () => {
  const result = assessEnrichmentQuality({ education: [{ school: "MIT" }] });
  assertEquals(result.hasRichData, true);
});

Deno.test("assessEnrichmentQuality - hasRichData true with career", () => {
  const result = assessEnrichmentQuality({ career_history: [{ co: "X" }] });
  assertEquals(result.hasRichData, true);
});

Deno.test("assessEnrichmentQuality - hasRichData true with interests", () => {
  const result = assessEnrichmentQuality({ personal_interests: ["chess"] });
  assertEquals(result.hasRichData, true);
});

Deno.test("assessEnrichmentQuality - hasRichData false when empty", () => {
  const result = assessEnrichmentQuality({});
  assertEquals(result.hasRichData, false);
});

// ─── calculateFreshnessScore ──────────────────────────────────────────────────

Deno.test("calculateFreshnessScore - null returns 0", () => {
  assertEquals(calculateFreshnessScore(null), 0);
});

Deno.test("calculateFreshnessScore - undefined returns 0", () => {
  assertEquals(calculateFreshnessScore(undefined), 0);
});

Deno.test("calculateFreshnessScore - just enriched returns ~100", () => {
  const now = new Date();
  const score = calculateFreshnessScore(now);
  assertEquals(score >= 99, true);
});

Deno.test("calculateFreshnessScore - 6 months ago decays significantly", () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const score = calculateFreshnessScore(sixMonthsAgo);
  // ~100 - 48 = ~52
  assertEquals(score >= 45, true);
  assertEquals(score <= 60, true);
});

Deno.test("calculateFreshnessScore - 13 months ago clamps to 0", () => {
  const thirteenMonthsAgo = new Date();
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
  const score = calculateFreshnessScore(thirteenMonthsAgo);
  assertEquals(score, 0);
});

Deno.test("calculateFreshnessScore - accepts ISO string", () => {
  const now = new Date().toISOString();
  const score = calculateFreshnessScore(now);
  assertEquals(score >= 99, true);
});

// ─── calculateConfidenceScore ─────────────────────────────────────────────────

Deno.test("calculateConfidenceScore - null returns 50", () => {
  assertEquals(calculateConfidenceScore(null), 50);
});

Deno.test("calculateConfidenceScore - empty object returns 50", () => {
  assertEquals(calculateConfidenceScore({}), 50);
});

Deno.test("calculateConfidenceScore - all high returns 100", () => {
  assertEquals(
    calculateConfidenceScore({ title: "high", company: "high", bio: "high" }),
    100,
  );
});

Deno.test("calculateConfidenceScore - all low returns 30", () => {
  assertEquals(
    calculateConfidenceScore({ title: "low", company: "low", bio: "low" }),
    30,
  );
});

Deno.test("calculateConfidenceScore - mixed values averaged", () => {
  // high(100) + low(30) = 130 / 2 = 65
  assertEquals(calculateConfidenceScore({ title: "high", company: "low" }), 65);
});

Deno.test("calculateConfidenceScore - unknown confidence defaults to 50", () => {
  // 50 + 100 = 150 / 2 = 75
  assertEquals(calculateConfidenceScore({ title: "unknown_level", company: "high" }), 75);
});

// ─── calculateCompositeQualityScore ───────────────────────────────────────────

Deno.test("calculateCompositeQualityScore - all zeros", () => {
  const score = calculateCompositeQualityScore({});
  // 0.4*0 + 0.3*50(default conf) + 0.3*0(no enrichment) = 15
  assertEquals(score, 15);
});

Deno.test("calculateCompositeQualityScore - high quality contact", () => {
  const score = calculateCompositeQualityScore({
    data_completeness_score: 80,
    enrichment_confidence: { title: "high", company: "high", bio: "high" },
    last_enriched_at: new Date(),
  });
  // 0.4*80 + 0.3*100 + 0.3*100 = 32 + 30 + 30 = 92
  assertEquals(score, 92);
});

Deno.test("calculateCompositeQualityScore - stale high-quality contact penalized", () => {
  const staleDate = new Date();
  staleDate.setMonth(staleDate.getMonth() - 12);
  const score = calculateCompositeQualityScore({
    data_completeness_score: 80,
    enrichment_confidence: { title: "high", company: "high" },
    last_enriched_at: staleDate,
  });
  // Freshness ~4, 0.4*80 + 0.3*100 + 0.3*4 = 32+30+~1 = ~63
  assertEquals(score >= 55, true);
  assertEquals(score <= 70, true);
});

// ─── getEnrichmentPriorityScore ───────────────────────────────────────────────

Deno.test("getEnrichmentPriorityScore - investor with no completeness scores highest", () => {
  const score = getEnrichmentPriorityScore({
    data_completeness_score: 0,
    is_investor: true,
    linkedin_url: "https://linkedin.com/in/test",
    company: "Fund",
    email: "a@b.com",
  });
  // 100 - 0 + 20 + 10 + 5 + 5 = 140
  assertEquals(score, 140);
});

Deno.test("getEnrichmentPriorityScore - well-enriched non-investor scores lowest", () => {
  const score = getEnrichmentPriorityScore({
    data_completeness_score: 90,
    is_investor: false,
  });
  // 100 - 90 = 10
  assertEquals(score, 10);
});

Deno.test("getEnrichmentPriorityScore - investor detected via contact_type", () => {
  const score = getEnrichmentPriorityScore({
    data_completeness_score: 50,
    contact_type: ["GP"],
  });
  // 100 - 50 + 20 = 70
  assertEquals(score, 70);
});

Deno.test("getEnrichmentPriorityScore - LinkedIn bonus applied", () => {
  const withLinkedin = getEnrichmentPriorityScore({
    data_completeness_score: 50,
    linkedin_url: "https://linkedin.com/in/test",
  });
  const without = getEnrichmentPriorityScore({
    data_completeness_score: 50,
  });
  assertEquals(withLinkedin - without, 10);
});

Deno.test("getEnrichmentPriorityScore - company bonus applied", () => {
  const withCompany = getEnrichmentPriorityScore({
    data_completeness_score: 50,
    company: "Acme",
  });
  const without = getEnrichmentPriorityScore({
    data_completeness_score: 50,
  });
  assertEquals(withCompany - without, 5);
});

Deno.test("getEnrichmentPriorityScore - null completeness treated as 0", () => {
  const score = getEnrichmentPriorityScore({});
  // 100 - 0 = 100
  assertEquals(score, 100);
});
