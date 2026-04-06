import type { Tool } from '@/types/tools';

export const deletePromptTool: Tool = {
  name: 'delete_prompt',
  description: 'Delete a saved prompt from the database.',
  parameters: {
    id: { type: 'string', description: 'The prompt ID to delete', required: true },
  },
  execute: async params => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: params.id }),
      });
      if (response.ok) {
        return { success: true, data: { message: 'Prompt deleted.' } };
      }
      return { success: false, error: 'Failed to delete prompt' };
    } catch (error) {
      return { success: false, error: 'Failed to delete prompt' };
    }
  },
};
