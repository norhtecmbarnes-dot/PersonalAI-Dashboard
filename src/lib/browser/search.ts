// Browser search functionality has been removed to simplify the system
// and avoid Playwright dependency issues. Use Ollama's built-in web search instead.

export interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
  source?: string;
}

export interface BrowserConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
}

export class BrowserService {
  /**
   * Browser automation has been removed. Use Ollama's web search instead.
   */
  static async isPlaywrightAvailable(): Promise<boolean> {
    console.log('[BrowserService] Browser automation disabled. Using Ollama web search instead.');
    return false;
  }

  async initialize(config?: BrowserConfig): Promise<void> {
    console.log('[BrowserService] Browser automation disabled. Using Ollama web search instead.');
  }

  async close(force?: boolean): Promise<void> {
    // No-op
  }

  async searchGoogle(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    console.log('[BrowserService] Browser search disabled. Use Ollama web search instead.');
    return [];
  }

  async searchDuckDuckGo(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    console.log('[BrowserService] Browser search disabled. Use Ollama web search instead.');
    return [];
  }

  async searchBing(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    console.log('[BrowserService] Browser search disabled. Use Ollama web search instead.');
    return [];
  }

  async search(query: string, engine: 'google' | 'bing' | 'duckduckgo' = 'google', maxResults: number = 5): Promise<SearchResult[]> {
    console.log('[BrowserService] Browser search disabled. Use Ollama web search instead.');
    return [];
  }

  async scrapeUrl(url: string): Promise<{ title: string; content: string; links: string[] }> {
    console.log('[BrowserService] Browser scraping disabled. Use Ollama web search instead.');
    return { title: '', content: '', links: [] };
  }

  async screenshot(url: string, options?: { fullPage?: boolean; width?: number; height?: number }): Promise<Buffer | null> {
    console.log('[BrowserService] Browser screenshot disabled.');
    return null;
  }
}

export const browserService = new BrowserService();

export async function browserSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  console.log('[BrowserService] Browser search disabled. Use Ollama web search instead.');
  return [];
}
