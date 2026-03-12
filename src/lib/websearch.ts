export interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
  source?: string;
}

export interface DuckDuckGoResponse {
  Abstract?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
}

/**
 * Web Search Provider
 * 
 * Priority order:
 * 1. Ollama Web Search (Recommended - Free tier available at ollama.com)
 * 2. Tavily API (Requires TAVILY_API_KEY) - Full web search
 * 3. DuckDuckGo Instant Answers (Free, no API key) - Best for facts, definitions
 * 4. Brave Search API (Requires BRAVE_API_KEY) - Full web search
 * 5. SerpAPI (Requires SERPAPI_KEY) - Full web search
 * 6. Playwright Browser Search (Fallback)
 * 
 * For best results, set OLLAMA_API_KEY (free from https://ollama.com/settings/keys)
 */
function validateQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }
  if (query.trim().length === 0) {
    throw new Error('Query cannot be empty or whitespace only');
  }
  if (query.length > 1000) {
    throw new Error('Query exceeds maximum length of 1000 characters');
  }
}

function validateDuckDuckGoResponse(data: unknown): DuckDuckGoResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid DuckDuckGo response: not an object');
  }
  
  const response = data as Record<string, unknown>;
  
  // Validate RelatedTopics if present
  if (response.RelatedTopics !== undefined) {
    if (!Array.isArray(response.RelatedTopics)) {
      throw new Error('Invalid DuckDuckGo response: RelatedTopics is not an array');
    }
  }
  
  return response as DuckDuckGoResponse;
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    // Validate input
    validateQuery(query);
    
    const results: SearchResult[] = [];
    const errors: string[] = [];
    
    // Get API keys from database (priority) or env
    let tavilyKey = process.env.TAVILY_API_KEY;
    let braveKey = process.env.BRAVE_API_KEY;
    let serpapiKey = process.env.SERPAPI_KEY;
    let ollamaKey = process.env.OLLAMA_API_KEY;
    
    try {
      const { sqlDatabase } = await import('./database/sqlite');
      sqlDatabase.initialize();
      
      const dbTavily = sqlDatabase.getApiKey('tavily');
      const dbBrave = sqlDatabase.getApiKey('brave');
      const dbSerpapi = sqlDatabase.getApiKey('serpapi');
      const dbOllama = sqlDatabase.getApiKey('ollama');
      
      if (dbTavily) tavilyKey = dbTavily;
      if (dbBrave) braveKey = dbBrave;
      if (dbSerpapi) serpapiKey = dbSerpapi;
      if (dbOllama) ollamaKey = dbOllama;
    } catch (dbError) {
      console.log('[WebSearch] Could not load keys from database, using env vars');
    }

    // Priority 0: Ollama Web Search (recommended, built into Ollama Cloud)
    if (ollamaKey) {
      try {
        console.log('[WebSearch] Trying Ollama Web Search...');
        const { ollamaWebSearch } = await import('./browser/web-search-tool');
        const ollamaResults = await ollamaWebSearch(query, { maxResults: 5 });
        
        if (ollamaResults.results && ollamaResults.results.length > 0) {
          console.log(`[WebSearch] Ollama returned ${ollamaResults.results.length} results`);
          return ollamaResults.results.map(r => ({
            title: r.title,
            url: r.url,
            excerpt: r.snippet?.slice(0, 300) || '',
            source: r.source || 'Ollama',
          }));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[WebSearch] Ollama error:', errorMsg);
        errors.push(`Ollama: ${errorMsg}`);
      }
    } else {
      console.log('[WebSearch] No OLLAMA_API_KEY configured - skipping Ollama search');
    }

    // Priority 1: Tavily API (requires API key)
    if (tavilyKey) {
      try {
        console.log('[WebSearch] Trying Tavily API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            api_key: tavilyKey,
            max_results: 5,
            search_depth: 'basic',
            include_answer: false,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          if (data.results && Array.isArray(data.results)) {
            for (const result of data.results.slice(0, 5)) {
              if (result.title && result.url) {
                results.push({
                  title: result.title,
                  url: result.url,
                  excerpt: result.content?.slice(0, 300) || '',
                  source: 'Tavily',
                });
              }
            }
          }
          
          if (results.length > 0) {
            console.log(`[WebSearch] Tavily returned ${results.length} results`);
            return results;
          }
        } else {
          const errorText = await response.text();
          if (response.status === 429) {
            errors.push(`Tavily: Rate limited (429) - try again later`);
          } else {
            errors.push(`Tavily: ${response.status} ${errorText.slice(0, 100)}`);
          }
        }
      } catch (error) {
        errors.push(`Tavily: ${error instanceof Error ? error.message : 'timeout'}`);
      }
    }

    // Priority 2: DuckDuckGo (Free, no API key) - Good for facts
    try {
      console.log('[WebSearch] Trying DuckDuckGo Instant Answers...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const ddgResponse = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (ddgResponse.ok) {
        const data = await ddgResponse.json();
        
        // Check for Abstract (direct answer)
        if (data.Abstract && data.AbstractURL) {
          results.push({
            title: data.Heading || 'Answer',
            url: data.AbstractURL,
            excerpt: data.Abstract.slice(0, 300),
            source: 'DuckDuckGo',
          });
        }
        
        // Check for RelatedTopics
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const item of data.RelatedTopics.slice(0, 5)) {
            if (item.Text && item.FirstURL) {
              results.push({
                title: item.Text.split(' - ')[0] || 'Topic',
                url: item.FirstURL,
                excerpt: item.Text.slice(0, 200),
                source: 'DuckDuckGo',
              });
            }
          }
        }
        
        if (results.length > 0) {
          console.log(`[WebSearch] DuckDuckGo returned ${results.length} results`);
          return results;
        }
      } else {
        errors.push(`DuckDuckGo: ${ddgResponse.status}`);
      }
    } catch (error) {
      errors.push(`DuckDuckGo: ${error instanceof Error ? error.message : 'timeout'}`);
    }

    // Priority 3: Brave Search API
    if (braveKey) {
      try {
        console.log('[WebSearch] Trying Brave Search...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveKey,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          if (data.web?.results && Array.isArray(data.web.results)) {
            for (const result of data.web.results.slice(0, 8)) {
              if (result.title && result.url) {
                results.push({
                  title: result.title,
                  url: result.url,
                  excerpt: result.description?.slice(0, 300) || '',
                  source: 'Brave Search',
                });
              }
            }
          }
          
          if (results.length > 0) {
            console.log(`[WebSearch] Brave returned ${results.length} results`);
            return results;
          }
        } else {
          if (response.status === 429) {
            errors.push(`Brave: Rate limited (429) - try again later`);
          } else {
            errors.push(`Brave: ${response.status}`);
          }
        }
      } catch (error) {
        errors.push(`Brave: ${error instanceof Error ? error.message : 'timeout'}`);
      }
    }

    // Priority 4: SerpAPI (optional)
    if (serpapiKey) {
      try {
        console.log('[WebSearch] Trying SerpAPI...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(
          `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${serpapiKey}&output=json`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          if (data.organic_results && Array.isArray(data.organic_results)) {
            for (const result of data.organic_results.slice(0, 8)) {
              if (result.title && result.link) {
                results.push({
                  title: result.title,
                  url: result.link,
                  excerpt: result.snippet?.slice(0, 300) || '',
                  source: 'SerpAPI',
                });
              }
            }
          }
          
          if (results.length > 0) {
            console.log(`[WebSearch] SerpAPI returned ${results.length} results`);
            return results;
          }
        } else {
          if (response.status === 429) {
            errors.push(`SerpAPI: Rate limited (429) - try again later`);
          } else {
            errors.push(`SerpAPI: ${response.status}`);
          }
        }
      } catch (error) {
        errors.push(`SerpAPI: ${error instanceof Error ? error.message : 'timeout'}`);
      }
    }

    // No results from API providers - try Playwright browser search as fallback
    console.log('[WebSearch] API providers failed, trying Playwright browser search...');
    
    try {
      const { browserSearch, BrowserService } = await import('./browser/search');
      
      // Check if Playwright is available before attempting search
      const isPlaywrightAvailable = await BrowserService.isPlaywrightAvailable();
      if (!isPlaywrightAvailable) {
        console.log('[WebSearch] Playwright not available, skipping browser fallback');
        errors.push('Browser: Playwright not installed');
      } else {
        const browserResults = await browserSearch(query, 5);
        
        if (browserResults.length > 0) {
          console.log(`[WebSearch] Playwright found ${browserResults.length} results`);
          return browserResults;
        }
      }
    } catch (browserError) {
      console.warn('[WebSearch] Playwright search failed:', browserError);
      errors.push(`Browser: ${browserError instanceof Error ? browserError.message : 'failed'}`);
    }
    
    // No results
    console.log(`[WebSearch] No results found. Tried: ${errors.join(', ') || 'no providers configured'}`);
    
    // Check for rate limit or usage limit errors
    const rateLimitError = errors.find(e => e.includes('429') || e.includes('432'));
    if (rateLimitError) {
      const isUsageLimit = rateLimitError.includes('432');
      return [
        {
          title: isUsageLimit ? 'Usage limit exceeded' : 'Rate limit exceeded',
          url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
          excerpt: isUsageLimit 
            ? `Your Tavily plan usage limit has been exceeded. Upgrade your plan at tavily.com or try again next month. You can also search directly on DuckDuckGo.`
            : `A search provider rate limit was hit. Try again later or use DuckDuckGo directly.`,
        },
      ];
    }
    
    if (errors.length > 0) {
      const providersTried: string[] = [];
      if (ollamaKey) providersTried.push('Ollama');
      providersTried.push('DuckDuckGo');
      if (tavilyKey) providersTried.push('Tavily');
      if (braveKey) providersTried.push('Brave');
      if (serpapiKey) providersTried.push('SerpAPI');
      providersTried.push('Browser');
      
      return [
        {
          title: 'Search providers available but no results',
          url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
          excerpt: `Tried: ${providersTried.join(', ')}. Errors: ${errors.join('; ')}. For best results, add OLLAMA_API_KEY (free from ollama.com) in Settings.`,
        },
      ];
    }
    
    return [
      {
        title: 'Configure a search API key for real results',
        url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
        excerpt: `No search API keys configured. Go to Settings to add OLLAMA_API_KEY (free from ollama.com/settings/keys) for built-in web search. Or add TAVILY_API_KEY, BRAVE_API_KEY, or SERPAPI_KEY.`,
      },
    ];
  } catch (error) {
    console.error('[WebSearch] Error:', error);

    return [
      {
        title: 'Search temporarily unavailable',
        url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
        excerpt: `Search error: ${error instanceof Error ? error.message : 'Unknown'}. Try searching directly on DuckDuckGo.`,
      },
    ];
  }
}