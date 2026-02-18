/**
 * Offline weight tuning for the matching algorithm.
 *
 * Loads score_breakdown data from match_suggestions alongside golden-set
 * and feedback-derived labels, then grid-searches over the most impactful
 * weight dimensions to maximise MRR (Mean Reciprocal Rank).
 *
 * Usage:
 *   npx tsx scripts/eval/tune-weights.ts
 *
 * Output: prints the best weight vector and its MRR / precision@5.
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

// ── Load labels ──────────────────────────────────────────────────────────────

interface Label {
  conversation_id?: string;
  contact_id?: string;
  conversation?: string;
  contact?: string;
  label: number;
}

function loadLabels(filePath: string): Label[] {
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data.labels ?? [];
}

const goldenLabels = loadLabels(path.join(__dirname, 'golden-set.json'));
const feedbackLabels = loadLabels(path.join(__dirname, 'feedback-labels.json'));

// Resolve golden-set names to IDs
const convTitles = [...new Set(goldenLabels.filter((l) => l.conversation).map((l) => l.conversation!))];
const contactNames = [...new Set(goldenLabels.filter((l) => l.contact).map((l) => l.contact!))];

const { data: convRows } = await supabase.from('conversations').select('id, title').in('title', convTitles);
const { data: contactRows } = await supabase.from('contacts').select('id, name').in('name', contactNames);

const convIdMap = new Map<string, string>();
for (const r of convRows ?? []) convIdMap.set(r.title, r.id);
const contactIdMap = new Map<string, string>();
for (const r of contactRows ?? []) contactIdMap.set(r.name, r.id);

// Merge all labels into a map keyed by conv_id::contact_id
const labelMap = new Map<string, number>();

for (const l of goldenLabels) {
  const cid = l.conversation_id ?? convIdMap.get(l.conversation!);
  const tid = l.contact_id ?? contactIdMap.get(l.contact!);
  if (cid && tid) labelMap.set(`${cid}::${tid}`, l.label);
}
for (const l of feedbackLabels) {
  const k = `${l.conversation_id}::${l.contact_id}`;
  if (!labelMap.has(k)) labelMap.set(k, l.label);
}

if (labelMap.size === 0) {
  console.error('No labels found. Run seed + eval first, or export feedback labels.');
  process.exit(1);
}

console.log(`Loaded ${labelMap.size} labels (${[...labelMap.values()].filter((v) => v === 1).length} positive)\n`);

// ── Fetch score breakdowns ───────────────────────────────────────────────────

const convIds = [...new Set([...labelMap.keys()].map((k) => k.split('::')[0]))];

interface MatchRow {
  conversation_id: string;
  contact_id: string;
  score_breakdown: Record<string, number>;
}

const allMatches: MatchRow[] = [];

for (const convId of convIds) {
  const { data } = await supabase
    .from('match_suggestions')
    .select('conversation_id, contact_id, score_breakdown')
    .eq('conversation_id', convId);
  if (data) allMatches.push(...(data as MatchRow[]));
}

if (allMatches.length === 0) {
  console.error('No match_suggestions found for labelled conversations. Run generate-matches first.');
  process.exit(1);
}

console.log(`Fetched ${allMatches.length} match suggestions across ${convIds.length} conversations\n`);

// ── Weight tuning grid search ────────────────────────────────────────────────

const COMPONENTS = ['embedding', 'semantic', 'tagOverlap', 'roleMatch', 'geoMatch', 'relationship', 'personalAffinity', 'checkSize'] as const;
type Component = typeof COMPONENTS[number];

// Default weights (with embeddings)
const DEFAULT: Record<Component, number> = {
  embedding: 0.25,
  semantic: 0.10,
  tagOverlap: 0.20,
  roleMatch: 0.10,
  geoMatch: 0.05,
  relationship: 0.10,
  personalAffinity: 0.15,
  checkSize: 0.05,
};

function reScore(breakdown: Record<string, number>, weights: Record<Component, number>): number {
  let score = 0;
  for (const c of COMPONENTS) {
    score += (weights[c] ?? 0) * (breakdown[c] ?? 0);
  }
  // Name match boost (pass through as-is)
  if (breakdown.nameMatch && breakdown.nameMatch > 0) {
    score += 0.3 * breakdown.nameMatch;
  }
  return Math.min(Math.max(score, 0), 1);
}

function rankMatches(weights: Record<Component, number>): Map<string, { contactId: string; score: number }[]> {
  const byConv = new Map<string, { contactId: string; score: number }[]>();
  for (const m of allMatches) {
    const score = reScore(m.score_breakdown ?? {}, weights);
    const list = byConv.get(m.conversation_id) ?? [];
    list.push({ contactId: m.contact_id, score });
    byConv.set(m.conversation_id, list);
  }
  for (const matches of byConv.values()) {
    matches.sort((a, b) => b.score - a.score);
  }
  return byConv;
}

function perConvMRR(weights: Record<Component, number>): number[] {
  const byConv = rankMatches(weights);
  const rrs: number[] = [];

  for (const [convId, matches] of byConv) {
    const hasPositives = [...labelMap.entries()].some(([k, v]) => k.startsWith(convId + '::') && v === 1);
    if (!hasPositives) continue;
    let rr = 0;
    for (let i = 0; i < matches.length; i++) {
      if (labelMap.get(`${convId}::${matches[i].contactId}`) === 1) {
        rr = 1 / (i + 1);
        break;
      }
    }
    rrs.push(rr);
  }

  return rrs;
}

function computeMRR(weights: Record<Component, number>): number {
  const rrs = perConvMRR(weights);
  return rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
}

function computePrecisionAt5(weights: Record<Component, number>): number {
  const byConv = rankMatches(weights);
  let totalPrecision = 0;
  let convCount = 0;

  for (const [convId, matches] of byConv) {
    const top5 = matches.slice(0, 5);
    const positives = top5.filter((m) => labelMap.get(`${convId}::${m.contactId}`) === 1);
    const positiveCount = [...labelMap.entries()].filter(([k, v]) => k.startsWith(convId + '::') && v === 1).length;
    if (positiveCount === 0) continue;
    totalPrecision += positives.length / Math.min(5, positiveCount);
    convCount++;
  }

  return convCount > 0 ? totalPrecision / convCount : 0;
}

// Grid search over the two most impactful weights: embedding and tagOverlap
// Other weights are scaled proportionally to fill the remaining budget
const TUNABLE: Component[] = ['embedding', 'tagOverlap', 'personalAffinity'];
const STEP = 0.05;

interface Trial {
  weights: Record<Component, number>;
  mrr: number;
  precision: number;
}

const baselineMRR = computeMRR(DEFAULT);
const baselineP5 = computePrecisionAt5(DEFAULT);
let bestTrial: Trial = { weights: { ...DEFAULT }, mrr: baselineMRR, precision: baselineP5 };

console.log(`Baseline MRR:          ${baselineMRR.toFixed(3)}`);
console.log(`Baseline Precision@5:  ${(baselineP5 * 100).toFixed(1)}%\n`);
console.log('Running grid search over embedding, tagOverlap, personalAffinity (optimizing MRR)...\n');

const steps = [];
for (let v = 0.05; v <= 0.45; v += STEP) steps.push(parseFloat(v.toFixed(2)));

let trials = 0;

for (const embW of steps) {
  for (const tagW of steps) {
    for (const paW of steps) {
      const tunedSum = embW + tagW + paW;
      if (tunedSum >= 0.95) continue; // leave room for other components

      const remaining = 1.0 - tunedSum;
      const fixedComponents: Component[] = ['semantic', 'roleMatch', 'geoMatch', 'relationship', 'checkSize'];
      const fixedSum = fixedComponents.reduce((s, c) => s + DEFAULT[c], 0);
      if (fixedSum === 0) continue;

      const scale = remaining / fixedSum;
      const candidate: Record<Component, number> = {
        embedding: embW,
        tagOverlap: tagW,
        personalAffinity: paW,
        semantic: DEFAULT.semantic * scale,
        roleMatch: DEFAULT.roleMatch * scale,
        geoMatch: DEFAULT.geoMatch * scale,
        relationship: DEFAULT.relationship * scale,
        checkSize: DEFAULT.checkSize * scale,
      };

      const m = computeMRR(candidate);
      trials++;

      if (m > bestTrial.mrr) {
        bestTrial = { weights: { ...candidate }, mrr: m, precision: computePrecisionAt5(candidate) };
      }
    }
  }
}

console.log(`Evaluated ${trials} weight combinations\n`);

// ── Pairwise logistic regression ranker ─────────────────────────────────────

function learnWeights(): Record<Component, number> | null {
  // Build pairwise training data: for each conversation, pair each positive
  // with each negative. Feature = score_breakdown[pos] - score_breakdown[neg].
  interface Pair { delta: number[] }
  const pairs: Pair[] = [];

  const byConv = new Map<string, MatchRow[]>();
  for (const m of allMatches) {
    const list = byConv.get(m.conversation_id) ?? [];
    list.push(m);
    byConv.set(m.conversation_id, list);
  }

  for (const [convId, matches] of byConv) {
    const positives = matches.filter((m) => labelMap.get(`${convId}::${m.contact_id}`) === 1);
    const negatives = matches.filter((m) => labelMap.get(`${convId}::${m.contact_id}`) === 0);

    for (const pos of positives) {
      for (const neg of negatives) {
        const delta = COMPONENTS.map(
          (c) => (pos.score_breakdown?.[c] ?? 0) - (neg.score_breakdown?.[c] ?? 0),
        );
        pairs.push({ delta });
      }
    }
  }

  if (pairs.length < 10) {
    console.log(`Only ${pairs.length} pairwise comparisons available (need >= 10). Skipping learned ranker.\n`);
    return null;
  }

  console.log(`Training pairwise logistic regression on ${pairs.length} pairs...\n`);

  // Initialize weights uniformly
  const w = new Array(COMPONENTS.length).fill(1.0 / COMPONENTS.length);
  const lr = 0.05;
  const lambda = 0.01; // L2 regularization

  for (let epoch = 0; epoch < 300; epoch++) {
    // Shuffle pairs each epoch
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    for (const pair of pairs) {
      const dot = pair.delta.reduce((s, v, i) => s + v * w[i], 0);
      const pred = 1 / (1 + Math.exp(-dot));
      const error = 1 - pred;
      for (let i = 0; i < w.length; i++) {
        w[i] += lr * (error * pair.delta[i] - lambda * w[i]);
      }
    }
  }

  // Clamp to non-negative and normalize to sum 1
  for (let i = 0; i < w.length; i++) w[i] = Math.max(w[i], 0);
  const wSum = w.reduce((a, b) => a + b, 0);
  if (wSum === 0) return null;
  for (let i = 0; i < w.length; i++) w[i] /= wSum;

  const result: Record<Component, number> = {} as any;
  for (let i = 0; i < COMPONENTS.length; i++) result[COMPONENTS[i]] = w[i];
  return result;
}

const learnedWeights = learnWeights();
let learnedTrial: Trial | null = null;
if (learnedWeights) {
  const lMRR = computeMRR(learnedWeights);
  const lP5 = computePrecisionAt5(learnedWeights);
  learnedTrial = { weights: learnedWeights, mrr: lMRR, precision: lP5 };
  console.log('Learned ranker results:');
  for (const c of COMPONENTS) {
    console.log(`  ${c.padEnd(20)} ${learnedWeights[c].toFixed(3)}`);
  }
  console.log(`  MRR:          ${lMRR.toFixed(3)}`);
  console.log(`  Precision@5:  ${(lP5 * 100).toFixed(1)}%\n`);
}

// Pick the best approach
if (learnedTrial && learnedTrial.mrr > bestTrial.mrr) {
  console.log('Learned ranker outperforms grid search — using learned weights.\n');
  bestTrial = learnedTrial;
} else if (learnedTrial) {
  console.log('Grid search outperforms learned ranker — using grid search weights.\n');
} else {
  console.log('Using grid search results.\n');
}

console.log('═══════════════════════════════════════════════════');
console.log('           BEST WEIGHTS FOUND');
console.log('═══════════════════════════════════════════════════\n');

for (const c of COMPONENTS) {
  const val = bestTrial.weights[c];
  const def = DEFAULT[c];
  const delta = val - def;
  const tag = delta > 0.005 ? ` (+${delta.toFixed(2)})` : delta < -0.005 ? ` (${delta.toFixed(2)})` : '';
  console.log(`  ${c.padEnd(20)} ${val.toFixed(3)}${tag}`);
}

// ── Bootstrap validation ─────────────────────────────────────────────────────

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

const baselineRRs = perConvMRR(DEFAULT);
const bestRRs = perConvMRR(bestTrial.weights);
const baselineCI = bootstrap(baselineRRs);
const bestCI = bootstrap(bestRRs);

const weightSum = COMPONENTS.reduce((s, c) => s + bestTrial.weights[c], 0);
console.log(`\n  Sum: ${weightSum.toFixed(3)}`);
console.log(`  MRR:          ${bestTrial.mrr.toFixed(3)} (baseline: ${baselineMRR.toFixed(3)})`);
console.log(`  Precision@5:  ${(bestTrial.precision * 100).toFixed(1)}% (baseline: ${(baselineP5 * 100).toFixed(1)}%)`);
console.log(`\n  Baseline MRR 90% CI: [${baselineCI.lo.toFixed(3)}, ${baselineCI.hi.toFixed(3)}]`);
console.log(`  Best MRR 90% CI:     [${bestCI.lo.toFixed(3)}, ${bestCI.hi.toFixed(3)}]`);

const ciOverlap = bestCI.lo <= baselineCI.hi && baselineCI.lo <= bestCI.hi;

if (bestTrial.mrr > baselineMRR + 0.001 && !ciOverlap) {
  console.log('\n  CIs do NOT overlap — improvement is statistically significant.\n');
  console.log('Improvement found! To apply, update WEIGHTS in:');
  console.log('  supabase/functions/generate-matches/index.ts\n');

  console.log('Copy-paste ready (with-embeddings mode):');
  console.log('const WEIGHTS = {');
  for (const c of COMPONENTS) {
    console.log(`  ${c}: ${bestTrial.weights[c].toFixed(3)},`);
  }
  console.log('};\n');
} else if (bestTrial.mrr > baselineMRR + 0.001) {
  console.log('\n  CIs overlap — improvement may be noise. Consider expanding the golden set.\n');
  console.log('Tentative improvement found. To apply, update WEIGHTS in:');
  console.log('  supabase/functions/generate-matches/index.ts\n');

  console.log('Copy-paste ready (with-embeddings mode):');
  console.log('const WEIGHTS = {');
  for (const c of COMPONENTS) {
    console.log(`  ${c}: ${bestTrial.weights[c].toFixed(3)},`);
  }
  console.log('};\n');
} else {
  console.log('\nNo significant improvement over current weights. Current weights are optimal for this dataset.\n');
}
