import fs from 'fs';
import path from 'path';
import https from 'https';

export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  username?: string;
  allowedUsers?: string[];
  chatWithAI?: boolean;
}

const TELEGRAM_CONFIG_FILE = path.join(process.cwd(), 'data', 'telegram_config.json');

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function saveTelegramConfig(config: TelegramConfig): Promise<void> {
  ensureDataDir();
  const content = JSON.stringify({
    telegram: config,
    updatedAt: Date.now(),
  }, null, 2);
  fs.writeFileSync(TELEGRAM_CONFIG_FILE, content, 'utf-8');
  console.log('[Telegram Config] Saved to', TELEGRAM_CONFIG_FILE);
}

export async function loadTelegramConfig(): Promise<TelegramConfig | null> {
  try {
    ensureDataDir();
    if (!fs.existsSync(TELEGRAM_CONFIG_FILE)) {
      console.log('[Telegram Config] Config file does not exist');
      return null;
    }
    const content = fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf-8');
    const data = JSON.parse(content);
    console.log('[Telegram Config] Loaded from file, has telegram:', !!data.telegram);
    return data.telegram || null;
  } catch (error) {
    console.error('[Telegram Config] Error loading:', error);
    return null;
  }
}

export function verifyTelegramToken(botToken: string): Promise<{ id: number; username: string; first_name: string } | null> {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    
    const options = {
      timeout: 10000,
      headers: {
        'User-Agent': 'PersonalAI-Dashboard/1.0'
      }
    };
    
    const req = https.get(url, options, (res) => {
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
          reject(new Error('Failed to parse Telegram response'));
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('[Telegram] Connection error:', e.message);
      if (e.message.includes('ECONNRESET')) {
        reject(new Error('Connection reset. Please check your internet connection and try again.'));
      } else if (e.message.includes('ETIMEDOUT')) {
        reject(new Error('Connection timed out. Telegram API may be slow or unreachable.'));
      } else {
        reject(new Error(`Network error: ${e.message}`));
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out after 10 seconds'));
    });
  });
}