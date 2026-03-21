export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  listModels,
  checkOllamaHealth,
  getOllamaModels,
  getExternalModels,
} from '@/lib/models/sdk.server';

export async function GET() {
  try {
    const ollamaModels = await getOllamaModels();
    const externalModels = getExternalModels();
    const ollamaHealthy = await checkOllamaHealth();

    // Default model preferences (since database may not be available)
    const modelPrefs = {
      defaultModel: 'glm-4.7-flash',
      autoRoute: false,
      preferLocal: true,
      cloudForChat: false,
    };

    // Check which API keys are configured
    const availableApiKeys = {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      glm: !!process.env.GLM_API_KEY,
      'ollama-cloud': !!process.env.OLLAMA_API_KEY,
    };

    // Filter external models to only those with configured API keys
    const filteredExternalModels = externalModels.filter(m => {
      const provider = m.provider as keyof typeof availableApiKeys;
      return availableApiKeys[provider] === true;
    });

    // IMPORTANT: Include ALL Ollama models (local) - these don't need API keys
    // The ollamaModels from getOllamaModels() already contains only actually installed models
    const allOllamaModels = ollamaModels.map(m => ({
      ...m,
      provider: 'ollama' as const,
    }));

    // Determine default model based on preferences
    let defaultModel = modelPrefs.defaultModel;

    // If auto-routing is enabled and local models are preferred
    if (modelPrefs.autoRoute && modelPrefs.preferLocal && allOllamaModels.length > 0) {
      defaultModel = allOllamaModels[0].name;
    }

    // If cloud for chat is enabled, use cloud model
    if (modelPrefs.cloudForChat && filteredExternalModels.length > 0) {
      defaultModel = filteredExternalModels[0].id;
    }

    // If Ollama is offline but we have external models, use first external
    if (!ollamaHealthy && filteredExternalModels.length > 0) {
      defaultModel = filteredExternalModels[0].id;
    }

    // If no models at all, provide helpful defaults based on what might work
    if (allOllamaModels.length === 0 && filteredExternalModels.length === 0) {
      defaultModel = 'glm-4.7-flash'; // Most commonly available
    }

    return NextResponse.json({
      ollama: {
        available: ollamaHealthy,
        models: allOllamaModels,
      },
      external: filteredExternalModels,
      allModels: [
        ...allOllamaModels,
        ...filteredExternalModels.map(m => ({ ...m, provider: m.provider })),
      ],
      defaultModel,
      preferences: modelPrefs,
      timestamp: Date.now(),
      // Add hint about what's available/no keys
      availableProviders: Object.entries(availableApiKeys)
        .filter(([_, has]) => has)
        .map(([provider]) => provider),
    });
  } catch (error) {
    console.error('Models API error:', error, error instanceof Error ? error.stack : undefined);
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
