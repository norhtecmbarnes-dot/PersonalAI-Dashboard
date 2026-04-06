/**
 * Web Search Tool
 * Search the web for current information
 */

import type { Tool, ToolResult } from './tool-types';

export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
    maxResults: { type: 'number', description: 'Max results (default 5)', required: false },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { performWebSearch } = await import('@/lib/websearch');
      const results = await performWebSearch(params.query);
      return { success: true, data: results.slice(0, params.maxResults || 5) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web search failed',
      };
    }
  },
};
