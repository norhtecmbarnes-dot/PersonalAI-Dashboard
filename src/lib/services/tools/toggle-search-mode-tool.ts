import type { Tool } from '@/types/tools';

export const toggleSearchModeTool: Tool = {
  name: 'toggle_search_mode',
  description:
    'Enable or disable web search mode. When enabled, responses will include web search results.',
  parameters: {
    enabled: {
      type: 'boolean',
      description: 'true to enable search, false to disable',
      required: true,
    },
  },
  execute: async params => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchMode: params.enabled }),
      });
      if (response.ok) {
        return {
          success: true,
          data: {
            message: `Web search has been ${params.enabled ? 'enabled' : 'disabled'}.`,
            searchMode: params.enabled,
          },
        };
      }
      return { success: false, error: 'Failed to toggle search mode' };
    } catch (error) {
      return { success: false, error: 'Failed to toggle search mode' };
    }
  },
};
