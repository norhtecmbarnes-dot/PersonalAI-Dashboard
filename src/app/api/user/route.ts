export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { validateString, sanitizeString } from '@/lib/utils/validation';
import { memoryFileService } from '@/lib/services/memory-file';
import * as fs from 'fs';
import * as path from 'path';

interface UserPrefs {
  userName: string;
  assistantName: string;
  createdAt: number;
  updatedAt: number;
  hasCompletedSetup: boolean;
  apiKeys?: Record<string, {
    key: string;
    enabled: boolean;
    addedAt?: number;
  }>;
}

const DEFAULT_PREFS: UserPrefs = {
  userName: 'User',
  assistantName: 'Proposal Genie',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  hasCompletedSetup: false,
};

const USER_PREFS_FILE = path.join(process.cwd(), 'data', 'user-preferences.json');

async function getPreferences(): Promise<UserPrefs> {
  try {
    if (!fs.existsSync(USER_PREFS_FILE)) {
      return DEFAULT_PREFS;
    }
    const content = fs.readFileSync(USER_PREFS_FILE, 'utf8');
    const prefs = JSON.parse(content || '{}');
    return { ...DEFAULT_PREFS, ...prefs };
  } catch (error) {
    console.error('[UserAPI] Failed to read preferences file:', error);
    return DEFAULT_PREFS;
  }
}

async function savePreferences(prefs: UserPrefs): Promise<void> {
  try {
    const dataDir = path.dirname(USER_PREFS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const content = JSON.stringify(prefs, null, 2);
    fs.writeFileSync(USER_PREFS_FILE, content, 'utf8');
  } catch (error) {
    console.error('[UserAPI] Failed to save preferences file:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const preferences = await getPreferences();
    
    // Resolve the display name: the name given at startup, falling back to the
    // memory-file name (never a bare "User"). This is what the Government
    // Contracting Studio greeting uses.
    const setupName = (preferences.userName || '').trim();
    const memoryName = ((memoryFileService.getMemory().user || {}).name || '').trim();
    const displayName =
      setupName && setupName !== 'User'
        ? setupName
        : memoryName && memoryName !== 'User'
          ? memoryName
          : '';
    
    return NextResponse.json({ 
      success: true, 
      preferences: { ...preferences, displayName },
    });
  } catch (error) {
    console.error('[UserAPI] Failed to get preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userName, assistantName, apiKeys } = body;
    let preferences = await getPreferences();

    switch (action) {
      case 'setup': {
        const userNameValidation = validateString(userName, 'userName', { maxLength: 100 });
        const assistantNameValidation = validateString(assistantName, 'assistantName', { maxLength: 100 });
        if (!userNameValidation.valid) {
          return NextResponse.json({ error: userNameValidation.error }, { status: 400 });
        }
        if (!assistantNameValidation.valid) {
          return NextResponse.json({ error: assistantNameValidation.error }, { status: 400 });
        }
        
        preferences = {
          ...preferences,
          userName: sanitizeString(userName || 'User'),
          assistantName: sanitizeString(assistantName || 'Proposal Genie'),
          hasCompletedSetup: true,
          updatedAt: Date.now(),
        };
        
        await savePreferences(preferences);
        
        // The name given when the program is started is the app-wide name:
        // keep the memory file (used for AI context) in sync so all surfaces
        // greet the same person.
        try {
          await memoryFileService.updateUser({ name: preferences.userName });
        } catch (e) {
          console.error('[UserAPI] Could not sync name to memory file:', e);
        }
        
        return NextResponse.json({ success: true, preferences });
      }

      case 'update': {
        if (body.userName) {
          const userNameValidation = validateString(body.userName, 'userName', { maxLength: 100 });
          if (!userNameValidation.valid) {
            return NextResponse.json({ error: userNameValidation.error }, { status: 400 });
          }
          body.userName = sanitizeString(body.userName);
        }
        if (body.assistantName) {
          const assistantNameValidation = validateString(body.assistantName, 'assistantName', { maxLength: 100 });
          if (!assistantNameValidation.valid) {
            return NextResponse.json({ error: assistantNameValidation.error }, { status: 400 });
          }
          body.assistantName = sanitizeString(body.assistantName);
        }
        
        if (body.userName) {
          try {
            await memoryFileService.updateUser({ name: body.userName });
          } catch (e) {
            console.error('[UserAPI] Could not sync name to memory file:', e);
          }
        }
        
        const updateData = { ...body, updatedAt: Date.now() };
        // Remove undefined fields to prevent overwriting with undefined
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        preferences = {
          ...preferences,
          ...updateData,
        };
        
        await savePreferences(preferences);
        return NextResponse.json({ success: true, preferences });
      }

      case 'check': {
        const needsSetup = !preferences.hasCompletedSetup;
        const needsUserName = !preferences.userName || preferences.userName === 'User';
        const needsAssistantName = !preferences.assistantName || preferences.assistantName === 'Proposal Genie';
        
        return NextResponse.json({
          success: true,
          needsSetup,
          needsUserName,
          needsAssistantName,
          preferences,
        });
      }

      case 'getApiKeys': {
        // Return API keys (masked for security)
        const maskedKeys: Record<string, { enabled: boolean; masked: string }> = {};
        if (preferences.apiKeys) {
          for (const [provider, config] of Object.entries(preferences.apiKeys)) {
            const key = config.key;
            maskedKeys[provider] = {
              enabled: config.enabled,
              masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : '',
            };
          }
        }
        return NextResponse.json({ success: true, apiKeys: maskedKeys });
      }

      case 'setApiKey': {
        const { provider, key } = body;
        if (!provider || !key) {
          return NextResponse.json({ error: 'Provider and key required' }, { status: 400 });
        }
        
        const keyValidation = validateString(key, 'apiKey', { maxLength: 500 });
        if (!keyValidation.valid) {
          return NextResponse.json({ error: keyValidation.error }, { status: 400 });
        }
        
        preferences = {
          ...preferences,
          apiKeys: {
            ...preferences.apiKeys,
            [provider]: {
              key: sanitizeString(key),
              enabled: true,
              addedAt: Date.now(),
            },
          },
          updatedAt: Date.now(),
        };
        
        await savePreferences(preferences);
        return NextResponse.json({ success: true, message: `${provider} API key saved` });
      }

      case 'removeApiKey': {
        const { provider } = body;
        if (!provider) {
          return NextResponse.json({ error: 'Provider required' }, { status: 400 });
        }
        
        if (preferences.apiKeys && preferences.apiKeys[provider]) {
          delete preferences.apiKeys[provider];
          preferences.updatedAt = Date.now();
          await savePreferences(preferences);
        }
        
        return NextResponse.json({ success: true, message: `${provider} API key removed` });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: setup, update, check, getApiKeys, setApiKey, removeApiKey' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[UserAPI] Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}