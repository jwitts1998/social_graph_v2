import { describe, it, expect } from 'vitest';
import { contactFromDb, contactToDb, matchFromDb } from './supabaseHelpers';

// ─── matchFromDb ──────────────────────────────────────────────────────────────

describe('matchFromDb', () => {
  it('maps snake_case DB row to camelCase TS object', () => {
    const dbRow = {
      id: 'match-1',
      conversation_id: 'conv-1',
      contact_id: 'contact-1',
      score: 3,
      reasons: ['Sector overlap', 'Name mentioned'],
      justification: 'Good match for fintech',
      status: 'pending',
      promise_status: 'general',
      promised_at: null,
      score_breakdown: { semantic: 0.4, tagOverlap: 0.6 },
      confidence_scores: { overall: 0.75, semantic: 0.8 },
      match_version: 'v1.1-transparency',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    };

    const result = matchFromDb(dbRow);

    expect(result.id).toBe('match-1');
    expect(result.conversationId).toBe('conv-1');
    expect(result.contactId).toBe('contact-1');
    expect(result.score).toBe(3);
    expect(result.reasons).toEqual(['Sector overlap', 'Name mentioned']);
    expect(result.justification).toBe('Good match for fintech');
    expect(result.status).toBe('pending');
    expect(result.promiseStatus).toBe('general');
    expect(result.promisedAt).toBeNull();
    expect(result.scoreBreakdown).toEqual({ semantic: 0.4, tagOverlap: 0.6 });
    expect(result.confidenceScores).toEqual({ overall: 0.75, semantic: 0.8 });
    expect(result.matchVersion).toBe('v1.1-transparency');
    expect(result.createdAt).toEqual(new Date('2025-01-15T10:00:00Z'));
    expect(result.updatedAt).toEqual(new Date('2025-01-15T10:00:00Z'));
  });

  it('defaults scoreBreakdown and confidenceScores when null', () => {
    const dbRow = {
      id: 'match-2',
      conversation_id: 'conv-1',
      contact_id: 'contact-1',
      score: 1,
      reasons: [],
      justification: null,
      status: 'pending',
      promise_status: null,
      promised_at: null,
      score_breakdown: null,
      confidence_scores: null,
      match_version: null,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    };

    const result = matchFromDb(dbRow);

    expect(result.scoreBreakdown).toEqual({});
    expect(result.confidenceScores).toEqual({});
    expect(result.matchVersion).toBe('v1.0');
  });

  it('parses promised_at date when present', () => {
    const dbRow = {
      id: 'match-3',
      conversation_id: 'conv-1',
      contact_id: 'contact-1',
      score: 2,
      reasons: [],
      justification: null,
      status: 'promised',
      promise_status: 'promised',
      promised_at: '2025-01-20T14:00:00Z',
      score_breakdown: {},
      confidence_scores: {},
      match_version: 'v1.0',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-20T14:00:00Z',
    };

    const result = matchFromDb(dbRow);

    expect(result.promisedAt).toEqual(new Date('2025-01-20T14:00:00Z'));
  });
});

// ─── contactFromDb ────────────────────────────────────────────────────────────

