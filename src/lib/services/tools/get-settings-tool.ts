/**
 * Get Settings Tool
 * Get current system settings
 */

import type { Tool, ToolResult } from './tool-types';

export const getSettingsTool: Tool = {
  name: 'get_settings',
  description: 'Get current system settings including model preferences and search mode.',
  parameters: {},
  execute: async (): Promise<ToolResult> => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: {
            modelPreferences: data.modelPreferences,
            searchMode: data.searchMode,
          },
        };
      }
      return { success: false, error: 'Failed to get settings' };
    } catch (error) {
      return { success: false, error: 'Failed to get settings' };
    }
  },
};
