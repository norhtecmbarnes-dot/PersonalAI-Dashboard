/**
 * Get API Keys Tool
 * List configured API keys (without exposing the actual keys)
 */

import type { Tool, ToolResult } from './tool-types';

export const getApiKeysTool: Tool = {
  name: 'get_api_keys',
  description:
    'Get list of configured API keys (shows which providers have keys set, not the actual keys). Use this to check what API keys are available.',
  parameters: {},
  execute: async (): Promise<ToolResult> => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        const keys = data.apiKeys || [];
        return {
          success: true,
          data: {
            keys: keys.map((k: any) => ({
              provider: k.provider,
              configured: k.hasKey,
            })),
            message:
              keys.filter((k: any) => k.hasKey).length > 0
                ? `Configured: ${keys
                    .filter((k: any) => k.hasKey)
                    .map((k: any) => k.provider)
                    .join(', ')}`
                : 'No API keys configured. Use set_api_key to add one.',
          },
        };
      }
      return { success: false, error: 'Failed to get API keys' };
    } catch (error) {
      return { success: false, error: 'Failed to get API keys' };
    }
  },
};
