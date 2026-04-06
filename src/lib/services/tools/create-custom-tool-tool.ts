import type { Tool } from '@/types/tools';

export const createCustomToolTool: Tool = {
  name: 'create_custom_tool',
  description:
    'Create a new custom API tool that the AI can call. Use this when the user wants to connect a local or external API.',
  parameters: {
    name: {
      type: 'string',
      description: 'Tool name (lowercase, underscores, e.g., "my_local_api")',
      required: true,
    },
    endpoint: {
      type: 'string',
      description: 'API endpoint URL (e.g., "http://localhost:3001/api/search")',
      required: true,
    },
    method: {
      type: 'string',
      description: 'HTTP method: GET, POST, PUT, or DELETE (default: POST)',
      required: false,
    },
    description: { type: 'string', description: 'What this tool does', required: false },
    headers: {
      type: 'object',
      description: 'HTTP headers as JSON object (e.g., {"Authorization": "Bearer token"})',
      required: false,
    },
    bodyTemplate: {
      type: 'string',
      description: 'JSON body template with {{parameter}} placeholders',
      required: false,
    },
    parameters: {
      type: 'array',
      description: 'Array of parameter definitions: {name, type, description, required}',
      required: false,
    },
    responsePath: {
      type: 'string',
      description: 'Dot-separated path to extract from response (e.g., "data.results")',
      required: false,
    },
  },
  execute: async params => {
    try {
      const response = await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          tool: {
            name: params.name,
            endpoint: params.endpoint,
            method: params.method || 'POST',
            description: params.description,
            headers: params.headers,
            bodyTemplate: params.bodyTemplate,
            parameters: params.parameters,
            responsePath: params.responsePath,
          },
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          data: {
            message: `Custom tool "${params.name}" created successfully. I can now use it when appropriate.`,
            id: data.id,
          },
        };
      }
      return { success: false, error: data.error || 'Failed to create custom tool' };
    } catch (error) {
      return { success: false, error: 'Failed to create custom tool' };
    }
  },
};
