import type { Tool } from '@/types/tools';

export const getPromptsTool: Tool = {
  name: 'get_prompts',
  description:
    'Retrieve saved prompts from the database. Use this to find prompts the user has saved.',
  parameters: {
    category: { type: 'string', description: 'Filter by category (optional)', required: false },
    query: { type: 'string', description: 'Search query (optional)', required: false },
  },
  execute: async params => {
    try {
      const queryString = new URLSearchParams();
      if (params.category) queryString.set('category', params.category);
      if (params.query) queryString.set('query', params.query);

      const response = await fetch(`/api/prompts?${queryString.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const prompts = data.prompts || [];
        return {
          success: true,
          data: {
            prompts: prompts.map((p: any) => ({
              id: p.id,
              title: p.title,
              category: p.category,
              tags: p.tags,
              useCount: p.use_count,
            })),
            count: prompts.length,
            message:
              prompts.length > 0
                ? `Found ${prompts.length} saved prompt(s).`
                : 'No saved prompts found. Use save_prompt to create one.',
          },
        };
      }
      return { success: false, error: 'Failed to get prompts' };
    } catch (error) {
      return { success: false, error: 'Failed to get prompts' };
    }
  },
};
