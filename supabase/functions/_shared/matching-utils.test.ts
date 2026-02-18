import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import {
  fuzzyNameMatch,
  levenshteinDistance,
  matchesAny,
  parseCheckSize,
  cosineSimilarity,
  jaccardSimilarity,
  weightedJaccardSimilarity,
  scoreToStars,
  checkSizeFit,
} from "./matching-utils.ts";

// ─── fuzzyNameMatch ───────────────────────────────────────────────────────────

Deno.test("fuzzyNameMatch - exact match", () => {
  const result = fuzzyNameMatch("John Smith", "John Smith");
  assertEquals(result.match, true);
  assertEquals(result.score, 1.0);
  assertEquals(result.type, "exact");
});

Deno.test("fuzzyNameMatch - case insensitive exact", () => {
  const result = fuzzyNameMatch("john smith", "John Smith");
  assertEquals(result.match, true);
  assertEquals(result.score, 1.0);
  assertEquals(result.type, "exact");
});

Deno.test("fuzzyNameMatch - contains match (substring)", () => {
  const result = fuzzyNameMatch("Roy", "Roy E. Bahat");
  assertEquals(result.match, true);
  assertEquals(result.score, 0.95);
  assertEquals(result.type, "contains");
});

Deno.test("fuzzyNameMatch - fuzzy-both with middle initial", () => {
  const result = fuzzyNameMatch("Roy Bahat", "Roy E. Bahat");
  assertEquals(result.match, true);
  assertEquals(result.score, 0.9);
  assertEquals(result.type, "fuzzy-both");
});

Deno.test("fuzzyNameMatch - nickname Matt -> Matthew", () => {
  const result = fuzzyNameMatch("Matt Smith", "Matthew Smith");
  assertEquals(result.match, true);
  assertEquals(result.type, "fuzzy-both");
});

Deno.test("fuzzyNameMatch - nickname Rob -> Robert", () => {
  const result = fuzzyNameMatch("Rob Johnson", "Robert Johnson");
  assertEquals(result.match, true);
  assertEquals(result.type, "fuzzy-both");
});

Deno.test("fuzzyNameMatch - first name substring triggers contains", () => {
  // "john" is a substring of "john smith", so contains match fires first
  const result = fuzzyNameMatch("John", "John Smith");
  assertEquals(result.match, true);
  assertEquals(result.score, 0.95);
  assertEquals(result.type, "contains");
});


Deno.test("fuzzyNameMatch - single name substring of contact first name triggers contains", () => {
  // "matt" is a substring of "matthew", so "matt" vs "matthew johnson"
  // triggers contains before the nickname path
  const result = fuzzyNameMatch("Matt", "Matthew Johnson");
  assertEquals(result.match, true);
  assertEquals(result.score, 0.95);
  assertEquals(result.type, "contains");
});

Deno.test("fuzzyNameMatch - no match", () => {
  const result = fuzzyNameMatch("Alice Walker", "Bob Johnson");
  assertEquals(result.match, false);
  assertEquals(result.score, 0);
  assertEquals(result.type, "none");
});

Deno.test("fuzzyNameMatch - empty strings", () => {
  const result = fuzzyNameMatch("", "");
  assertEquals(result.match, true);
  assertEquals(result.type, "exact");
});

Deno.test("fuzzyNameMatch - one empty string", () => {
  const result = fuzzyNameMatch("", "John Smith");
  assertEquals(result.match, true);
  assertEquals(result.type, "contains");
});

Deno.test("fuzzyNameMatch - levenshtein close spelling", () => {
  // "jonh smith" vs "john smith": distance=1, maxLen=10, similarity=0.9 >= 0.8
  const result = fuzzyNameMatch("Jonh Smith", "John Smith");
  assertEquals(result.match, true);
  assertEquals(result.type, "levenshtein");
});

// ─── levenshteinDistance ──────────────────────────────────────────────────────

Deno.test("levenshteinDistance - identical strings", () => {
  assertEquals(levenshteinDistance("hello", "hello"), 0);
});

Deno.test("levenshteinDistance - single edit", () => {
  assertEquals(levenshteinDistance("kitten", "sitten"), 1);
});

Deno.test("levenshteinDistance - completely different", () => {
  const d = levenshteinDistance("abc", "xyz");
  assertEquals(d, 3);
});

Deno.test("levenshteinDistance - empty first string", () => {
  assertEquals(levenshteinDistance("", "hello"), 5);
});

Deno.test("levenshteinDistance - empty second string", () => {
  assertEquals(levenshteinDistance("hello", ""), 5);
});

