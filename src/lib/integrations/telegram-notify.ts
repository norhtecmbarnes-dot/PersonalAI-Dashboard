import { telegramService } from '@/lib/integrations/telegram';
import { loadTelegramConfig } from '@/lib/storage/telegram-config';

export interface SendTelegramMessageOptions {
  chatId?: number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

export async function sendTelegramMessage(options: SendTelegramMessageOptions): Promise<boolean> {
  try {
    const config = await loadTelegramConfig();

    if (!config || !config.enabled || !config.botToken) {
      console.log('[Telegram] Bot not configured or disabled');
      return false;
    }

    const chatId = options.chatId || config.chatId;
    if (!chatId) {
      console.log('[Telegram] No chatId configured');
      return false;
    }

    telegramService.setConfig({
      botToken: config.botToken,
      enabled: true,
      webhookUrl: config.webhookUrl,
      allowedUsers: config.allowedUsers || [],
      chatWithAI: true,
    });

    return await telegramService.sendMessage(chatId, options.text, options.parseMode || 'Markdown');
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

export async function getTelegramChatId(): Promise<number | null> {
  try {
    const config = await loadTelegramConfig();
    return config?.chatId || null;
  } catch (error) {
    console.error('[Telegram] Error getting chatId:', error);
    return null;
  }
}

export async function setTelegramChatId(chatId: number): Promise<void> {
  try {
    const config = await loadTelegramConfig();
    const updatedConfig = {
      ...config,
      chatId,
    };

    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    const configFile = path.join(dataDir, 'telegram_config.json');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      configFile,
      JSON.stringify(
        {
          telegram: updatedConfig,
          updatedAt: Date.now(),
        },
        null,
        2
      )
    );

    console.log('[Telegram] ChatId saved:', chatId);
  } catch (error) {
    console.error('[Telegram] Error saving chatId:', error);
    throw error;
  }
}
