export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { sanitizeString } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    if (category) {
      const settings = sqlDatabase.getSettingsByCategory(sanitizeString(category));
      return NextResponse.json({ settings });
    }
    
    const allSettings = sqlDatabase.getAllSettings();
    
    // Redact API key values - never expose actual keys to client
    const redactedSettings: Record<string, { value: string; category: string }> = {};
    for (const [key, data] of Object.entries(allSettings)) {
      if (key.startsWith('api_key_')) {
        redactedSettings[key] = { value: data.value ? '[REDACTED]' : '', category: data.category };
      } else {
        redactedSettings[key] = data;
      }
    }
    
    const modelPreferences = sqlDatabase.getModelPreferences();
    const apiKeys = sqlDatabase.getAllApiKeys();
    
    return NextResponse.json({
      settings: redactedSettings,
      modelPreferences,
      apiKeys,
      searchMode: sqlDatabase.getSearchMode(),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    sqlDatabase.initialize();
    
    const body = await request.json();
    const { action, key, value, category, provider, modelPreferences, searchMode } = body;
    
    if (searchMode !== undefined) {
      sqlDatabase.setSearchMode(Boolean(searchMode));
      return NextResponse.json({ success: true, searchMode: Boolean(searchMode) });
    }
    
    if (modelPreferences) {
      sqlDatabase.setModelPreferences(modelPreferences);
      return NextResponse.json({ success: true, preferences: sqlDatabase.getModelPreferences() });
    }
    
    if (provider !== undefined) {
      const sanitizedProvider = sanitizeString(provider).slice(0, 50);
      if (action === 'delete') {
        sqlDatabase.deleteApiKey(sanitizedProvider);
        return NextResponse.json({ success: true });
      }
      if (value) {
        sqlDatabase.setApiKey(sanitizedProvider, sanitizeString(value).slice(0, 200));
        return NextResponse.json({ success: true, hasKey: true });
      }
    }
    
    if (key && value !== undefined) {
      const sanitizedKey = sanitizeString(key).slice(0, 100);
      const sanitizedValue = typeof value === 'string' ? sanitizeString(value).slice(0, 10000) : value;
      const sanitizedCategory = category ? sanitizeString(category).slice(0, 50) : 'general';
      sqlDatabase.setSetting(sanitizedKey, sanitizedValue, sanitizedCategory);
      return NextResponse.json({ success: true });
    }
    
    if (action === 'delete' && key) {
      sqlDatabase.deleteSetting(sanitizeString(key).slice(0, 100));
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: 'Invalid request. Provide key/value, provider/value, modelPreferences, or searchMode' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}