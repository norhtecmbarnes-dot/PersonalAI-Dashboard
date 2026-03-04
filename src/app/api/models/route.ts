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
      external: externalModels,
      allModels: [
        ...ollamaModels.map(m => ({ ...m, provider: 'ollama' })),
        ...externalModels.map(m => ({ ...m, provider: m.provider })),
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
