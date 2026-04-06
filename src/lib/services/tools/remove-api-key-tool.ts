import type { Tool } from '@/types/tools';

export const removeApiKeyTool: Tool = {
  name: 'remove_api_key',
  description:
    'Remove an API key for a provider. Use this when the user wants to delete an API key.',
  parameters: {
    provider: {
      type: 'string',
      description: 'Provider name (tavily, brave, serpapi, openrouter, etc.)',
      required: true,
    },
  },
  execute: async params => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', provider: params.provider }),
      });
      if (response.ok) {
        return {
          success: true,
          data: {
            message: `API key for ${params.provider} has been removed.`,
            provider: params.provider,
          },
        };
      }
      return { success: false, error: 'Failed to remove API key' };
    } catch (error) {
      return { success: false, error: 'Failed to remove API key' };
    }
  },
};
