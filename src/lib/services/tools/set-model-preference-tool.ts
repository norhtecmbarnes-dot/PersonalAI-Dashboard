import type { Tool } from '@/types/tools';

export const setModelPreferenceTool: Tool = {
  name: 'set_model_preference',
  description:
    'Set model preferences. Use this when the user wants to change default model or routing behavior.',
  parameters: {
    defaultModel: {
      type: 'string',
      description: 'Default model ID (e.g., "glm-4.7-flash", "llama3.2")',
      required: false,
    },
    autoRoute: {
      type: 'boolean',
      description: 'Automatically route to best model for task',
      required: false,
    },
    preferLocal: {
      type: 'boolean',
      description: 'Prefer local Ollama models over cloud',
      required: false,
    },
    cloudForChat: {
      type: 'boolean',
      description: 'Use cloud models for chat',
      required: false,
    },
  },
  execute: async params => {
    try {
      const prefs: any = {};
      if (params.defaultModel) prefs.defaultModel = params.defaultModel;
      if (params.autoRoute !== undefined) prefs.autoRoute = params.autoRoute;
      if (params.preferLocal !== undefined) prefs.preferLocal = params.preferLocal;
      if (params.cloudForChat !== undefined) prefs.cloudForChat = params.cloudForChat;

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelPreferences: prefs }),
      });
      if (response.ok) {
        return {
          success: true,
          data: {
            message: 'Model preferences updated.',
            preferences: prefs,
          },
        };
      }
      return { success: false, error: 'Failed to update model preferences' };
    } catch (error) {
      return { success: false, error: 'Failed to update model preferences' };
    }
  },
};
