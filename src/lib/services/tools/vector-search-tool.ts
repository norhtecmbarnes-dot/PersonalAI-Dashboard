/**
 * Vector Search Tool
 * Search the vector knowledge base for relevant information
 */

import type { Tool, ToolResult } from './tool-types';

export const vectorSearchTool: Tool = {
  name: 'vector_search',
  description: 'Search the vector knowledge base for relevant information',
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
    limit: { type: 'number', description: 'Max results (default 5)', required: false },
    threshold: {
      type: 'number',
      description: 'Similarity threshold 0-1 (default 0.3)',
      required: false,
    },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { VectorStore } = await import('@/lib/storage/vector');
      VectorStore.initialize();
      const results = VectorStore.search(params.query, params.limit || 5, params.threshold || 0.3);
      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};
