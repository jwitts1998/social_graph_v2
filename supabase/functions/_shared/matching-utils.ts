/**
 * Pure utility functions extracted from generate-matches/index.ts
 * for testability and reuse.
 */

// Levenshtein distance for fuzzy string matching
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Fuzzy name matching with similarity scoring
export function fuzzyNameMatch(mentionedName: string, contactName: string): { match: boolean; score: number; type: string } {
  const mentioned = mentionedName.toLowerCase().trim();
  const contact = contactName.toLowerCase().trim();

  // Exact match
  if (mentioned === contact) {
    return { match: true, score: 1.0, type: 'exact' };
  }

  // One contains the other (e.g., "Roy Bahat" in "Roy E. Bahat")
  if (contact.includes(mentioned) || mentioned.includes(contact)) {
    return { match: true, score: 0.95, type: 'contains' };
  }

  // Split into parts
  const mentionedParts = mentioned.split(/\s+/).filter(p => p.length > 1);
  const contactParts = contact.split(/\s+/).filter(p => p.length > 1);

  // Handle single-word names (first name only match)
  if (mentionedParts.length === 1 && contactParts.length >= 1) {
    const singleName = mentionedParts[0];
    const contactFirst = contactParts[0];

    // Exact first name match
    if (singleName === contactFirst) {
      return { match: true, score: 0.7, type: 'first-only' };
    }

    // Nickname match for first name
    const nicknames: Record<string, string[]> = {
      'matt': ['matthew', 'mat'],
      'matthew': ['matt', 'mat'],
      'rob': ['robert', 'bob', 'bobby'],
      'robert': ['rob', 'bob', 'bobby'],
      'mike': ['michael', 'mick'],
      'michael': ['mike', 'mick'],
    };

    if (nicknames[singleName]?.includes(contactFirst) || nicknames[contactFirst]?.includes(singleName)) {
      return { match: true, score: 0.65, type: 'first-nickname' };
    }

    return { match: false, score: 0, type: 'none' };
  }

  if (mentionedParts.length < 2 || contactParts.length < 1) {
    return { match: false, score: 0, type: 'none' };
  }

  const mentionedFirst = mentionedParts[0];
  const mentionedLast = mentionedParts[mentionedParts.length - 1];
  const contactFirst = contactParts[0];
  const contactLast = contactParts[contactParts.length - 1];

  // Check for nickname matches (Matt/Matthew, Rob/Robert, etc.)
  const nicknames: Record<string, string[]> = {
    'matt': ['matthew', 'mat'],
    'matthew': ['matt', 'mat'],
    'rob': ['robert', 'bob', 'bobby'],
    'robert': ['rob', 'bob', 'bobby'],
    'bob': ['robert', 'rob', 'bobby'],
    'mike': ['michael', 'mick'],
    'michael': ['mike', 'mick'],
    'jim': ['james', 'jimmy'],
    'james': ['jim', 'jimmy'],
    'bill': ['william', 'will', 'billy'],
    'william': ['bill', 'will', 'billy'],
    'tom': ['thomas', 'tommy'],
    'thomas': ['tom', 'tommy'],
    'joe': ['joseph', 'joey'],
    'joseph': ['joe', 'joey'],
    'dan': ['daniel', 'danny'],
    'daniel': ['dan', 'danny'],
    'chris': ['christopher', 'kristopher'],
    'christopher': ['chris'],
    'alex': ['alexander', 'alexandra'],
    'alexander': ['alex'],
    'sam': ['samuel', 'samantha'],
    'samuel': ['sam'],
    'nick': ['nicholas', 'nicolas'],
    'nicholas': ['nick', 'nicolas'],
    'steve': ['steven', 'stephen'],
    'steven': ['steve', 'stephen'],
    'stephen': ['steve', 'steven'],
    'tony': ['anthony'],
    'anthony': ['tony'],
    'dave': ['david'],
    'david': ['dave'],
    'ed': ['edward', 'eddie'],
    'edward': ['ed', 'eddie'],
    'sara': ['sarah'],
    'sarah': ['sara'],
    'kate': ['katherine', 'catherine', 'kathy'],
    'katherine': ['kate', 'kathy', 'katie'],
    'liz': ['elizabeth', 'beth', 'lizzy'],
    'elizabeth': ['liz', 'beth', 'lizzy'],
    'jen': ['jennifer', 'jenny'],
    'jennifer': ['jen', 'jenny'],
  };

  // Check first name match (exact or nickname)
  let firstNameMatch = false;
  if (mentionedFirst === contactFirst) {
    firstNameMatch = true;
  } else if (contactFirst.startsWith(mentionedFirst) || mentionedFirst.startsWith(contactFirst)) {
    firstNameMatch = true;
  } else if (nicknames[mentionedFirst]?.includes(contactFirst) || nicknames[contactFirst]?.includes(mentionedFirst)) {
    firstNameMatch = true;
  }

  // Check last name match (exact or close)
  let lastNameMatch = false;
  if (mentionedLast === contactLast) {
    lastNameMatch = true;
  } else if (levenshteinDistance(mentionedLast, contactLast) <= 2) {
    lastNameMatch = true;
  }

  // Both first and last match
  if (firstNameMatch && lastNameMatch) {
    return { match: true, score: 0.9, type: 'fuzzy-both' };
  }

  // Only last name matches exactly (common for formal references)
  if (mentionedLast === contactLast && mentionedParts.length === 1) {
    return { match: true, score: 0.7, type: 'last-only' };
  }

  // Levenshtein distance for close spelling
  const fullDistance = levenshteinDistance(mentioned, contact);
  const maxLen = Math.max(mentioned.length, contact.length);
  const similarity = 1 - (fullDistance / maxLen);

  if (similarity >= 0.8) {
    return { match: true, score: similarity, type: 'levenshtein' };
  }

  return { match: false, score: 0, type: 'none' };
}

