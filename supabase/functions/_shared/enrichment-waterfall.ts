/**
 * Waterfall Enrichment Strategy
 *
 * Queries structured data providers in order (PDL → Apollo → Serper+GPT),
 * stopping as soon as a sufficiently complete profile is found.
 * This reduces cost and improves accuracy since structured databases
 * are more reliable than web-search extraction.
 */

export interface WaterfallContact {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  title?: string | null;
  location?: string | null;
  phone?: string | null;
}

export interface WaterfallResult {
  source: 'pdl' | 'apollo' | 'none';
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    linkedinUrl?: string;
    title?: string;
    company?: string;
    location?: string;
    phone?: string;
    bio?: string;
    twitter?: string;
    companyUrl?: string;
    companyAddress?: string;
    companyEmployees?: string;
    companyFounded?: string;
    companyLinkedin?: string;
    companyTwitter?: string;
    companyFacebook?: string;
  } | null;
  isSufficientlyComplete: boolean;
}

function isProfileComplete(data: WaterfallResult['data']): boolean {
  if (!data) return false;
  let filled = 0;
  if (data.title) filled++;
  if (data.company) filled++;
  if (data.bio) filled++;
  if (data.email) filled++;
  if (data.linkedinUrl) filled++;
  return filled >= 3;
}

async function tryPDL(contact: WaterfallContact, apiKey: string): Promise<WaterfallResult> {
  const url = new URL('https://api.peopledatalabs.com/v5/person/enrich');

  if (contact.linkedinUrl) {
    url.searchParams.set('profile', contact.linkedinUrl);
  } else if (contact.email) {
    url.searchParams.set('email', contact.email);
  } else if (contact.name && contact.company) {
    url.searchParams.set('name', contact.name);
    url.searchParams.set('company', contact.company);
  } else {
    return { source: 'pdl', data: null, isSufficientlyComplete: false };
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { 'X-API-Key': apiKey },
    });

    if (!response.ok) {
      console.log('[Waterfall] PDL returned', response.status);
      return { source: 'pdl', data: null, isSufficientlyComplete: false };
    }

    const result = await response.json();
    if (!result.data) {
      return { source: 'pdl', data: null, isSufficientlyComplete: false };
    }

    const d = result.data;
    const primaryEmail = d.emails?.find((e: any) => e.type === 'professional')?.address
      || d.emails?.[0]?.address;

    const location = d.location_name ||
      [d.location_locality, d.location_region, d.location_country].filter(Boolean).join(', ') || undefined;

    const companyAddress = [
      d.job_company_location_street_address,
      d.job_company_location_locality,
      d.job_company_location_region,
      d.job_company_location_postal_code,
      d.job_company_location_country,
    ].filter(Boolean).join(', ') || undefined;

    const data: WaterfallResult['data'] = {
      firstName: d.first_name || undefined,
      lastName: d.last_name || undefined,
      email: primaryEmail || undefined,
      linkedinUrl: d.linkedin_url || undefined,
      title: d.job_title || undefined,
      company: d.job_company_name || undefined,
      location,
      phone: d.mobile_phone || d.phone_numbers?.[0] || undefined,
      bio: d.summary || undefined,
      twitter: d.twitter_url || undefined,
      companyUrl: d.job_company_website || undefined,
      companyAddress,
      companyEmployees: d.job_company_size || undefined,
      companyFounded: d.job_company_founded?.toString() || undefined,
      companyLinkedin: d.job_company_linkedin_url || undefined,
      companyTwitter: d.job_company_twitter_url || undefined,
      companyFacebook: d.job_company_facebook_url || undefined,
    };

    console.log('[Waterfall] PDL found profile for', contact.name);
    return { source: 'pdl', data, isSufficientlyComplete: isProfileComplete(data) };
  } catch (error) {
    console.error('[Waterfall] PDL error:', error);
    return { source: 'pdl', data: null, isSufficientlyComplete: false };
  }
}

async function tryApollo(contact: WaterfallContact, apiKey: string): Promise<WaterfallResult> {
  try {
    const body: Record<string, any> = {};
    if (contact.email) {
      body.email = contact.email;
    } else if (contact.firstName && contact.lastName && contact.company) {
      body.first_name = contact.firstName;
      body.last_name = contact.lastName;
      body.organization_name = contact.company;
    } else if (contact.name && contact.company) {
      const parts = contact.name.split(' ');
      body.first_name = parts[0];
      body.last_name = parts.slice(1).join(' ');
      body.organization_name = contact.company;
    } else if (contact.linkedinUrl) {
      body.linkedin_url = contact.linkedinUrl;
    } else {
      return { source: 'apollo', data: null, isSufficientlyComplete: false };
    }

    const response = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.log('[Waterfall] Apollo returned', response.status);
      return { source: 'apollo', data: null, isSufficientlyComplete: false };
    }

    const result = await response.json();
    const person = result.person;
    if (!person) {
      return { source: 'apollo', data: null, isSufficientlyComplete: false };
    }

    const data: WaterfallResult['data'] = {
      firstName: person.first_name || undefined,
      lastName: person.last_name || undefined,
      email: person.email || undefined,
      linkedinUrl: person.linkedin_url || undefined,
      title: person.title || undefined,
      company: person.organization?.name || undefined,
      location: [person.city, person.state, person.country].filter(Boolean).join(', ') || undefined,
      phone: person.phone_numbers?.[0]?.sanitized_number || undefined,
      bio: person.headline || undefined,
      twitter: person.twitter_url || undefined,
      companyUrl: person.organization?.website_url || undefined,
    };

    console.log('[Waterfall] Apollo found profile for', contact.name);
    return { source: 'apollo', data, isSufficientlyComplete: isProfileComplete(data) };
  } catch (error) {
    console.error('[Waterfall] Apollo error:', error);
    return { source: 'apollo', data: null, isSufficientlyComplete: false };
  }
}

/**
 * Run waterfall enrichment: PDL → Apollo, returning the best result.
 * The caller should fall back to Serper+GPT if the result is not sufficiently complete.
 */
export async function runWaterfallEnrichment(
  contact: WaterfallContact,
  pdlApiKey: string | null,
  apolloApiKey: string | null
): Promise<WaterfallResult> {
  // Step 1: Try PDL
  if (pdlApiKey) {
    const pdlResult = await tryPDL(contact, pdlApiKey);
    if (pdlResult.isSufficientlyComplete) {
      return pdlResult;
    }
    // Even if not complete, save partial data
    if (pdlResult.data) {
      console.log('[Waterfall] PDL returned partial data, trying Apollo next');
    }
  }

  // Step 2: Try Apollo
  if (apolloApiKey) {
    const apolloResult = await tryApollo(contact, apolloApiKey);
    if (apolloResult.isSufficientlyComplete) {
      return apolloResult;
    }
    if (apolloResult.data) {
      return apolloResult;
    }
  }

  return { source: 'none', data: null, isSufficientlyComplete: false };
}
