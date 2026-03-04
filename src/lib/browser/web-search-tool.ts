/**
 * Ollama Web Search Tool
 * 
 * Uses Ollama's official web search API for real-time information.
 * Requires OLLAMA_API_KEY from https://ollama.com/settings/keys
 * 
 * Docs: https://docs.ollama.com/capabilities/web-search
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  published_date?: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
  search_time_ms?: number;
}

export interface SearXNGResult {
  title: string;
  url: string;
  snippet: string;
  engine?: string;
}

const OLLAMA_SEARCH_URL = 'https://ollama.com/api/web_search';
const OLLAMA_CLOUD_URL = 'https://api.ollama.com/v1/web_search';

/**
 * Perform web search using Ollama's official API
 * Works with GLM-5 and other cloud models
 */
export async function ollamaWebSearch(
  query: string,
  options?: {
    maxResults?: number;
    region?: string;
    freshness?: 'day' | 'week' | 'month' | 'year';
  }
): Promise<WebSearchResponse> {
  const apiKey = process.env.OLLAMA_API_KEY;
  
  if (!apiKey) {
    console.log('[OllamaWebSearch] No OLLAMA_API_KEY found');
    console.log('[OllamaWebSearch] To enable web search:');
    console.log('[OllamaWebSearch] 1. Get a free API key at https://ollama.com/settings/keys');
    console.log('[OllamaWebSearch] 2. Add OLLAMA_API_KEY=your-key to .env.local');
    console.log('[OllamaWebSearch] Falling back to browser search...');
    return fallbackToBrowserSearch(query, options?.maxResults || 5);
  }

  const maxResults = options?.maxResults || 5;

  try {
    console.log(`[OllamaWebSearch] Searching for: ${query}`);
    
    // Try ollama.com endpoint first (more reliable)
    const response = await fetch(OLLAMA_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[OllamaWebSearch] Found ${data.results?.length || 0} results via ollama.com`);
      return {
        results: (data.results || []).map((r: any) => ({
          title: r.title || '',
          url: r.url || '',
          snippet: r.snippet || r.content || '',
          source: r.source || 'ollama',
        })),
        query,
      };
    }
    
    console.log(`[OllamaWebSearch] ollama.com failed: ${response.status}`);

    // Try api.ollama.com as alternative
    const cloudResponse = await fetch(OLLAMA_CLOUD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        region: options?.region || 'us',
        freshness: options?.freshness,
      }),
    });

    if (cloudResponse.ok) {
      const data = await cloudResponse.json();
      console.log(`[OllamaWebSearch] Found ${data.results?.length || 0} results via api.ollama.com`);
      return {
        results: (data.results || []).map((r: any) => ({
          title: r.title || r.name || '',
          url: r.url || r.link || '',
          snippet: r.snippet || r.content || r.description || '',
          source: r.source || r.engine || 'ollama',
          published_date: r.published_date || r.date,
        })),
        query,
        search_time_ms: data.search_time_ms,
      };
    }
    
    console.log('[OllamaWebSearch] Both endpoints failed, falling back to browser search');

    // If both fail, fall back to browser search
    return fallbackToBrowserSearch(query, maxResults);

  } catch (error) {
    console.error('[OllamaWebSearch] Error:', error);
    return fallbackToBrowserSearch(query, maxResults);
  }
}

/**
 * Fallback when Ollama API is not available
 * Note: Browser search has been disabled. Use Ollama's web search or configure SearXNG.
 */
async function fallbackToBrowserSearch(
  query: string,
  maxResults: number
): Promise<WebSearchResponse> {
  console.log('[OllamaWebSearch] No fallback search available.');
  console.log('[OllamaWebSearch] To enable web search:');
  console.log('[OllamaWebSearch] 1. Add OLLAMA_API_KEY to .env.local');
  console.log('[OllamaWebSearch] 2. Or set up a SearXNG instance');
  return { results: [], query };
}

/**
 * Fallback to self-hosted SearXNG
 */
export async function searXNGSearch(
  query: string,
  searxngUrl: string = 'http://localhost:8888',
  maxResults: number = 5
): Promise<WebSearchResponse> {
  try {
    const response = await fetch(
      `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo`
    );

    if (!response.ok) {
      throw new Error(`SearXNG error: ${response.status}`);
    }

    const data = await response.json();
    
    const results: WebSearchResult[] = (data.results || [])
      .slice(0, maxResults)
      .map((r: any) => ({
        title: r.title || '',
        url: r.url || r.pretty_url || '',
        snippet: r.content || r.snippet || '',
        source: r.engine || 'searxng',
      }));

    return { results, query };
  } catch (error) {
    console.error('[SearXNG] Error:', error);
    return fallbackToBrowserSearch(query, maxResults);
  }
}

/**
 * Tool definition for AI models (GLM-5, etc.)
 * This is passed in the tools array for function calling
 */
export const webSearchToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the web for real-time information. Use this when you need current information, news, facts, or anything that might have changed recently. Returns relevant search results with titles, URLs, and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific and use relevant keywords.',
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return (default: 5, max: 10)',
          default: 5,
        },
        freshness: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: 'How recent the results should be',
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Execute web search tool call from AI
 */
export async function executeWebSearchTool(args: {
  query: string;
  max_results?: number;
  freshness?: 'day' | 'week' | 'month' | 'year';
}): Promise<string> {
  const apiKey = process.env.OLLAMA_API_KEY;
  
  // Check if API key is configured
  if (!apiKey) {
    return `## Web Search Not Configured

To enable web search, you need an Ollama API key:

1. **Get a free API key** at https://ollama.com/settings/keys
2. **Add to .env.local:**
   \`\`\`
   OLLAMA_API_KEY=your-key-here
   \`\`\`
3. **Restart the server**

Alternatively, the system will try browser-based search (requires Playwright/Chromium).

Your search query was: "${args.query}"`;
  }

  try {
    const response = await ollamaWebSearch(args.query, {
      maxResults: args.max_results || 5,
      freshness: args.freshness,
    });

    if (response.results.length === 0) {
      return `No search results found for "${args.query}". Try a different search term.`;
    }

    // Format results for AI consumption
    const formatted = response.results
      .map((r, i) => {
        let result = `${i + 1}. **${r.title}**\n`;
        result += `   URL: ${r.url}\n`;
        result += `   ${r.snippet}`;
        if (r.published_date) {
          result += `\n   Published: ${r.published_date}`;
        }
        return result;
      })
      .join('\n\n');

    return `## Web Search Results for "${args.query}"\n\n${formatted}`;
  } catch (error) {
    return `## Web Search Error

Failed to search for "${args.query}":
${error instanceof Error ? error.message : 'Unknown error'}

Please check:
1. Your OLLAMA_API_KEY is valid
2. You have internet connectivity
3. The Ollama API service is available`;
  }
}

/**
 * Check if Ollama web search is available
 */
export async function checkOllamaSearchAvailable(): Promise<{
  available: boolean;
  method: string;
  message: string;
}> {
  const apiKey = process.env.OLLAMA_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(OLLAMA_CLOUD_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'test', max_results: 1 }),
      });

      if (response.ok || response.status === 429) {
        return {
          available: true,
          method: 'ollama_cloud',
          message: 'Ollama Cloud web search is available',
        };
      }
    } catch {
      // Continue to check other methods
    }
  }

  // Check browser search
  try {
    const { BrowserService } = await import('./search');
    const isAvailable = await BrowserService.isPlaywrightAvailable();
    
    if (isAvailable) {
      return {
        available: true,
        method: 'browser',
        message: 'Browser-based search is available (Playwright)',
      };
    }
  } catch {
    // Continue to return not available
  }

  return {
    available: false,
    method: 'none',
    message: 'No web search available. Set OLLAMA_API_KEY for Ollama Cloud or install Playwright.',
  };
}