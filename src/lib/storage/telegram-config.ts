import https from 'https';
import { sqlDatabase } from '@/lib/database/sqlite';

export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  username?: string;
  allowedUsers?: string[];
  chatWithAI?: boolean;
}

interface UserPrefs {
  userName: string;
  assistantName: string;
  createdAt: number;
  updatedAt: number;
  hasCompletedSetup: boolean;
  telegram?: TelegramConfig;
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

async function getPreferences(): Promise<UserPrefs> {
  await sqlDatabase.initialize();
  
  const docs = sqlDatabase.getDocuments(undefined, 'user_preference');
  if (docs && docs.length > 0) {
    try {
      const prefs = JSON.parse(docs[0].content || '{}');
      return { ...DEFAULT_PREFS, ...prefs };
    } catch {
      return DEFAULT_PREFS;
    }
  }
  return DEFAULT_PREFS;
}

async function savePreferences(prefs: UserPrefs): Promise<void> {
  await sqlDatabase.initialize();
  
  const docs = sqlDatabase.getDocuments(undefined, 'user_preference');
  const content = JSON.stringify(prefs);
  
  if (docs && docs.length > 0) {
    sqlDatabase.updateDocument(docs[0].id, { content });
  } else {
    sqlDatabase.addDocument({
      title: 'User Preferences',
      content,
      category: 'user_preference',
    });
  }
}

export async function saveTelegramConfig(config: TelegramConfig): Promise<void> {
  try {
    const preferences = await getPreferences();
    preferences.telegram = config;
    preferences.updatedAt = Date.now();
    await savePreferences(preferences);
    console.log('[Telegram Config] Saved to database');
  } catch (error) {
    console.error('[Telegram Config] Error saving:', error);
    throw error;
  }
}

export async function loadTelegramConfig(): Promise<TelegramConfig | null> {
  try {
    const preferences = await getPreferences();
    console.log('[Telegram Config] Loaded from database, has telegram:', !!preferences.telegram);
    return preferences.telegram || null;
  } catch (error) {
    console.error('[Telegram Config] Error loading:', error);
    return null;
  }
}

export function verifyTelegramToken(botToken: string): Promise<{ id: number; username: string; first_name: string } | null> {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.ok && json.result) {
            resolve(json.result);
          } else {
            reject(new Error(json.description || 'Invalid token'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}