describe('contactFromDb', () => {
  it('maps full snake_case DB row to camelCase', () => {
    const dbRow = {
      id: 'c-1',
      owned_by_profile: 'profile-1',
      name: 'Jane Doe',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      company: 'Acme Corp',
      title: 'CEO',
      linkedin_url: 'https://linkedin.com/in/janedoe',
      location: 'San Francisco, CA',
      phone: '+15551234567',
      category: 'Investor',
      twitter: '@janedoe',
      angellist: null,
      bio: 'Experienced investor in fintech',
      company_address: '123 Main St',
      company_employees: '50-100',
      company_founded: '2010',
      company_url: 'https://acme.com',
      company_linkedin: null,
      company_twitter: null,
      company_facebook: null,
      company_angellist: null,
      company_crunchbase: null,
      company_owler: null,
      youtube_vimeo: null,
      is_shared: false,
      status: 'verified',
      is_investor: true,
      contact_type: ['GP', 'Angel'],
      check_size_min: 100000,
      check_size_max: 5000000,
      investor_notes: 'Focus on early-stage fintech',
      preferred_stages: ['seed', 'series-a'],
      preferred_team_sizes: [],
      preferred_tenure: [],
      is_family_office: false,
      investment_types: ['direct'],
      avg_check_size: 500000,
      relationship_strength: 75,
      education: [{ school: 'Stanford', degree: 'MBA', field: 'Business', year: 2005 }],
      career_history: [{ company: 'Goldman Sachs', role: 'VP', years: '2005-2010' }],
      personal_interests: ['tennis', 'wine'],
      expertise_areas: ['fintech', 'payments'],
      portfolio_companies: ['Stripe', 'Plaid'],
      last_enriched_at: '2025-01-10T08:00:00Z',
      data_completeness_score: 85,
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2025-01-10T08:00:00Z',
    };

    const result = contactFromDb(dbRow);

    expect(result.id).toBe('c-1');
    expect(result.ownedByProfile).toBe('profile-1');
    expect(result.name).toBe('Jane Doe');
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Doe');
    expect(result.email).toBe('jane@example.com');
    expect(result.company).toBe('Acme Corp');
    expect(result.title).toBe('CEO');
    expect(result.isInvestor).toBe(true);
    expect(result.contactType).toEqual(['GP', 'Angel']);
    expect(result.relationshipStrength).toBe(75);
    expect(result.education).toEqual([{ school: 'Stanford', degree: 'MBA', field: 'Business', year: 2005 }]);
    expect(result.personalInterests).toEqual(['tennis', 'wine']);
    expect(result.expertiseAreas).toEqual(['fintech', 'payments']);
    expect(result.portfolioCompanies).toEqual(['Stripe', 'Plaid']);
    expect(result.lastEnrichedAt).toEqual(new Date('2025-01-10T08:00:00Z'));
    expect(result.dataCompletenessScore).toBe(85);
    expect(result.createdAt).toEqual(new Date('2024-06-01T00:00:00Z'));
  });

  it('handles null/undefined enrichment fields with defaults', () => {
    const dbRow = {
      id: 'c-2',
      owned_by_profile: 'profile-1',
      name: 'Minimal Contact',
      first_name: null,
      last_name: null,
      email: null,
      company: null,
      title: null,
      linkedin_url: null,
      location: null,
      phone: null,
      category: null,
      twitter: null,
      angellist: null,
      bio: null,
      company_address: null,
      company_employees: null,
      company_founded: null,
      company_url: null,
      company_linkedin: null,
      company_twitter: null,
      company_facebook: null,
      company_angellist: null,
      company_crunchbase: null,
      company_owler: null,
      youtube_vimeo: null,
      is_shared: false,
      status: null,
      is_investor: null,
      contact_type: null,
      check_size_min: null,
      check_size_max: null,
      investor_notes: null,
      preferred_stages: null,
      preferred_team_sizes: null,
      preferred_tenure: null,
      is_family_office: null,
      investment_types: null,
      avg_check_size: null,
      relationship_strength: null,
      education: null,
      career_history: null,
      personal_interests: null,
      expertise_areas: null,
      portfolio_companies: null,
      last_enriched_at: null,
      data_completeness_score: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    const result = contactFromDb(dbRow);

    expect(result.status).toBe('verified');
    expect(result.isInvestor).toBe(false);
    expect(result.contactType).toEqual([]);
    expect(result.isFamilyOffice).toBe(false);
    expect(result.relationshipStrength).toBeUndefined();
    expect(result.education).toBeUndefined();
    expect(result.careerHistory).toBeUndefined();
    expect(result.personalInterests).toBeUndefined();
    expect(result.expertiseAreas).toBeUndefined();
    expect(result.portfolioCompanies).toBeUndefined();
    expect(result.lastEnrichedAt).toBeUndefined();
    expect(result.dataCompletenessScore).toBeUndefined();
  });
});

// ─── contactToDb ──────────────────────────────────────────────────────────────

describe('contactToDb', () => {
  it('converts camelCase to snake_case for full object', () => {
    const contact = {
      id: 'c-1',
      ownedByProfile: 'profile-1',
      name: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      company: 'Acme Corp',
      title: 'CEO',
      isInvestor: true,
      contactType: ['GP'] as any,
      checkSizeMin: 100000,
      checkSizeMax: 5000000,
    };

    const result = contactToDb(contact);

    expect(result.id).toBe('c-1');
    expect(result.owned_by_profile).toBe('profile-1');
    expect(result.name).toBe('Jane Doe');
    expect(result.first_name).toBe('Jane');
    expect(result.last_name).toBe('Doe');
    expect(result.email).toBe('jane@example.com');
    expect(result.company).toBe('Acme Corp');
    expect(result.title).toBe('CEO');
    expect(result.is_investor).toBe(true);
    expect(result.contact_type).toEqual(['GP']);
    expect(result.check_size_min).toBe(100000);
    expect(result.check_size_max).toBe(5000000);
  });

  it('only includes provided fields (partial update)', () => {
    const partial = {
      name: 'Updated Name',
      title: 'New Title',
    };

    const result = contactToDb(partial);

    expect(result.name).toBe('Updated Name');
    expect(result.title).toBe('New Title');
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('owned_by_profile');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('company');
  });

  it('includes null values to allow clearing fields', () => {
    const contact = {
      email: null as any,
      bio: null as any,
      investorNotes: null as any,
    };

    const result = contactToDb(contact);

    expect(result.email).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.investor_notes).toBeNull();
  });

  it('returns empty object for empty input', () => {
    const result = contactToDb({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