// Check if a value matches any item in an array (case-insensitive, partial match)
export function matchesAny(value: string, items: string[]): boolean {
  const valueLower = value.toLowerCase();
  return items.some(item => {
    const itemLower = item.toLowerCase();
    return valueLower.includes(itemLower) || itemLower.includes(valueLower);
  });
}

// Parse check size from string (e.g., "$5,000,000" -> 5000000)
export function parseCheckSize(value: string): number | null {
  const cleaned = value.replace(/[$,]/g, '').toLowerCase();
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(k|m|million|thousand)?/);
  if (!match) return null;

  let num = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === 'k' || suffix === 'thousand') num *= 1000;
  if (suffix === 'm' || suffix === 'million') num *= 1000000;

  return num;
}

// Cosine similarity for embedding vectors
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Jaccard similarity for tag overlap
export function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 0;
  const s1 = new Set(set1.map(s => s.toLowerCase()));
  const s2 = new Set(set2.map(s => s.toLowerCase()));
  const intersection = [...s1].filter(x => s2.has(x)).length;
  const union = new Set([...s1, ...s2]).size;
  return union > 0 ? intersection / union : 0;
}

// Check-size fit: how well conversation's funding range overlaps with a
// contact's check-size range.  Returns 0–1.
export function checkSizeFit(
  convMin: number | null,
  convMax: number | null,
  contactMin: number | null,
  contactMax: number | null,
): number {
  if (convMin == null && convMax == null) return 0;
  if (contactMin == null && contactMax == null) return 0;

  // Treat a single value as both min and max
  const cMin = convMin ?? convMax!;
  const cMax = convMax ?? convMin!;
  const tMin = contactMin ?? contactMax!;
  const tMax = contactMax ?? contactMin!;

  // Full overlap: conversation range fits within contact range
  if (tMin <= cMin && cMax <= tMax) return 1.0;
  // Partial overlap
  const overlapStart = Math.max(cMin, tMin);
  const overlapEnd = Math.min(cMax, tMax);
  if (overlapStart <= overlapEnd) {
    const overlapLen = overlapEnd - overlapStart;
    const convLen = cMax - cMin || 1;
    return Math.min(0.5 + 0.5 * (overlapLen / convLen), 1.0);
  }
  // No overlap — score by how close they are (exponential decay)
  const gap = Math.min(Math.abs(cMin - tMax), Math.abs(tMin - cMax));
  const scale = Math.max(cMax, tMax) || 1;
  const proximity = Math.exp(-3 * gap / scale);
  return Math.min(proximity, 0.3);
}

// Weighted Jaccard similarity: each item in set1 has a weight (confidence).
// score = sum(weight_i * match_i) / max(sum(weight_i), |set2|)
export function weightedJaccardSimilarity(
  set1: { value: string; weight: number }[],
  set2: string[],
): number {
  if (set1.length === 0 && set2.length === 0) return 0;
  if (set1.length === 0 || set2.length === 0) return 0;

  const s2 = new Set(set2.map((s) => s.toLowerCase()));
  let weightedHits = 0;
  let totalWeight = 0;

  for (const item of set1) {
    totalWeight += item.weight;
    if (s2.has(item.value.toLowerCase())) {
      weightedHits += item.weight;
    }
  }

  const denom = Math.max(totalWeight, s2.size);
  return denom > 0 ? weightedHits / denom : 0;
}

// Star rating thresholds
export function scoreToStars(rawScore: number): number {
  if (rawScore >= 0.40) return 3;
  if (rawScore >= 0.20) return 2;
  if (rawScore >= 0.05) return 1;
  return 0;
}
