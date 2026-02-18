/**
 * Data Quality Utilities
 * 
 * Functions for calculating contact data completeness and quality scores
 */

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  bio?: string;
  title?: string;
  company?: string;
  location?: string;
  education?: any[];
  career_history?: any[];
  personal_interests?: string[];
  expertise_areas?: string[];
  portfolio_companies?: string[];
  is_investor?: boolean;
  theses?: any[];
}

/**
 * Calculate data completeness score (0-100) for a contact
 * Higher score indicates more complete profile data
 */
export function calculateCompletenessScore(contact: Contact): number {
  let score = 0;
  
  // Define weights for each field (total = 100)
  const weights = {
    name: 5,
    email: 10,
    phone: 5,
    linkedin_url: 10,
    bio: 15,
    title: 10,
    company: 10,
    location: 5,
    education: 10,
    career_history: 10,
    personal_interests: 5,
    expertise_areas: 5,
    portfolio_companies: 5, // for investors only
  };
  
  // Check each field and add weight if present
  for (const [field, weight] of Object.entries(weights)) {
    const value = contact[field as keyof Contact];
    
    if (value !== null && value !== undefined) {
      // For arrays: must have at least one item
      if (Array.isArray(value)) {
        if (value.length > 0) {
          score += weight;
        }
      }
      // For strings: must not be empty after trim
      else if (typeof value === 'string') {
        if (value.trim().length > 0) {
          score += weight;
        }
      }
      // For objects/other types: presence counts
      else {
        score += weight;
      }
    }
  }
  
  // Cap at 100 (shouldn't exceed but defensive)
  return Math.min(score, 100);
}

/**
 * Get enrichment priority level based on completeness score
 */
export function getEnrichmentPriority(score: number): 'high' | 'medium' | 'low' {
  if (score < 40) return 'high';
  if (score < 70) return 'medium';
  return 'low';
}

/**
 * Identify missing critical fields for a contact
 */
export function getMissingCriticalFields(contact: Contact): string[] {
  const criticalFields = ['email', 'linkedin_url', 'bio', 'title', 'company'];
  const missing: string[] = [];
  
  for (const field of criticalFields) {
    const value = contact[field as keyof Contact];
    if (!value || (typeof value === 'string' && !value.trim())) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Get enrichment quality assessment
 */
export function assessEnrichmentQuality(contact: Contact): {
  score: number;
  priority: 'high' | 'medium' | 'low';
  missingFields: string[];
  hasRichData: boolean;
} {
  const score = calculateCompletenessScore(contact);
  const priority = getEnrichmentPriority(score);
  const missingFields = getMissingCriticalFields(contact);
  
  // Rich data includes education, career, or interests
  const hasRichData = !!(
    (contact.education && contact.education.length > 0) ||
    (contact.career_history && contact.career_history.length > 0) ||
    (contact.personal_interests && contact.personal_interests.length > 0)
  );
  
  return {
    score,
    priority,
    missingFields,
    hasRichData,
  };
}

/**
 * Calculate freshness score (0-100) based on how recently the contact was enriched.
 * Decays ~8 points per month from last_enriched_at.
 */
export function calculateFreshnessScore(lastEnrichedAt: string | Date | null | undefined): number {
  if (!lastEnrichedAt) return 0;
  const enrichedDate = typeof lastEnrichedAt === 'string' ? new Date(lastEnrichedAt) : lastEnrichedAt;
  const now = new Date();
  const monthsElapsed = (now.getTime() - enrichedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, Math.round(100 - (monthsElapsed * 8)));
}

/**
 * Calculate confidence score (0-100) from per-field confidence metadata.
 * Maps high=100, medium=65, low=30, and averages across present fields.
 */
export function calculateConfidenceScore(
  enrichmentConfidence: Record<string, string> | null | undefined
): number {
  if (!enrichmentConfidence || Object.keys(enrichmentConfidence).length === 0) return 50;

  const confidenceMap: Record<string, number> = {
    high: 100,
    medium: 65,
    low: 30,
    none: 0,
  };

  const scores = Object.values(enrichmentConfidence)
    .map(c => confidenceMap[c] ?? 50);

  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Calculate composite quality score combining completeness, confidence, freshness.
 * Formula: 0.4 * completeness + 0.3 * confidence + 0.3 * freshness
 */
export function calculateCompositeQualityScore(contact: {
  data_completeness_score?: number | null;
  enrichment_confidence?: Record<string, string> | null;
  last_enriched_at?: string | Date | null;
}): number {
  const completeness = contact.data_completeness_score ?? 0;
  const confidence = calculateConfidenceScore(contact.enrichment_confidence);
  const freshness = calculateFreshnessScore(contact.last_enriched_at);

  return Math.round(0.4 * completeness + 0.3 * confidence + 0.3 * freshness);
}

/**
 * Compute enrichment priority score for batch ordering.
 * Higher score = should be enriched first.
 * Prioritizes: low completeness, investors, contacts with LinkedIn/company (better success rate).
 */
export function getEnrichmentPriorityScore(contact: {
  data_completeness_score?: number | null;
  is_investor?: boolean;
  contact_type?: string[];
  linkedin_url?: string | null;
  company?: string | null;
  email?: string | null;
}): number {
  const completeness = contact.data_completeness_score ?? 0;
  let score = 100 - completeness;

  const investorTypes = ['GP', 'LP', 'Angel', 'FamilyOffice', 'Family Office', 'PE'];
  const isInvestor = contact.is_investor ||
    contact.contact_type?.some(t => investorTypes.includes(t));
  if (isInvestor) score += 20;

  if (contact.linkedin_url) score += 10;
  if (contact.company) score += 5;
  if (contact.email) score += 5;

  return score;
}
