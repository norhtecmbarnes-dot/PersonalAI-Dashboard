export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    if (category) {
      const settings = sqlDatabase.getSettingsByCategory(category);
      return NextResponse.json({ settings });
    }
    
    const allSettings = sqlDatabase.getAllSettings();
    const modelPreferences = sqlDatabase.getModelPreferences();
    const apiKeys = sqlDatabase.getAllApiKeys();
    
    return NextResponse.json({
      settings: allSettings,
      modelPreferences,
      apiKeys,
      searchMode: sqlDatabase.getSearchMode(),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await sqlDatabase.initialize();
    
    const body = await request.json();
    const { action, key, value, category, provider, modelPreferences, searchMode } = body;
    
    // Handle search mode toggle
    if (searchMode !== undefined) {
      sqlDatabase.setSearchMode(searchMode);
      return NextResponse.json({ success: true, searchMode });
    }
    
    // Handle model preferences
    if (modelPreferences) {
      sqlDatabase.setModelPreferences(modelPreferences);
      return NextResponse.json({ success: true, preferences: sqlDatabase.getModelPreferences() });
    }
    
    // Handle API key
    if (provider !== undefined) {
      if (action === 'delete') {
        sqlDatabase.deleteApiKey(provider);
        return NextResponse.json({ success: true });
      }
      if (value) {
        sqlDatabase.setApiKey(provider, value);
        return NextResponse.json({ success: true, hasKey: true });
      }
    }
    
    // Handle generic setting
    if (key && value !== undefined) {
      sqlDatabase.setSetting(key, value, category || 'general');
      return NextResponse.json({ success: true });
    }
    
    if (action === 'delete' && key) {
      sqlDatabase.deleteSetting(key);
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