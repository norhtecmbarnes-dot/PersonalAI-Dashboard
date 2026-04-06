/**
 * Web Fetch Tool
 * Fetch and extract content from a URL
 */

import type { Tool, ToolResult } from './tool-types';

export const webFetchTool: Tool = {
  name: 'web_fetch',
  description: 'Fetch and extract content from a URL',
  parameters: {
    url: { type: 'string', description: 'URL to fetch', required: true },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const response = await fetch(params.url);
      const text = await response.text();
      const content = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);
      return { success: true, data: { url: params.url, content } };
    } catch (error) {
      return { success: false, error: 'Failed to fetch URL' };
    }
  },
};
