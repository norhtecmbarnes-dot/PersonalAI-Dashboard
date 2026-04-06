import type { Tool } from '@/types/tools';

export const usePromptTool: Tool = {
  name: 'use_prompt',
  description: 'Retrieve and use a saved prompt by ID. Increments the use count.',
  parameters: {
    id: { type: 'string', description: 'The prompt ID', required: true },
  },
  execute: async params => {
    try {
      const response = await fetch(`/api/prompts?id=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.prompt) {
          return {
            success: true,
            data: {
              prompt: data.prompt,
              message: `Loaded prompt: "${data.prompt.title}"`,
            },
          };
        }
      }
      return { success: false, error: 'Prompt not found' };
    } catch (error) {
      return { success: false, error: 'Failed to get prompt' };
    }
  },
};
