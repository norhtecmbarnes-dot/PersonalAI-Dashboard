import type { Tool } from '@/types/tools';

export const listCustomToolsTool: Tool = {
  name: 'list_custom_tools',
  description:
    'List all custom API tools that have been configured. Use this to see what custom tools are available.',
  parameters: {},
  execute: async () => {
    try {
      const response = await fetch('/api/custom-tools');
      if (response.ok) {
        const data = await response.json();
        const tools = data.tools || [];
        return {
          success: true,
          data: {
            tools: tools.map((t: any) => ({
              name: t.name,
              endpoint: t.endpoint,
              method: t.method,
              enabled: t.enabled,
              description: t.description,
            })),
            count: tools.length,
            message:
              tools.length > 0
                ? `${tools.length} custom tool(s) configured.`
                : 'No custom tools configured. Use create_custom_tool to add one.',
          },
        };
      }
      return { success: false, error: 'Failed to list custom tools' };
    } catch (error) {
      return { success: false, error: 'Failed to list custom tools' };
    }
  },
};