Deno.test("levenshteinDistance - both empty", () => {
  assertEquals(levenshteinDistance("", ""), 0);
});

// ─── matchesAny ───────────────────────────────────────────────────────────────

Deno.test("matchesAny - exact match in list", () => {
  assertEquals(matchesAny("fintech", ["fintech", "healthcare"]), true);
});

Deno.test("matchesAny - partial match (value contains item)", () => {
  assertEquals(matchesAny("san francisco bay area", ["san francisco"]), true);
});

Deno.test("matchesAny - partial match (item contains value)", () => {
  assertEquals(matchesAny("AI", ["artificial intelligence and AI"]), true);
});

Deno.test("matchesAny - case insensitive", () => {
  assertEquals(matchesAny("SaaS", ["saas", "fintech"]), true);
});

Deno.test("matchesAny - no match", () => {
  assertEquals(matchesAny("biotech", ["fintech", "saas"]), false);
});

Deno.test("matchesAny - empty items array", () => {
  assertEquals(matchesAny("anything", []), false);
});

// ─── parseCheckSize ───────────────────────────────────────────────────────────

Deno.test("parseCheckSize - $5M", () => {
  assertEquals(parseCheckSize("$5M"), 5_000_000);
});

Deno.test("parseCheckSize - $500K", () => {
  assertEquals(parseCheckSize("$500K"), 500_000);
});

Deno.test("parseCheckSize - 2.5m lowercase", () => {
  assertEquals(parseCheckSize("2.5m"), 2_500_000);
});

Deno.test("parseCheckSize - $5,000,000 plain number", () => {
  assertEquals(parseCheckSize("$5,000,000"), 5_000_000);
});

Deno.test("parseCheckSize - 10 thousand", () => {
  assertEquals(parseCheckSize("10 thousand"), 10_000);
});

Deno.test("parseCheckSize - 3 million", () => {
  assertEquals(parseCheckSize("3 million"), 3_000_000);
});

Deno.test("parseCheckSize - invalid input", () => {
  assertEquals(parseCheckSize("no numbers here"), null);
});

Deno.test("parseCheckSize - plain number without suffix", () => {
  assertEquals(parseCheckSize("250000"), 250_000);
});

// ─── cosineSimilarity ─────────────────────────────────────────────────────────

Deno.test("cosineSimilarity - identical vectors", () => {
  const vec = [1, 2, 3];
  assertAlmostEquals(cosineSimilarity(vec, vec), 1.0, 1e-10);
});

Deno.test("cosineSimilarity - orthogonal vectors", () => {
  assertAlmostEquals(cosineSimilarity([1, 0], [0, 1]), 0.0, 1e-10);
});

Deno.test("cosineSimilarity - opposite vectors", () => {
  assertAlmostEquals(cosineSimilarity([1, 0], [-1, 0]), -1.0, 1e-10);
});

Deno.test("cosineSimilarity - different lengths returns 0", () => {
  assertEquals(cosineSimilarity([1, 2, 3], [1, 2]), 0);
});

Deno.test("cosineSimilarity - zero vectors returns 0", () => {
  assertEquals(cosineSimilarity([0, 0, 0], [0, 0, 0]), 0);
});

// ─── jaccardSimilarity ───────────────────────────────────────────────────────

Deno.test("jaccardSimilarity - identical sets", () => {
  assertAlmostEquals(
    jaccardSimilarity(["a", "b", "c"], ["a", "b", "c"]),
    1.0,
    1e-10,
  );
});

Deno.test("jaccardSimilarity - disjoint sets", () => {
  assertAlmostEquals(
    jaccardSimilarity(["a", "b"], ["c", "d"]),
    0.0,
    1e-10,
  );
});

Deno.test("jaccardSimilarity - partial overlap", () => {
  assertAlmostEquals(
    jaccardSimilarity(["a", "b", "c"], ["b", "c", "d"]),
    0.5,
    1e-10,
  );
});

Deno.test("jaccardSimilarity - both empty", () => {
  assertEquals(jaccardSimilarity([], []), 0);
});

Deno.test("jaccardSimilarity - one empty", () => {
  assertEquals(jaccardSimilarity(["a", "b"], []), 0);
});

Deno.test("jaccardSimilarity - case insensitive", () => {
  assertAlmostEquals(
    jaccardSimilarity(["Fintech", "SaaS"], ["fintech", "saas"]),
    1.0,
    1e-10,
  );
});

// ─── scoreToStars ─────────────────────────────────────────────────────────────

Deno.test("scoreToStars - 3 stars at threshold", () => {
  assertEquals(scoreToStars(0.40), 3);
});

