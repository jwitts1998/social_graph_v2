/**
 * Investor Data Sources
 *
 * Integrates Crunchbase API and OpenVC for structured investor data:
 * portfolio companies, sectors, stages, check sizes.
 * Used to ground thesis generation in real data rather than GPT inference.
 */

export interface InvestorPortfolioData {
  source: 'crunchbase' | 'openvc' | 'none';
  portfolioCompanies: Array<{
    name: string;
    category?: string;
    fundingStage?: string;
    description?: string;
  }>;
  firmProfile?: {
    name: string;
    description?: string;
    sectors?: string[];
    stages?: string[];
    checkSizeMin?: number;
    checkSizeMax?: number;
    geographicFocus?: string[];
  };
}

// --- Crunchbase API (requires Pro plan API key, $588/year) ---

async function fetchCrunchbaseInvestor(
  name: string,
  company: string | null,
  apiKey: string
): Promise<InvestorPortfolioData> {
  try {
    // Search for the person in Crunchbase
    const searchQuery = company ? `${name} ${company}` : name;
    const searchUrl = new URL('https://api.crunchbase.com/api/v4/autocompletes');
    searchUrl.searchParams.set('query', searchQuery);
    searchUrl.searchParams.set('collection_ids', 'people,organizations');
    searchUrl.searchParams.set('limit', '5');
    searchUrl.searchParams.set('user_key', apiKey);

    const searchResp = await fetch(searchUrl.toString());
    if (!searchResp.ok) {
      console.log('[InvestorSources] Crunchbase search returned', searchResp.status);
      return { source: 'crunchbase', portfolioCompanies: [] };
    }

    const searchData = await searchResp.json();
    const entities = searchData.entities || [];

    // Try to find the person entity
    const personEntity = entities.find((e: any) =>
      e.facet_ids?.includes('investor') || e.facet_ids?.includes('person')
    );

    if (!personEntity) {
      // Try to find the organization (firm) instead
      const orgEntity = entities.find((e: any) =>
        e.facet_ids?.includes('investor') || e.facet_ids?.includes('company')
      );

      if (orgEntity) {
        return await fetchCrunchbaseOrg(orgEntity.identifier?.permalink, apiKey);
      }
      return { source: 'crunchbase', portfolioCompanies: [] };
    }

    // Fetch the person's investments
    const personPermalink = personEntity.identifier?.permalink;
    if (!personPermalink) {
      return { source: 'crunchbase', portfolioCompanies: [] };
    }

    const investmentsUrl = new URL(`https://api.crunchbase.com/api/v4/entities/people/${personPermalink}`);
    investmentsUrl.searchParams.set('card_ids', 'investments,partner_investments');
    investmentsUrl.searchParams.set('user_key', apiKey);

    const investResp = await fetch(investmentsUrl.toString());
    if (!investResp.ok) {
      console.log('[InvestorSources] Crunchbase person fetch returned', investResp.status);
      return { source: 'crunchbase', portfolioCompanies: [] };
    }

    const investData = await investResp.json();
    const investments = [
      ...(investData.cards?.investments || []),
      ...(investData.cards?.partner_investments || []),
    ];

    const portfolioCompanies = investments
      .filter((inv: any) => inv.organization_identifier?.value)
      .map((inv: any) => ({
        name: inv.organization_identifier.value,
        category: inv.organization_identifier?.category_groups_list || undefined,
        fundingStage: inv.funding_round_identifier?.value || undefined,
      }))
      .slice(0, 50);

    console.log('[InvestorSources] Crunchbase found', portfolioCompanies.length, 'portfolio companies');
    return { source: 'crunchbase', portfolioCompanies };
  } catch (error) {
    console.error('[InvestorSources] Crunchbase error:', error);
    return { source: 'crunchbase', portfolioCompanies: [] };
  }
}

async function fetchCrunchbaseOrg(
  permalink: string,
  apiKey: string
): Promise<InvestorPortfolioData> {
  try {
    const orgUrl = new URL(`https://api.crunchbase.com/api/v4/entities/organizations/${permalink}`);
    orgUrl.searchParams.set('card_ids', 'investments,fields');
    orgUrl.searchParams.set('user_key', apiKey);

    const resp = await fetch(orgUrl.toString());
    if (!resp.ok) return { source: 'crunchbase', portfolioCompanies: [] };

    const data = await resp.json();
    const investments = data.cards?.investments || [];

    const portfolioCompanies = investments
      .filter((inv: any) => inv.organization_identifier?.value)
      .map((inv: any) => ({
        name: inv.organization_identifier.value,
        category: inv.organization_identifier?.category_groups_list || undefined,
        fundingStage: inv.funding_round_identifier?.value || undefined,
      }))
      .slice(0, 50);

    const fields = data.properties || {};
    const firmProfile = {
      name: fields.name || permalink,
      description: fields.short_description || undefined,
      sectors: fields.category_groups_list?.split(',').map((s: string) => s.trim()) || undefined,
    };

    return { source: 'crunchbase', portfolioCompanies, firmProfile };
  } catch (error) {
    console.error('[InvestorSources] Crunchbase org error:', error);
    return { source: 'crunchbase', portfolioCompanies: [] };
  }
}

