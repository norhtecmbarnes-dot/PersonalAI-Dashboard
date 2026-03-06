export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listModels, checkOllamaHealth, getOllamaModels, getExternalModels } from '@/lib/models/sdk.server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    await sqlDatabase.initialize();
    
    const ollamaModels = await getOllamaModels();
    const externalModels = getExternalModels();
    const ollamaHealthy = await checkOllamaHealth();
    const modelPrefs = sqlDatabase.getModelPreferences();
    
    // Filter external models to only show those with API keys configured
    const availableApiKeys = {
      gemini: !!process.env.GEMINI_API_KEY || !!sqlDatabase.getApiKey('gemini'),
      openai: !!process.env.OPENAI_API_KEY || !!sqlDatabase.getApiKey('openai'),
      anthropic: !!process.env.ANTHROPIC_API_KEY || !!sqlDatabase.getApiKey('anthropic'),
      groq: !!process.env.GROQ_API_KEY || !!sqlDatabase.getApiKey('groq'),
      mistral: !!process.env.MISTRAL_API_KEY || !!sqlDatabase.getApiKey('mistral'),
      deepseek: !!process.env.DEEPSEEK_API_KEY || !!sqlDatabase.getApiKey('deepseek'),
      openrouter: !!process.env.OPENROUTER_API_KEY || !!sqlDatabase.getApiKey('openrouter'),
    };
    
    // GLM models use OLLAMA_API_KEY which we already have checked
    const hasOllamaKey = !!process.env.OLLAMA_API_KEY || !!sqlDatabase.getApiKey('ollama');
    
    // Filter external models to only those with configured API keys
    const filteredExternalModels = externalModels.filter(m => {
      if (m.provider === 'glm') return hasOllamaKey;
      return availableApiKeys[m.provider as keyof typeof availableApiKeys] === true;
    });

    // Determine default model based on preferences
    let defaultModel = modelPrefs.defaultModel || 'glm-4.7-flash';
    
    // If auto-routing is enabled and local models are preferred
    if (modelPrefs.autoRoute && modelPrefs.preferLocal && ollamaModels.length > 0) {
      defaultModel = ollamaModels[0].name;
    }
    
    // If cloud for chat is enabled, use cloud model
    if (modelPrefs.cloudForChat) {
      defaultModel = 'glm-5:cloud';
    }

    return NextResponse.json({
      ollama: {
        available: ollamaHealthy,
        models: ollamaModels,
      },
      external: filteredExternalModels,
      allModels: [
        ...ollamaModels.map(m => ({ ...m, provider: 'ollama' })),
        ...filteredExternalModels.map(m => ({ ...m, provider: m.provider })),
      ],
      defaultModel,
      preferences: modelPrefs,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch models',
        details: error instanceof Error ? error.message : 'Unknown error',
        ollama: { available: false, models: [] },
        external: [],
        allModels: [],
        defaultModel: 'glm-4.7-flash',
      },
      { status: 500 }
    );
  }
}
