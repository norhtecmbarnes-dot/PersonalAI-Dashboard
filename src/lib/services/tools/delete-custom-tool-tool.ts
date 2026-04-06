import type { Tool } from '@/types/tools';

export const deleteCustomToolTool: Tool = {
  name: 'delete_custom_tool',
  description: 'Delete a custom API tool. Use this to remove a tool that is no longer needed.',
  parameters: {
    name: { type: 'string', description: 'Name of the tool to delete', required: true },
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
        body: JSON.stringify({ action: 'delete', id: tool.id }),
      });
      if (response.ok) {
        return {
          success: true,
          data: { message: `Custom tool "${params.name}" has been deleted.` },
        };
      }
      return { success: false, error: 'Failed to delete custom tool' };
    } catch (error) {
      return { success: false, error: 'Failed to delete custom tool' };
    }
  },
};
