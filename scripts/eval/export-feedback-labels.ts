/**
 * Export feedback-derived labels from match_feedback and match_suggestions
 * into a JSON file compatible with the golden-set format.
 *
 * Positive signals: thumbs_up, saved, intro_sent, status=intro_made
 * Negative signals: thumbs_down, status=dismissed
 *
 * Usage:
 *   npx tsx scripts/eval/export-feedback-labels.ts [--out feedback-labels.json]
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

const outArg = process.argv.find((a) => a.startsWith('--out'));
const outFile = outArg
  ? outArg.split('=')[1] ?? process.argv[process.argv.indexOf(outArg) + 1]
  : path.join(__dirname, 'feedback-labels.json');

const POSITIVE_FEEDBACK = new Set(['thumbs_up', 'saved', 'intro_sent']);
const NEGATIVE_FEEDBACK = new Set(['thumbs_down']);
const POSITIVE_STATUS = new Set(['intro_made']);
const NEGATIVE_STATUS = new Set(['dismissed']);

interface LabelEntry {
  conversation_id: string;
  contact_id: string;
  label: number;
  source: string;
}

const labelMap = new Map<string, LabelEntry>();
const key = (convId: string, contactId: string) => `${convId}::${contactId}`;

// 1. Gather labels from match_feedback
const { data: feedbackRows, error: fbErr } = await supabase
  .from('match_feedback')
  .select(`
    feedback,
    suggestion:suggestion_id (
      conversation_id,
      contact_id
    )
  `);

if (fbErr) {
  console.error('Error fetching match_feedback:', fbErr.message);
  process.exit(1);
}

for (const row of feedbackRows ?? []) {
  const suggestion = row.suggestion as any;
  if (!suggestion?.conversation_id || !suggestion?.contact_id) continue;
  const k = key(suggestion.conversation_id, suggestion.contact_id);

  if (POSITIVE_FEEDBACK.has(row.feedback)) {
    labelMap.set(k, {
      conversation_id: suggestion.conversation_id,
      contact_id: suggestion.contact_id,
      label: 1,
      source: `feedback:${row.feedback}`,
    });
  } else if (NEGATIVE_FEEDBACK.has(row.feedback) && !labelMap.has(k)) {
    labelMap.set(k, {
      conversation_id: suggestion.conversation_id,
      contact_id: suggestion.contact_id,
      label: 0,
      source: `feedback:${row.feedback}`,
    });
  }
}

// 2. Gather labels from match_suggestions.status (lower priority — don't overwrite explicit feedback)
const { data: statusRows, error: stErr } = await supabase
  .from('match_suggestions')
  .select('conversation_id, contact_id, status')
  .or('status.eq.intro_made,status.eq.dismissed');

if (stErr) {
  console.error('Error fetching match_suggestions status:', stErr.message);
  process.exit(1);
}

for (const row of statusRows ?? []) {
  const k = key(row.conversation_id, row.contact_id);
  if (labelMap.has(k)) continue; // explicit feedback takes precedence
  if (POSITIVE_STATUS.has(row.status)) {
    labelMap.set(k, {
      conversation_id: row.conversation_id,
      contact_id: row.contact_id,
      label: 1,
      source: `status:${row.status}`,
    });
  } else if (NEGATIVE_STATUS.has(row.status)) {
    labelMap.set(k, {
      conversation_id: row.conversation_id,
      contact_id: row.contact_id,
      label: 0,
      source: `status:${row.status}`,
    });
  }
}

const labels = [...labelMap.values()];

const output = {
  _meta: {
    description: 'Labels derived from match_feedback and match_suggestions.status',
    exported_at: new Date().toISOString(),
    total: labels.length,
    positive: labels.filter((l) => l.label === 1).length,
    negative: labels.filter((l) => l.label === 0).length,
  },
  labels,
};

fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

console.log(`Exported ${labels.length} labels (${output._meta.positive} positive, ${output._meta.negative} negative)`);
console.log(`Written to ${outFile}`);