Deno.test("scoreToStars - 3 stars above threshold", () => {
  assertEquals(scoreToStars(0.85), 3);
});

Deno.test("scoreToStars - 2 stars at threshold", () => {
  assertEquals(scoreToStars(0.20), 2);
});

Deno.test("scoreToStars - 2 stars between", () => {
  assertEquals(scoreToStars(0.35), 2);
});

Deno.test("scoreToStars - 1 star at threshold", () => {
  assertEquals(scoreToStars(0.05), 1);
});

Deno.test("scoreToStars - 1 star between", () => {
  assertEquals(scoreToStars(0.10), 1);
});

Deno.test("scoreToStars - 0 stars below threshold", () => {
  assertEquals(scoreToStars(0.04), 0);
});

Deno.test("scoreToStars - 0 stars at zero", () => {
  assertEquals(scoreToStars(0), 0);
});

// ─── weightedJaccardSimilarity ────────────────────────────────────────────────

Deno.test("weightedJaccardSimilarity - all high-confidence matches", () => {
  const set1 = [
    { value: "fintech", weight: 0.95 },
    { value: "saas", weight: 0.90 },
  ];
  const score = weightedJaccardSimilarity(set1, ["fintech", "saas"]);
  assertEquals(score > 0.8, true);
});

Deno.test("weightedJaccardSimilarity - low-confidence tags contribute less", () => {
  const highConf = [
    { value: "fintech", weight: 0.95 },
    { value: "saas", weight: 0.90 },
  ];
  const lowConf = [
    { value: "fintech", weight: 0.30 },
    { value: "saas", weight: 0.20 },
  ];
  const highScore = weightedJaccardSimilarity(highConf, ["fintech", "saas"]);
  const lowScore = weightedJaccardSimilarity(lowConf, ["fintech", "saas"]);
  assertEquals(highScore > lowScore, true);
});

Deno.test("weightedJaccardSimilarity - no overlap returns 0", () => {
  const set1 = [{ value: "fintech", weight: 0.9 }];
  assertEquals(weightedJaccardSimilarity(set1, ["biotech"]), 0);
});

Deno.test("weightedJaccardSimilarity - both empty returns 0", () => {
  assertEquals(weightedJaccardSimilarity([], []), 0);
});

Deno.test("weightedJaccardSimilarity - case insensitive", () => {
  const set1 = [{ value: "FinTech", weight: 0.9 }];
  const score = weightedJaccardSimilarity(set1, ["fintech"]);
  assertEquals(score > 0, true);
});

// ─── checkSizeFit ─────────────────────────────────────────────────────────────

Deno.test("checkSizeFit - perfect overlap (contact range contains conv range)", () => {
  assertEquals(checkSizeFit(1_000_000, 3_000_000, 500_000, 5_000_000), 1.0);
});

Deno.test("checkSizeFit - exact same range", () => {
  assertEquals(checkSizeFit(1_000_000, 3_000_000, 1_000_000, 3_000_000), 1.0);
});

Deno.test("checkSizeFit - partial overlap returns > 0.5", () => {
  const score = checkSizeFit(1_000_000, 5_000_000, 3_000_000, 10_000_000);
  assertEquals(score > 0.5, true);
  assertEquals(score <= 1.0, true);
});

Deno.test("checkSizeFit - no overlap returns low score", () => {
  const score = checkSizeFit(1_000_000, 2_000_000, 10_000_000, 20_000_000);
  assertEquals(score <= 0.3, true);
  assertEquals(score >= 0, true);
});

Deno.test("checkSizeFit - both null conv returns 0", () => {
  assertEquals(checkSizeFit(null, null, 1_000_000, 5_000_000), 0);
});

Deno.test("checkSizeFit - both null contact returns 0", () => {
  assertEquals(checkSizeFit(1_000_000, 5_000_000, null, null), 0);
});

Deno.test("checkSizeFit - single value conv (min only)", () => {
  const score = checkSizeFit(2_000_000, null, 1_000_000, 5_000_000);
  assertEquals(score, 1.0);
});

Deno.test("checkSizeFit - single value contact (min only)", () => {
  // contact has single point at 2M, conv range is 1-3M → point is inside range
  const score = checkSizeFit(1_000_000, 3_000_000, 2_000_000, null);
  assertEquals(score >= 0.5, true);
});

Deno.test("checkSizeFit - adjacent ranges return moderate score", () => {
  const score = checkSizeFit(1_000_000, 2_000_000, 2_000_000, 5_000_000);
  assertEquals(score >= 0.5, true);
});
