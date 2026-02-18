import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import { analyzePortfolio } from "./investor-sources.ts";

// ─── analyzePortfolio ─────────────────────────────────────────────────────────

Deno.test("analyzePortfolio - clear sector patterns produces correct ranking", () => {
  const portfolio = [
    { name: "Company A", category: "SaaS, AI", fundingStage: "Series A" },
    { name: "Company B", category: "SaaS, Cloud", fundingStage: "Seed" },
    { name: "Company C", category: "AI, ML", fundingStage: "Series A" },
    { name: "Company D", category: "SaaS", fundingStage: "Series B" },
    { name: "Company E", category: "Biotech", fundingStage: "Series A" },
  ];
  const result = analyzePortfolio(portfolio);

  // SaaS appears 3 times, AI appears 2 times
  assertEquals(result.sectors[0], "SaaS");
  assertEquals(result.sectors.includes("AI"), true);
  assertEquals(result.sectorDistribution["SaaS"], 3);
  assertEquals(result.sectorDistribution["AI"], 2);
});

Deno.test("analyzePortfolio - stage distribution sorted correctly", () => {
  const portfolio = [
    { name: "A", fundingStage: "Series A" },
    { name: "B", fundingStage: "Series A" },
    { name: "C", fundingStage: "Seed" },
    { name: "D", fundingStage: "Series B" },
    { name: "E", fundingStage: "Seed" },
    { name: "F", fundingStage: "Seed" },
  ];
  const result = analyzePortfolio(portfolio);

  // Seed: 3, Series A: 2, Series B: 1
  assertEquals(result.stages[0], "Seed");
  assertEquals(result.stages[1], "Series A");
});

Deno.test("analyzePortfolio - empty portfolio returns empty arrays", () => {
  const result = analyzePortfolio([]);
  assertEquals(result.sectors, []);
  assertEquals(result.stages, []);
  assertEquals(Object.keys(result.sectorDistribution).length, 0);
});

Deno.test("analyzePortfolio - single company portfolio works", () => {
  const portfolio = [{ name: "Solo Corp", category: "Fintech", fundingStage: "Seed" }];
  const result = analyzePortfolio(portfolio);
  assertEquals(result.sectors, ["Fintech"]);
  assertEquals(result.stages, ["Seed"]);
});

Deno.test("analyzePortfolio - companies without category or stage skipped", () => {
  const portfolio = [
    { name: "No Info" },
    { name: "Has Category", category: "Web3" },
    { name: "Has Stage", fundingStage: "Series C" },
  ];
  const result = analyzePortfolio(portfolio);
  assertEquals(result.sectors, ["Web3"]);
  assertEquals(result.stages, ["Series C"]);
});

Deno.test("analyzePortfolio - multi-value categories split correctly", () => {
  const portfolio = [
    { name: "A", category: "Enterprise Software, Security, Cloud" },
  ];
  const result = analyzePortfolio(portfolio);
  assertEquals(result.sectors.includes("Enterprise Software"), true);
  assertEquals(result.sectors.includes("Security"), true);
  assertEquals(result.sectors.includes("Cloud"), true);
  assertEquals(result.sectorDistribution["Enterprise Software"], 1);
});

Deno.test("analyzePortfolio - sectors capped at 5", () => {
  const portfolio = [
    { name: "A", category: "Cat1" },
    { name: "B", category: "Cat2" },
    { name: "C", category: "Cat3" },
    { name: "D", category: "Cat4" },
    { name: "E", category: "Cat5" },
    { name: "F", category: "Cat6" },
    { name: "G", category: "Cat7" },
  ];
  const result = analyzePortfolio(portfolio);
  assertEquals(result.sectors.length <= 5, true);
});

Deno.test("analyzePortfolio - stages capped at 3", () => {
  const portfolio = [
    { name: "A", fundingStage: "Pre-Seed" },
    { name: "B", fundingStage: "Seed" },
    { name: "C", fundingStage: "Series A" },
    { name: "D", fundingStage: "Series B" },
    { name: "E", fundingStage: "Growth" },
  ];
  const result = analyzePortfolio(portfolio);
  assertEquals(result.stages.length <= 3, true);
});

Deno.test("analyzePortfolio - funding stage suffix stripped", () => {
  // fundingStage like "Series A - $5M" should become "Series A"
  const portfolio = [
    { name: "A", fundingStage: "Series A - $5M" },
    { name: "B", fundingStage: "Series A - $10M" },
  ];
  const result = analyzePortfolio(portfolio);
  assertEquals(result.stages[0], "Series A");
});
