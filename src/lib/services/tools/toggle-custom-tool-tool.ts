import type { Tool } from '@/types/tools';

export const toggleCustomToolTool: Tool = {
  name: 'toggle_custom_tool',
  description: 'Enable or disable a custom API tool.',
  parameters: {
    name: { type: 'string', description: 'Name of the tool', required: true },
    enabled: {
      type: 'boolean',
      description: 'true to enable, false to disable',
      required: true,
    },
  },
  execute: async params => {
    try {
      const listResponse = await fetch('/api/custom-tools');
      const listData = await listResponse.json();
      const tool = listData.tools?.find((t: any) => t.name === params.name);

      if (!tool) {
        return { success: false, error: `Tool "${params.name}" not found` };
      }

      const response = await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: tool.id, enabled: params.enabled }),
      });
      if (response.ok) {
        return {
          success: true,
          data: {
            message: `Custom tool "${params.name}" has been ${params.enabled ? 'enabled' : 'disabled'}.`,
          },
        };
      }
      return { success: false, error: 'Failed to toggle custom tool' };
    } catch (error) {
      return { success: false, error: 'Failed to toggle custom tool' };
    }
  },
};
