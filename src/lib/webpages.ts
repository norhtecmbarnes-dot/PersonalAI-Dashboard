/**
 * Web page fetching for research features (org charts, market research).
 * Fetches a page, strips markup, and returns the readable text so an LLM
 * can build "last known" structures from Wikipedia and government sites.
 */

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
}

const FETCH_TIMEOUT_MS = 12000;
const DEFAULT_MAX_CHARS = 12000;

/** Strip HTML tags/scripts/styles and normalize whitespace to readable text. */
export function extractTextFromHtml(html: string): string {
  let text = html;

  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' ');
  text = text.replace(/<\/tr>/gi, '\n');

  text = text.replace(/<[^>]+>/g, '');

  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");

  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+\n/g, '\n');

  return text.trim();
}

/** Resolve the Ollama API key (Settings DB first, then env). */
async function getOllamaApiKey(): Promise<string | null> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const dbKey = sqlDatabase.getApiKey('ollama');
    if (dbKey) return dbKey;
  } catch {
    /* DB unavailable — fall through to env */
  }
  return process.env.OLLAMA_API_KEY || null;
}

/**
 * Fetch a page via Ollama's web fetch API (https://ollama.com/api/web_fetch).
 * More reliable against bot-blocking sites and returns clean markdown text.
 * Requires an Ollama API key.
 */
async function fetchPageViaOllama(
  url: string,
  apiKey: string,
  maxChars: number
): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch('https://ollama.com/api/web_fetch', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content: string = data?.content || '';
    if (!content.trim()) return null;
    // Ollama returns markdown-ish text; strip markdown link/image syntax for
    // a cleaner read and normalize whitespace.
    const text = content
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
      .replace(/[#>*`_~|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxChars);
    if (text.length < 300) return null;
    return { url, title: (data?.title || url).slice(0, 200), text };
  } catch (error) {
    console.error(`[WebPages] Ollama fetch failed for ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a page and return its readable text. Uses Ollama's web fetch API
 * when a key is configured (better against bot-blocking sites), otherwise
 * fetches directly. Returns null on failure. Size-capped at `maxChars`.
 */
export async function fetchPageText(
  url: string,
  maxChars: number = DEFAULT_MAX_CHARS
): Promise<FetchedPage | null> {
  const ollamaKey = await getOllamaApiKey();
  if (ollamaKey) {
    const viaOllama = await fetchPageViaOllama(url, ollamaKey, maxChars);
    if (viaOllama) return viaOllama;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('html') && !contentType.includes('text')) {
      return null;
    }
    const html = await response.text();
    if (!html) return null;

    const text = extractTextFromHtml(html).slice(0, maxChars);
    if (text.length < 300) return null;

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return {
      url,
      title: titleMatch ? titleMatch[1].trim().slice(0, 200) : url,
      text,
    };
  } catch (error) {
    console.error(`[WebPages] Fetch failed for ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface WikipediaHit {
  title: string;
  url: string;
}

/**
 * Query Wikipedia directly (free, no API key) for pages about an agency or
 * organization. This is the reliable backbone for org chart research — it
 * works even when no search-provider API key is configured.
 */
export async function wikipediaSearch(
  term: string,
  limit = 5
): Promise<WikipediaHit[]> {
  if (!term || !term.trim()) return [];
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    format: 'json',
    srsearch: term,
    srlimit: String(limit),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ProposalGenie/1.0 (research bot; contact: local)' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    const hits: WikipediaHit[] = [];
    for (const item of data?.query?.search || []) {
      if (!item?.title) continue;
      hits.push({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
          item.title.replace(/ /g, '_')
        )}`,
      });
    }
    return hits;
  } catch (error) {
    console.error(`[WebPages] Wikipedia search failed for "${term}":`, error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pick the highest-value sources from a list of search findings and fetch
 * them. Wikipedia and .gov/.mil domains are prioritized (they carry the
 * real "last known" org structure); the rest are deduped by hostname.
 */
export async function fetchTopPages(
  candidates: Array<{ title?: string; url: string }>,
  maxPages = 5
): Promise<FetchedPage[]> {
  const score = (url: string): number => {
    if (url.includes('wikipedia.org')) return 3;
    if (/\.(gov|mil)\b/i.test(url)) return 2;
    return 1;
  };

  const unique: Array<{ title?: string; url: string }> = [];
  const seenHosts = new Set<string>();
  for (const c of [...candidates].sort((a, b) => score(b.url) - score(a.url))) {
    let host = '';
    try {
      host = new URL(c.url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (seenHosts.has(host)) continue;
    seenHosts.add(host);
    unique.push(c);
    if (unique.length >= maxPages * 2) break;
  }

  const pages: FetchedPage[] = [];
  for (const c of unique) {
    const page = await fetchPageText(c.url);
    if (page) {
      pages.push(page);
      if (pages.length >= maxPages) break;
    }
  }
  return pages;
}
