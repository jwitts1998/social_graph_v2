import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEnrichmentPriorityScore } from '../_shared/data-quality.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Re-enrichment scheduler.
 *
 * Designed to be called by a cron job (e.g. daily) or triggered manually.
 * Selects stale contacts based on:
 *   - last_enriched_at > 6 months AND data_completeness_score < 70
 *   - last_enriched_at > 12 months (regardless of score)
 *
 * Respects a per-user daily budget limit to control API costs.
 * Processes contacts in priority order (investors, low completeness first).
 */

const DAILY_BUDGET_PER_USER = 20;
const BATCH_SIZE = 5;
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const TWELVE_MONTHS_MS = 12 * 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || null;
    const maxContacts = body.maxContacts || DAILY_BUDGET_PER_USER;

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - SIX_MONTHS_MS).toISOString();
    const twelveMonthsAgo = new Date(now.getTime() - TWELVE_MONTHS_MS).toISOString();

    // Find stale contacts: >6mo with low score, or >12mo any score
    let query = supabase
      .from('contacts')
      .select('id, name, company, title, bio, is_investor, contact_type, linkedin_url, email, data_completeness_score, last_enriched_at')
      .not('name', 'is', null)
      .or(
        `and(last_enriched_at.lt.${sixMonthsAgo},data_completeness_score.lt.70),` +
        `last_enriched_at.lt.${twelveMonthsAgo},` +
        `last_enriched_at.is.null`
      )
      .limit(maxContacts * 4);

    if (targetUserId) {
      query = query.eq('owned_by_profile', targetUserId);
    }

    const { data: candidates, error } = await query;

    if (error) throw error;
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No contacts need re-enrichment', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort by priority
    candidates.sort((a: any, b: any) =>
      getEnrichmentPriorityScore(b) - getEnrichmentPriorityScore(a)
    );

    const toProcess = candidates.slice(0, maxContacts);
    console.log(`[Re-enrichment] Found ${candidates.length} stale contacts, processing top ${toProcess.length}`);

    let succeeded = 0;
    let failed = 0;

    // Process in batches, invoking research-contact for each
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (contact: any) => {
          const resp = await fetch(`${supabaseUrl}/functions/v1/research-contact`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ contactId: contact.id }),
          });

          if (!resp.ok) {
            throw new Error(`research-contact returned ${resp.status}`);
          }
          return resp.json();
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') succeeded++;
        else failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidates: candidates.length,
        processed: toProcess.length,
        succeeded,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Re-enrichment] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
