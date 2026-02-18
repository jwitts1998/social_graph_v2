import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import {
  validateLinkedInUrl,
  validateEmailDomain,
  crossReferenceResults,
  mergeWithPreference,
} from "./enrichment-validation.ts";

// ─── validateLinkedInUrl ──────────────────────────────────────────────────────

Deno.test("validateLinkedInUrl - valid URL with matching name parts", () => {
  assertEquals(
    validateLinkedInUrl("https://linkedin.com/in/marc-andreessen", "Marc Andreessen"),
    true,
  );
});

Deno.test("validateLinkedInUrl - valid URL with partial name match", () => {
  assertEquals(
    validateLinkedInUrl("https://www.linkedin.com/in/satyanadella/", "Satya Nadella"),
    true,
  );
});

Deno.test("validateLinkedInUrl - slug does not match name", () => {
  assertEquals(
    validateLinkedInUrl("https://linkedin.com/in/jane-smith-123", "John Doe"),
    false,
  );
});

Deno.test("validateLinkedInUrl - non-LinkedIn URL", () => {
  assertEquals(
    validateLinkedInUrl("https://twitter.com/johndoe", "John Doe"),
    false,
  );
});

Deno.test("validateLinkedInUrl - empty URL", () => {
  assertEquals(validateLinkedInUrl("", "John Doe"), false);
});

Deno.test("validateLinkedInUrl - empty name", () => {
  assertEquals(validateLinkedInUrl("https://linkedin.com/in/john-doe", ""), false);
});

Deno.test("validateLinkedInUrl - invalid URL format", () => {
  assertEquals(validateLinkedInUrl("not-a-url", "John Doe"), false);
});

Deno.test("validateLinkedInUrl - short name parts filtered out", () => {
  // "Li" is too short (<=2 chars), so only "Zhang" should be checked
  assertEquals(
    validateLinkedInUrl("https://linkedin.com/in/zhang-wei", "Li Zhang"),
    true,
  );
});

// ─── validateEmailDomain ──────────────────────────────────────────────────────

Deno.test("validateEmailDomain - work email matches company", () => {
  assertEquals(validateEmailDomain("john@stripe.com", "Stripe"), true);
});

Deno.test("validateEmailDomain - company name contained in domain", () => {
  assertEquals(validateEmailDomain("jane@openai.com", "OpenAI"), true);
});

Deno.test("validateEmailDomain - domain mismatch", () => {
  assertEquals(validateEmailDomain("john@google.com", "Microsoft"), false);
});

Deno.test("validateEmailDomain - Gmail returns null (generic)", () => {
  assertEquals(validateEmailDomain("john@gmail.com", "Stripe"), null);
});

Deno.test("validateEmailDomain - Yahoo returns null (generic)", () => {
  assertEquals(validateEmailDomain("john@yahoo.com", "Stripe"), null);
});

Deno.test("validateEmailDomain - null email returns null", () => {
  assertEquals(validateEmailDomain(null, "Stripe"), null);
});

Deno.test("validateEmailDomain - null company returns null", () => {
  assertEquals(validateEmailDomain("john@stripe.com", null), null);
});

Deno.test("validateEmailDomain - no @ in email returns null", () => {
  assertEquals(validateEmailDomain("invalid-email", "Stripe"), null);
});

// ─── crossReferenceResults ────────────────────────────────────────────────────

Deno.test("crossReferenceResults - matching data has no discrepancies", () => {
  const waterfall = { title: "CEO", company: "Acme Inc", location: "San Francisco" };
  const gpt = { title: "CEO", company: "Acme Inc", location: "San Francisco" };
  const result = crossReferenceResults(waterfall, gpt, "John Doe");
  assertEquals(result.isValid, true);
  assertEquals(result.discrepancies.length, 0);
});

Deno.test("crossReferenceResults - conflicting title flagged as prefer_waterfall", () => {
  const waterfall = { title: "CTO", company: "Acme Inc" };
  const gpt = { title: "VP Engineering", company: "Acme Inc" };
  const result = crossReferenceResults(waterfall, gpt, "John Doe");
  assertEquals(result.isValid, false);
  assertEquals(result.discrepancies.length, 1);
  assertEquals(result.discrepancies[0].field, "title");
  assertEquals(result.discrepancies[0].resolution, "prefer_waterfall");
});

Deno.test("crossReferenceResults - conflicting company flagged", () => {
  const waterfall = { title: "CEO", company: "Acme Inc" };
  const gpt = { title: "CEO", company: "Beta Corp" };
  const result = crossReferenceResults(waterfall, gpt, "John Doe");
  assertEquals(result.isValid, false);
  assertEquals(result.discrepancies[0].field, "company");
});

