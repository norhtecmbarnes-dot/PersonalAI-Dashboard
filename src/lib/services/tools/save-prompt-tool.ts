import type { Tool } from '@/types/tools';

export const savePromptTool: Tool = {
  name: 'save_prompt',
  description:
    'Save a prompt to the prompt database for later reuse. Use this when the user wants to remember a prompt they crafted.',
  parameters: {
    title: { type: 'string', description: 'Short title for the prompt', required: true },
    content: { type: 'string', description: 'The full prompt content', required: true },
    category: {
      type: 'string',
      description: 'Category (e.g., "writing", "analysis", "coding", "general")',
      required: false,
    },
    tags: { type: 'array', description: 'Tags for organization', required: false },
    variables: {
      type: 'array',
      description: 'Variable definitions: {name, description, default}',
      required: false,
    },
  },
  execute: async params => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params.title,
          content: params.content,
          category: params.category || 'general',
          tags: params.tags || [],
          variables: params.variables || [],
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          data: {
            message: `Prompt "${params.title}" saved successfully.`,
            id: data.prompt?.id,
          },
        };
      }
      return { success: false, error: data.error || 'Failed to save prompt' };
    } catch (error) {
      return { success: false, error: 'Failed to save prompt' };
    }
  },
};