// --- OpenVC (free, community-sourced investor criteria) ---

async function fetchOpenVCData(
  company: string
): Promise<InvestorPortfolioData['firmProfile'] | null> {
  try {
    // OpenVC has a public API at openvc.app for fund profiles
    const searchUrl = `https://api.openvc.app/v1/funds?search=${encodeURIComponent(company)}&limit=3`;

    const resp = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      console.log('[InvestorSources] OpenVC returned', resp.status);
      return null;
    }

    const data = await resp.json();
    const funds = data.data || data.funds || data;

    if (!Array.isArray(funds) || funds.length === 0) return null;

    // Find best match
    const fund = funds[0];
    return {
      name: fund.name || company,
      description: fund.description || undefined,
      sectors: fund.sectors || fund.industries || undefined,
      stages: fund.stages || undefined,
      checkSizeMin: fund.check_size_min || fund.ticket_min || undefined,
      checkSizeMax: fund.check_size_max || fund.ticket_max || undefined,
      geographicFocus: fund.geographies || fund.geos || undefined,
    };
  } catch (error) {
    console.error('[InvestorSources] OpenVC error:', error);
    return null;
  }
}

// --- Portfolio analysis: derive thesis signals from structured portfolio data ---

export function analyzePortfolio(
  portfolioCompanies: InvestorPortfolioData['portfolioCompanies']
): {
  sectors: string[];
  stages: string[];
  sectorDistribution: Record<string, number>;
} {
  const sectorCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};

  for (const co of portfolioCompanies) {
    if (co.category) {
      const categories = co.category.split(',').map(s => s.trim());
      for (const cat of categories) {
        sectorCounts[cat] = (sectorCounts[cat] || 0) + 1;
      }
    }
    if (co.fundingStage) {
      const stage = co.fundingStage.replace(/\s*-\s*.*/, '').trim();
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    }
  }

  const sectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector]) => sector);

  const stages = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([stage]) => stage);

  return { sectors, stages, sectorDistribution: sectorCounts };
}

/**
 * Fetch investor data from structured sources (Crunchbase + OpenVC).
 * Returns portfolio companies and firm-level criteria.
 */
export async function fetchInvestorData(
  name: string,
  company: string | null,
  crunchbaseApiKey: string | null,
  existingPortfolio: string[]
): Promise<InvestorPortfolioData> {
  let result: InvestorPortfolioData = { source: 'none', portfolioCompanies: [] };

  // Try Crunchbase first for portfolio data
  if (crunchbaseApiKey) {
    result = await fetchCrunchbaseInvestor(name, company, crunchbaseApiKey);
  }

  // Supplement with OpenVC for firm-level criteria
  if (company) {
    const openvcProfile = await fetchOpenVCData(company);
    if (openvcProfile) {
      result.firmProfile = {
        ...result.firmProfile,
        ...openvcProfile,
        // Prefer OpenVC for check sizes since they're self-reported
        checkSizeMin: openvcProfile.checkSizeMin || result.firmProfile?.checkSizeMin,
        checkSizeMax: openvcProfile.checkSizeMax || result.firmProfile?.checkSizeMax,
        sectors: openvcProfile.sectors || result.firmProfile?.sectors,
        stages: openvcProfile.stages || result.firmProfile?.stages,
        geographicFocus: openvcProfile.geographicFocus || result.firmProfile?.geographicFocus,
      };
      if (result.source === 'none') result.source = 'crunchbase';
      console.log('[InvestorSources] OpenVC supplemented firm profile for', company);
    }
  }

  // Merge existing portfolio companies with Crunchbase ones (dedup)
  if (existingPortfolio.length > 0) {
    const existingNames = new Set(existingPortfolio.map(n => n.toLowerCase()));
    const uniqueNew = result.portfolioCompanies.filter(
      co => !existingNames.has(co.name.toLowerCase())
    );
    result.portfolioCompanies = [
      ...existingPortfolio.map(name => ({ name })),
      ...uniqueNew,
    ];
  }

  return result;
}
