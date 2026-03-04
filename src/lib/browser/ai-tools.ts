import { ollamaWebSearch } from './web-search-tool';

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

export const aiTools = {
  /**
   * Search the web using Ollama's web search API
   * Note: Browser automation has been removed. Use Ollama's built-in web search.
   */
  async web_search(query: string, engine?: 'google' | 'bing' | 'duckduckgo'): Promise<ToolResult> {
    try {
      // Use Ollama's web search instead of browser automation
      const response = await ollamaWebSearch(query, { maxResults: 5 });
      
      return {
        success: response.results.length > 0,
        result: {
          query,
          engine: engine || 'google',
          results: response.results.map(r => ({
            title: r.title,
            url: r.url,
            excerpt: r.snippet?.substring(0, 200),
          })),
          count: response.results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },

  /**
   * Scrape content from a webpage
   * Note: Browser scraping has been removed. Use Ollama's web search for content.
   */
  async scrape_url(url: string): Promise<ToolResult> {
    return {
      success: false,
      error: 'Browser scraping has been disabled. Use Ollama web search instead.',
    };
  },

  /**
   * Take a screenshot of a webpage
   * Note: Browser automation has been removed.
   */
  async screenshot_url(url: string): Promise<ToolResult> {
    return {
      success: false,
      error: 'Browser automation has been disabled.',
    };
  },

  /**
   * Research a topic using Ollama's web search
   * Note: Browser automation has been removed. Uses Ollama web search instead.
   */
  async research_topic(topic: string, depth: number = 3): Promise<ToolResult> {
    try {
      const response = await ollamaWebSearch(topic, { maxResults: depth });
      
      return {
        success: response.results.length > 0,
        result: {
          topic,
          sources: response.results.map(r => ({
            title: r.title,
            url: r.url,
            content: r.snippet?.substring(0, 2000) || '',
          })),
          summary: `Researched ${topic} using ${response.results.length} sources`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Research failed',
      };
    }
  },
};

/**
 * AI Tool definitions for system prompts
 */
export const aiToolsDescription = `
## Available AI Tools

You have access to these tools that you can use by requesting them in your response:

### 1. web_search
Search the web using Ollama's built-in web search.
\`\`\`
TOOL: web_search
QUERY: "your search query"
\`\`\`

### 2. research_topic
Deep research on a topic using web search.
\`\`\`
TOOL: research_topic
TOPIC: "topic to research"
DEPTH: 3 (number of sources, optional)
\`\`\`

## Usage

When you need to use a tool, include a tool request block in your response:

\`\`\`
<tool_request>
{
  "tool": "web_search",
  "params": {
    "query": "latest AI developments 2026"
  }
}
</tool_request>
\`\`\`

The system will execute the tool and provide results in the next message.

Note: Browser automation tools (scrape_url, screenshot_url) have been disabled to simplify the system.
Use Ollama's web search for all web-based research.
`;

/**
 * Parse tool requests from AI response
 */
export function parseToolRequest(content: string): { tool: string; params: Record<string, any> } | null {
  const toolMatch = content.match(/<tool_request>\s*([\s\S]*?)\s*<\/tool_request>/);
  
  if (!toolMatch) return null;
  
  try {
    const parsed = JSON.parse(toolMatch[1]);
    return {
      tool: parsed.tool,
      params: parsed.params || {},
    };
  } catch {
    return null;
  }
}

/**
 * Execute a tool request
 */
export async function executeToolRequest(tool: string, params: Record<string, any>): Promise<ToolResult> {
  switch (tool) {
    case 'web_search':
      return aiTools.web_search(params.query, params.engine);
    
    case 'scrape_url':
      return aiTools.scrape_url(params.url);
    
    case 'screenshot_url':
      return aiTools.screenshot_url(params.url);
    
    case 'research_topic':
      return aiTools.research_topic(params.topic, params.depth);
    
    default:
      return {
        success: false,
        error: `Unknown tool: ${tool}`,
      };
  }
}
