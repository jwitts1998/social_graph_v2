/**
 * Enrichment Validation
 *
 * Cross-references data from multiple sources (PDL/Apollo vs GPT extraction)
 * and validates individual fields for consistency and correctness.
 */

export interface ValidationResult {
  isValid: boolean;
  discrepancies: Array<{
    field: string;
    waterfallValue: string;
    gptValue: string;
    resolution: 'prefer_waterfall' | 'prefer_gpt' | 'conflict';
  }>;
  linkedinUrlValid: boolean | null;
}

/**
 * Cross-reference data from waterfall (PDL/Apollo) and GPT extraction.
 * When sources disagree, prefer the structured provider.
 */
export function crossReferenceResults(
  waterfallData: Record<string, any> | null,
  gptData: Record<string, any> | null,
  contactName: string
): ValidationResult {
  const discrepancies: ValidationResult['discrepancies'] = [];
  let linkedinUrlValid: boolean | null = null;

  if (!waterfallData || !gptData) {
    return { isValid: true, discrepancies: [], linkedinUrlValid };
  }

  const fieldsToCompare = [
    { key: 'title', waterfallKey: 'title', gptKey: 'title' },
    { key: 'company', waterfallKey: 'company', gptKey: 'company' },
    { key: 'location', waterfallKey: 'location', gptKey: 'location' },
  ];

  for (const { key, waterfallKey, gptKey } of fieldsToCompare) {
    const wVal = waterfallData[waterfallKey];
    const gVal = gptData[gptKey];

    if (!wVal || !gVal) continue;

    const wNorm = normalizeForComparison(wVal);
    const gNorm = normalizeForComparison(gVal);

    if (wNorm && gNorm && wNorm !== gNorm && !wNorm.includes(gNorm) && !gNorm.includes(wNorm)) {
      discrepancies.push({
        field: key,
        waterfallValue: wVal,
        gptValue: gVal,
        resolution: 'prefer_waterfall',
      });
    }
  }

  // Validate LinkedIn URL if GPT returned one
  if (gptData.linkedin_url) {
    linkedinUrlValid = validateLinkedInUrl(gptData.linkedin_url, contactName);
  }

  if (discrepancies.length > 0) {
    console.log('[Validation] Found', discrepancies.length, 'discrepancies:', 
      discrepancies.map(d => `${d.field}: "${d.waterfallValue}" vs "${d.gptValue}"`).join('; '));
  }

  return {
    isValid: discrepancies.length === 0,
    discrepancies,
    linkedinUrlValid,
  };
}

/**
 * Validate that a LinkedIn URL likely belongs to the target person.
 * Checks if the URL slug contains parts of the person's name.
 */
export function validateLinkedInUrl(url: string, name: string): boolean {
  if (!url || !name) return false;
  
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('linkedin.com')) return false;
    
    const slug = urlObj.pathname.replace(/^\/in\//, '').replace(/\/$/, '').toLowerCase();
    if (!slug) return false;

    const nameParts = name.toLowerCase().split(/\s+/).filter(p => p.length > 2);
    
    // At least one substantial name part should appear in the slug
    const hasNameMatch = nameParts.some(part => slug.includes(part));
    return hasNameMatch;
  } catch {
    return false;
  }
}

/**
 * Validate that an email domain matches the contact's company (basic check).
 */
export function validateEmailDomain(email: string | null, company: string | null): boolean | null {
  if (!email || !company) return null;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  // Skip generic email providers
  const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com'];
  if (genericDomains.includes(domain)) return null;

  const companyNorm = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domainBase = domain.split('.')[0].replace(/[^a-z0-9]/g, '');

  return domainBase.includes(companyNorm) || companyNorm.includes(domainBase);
}

/**
 * Merge waterfall and GPT data, preferring waterfall for core fields
 * and GPT for enrichment-only fields (education, interests, etc.)
 */
export function mergeWithPreference(
  waterfallData: Record<string, any> | null,
  gptData: Record<string, any> | null,
  existingContact: Record<string, any>
): Record<string, any> {
  const updates: Record<string, any> = {};

  // Core fields: prefer waterfall (structured provider), then GPT, then existing
  const coreFields = ['title', 'company', 'location', 'email', 'phone', 'linkedin_url'];
  for (const field of coreFields) {
    const wVal = waterfallData?.[field];
    const gVal = gptData?.[field];
    const existing = existingContact[field];

    if (existing) continue;
    if (wVal) {
      updates[field] = wVal;
    } else if (gVal) {
      updates[field] = gVal;
    }
  }

  // Enrichment fields: prefer GPT since waterfall rarely has these
  const enrichmentFields = ['bio', 'education', 'career_history', 'expertise_areas', 'personal_interests', 'portfolio_companies'];
  for (const field of enrichmentFields) {
    const gVal = gptData?.[field];
    const wVal = waterfallData?.[field];
    const existing = existingContact[field];

    if (existing && (typeof existing !== 'string' || existing.length > 10)) continue;

    if (gVal && (typeof gVal !== 'string' || gVal.length > 0) && (!Array.isArray(gVal) || gVal.length > 0)) {
      updates[field] = gVal;
    } else if (wVal && (typeof wVal !== 'string' || wVal.length > 0) && (!Array.isArray(wVal) || wVal.length > 0)) {
      updates[field] = wVal;
    }
  }

  return updates;
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().trim().replace(/[.,\-_]/g, ' ').replace(/\s+/g, ' ');
}
