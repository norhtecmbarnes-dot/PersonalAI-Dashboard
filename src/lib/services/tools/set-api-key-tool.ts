/**
 * Set API Key Tool
 * Set an API key for a provider
 */

import type { Tool, ToolResult } from './tool-types';

export const setApiKeyTool: Tool = {
  name: 'set_api_key',
  description:
    'Set an API key for a provider. Use this when the user wants to add or update an API key.',
  parameters: {
    provider: {
      type: 'string',
      description:
        'Provider name (tavily, brave, serpapi, openrouter, glm, deepseek, sam, openai, anthropic)',
      required: true,
    },
    key: { type: 'string', description: 'The API key value', required: true },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: params.provider, value: params.key }),
      });
      if (response.ok) {
        return {
          success: true,
          data: {
            message: `API key for ${params.provider} has been saved successfully.`,
            provider: params.provider,
          },
        };
      }
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to save API key' };
    } catch (error) {
      return { success: false, error: 'Failed to save API key' };
    }
  },
};
