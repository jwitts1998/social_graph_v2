/**
 * Page Scraper Module
 *
 * Tiered web page scraping with three strategies:
 *   Tier 1 - Firecrawl: JS rendering, clean markdown output (~$0.001/page)
 *   Tier 2 - Jina Reader: Free, converts URLs to LLM-readable text
 *   Tier 3 - Native fetch: Raw HTML stripped to text (free, no JS support)
 *
 * Designed for reuse across projects. Only depends on Deno fetch.
 */

export interface ScrapedPage {
  url: string;
  content: string;
  title: string | null;
  scraper: 'firecrawl' | 'jina' | 'native';
  contentLength: number;
  truncated: boolean;
}

export interface ScraperOptions {
  firecrawlApiKey?: string | null;
  maxContentLength?: number;
  timeoutMs?: number;
}

const DEFAULT_MAX_CONTENT = 12_000;
const DEFAULT_TIMEOUT_MS = 15_000;

const BLOCKED_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'pinterest.com',
];

function isBlockedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

function truncateContent(content: string, max: number): { text: string; truncated: boolean } {
  if (content.length <= max) return { text: content, truncated: false };
  const truncated = content.slice(0, max);
  const lastNewline = truncated.lastIndexOf('\n');
  return {
    text: lastNewline > max * 0.8 ? truncated.slice(0, lastNewline) : truncated,
    truncated: true,
  };
}

// ---------------------------------------------------------------------------
// Tier 1: Firecrawl
// ---------------------------------------------------------------------------

async function firecrawlScrape(
  url: string,
  apiKey: string,
  timeoutMs: number,
  maxContent: number,
): Promise<ScrapedPage | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
        timeout: Math.floor(timeoutMs / 1000) * 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.log(`[Scraper] Firecrawl returned ${response.status} for ${url}`);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown;
    if (!markdown || markdown.length < 50) {
      console.log(`[Scraper] Firecrawl returned insufficient content for ${url}`);
      return null;
    }

    const { text, truncated } = truncateContent(markdown, maxContent);

    return {
      url,
      content: text,
      title: data.data?.metadata?.title || null,
      scraper: 'firecrawl',
      contentLength: markdown.length,
      truncated,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('abort')) {
      console.log(`[Scraper] Firecrawl timeout for ${url}`);
    } else {
      console.error(`[Scraper] Firecrawl error for ${url}:`, msg);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tier 2: Jina Reader
// ---------------------------------------------------------------------------

async function jinaScrape(
  url: string,
  timeoutMs: number,
  maxContent: number,
): Promise<ScrapedPage | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.log(`[Scraper] Jina returned ${response.status} for ${url}`);
      return null;
    }

    const text = await response.text();
    if (!text || text.length < 50) {
      console.log(`[Scraper] Jina returned insufficient content for ${url}`);
      return null;
    }

    const titleMatch = text.match(/^Title:\s*(.+)/m);
    const { text: content, truncated } = truncateContent(text, maxContent);

    return {
      url,
      content,
      title: titleMatch?.[1]?.trim() || null,
      scraper: 'jina',
      contentLength: text.length,
      truncated,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('abort')) {
      console.log(`[Scraper] Jina timeout for ${url}`);
    } else {
      console.error(`[Scraper] Jina error for ${url}:`, msg);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tier 3: Native fetch + HTML strip
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || null;
}

async function nativeScrape(
  url: string,
  timeoutMs: number,
  maxContent: number,
): Promise<ScrapedPage | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialGraphBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.log(`[Scraper] Native fetch returned ${response.status} for ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      console.log(`[Scraper] Non-HTML content type for ${url}: ${contentType}`);
      return null;
    }

    const html = await response.text();
    const title = extractTitleFromHtml(html);
    const stripped = stripHtml(html);

    if (stripped.length < 50) {
      console.log(`[Scraper] Native fetch returned insufficient content for ${url}`);
      return null;
    }

    const { text: content, truncated } = truncateContent(stripped, maxContent);

    return {
      url,
      content,
      title,
      scraper: 'native',
      contentLength: stripped.length,
      truncated,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('abort')) {
      console.log(`[Scraper] Native fetch timeout for ${url}`);
    } else {
      console.error(`[Scraper] Native fetch error for ${url}:`, msg);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape a single URL using tiered fallback: Firecrawl -> Jina -> Native.
 */
export async function scrapePage(url: string, options: ScraperOptions = {}): Promise<ScrapedPage | null> {
  const maxContent = options.maxContentLength ?? DEFAULT_MAX_CONTENT;
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (isBlockedUrl(url)) {
    console.log(`[Scraper] Skipping blocked domain: ${url}`);
    return null;
  }

  if (options.firecrawlApiKey) {
    const result = await firecrawlScrape(url, options.firecrawlApiKey, timeout, maxContent);
    if (result) return result;
  }

  const jinaResult = await jinaScrape(url, timeout, maxContent);
  if (jinaResult) return jinaResult;

  return await nativeScrape(url, timeout, maxContent);
}

/**
 * Scrape multiple URLs in parallel with concurrency control.
 * Returns results in the same order as input URLs. Failed scrapes are null.
 */
export async function scrapePages(
  urls: string[],
  options: ScraperOptions = {},
  concurrency = 3,
): Promise<(ScrapedPage | null)[]> {
  const results: (ScrapedPage | null)[] = new Array(urls.length).fill(null);

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => scrapePage(url, options)),
    );
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }

  return results;
}
