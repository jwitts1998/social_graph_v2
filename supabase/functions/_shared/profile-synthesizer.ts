/**
 * Profile Synthesizer
 *
 * Merges extracted data from multiple scraped pages into a single
 * coherent contact profile. Handles:
 *   - Conflict resolution (prefer higher-confidence, higher-relevance sources)
 *   - Array deduplication and merging
 *   - Cross-source validation
 *   - Source provenance tracking
 */

import type { PageExtraction, ExtractedFields } from './page-extractor.ts';

export interface SynthesizedProfile {
  fields: ExtractedFields;
  confidence: Record<string, 'high' | 'medium' | 'low'>;
  sources: Record<string, string[]>;
  pagesUsed: number;
  completenessScore: number;
}

const CONFIDENCE_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function confRank(level: string | undefined): number {
  return CONFIDENCE_RANK[level || ''] ?? 0;
}

/**
 * Check if a profile has enough data to be considered complete.
 * Requires at least bio + title + 2 other enrichment fields.
 */
export function isProfileComplete(profile: Partial<ExtractedFields>): boolean {
  let score = 0;
  if (profile.title) score += 2;
  if (profile.bio && profile.bio.length >= 50) score += 3;
  if (profile.company) score += 1;
  if (profile.location) score += 1;
  if (profile.linkedin_url) score += 1;
  if (profile.email) score += 1;
  if (profile.education && profile.education.length > 0) score += 2;
  if (profile.career_history && profile.career_history.length > 0) score += 2;
  if (profile.expertise_areas && profile.expertise_areas.length > 0) score += 1;
  if (profile.personal_interests && profile.personal_interests.length > 0) score += 1;
  if (profile.portfolio_companies && profile.portfolio_companies.length > 0) score += 1;
  // Complete if we have 10+ points (bio+title+3 enrichment fields)
  return score >= 10;
}

/**
 * Merge a set of scalar field values from multiple extractions, picking the best.
 */
function pickBestScalar(
  field: string,
  extractions: PageExtraction[],
): { value: string | null; confidence: string; sourceUrl: string } {
  let best: { value: string | null; confidence: string; sourceUrl: string; score: number } = {
    value: null,
    confidence: '',
    sourceUrl: '',
    score: -1,
  };

  for (const ext of extractions) {
    const val = (ext.fields as any)[field];
    if (!val) continue;

    const conf = ext.confidence[field] || 'low';
    // Score = confidence rank * 10 + relevance score (to break ties)
    const score = confRank(conf) * 10 + ext.relevanceScore / 10;

    if (score > best.score) {
      best = { value: val, confidence: conf, sourceUrl: ext.url, score };
    }
  }

  return { value: best.value, confidence: best.confidence, sourceUrl: best.sourceUrl };
}

/**
 * Merge arrays from multiple extractions, deduplicating entries.
 */
function mergeStringArrays(field: string, extractions: PageExtraction[]): string[] {
  const all = new Set<string>();
  for (const ext of extractions) {
    const arr = (ext.fields as any)[field];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string' && item.length > 0) {
          all.add(item.toLowerCase().trim());
        }
      }
    }
  }
  // Return with original casing from first occurrence
  const result: string[] = [];
  const seen = new Set<string>();
  for (const ext of extractions) {
    const arr = (ext.fields as any)[field];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item !== 'string') continue;
      const key = item.toLowerCase().trim();
      if (all.has(key) && !seen.has(key)) {
        result.push(item);
        seen.add(key);
      }
    }
  }
  return result;
}

/**
 * Merge education entries from multiple sources, deduplicating by school name.
 */
function mergeEducation(
  extractions: PageExtraction[],
): Array<{ school: string; degree?: string; field?: string; year?: number }> {
  const bySchool = new Map<string, any>();

  for (const ext of extractions) {
    for (const edu of ext.fields.education) {
      const key = edu.school.toLowerCase().trim();
      const existing = bySchool.get(key);
      if (!existing) {
        bySchool.set(key, { ...edu });
      } else {
        // Merge: fill in missing fields from this source
        if (!existing.degree && edu.degree) existing.degree = edu.degree;
        if (!existing.field && edu.field) existing.field = edu.field;
        if (!existing.year && edu.year) existing.year = edu.year;
      }
    }
  }

  return Array.from(bySchool.values());
}

/**
 * Merge career history entries, deduplicating by company+role.
 */
