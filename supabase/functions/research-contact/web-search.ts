// Web Search Integration using Serper API
// Provides real Google search results for contact research

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperResponse {
  organic: SearchResult[];
  searchParameters: {
    q: string;
    type: string;
  };
}

/**
 * Search Google using Serper API
 * Free tier: 2,500 searches/month
 */
export async function searchGoogle(query: string, serperApiKey: string): Promise<SerperResponse | null> {
  try {
    console.log('[Search] Query:', query);
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10, // Number of results
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Search] Serper API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('[Search] Found', data.organic?.length || 0, 'results');
    
    return data;
  } catch (error) {
    console.error('[Search] Error:', error);
    return null;
  }
}

/**
 * Generate optimized search queries for a contact
 */
export function generateSearchQueries(
  name: string,
  company: string | null,
  location: string | null,
  isInvestor: boolean
): string[] {
  const queries: string[] = [];
  
  // LinkedIn profile search
  queries.push(`"${name}" ${company ? `"${company}"` : ''} LinkedIn profile`);
  
  if (isInvestor) {
    // Investor-specific searches
    queries.push(`"${name}" ${company ? `"${company}"` : ''} Crunchbase investor portfolio`);
    queries.push(`"${name}" ${company ? `"${company}"` : ''} investments`);
    
    if (company) {
      queries.push(`"${company}" portfolio companies`);
    }
  } else {
    // Professional searches
    queries.push(`"${name}" ${company ? `"${company}"` : ''} biography`);
    queries.push(`"${name}" professional background`);
  }
  
  return queries;
}

/**
 * Format search results for GPT consumption
 */
export function formatSearchResults(results: SerperResponse[]): string {
  const formatted = results
    .filter(r => r && r.organic && r.organic.length > 0)
    .map((result, idx) => {
      const query = result.searchParameters?.q || `Search ${idx + 1}`;
      const topResults = result.organic.slice(0, 5); // Top 5 results per query
      
      return `### Search: ${query}\n${topResults.map((r, i) => 
        `${i + 1}. ${r.title}\n   URL: ${r.link}\n   ${r.snippet}`
      ).join('\n\n')}`;
    })
    .join('\n\n---\n\n');
  
  return formatted;
}
