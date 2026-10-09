export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { checkOllamaHealth, getOllamaModels, getExternalModels } from '@/lib/models/sdk.server';
import { isLocalOnly, preferLocal, pickLocalModel, localFirstStatus } from '@/lib/config/local-first';

export async function GET() {
  try {
    // Run Ollama checks in parallel with quick fallbacks
    const [ollamaModels, ollamaHealthy] = await Promise.all([
      getOllamaModels().catch(() => [] as any[]),
      checkOllamaHealth().catch(() => false),
    ]);

    const externalModels = getExternalModels();

    // Default model preferences (since database may not be available)
    const modelPrefs = {
      defaultModel: 'ollama/glm-5.3:cloud',
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
    const allOllamaModels = (ollamaModels || []).map(m => ({
      ...m,
      provider: 'ollama' as const,
    }));

    // ---- Local-first posture -------------------------------------------------
    // In LOCAL_ONLY mode nothing cloud is even offered. Otherwise a local model
    // is preferred as the default whenever one is available.
    const localOnly = isLocalOnly();
    const cloudModels = localOnly ? [] : filteredExternalModels;
    const localModelIds = allOllamaModels.map(m => `ollama/${m.name}`);

    // Determine default model, local-first.
    let defaultModel = modelPrefs.defaultModel;

    const preferredLocal = pickLocalModel(localModelIds);
    if (preferredLocal) {
      defaultModel = preferredLocal;
    } else if (localModelIds.length > 0) {
      defaultModel = localModelIds[0];
    } else if (!localOnly && cloudModels.length > 0) {
      defaultModel = cloudModels[0].id;
    }

    // If Ollama is offline but cloud is allowed and available, use the first cloud.
    if (!ollamaHealthy && !localOnly && cloudModels.length > 0) {
      defaultModel = cloudModels[0].id;
    }

    // If no models at all, provide helpful defaults.
    if (allOllamaModels.length === 0 && cloudModels.length === 0) {
      defaultModel = localOnly ? '' : 'glm-4.7-flash';
    }

    return NextResponse.json({
      ollama: {
        available: ollamaHealthy,
        models: allOllamaModels,
      },
      external: cloudModels,
      allModels: [
        ...allOllamaModels,
        ...cloudModels.map(m => ({ ...m, provider: m.provider })),
      ],
      defaultModel,
      preferences: { ...modelPrefs, preferLocal: preferLocal() },
      localFirst: localFirstStatus(),
      timestamp: Date.now(),
      availableProviders: Object.entries(availableApiKeys)
        .filter(([, has]) => has)
        .map(([provider]) => provider),
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
        defaultModel: isLocalOnly() ? '' : 'glm-4.7-flash',
        localFirst: localFirstStatus(),
      },
      { status: 500 }
    );
  }
}
