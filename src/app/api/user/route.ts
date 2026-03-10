export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { validateString, sanitizeString } from '@/lib/utils/validation';
import * as fs from 'fs';
import * as path from 'path';

interface UserPrefs {
  userName: string;
  assistantName: string;
  createdAt: number;
  updatedAt: number;
  hasCompletedSetup: boolean;
  telegram?: {
    botToken: string;
    enabled: boolean;
    webhookUrl?: string;
  };
  apiKeys?: Record<string, {
    key: string;
    enabled: boolean;
    addedAt?: number;
  }>;
}

const DEFAULT_PREFS: UserPrefs = {
  userName: 'User',
  assistantName: 'AI Assistant',
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
    
    return NextResponse.json({ 
      success: true, 
      preferences,
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
    const { action, userName, assistantName, telegram, apiKeys } = body;
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
          assistantName: sanitizeString(assistantName || 'AI Assistant'),
          hasCompletedSetup: true,
          updatedAt: Date.now(),
        };
        
        await savePreferences(preferences);
        
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
        
        // Note: Don't overwrite telegram unless explicitly provided
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
        const needsAssistantName = !preferences.assistantName || preferences.assistantName === 'AI Assistant';
        
        return NextResponse.json({
          success: true,
          needsSetup,
          needsUserName,
          needsAssistantName,
          preferences,
        });
      }

      case 'telegram': {
        if (telegram) {
          if (telegram.botToken) {
            const botTokenValidation = validateString(telegram.botToken, 'botToken', { maxLength: 500 });
            if (!botTokenValidation.valid) {
              return NextResponse.json({ error: botTokenValidation.error }, { status: 400 });
            }
            telegram.botToken = sanitizeString(telegram.botToken);
          }
          preferences = {
            ...preferences,
            telegram,
            updatedAt: Date.now(),
          };
          await savePreferences(preferences);
        }
        return NextResponse.json({ success: true, preferences });
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
          { error: 'Invalid action. Use: setup, update, check, telegram, getApiKeys, setApiKey, removeApiKey' },
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