Deno.test("crossReferenceResults - null waterfall returns valid", () => {
  const gpt = { title: "CEO", company: "Acme" };
  const result = crossReferenceResults(null, gpt, "John Doe");
  assertEquals(result.isValid, true);
  assertEquals(result.discrepancies.length, 0);
});

Deno.test("crossReferenceResults - null gpt returns valid", () => {
  const waterfall = { title: "CEO", company: "Acme" };
  const result = crossReferenceResults(waterfall, null, "John Doe");
  assertEquals(result.isValid, true);
});

Deno.test("crossReferenceResults - both null returns valid", () => {
  const result = crossReferenceResults(null, null, "John Doe");
  assertEquals(result.isValid, true);
});

Deno.test("crossReferenceResults - similar values (substring match) are not flagged", () => {
  const waterfall = { title: "Senior Software Engineer" };
  const gpt = { title: "Software Engineer" };
  const result = crossReferenceResults(waterfall, gpt, "John Doe");
  assertEquals(result.isValid, true);
  assertEquals(result.discrepancies.length, 0);
});

Deno.test("crossReferenceResults - validates LinkedIn URL in GPT data", () => {
  const waterfall = { title: "CEO" };
  const gpt = { title: "CEO", linkedin_url: "https://linkedin.com/in/john-doe" };
  const result = crossReferenceResults(waterfall, gpt, "John Doe");
  assertEquals(result.linkedinUrlValid, true);
});

Deno.test("crossReferenceResults - invalid LinkedIn URL flagged", () => {
  const waterfall = { title: "CEO" };
  const gpt = { title: "CEO", linkedin_url: "https://linkedin.com/in/someone-else" };
  const result = crossReferenceResults(waterfall, gpt, "John Doe");
  assertEquals(result.linkedinUrlValid, false);
});

// ─── mergeWithPreference ──────────────────────────────────────────────────────

Deno.test("mergeWithPreference - waterfall wins for core fields", () => {
  const waterfall = { title: "CTO", company: "Acme" };
  const gpt = { title: "VP Engineering", company: "Acme Inc" };
  const existing = {};
  const result = mergeWithPreference(waterfall, gpt, existing);
  assertEquals(result.title, "CTO");
  assertEquals(result.company, "Acme");
});

Deno.test("mergeWithPreference - GPT fills core field gaps", () => {
  const waterfall = { title: "CTO" };
  const gpt = { title: "CTO", company: "Acme", location: "SF" };
  const existing = {};
  const result = mergeWithPreference(waterfall, gpt, existing);
  assertEquals(result.title, "CTO");
  assertEquals(result.company, "Acme");
  assertEquals(result.location, "SF");
});

Deno.test("mergeWithPreference - existing fields not overwritten", () => {
  const waterfall = { title: "CTO", company: "New Corp" };
  const gpt = { title: "VP", company: "Other" };
  const existing = { title: "CEO", company: "Existing Inc" };
  const result = mergeWithPreference(waterfall, gpt, existing);
  assertEquals(result.title, undefined);
  assertEquals(result.company, undefined);
});

Deno.test("mergeWithPreference - GPT wins for enrichment fields", () => {
  const waterfall = { bio: "Short bio from PDL" };
  const gpt = { bio: "Detailed bio from GPT with much more context about the person" };
  const existing = {};
  const result = mergeWithPreference(waterfall, gpt, existing);
  assertEquals(result.bio, "Detailed bio from GPT with much more context about the person");
});

Deno.test("mergeWithPreference - enrichment arrays from GPT preferred", () => {
  const waterfall = {};
  const gpt = { education: [{ school: "MIT" }], expertise_areas: ["AI", "ML"] };
  const existing = {};
  const result = mergeWithPreference(waterfall, gpt, existing);
  assertEquals(result.education, [{ school: "MIT" }]);
  assertEquals(result.expertise_areas, ["AI", "ML"]);
});

Deno.test("mergeWithPreference - null inputs handled gracefully", () => {
  const result = mergeWithPreference(null, null, {});
  assertEquals(Object.keys(result).length, 0);
});

Deno.test("mergeWithPreference - waterfall enrichment used when no GPT", () => {
  const waterfall = { bio: "A professional bio from PDL with enough detail" };
  const gpt = null;
  const existing = {};
  const result = mergeWithPreference(waterfall, gpt, existing);
  assertEquals(result.bio, "A professional bio from PDL with enough detail");
});