function mergeCareerHistory(
  extractions: PageExtraction[],
): Array<{ company: string; role: string; years?: string; description?: string }> {
  const byKey = new Map<string, any>();

  for (const ext of extractions) {
    for (const job of ext.fields.career_history) {
      const key = `${job.company.toLowerCase().trim()}|${job.role.toLowerCase().trim()}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...job });
      } else {
        if (!existing.years && job.years) existing.years = job.years;
        if (!existing.description && job.description) existing.description = job.description;
      }
    }
  }

  return Array.from(byKey.values());
}

/**
 * Calculate a completeness score (0-100) for the synthesized profile.
 */
function calculateCompleteness(fields: ExtractedFields, isInvestor: boolean): number {
  let score = 0;
  const weights: Record<string, number> = {
    title: 10,
    bio: 15,
    company: 10,
    location: 5,
    linkedin_url: 10,
    email: 10,
    education: 10,
    career_history: 10,
    expertise_areas: 5,
    personal_interests: 5,
    company_url: 5,
    phone: 5,
  };

  if (fields.title) score += weights.title;
  if (fields.bio && fields.bio.length >= 20) score += weights.bio;
  if (fields.company) score += weights.company;
  if (fields.location) score += weights.location;
  if (fields.linkedin_url) score += weights.linkedin_url;
  if (fields.email) score += weights.email;
  if (fields.education.length > 0) score += weights.education;
  if (fields.career_history.length > 0) score += weights.career_history;
  if (fields.expertise_areas.length > 0) score += weights.expertise_areas;
  if (fields.personal_interests.length > 0) score += weights.personal_interests;
  if (fields.company_url) score += weights.company_url;
  if (fields.phone) score += weights.phone;

  return Math.min(score, 100);
}

/**
 * Synthesize a complete profile from multiple page extractions.
 * Filters out low-relevance pages, resolves conflicts, merges arrays.
 */
export function synthesizeProfile(
  extractions: PageExtraction[],
  isInvestor = false,
): SynthesizedProfile {
  // Filter out irrelevant pages (relevance < 20)
  const relevant = extractions.filter(e => e.relevanceScore >= 20);
  // Sort by relevance so higher-relevance pages are processed last (overwriting)
  relevant.sort((a, b) => a.relevanceScore - b.relevanceScore);

  const fields: ExtractedFields = {
    title: null,
    bio: null,
    company: null,
    location: null,
    linkedin_url: null,
    company_url: null,
    email: null,
    phone: null,
    education: [],
    career_history: [],
    expertise_areas: [],
    personal_interests: [],
    portfolio_companies: [],
    thesis_summary: null,
    sectors: [],
    stages: [],
    check_sizes: [],
    geographic_focus: [],
  };

  const confidence: Record<string, 'high' | 'medium' | 'low'> = {};
  const sources: Record<string, string[]> = {};

  // Scalar fields: pick highest-confidence value
  const scalarFields = [
    'title', 'bio', 'company', 'location', 'linkedin_url',
    'company_url', 'email', 'phone',
  ];
  if (isInvestor) scalarFields.push('thesis_summary');

  for (const field of scalarFields) {
    const best = pickBestScalar(field, relevant);
    if (best.value) {
      (fields as any)[field] = best.value;
      if (best.confidence) confidence[field] = best.confidence as any;
      sources[field] = [best.sourceUrl];
    }
  }

  // Array fields: merge and deduplicate across all sources
  const stringArrayFields = ['expertise_areas', 'personal_interests', 'portfolio_companies'];
  if (isInvestor) stringArrayFields.push('sectors', 'stages', 'check_sizes', 'geographic_focus');

  for (const field of stringArrayFields) {
    const merged = mergeStringArrays(field, relevant);
    (fields as any)[field] = merged;
    if (merged.length > 0) {
      sources[field] = relevant
        .filter(e => {
          const arr = (e.fields as any)[field];
          return Array.isArray(arr) && arr.length > 0;
        })
        .map(e => e.url);
    }
  }

  // Structured arrays: merge with deduplication
  fields.education = mergeEducation(relevant);
  if (fields.education.length > 0) {
    sources['education'] = relevant
      .filter(e => e.fields.education.length > 0)
      .map(e => e.url);
  }

  fields.career_history = mergeCareerHistory(relevant);
  if (fields.career_history.length > 0) {
    sources['career_history'] = relevant
      .filter(e => e.fields.career_history.length > 0)
      .map(e => e.url);
  }

  return {
    fields,
    confidence,
    sources,
    pagesUsed: relevant.length,
    completenessScore: calculateCompleteness(fields, isInvestor),
  };
}

/**
 * Incrementally merge new extractions into an existing synthesized profile.
 * Used between agentic loop iterations to accumulate data.
 */
export function mergeIntoProfile(
  existing: SynthesizedProfile,
  newExtractions: PageExtraction[],
  isInvestor = false,
): SynthesizedProfile {
  // Combine all sources for a fresh synthesis
  // We rebuild from sources to ensure consistent conflict resolution
  const allExtractions: PageExtraction[] = [];

  // Reconstruct pseudo-extractions from existing profile for fields that have data
  // This ensures existing data participates in conflict resolution
  if (existing.pagesUsed > 0) {
    const pseudoExtraction: PageExtraction = {
      url: '__existing__',
      fields: existing.fields,
      confidence: existing.confidence,
      followUpUrls: [],
      summary: 'Previously synthesized data',
      relevanceScore: 80,
    };
    allExtractions.push(pseudoExtraction);
  }

  allExtractions.push(...newExtractions);
  return synthesizeProfile(allExtractions, isInvestor);
}
