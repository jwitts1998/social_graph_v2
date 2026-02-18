/**
 * Offline evaluation script for the matching algorithm.
 *
 * Reads the golden set, resolves seed names to database IDs, fetches
 * the latest match_suggestions, and computes precision@5, precision@10,
 * hit-rate@1, MRR, and NDCG@5 per conversation plus macro-averages.
 *
 * Usage:
 *   npx tsx scripts/eval/run-matching-eval.ts [--threshold N]
 *
 * Exits 0 when mean MRR >= threshold (default 0.40), non-zero otherwise.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Args ─────────────────────────────────────────────────────────────────────

const thresholdArg = process.argv.find((a) => a.startsWith('--threshold'));
const MIN_MRR = thresholdArg
  ? parseFloat(thresholdArg.split('=')[1] ?? process.argv[process.argv.indexOf(thresholdArg) + 1])
  : 0.40;

// ── Load golden set ──────────────────────────────────────────────────────────

const goldenPath = path.join(__dirname, 'golden-set.json');
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
interface Label {
  conversation: string;
  contact: string;
  label: number;
  note?: string;
}
const labels: Label[] = golden.labels;

// ── Resolve names → IDs ─────────────────────────────────────────────────────

const convTitles = [...new Set(labels.map((l) => l.conversation))];
const contactNames = [...new Set(labels.map((l) => l.contact))];

const { data: convRows } = await supabase
  .from('conversations')
  .select('id, title')
  .in('title', convTitles);

const { data: contactRows } = await supabase
  .from('contacts')
  .select('id, name')
  .in('name', contactNames);

const convIdMap = new Map<string, string>();
for (const r of convRows ?? []) convIdMap.set(r.title, r.id);

const contactIdMap = new Map<string, string>();
for (const r of contactRows ?? []) contactIdMap.set(r.name, r.id);

// Verify all names resolved
let missing = false;
for (const t of convTitles) {
  if (!convIdMap.has(t)) {
    console.error(`Conversation not found in DB: "${t}"`);
    missing = true;
  }
}
for (const n of contactNames) {
  if (!contactIdMap.has(n)) {
    console.error(`Contact not found in DB: "${n}"`);
    missing = true;
  }
}
if (missing) {
  console.error('\nRun the seed script first:  npx tsx scripts/seed-test-data.ts');
  process.exit(1);
}

// Build per-conversation positive / negative sets
interface ConvEval {
  title: string;
  convId: string;
  positiveContactIds: Set<string>;
  negativeContactIds: Set<string>;
}

const evalMap = new Map<string, ConvEval>();
for (const l of labels) {
  const convId = convIdMap.get(l.conversation)!;
  const contactId = contactIdMap.get(l.contact)!;
  if (!evalMap.has(l.conversation)) {
    evalMap.set(l.conversation, {
      title: l.conversation,
      convId,
      positiveContactIds: new Set(),
      negativeContactIds: new Set(),
    });
  }
  const ce = evalMap.get(l.conversation)!;
  if (l.label === 1) ce.positiveContactIds.add(contactId);
  else ce.negativeContactIds.add(contactId);
}

// ── Fetch matches and compute metrics ────────────────────────────────────────

// ── Metric helpers ───────────────────────────────────────────────────────────

function computeReciprocalRank(ranked: string[], positives: Set<string>): number {
  for (let i = 0; i < ranked.length; i++) {
    if (positives.has(ranked[i])) return 1 / (i + 1);
  }
  return 0;
}

function computeNDCG(ranked: string[], positives: Set<string>, k: number): number {
  // DCG@k with binary relevance
  let dcg = 0;
  for (let i = 0; i < Math.min(k, ranked.length); i++) {
    const rel = positives.has(ranked[i]) ? 1 : 0;
    dcg += rel / Math.log2(i + 2); // i+2 because rank is 1-indexed
  }
  // Ideal DCG: all positives at the top
  const idealCount = Math.min(positives.size, k);
  let idcg = 0;
  for (let i = 0; i < idealCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  return idcg > 0 ? dcg / idcg : 0;
}

// ── Fetch matches and compute metrics ────────────────────────────────────────

interface Result {
  title: string;
  totalMatches: number;
  precisionAt5: number;
  precisionAt10: number;
  hitRateAt1: number;
  mrr: number;
  ndcgAt5: number;
  falsePositivesInTop5: string[];
  missedPositives: string[];
}

const results: Result[] = [];

for (const ce of evalMap.values()) {
  const { data: matches } = await supabase
    .from('match_suggestions')
    .select('contact_id, score, score_breakdown, contacts:contact_id ( name )')
    .eq('conversation_id', ce.convId)
    .order('score', { ascending: false });

  const rankedContactIds = (matches ?? []).map((m: any) => m.contact_id as string);

  const precisionAtK = (k: number): number => {
    const topK = rankedContactIds.slice(0, k);
    if (topK.length === 0) return ce.positiveContactIds.size === 0 ? 1.0 : 0;
    const hits = topK.filter((id) => ce.positiveContactIds.has(id)).length;
    return hits / Math.min(k, ce.positiveContactIds.size || 1);
  };

  const hitRateAt1 =
    rankedContactIds.length > 0 && ce.positiveContactIds.has(rankedContactIds[0]) ? 1 : 0;

  const mrr = computeReciprocalRank(rankedContactIds, ce.positiveContactIds);
  const ndcgAt5 = computeNDCG(rankedContactIds, ce.positiveContactIds, 5);

  const falsePositivesInTop5 = rankedContactIds
    .slice(0, 5)
    .filter((id) => ce.negativeContactIds.has(id))
    .map((id) => {
      const name = contactRows?.find((c: any) => c.id === id)?.name ?? id;
      return name;
    });

  const missedPositives = [...ce.positiveContactIds]
    .filter((id) => !rankedContactIds.includes(id))
    .map((id) => {
      const name = contactRows?.find((c: any) => c.id === id)?.name ?? id;
      return name;
    });

  results.push({
    title: ce.title,
    totalMatches: rankedContactIds.length,
    precisionAt5: precisionAtK(5),
    precisionAt10: precisionAtK(10),
    hitRateAt1,
    mrr,
    ndcgAt5,
    falsePositivesInTop5,
    missedPositives,
  });
}

// ── Print report ─────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════════');
console.log('           MATCHING ALGORITHM EVALUATION REPORT');
console.log('══════════════════════════════════════════════════════════════\n');

for (const r of results) {
  console.log(`▸ ${r.title}`);
  console.log(`  Matches returned: ${r.totalMatches}`);
  console.log(`  Precision@5:  ${(r.precisionAt5 * 100).toFixed(1)}%`);
  console.log(`  Precision@10: ${(r.precisionAt10 * 100).toFixed(1)}%`);
  console.log(`  Hit-rate@1:   ${r.hitRateAt1 ? 'YES' : 'NO'}`);
  console.log(`  MRR:          ${r.mrr.toFixed(3)}`);
  console.log(`  NDCG@5:       ${(r.ndcgAt5 * 100).toFixed(1)}%`);
  if (r.falsePositivesInTop5.length > 0) {
    console.log(`  FP in top 5:  ${r.falsePositivesInTop5.join(', ')}`);
  }
  if (r.missedPositives.length > 0) {
    console.log(`  Missed:       ${r.missedPositives.join(', ')}`);
  }
  console.log('');
}

// ── Bootstrap confidence intervals ───────────────────────────────────────────

function bootstrap(
  values: number[],
  n = 1000,
): { lo: number; hi: number; mean: number } {
  const means: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < values.length; j++) {
      sum += values[Math.floor(Math.random() * values.length)];
    }
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  return {
    lo: means[Math.floor(n * 0.05)],
    hi: means[Math.floor(n * 0.95)],
    mean: means.reduce((a, b) => a + b, 0) / n,
  };
}

function fmtCI(stat: { lo: number; hi: number; mean: number }, pct = true): string {
  if (pct) {
    return `${(stat.mean * 100).toFixed(1)}%  [${(stat.lo * 100).toFixed(1)}%, ${(stat.hi * 100).toFixed(1)}%]`;
  }
  return `${stat.mean.toFixed(3)}  [${stat.lo.toFixed(3)}, ${stat.hi.toFixed(3)}]`;
}

const meanP5 = results.reduce((s, r) => s + r.precisionAt5, 0) / (results.length || 1);
const meanP10 = results.reduce((s, r) => s + r.precisionAt10, 0) / (results.length || 1);
const meanHR1 = results.reduce((s, r) => s + r.hitRateAt1, 0) / (results.length || 1);
const meanMRR = results.reduce((s, r) => s + r.mrr, 0) / (results.length || 1);
const meanNDCG5 = results.reduce((s, r) => s + r.ndcgAt5, 0) / (results.length || 1);

const ciP5 = bootstrap(results.map((r) => r.precisionAt5));
const ciMRR = bootstrap(results.map((r) => r.mrr));
const ciNDCG5 = bootstrap(results.map((r) => r.ndcgAt5));

console.log('── Macro Averages (90% bootstrap CI) ──────────────────────');
console.log(`  Mean Precision@5:  ${fmtCI(ciP5)}`);
console.log(`  Mean Precision@10: ${(meanP10 * 100).toFixed(1)}%`);
console.log(`  Mean Hit-rate@1:   ${(meanHR1 * 100).toFixed(1)}%`);
console.log(`  Mean MRR:          ${fmtCI(ciMRR, false)}`);
console.log(`  Mean NDCG@5:       ${fmtCI(ciNDCG5)}`);
console.log('');

const pass = meanMRR >= MIN_MRR;
console.log(
  pass
    ? `PASS: Mean MRR (${meanMRR.toFixed(3)}) >= threshold (${MIN_MRR.toFixed(3)})`
    : `FAIL: Mean MRR (${meanMRR.toFixed(3)}) < threshold (${MIN_MRR.toFixed(3)})`,
);

process.exit(pass ? 0 : 1);
