export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  allowedUsers?: string[];
  chatWithAI: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramUpdateResponse {
  ok: boolean;
  result: TelegramUpdate[];
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhoto[];
  document?: TelegramDocument;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramPhoto {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramBotCommand {
  command: string;
  description: string;
}

class TelegramService {
  private config: TelegramConfig | null = null;
  private baseUrl = 'https://api.telegram.org';
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdateId: number = 0;
  private onMessageHandler: ((message: TelegramMessage) => Promise<void>) | null = null;
  private processedMessages: Set<number> = new Set();
  private isProcessing: boolean = false;

  setConfig(config: TelegramConfig) {
    this.config = config;
  }

  getConfig(): TelegramConfig | null {
    return this.config;
  }

  setOnMessage(handler: (message: TelegramMessage) => Promise<void>) {
    this.onMessageHandler = handler;
  }

  async getUpdates(timeout: number = 30): Promise<TelegramUpdate[]> {
    if (!this.config?.botToken) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        timeout: timeout.toString(),
        offset: (this.lastUpdateId + 1).toString(),
      });

      const response = await fetch(`${this.getApiUrl('getUpdates')}?${params}`, {
        method: 'GET',
      });

      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        const updates = data.result as TelegramUpdate[];
        this.lastUpdateId = updates[updates.length - 1].update_id;
        return updates;
      }

      return [];
    } catch (error) {
      console.error('Telegram getUpdates error:', error);
      return [];
    }
  }

  startPolling(intervalMs: number = 3000): void {
    if (this.pollingInterval) {
      console.log('[Telegram] Polling already running');
      return;
    }

    console.log('[Telegram] Starting polling...');
    
    const poll = async () => {
      if (!this.config?.enabled || this.isProcessing) {
        return;
      }

      this.isProcessing = true;
      try {
        const updates = await this.getUpdates(5);
        
        for (const update of updates) {
          if (update.message && this.onMessageHandler) {
            const messageId = update.message.message_id;
            
            // Skip already processed messages
            if (this.processedMessages.has(messageId)) {
              // Silently skip duplicates - no logging in production
              continue;
            }
            
            this.processedMessages.add(messageId);
            
            // Keep processed messages set from growing too large
            if (this.processedMessages.size > 100) {
              const arr = Array.from(this.processedMessages);
              this.processedMessages = new Set(arr.slice(-50));
            }
            
            try {
              // Only log errors, not successful processing
              await this.onMessageHandler(update.message);
            } catch (handlerError) {
              console.error('[Telegram] Handler error for message', messageId, ':', handlerError);
            }
          }
        }
      } catch (error) {
        console.error('[Telegram] Polling error:', error);
      } finally {
        this.isProcessing = false;
      }
    };

    poll();
    this.pollingInterval = setInterval(poll, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[Telegram] Polling stopped');
    }
  }

  isPolling(): boolean {
    return this.pollingInterval !== null;
  }

  private getApiUrl(method: string): string {
    if (!this.config?.botToken) {
      throw new Error('Telegram bot token not configured');
    }
    return `${this.baseUrl}/bot${this.config.botToken}/${method}`;
  }

  async sendMessage(chatId: number, text: string, parseMode?: 'Markdown' | 'HTML', replyMarkup?: any): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          reply_markup: replyMarkup,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram sendMessage error:', error);
      return false;
    }
  }

  async sendPhoto(chatId: number, photoUrl: string, caption?: string): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('sendPhoto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram sendPhoto error:', error);
      return false;
    }
  }

  async sendChatAction(chatId: number, action: 'typing' | 'upload_photo' | 'upload_document' | 'record_video' | 'record_voice' | 'upload_voice' | 'choose_sticker'): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('sendChatAction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          action,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram sendChatAction error:', error);
      return false;
    }
  }

  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('setWebhook'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message', 'callback_query'],
        }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Telegram setWebhook error:', error);
      return false;
    }
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('deleteWebhook'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Telegram deleteWebhook error:', error);
      return false;
    }
  }

  async getWebhookInfo(): Promise<{ url: string; has_custom_certificate: boolean; pending_update_count: number } | null> {
    try {
      const response = await fetch(this.getApiUrl('getWebhookInfo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.ok) {
        return data.result;
      }
      return null;
    } catch (error) {
      console.error('Telegram getWebhookInfo error:', error);
      return null;
    }
  }

  async getMe(): Promise<{ id: number; username: string; first_name: string } | null> {
    try {
      const response = await fetch(this.getApiUrl('getMe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.ok) {
        return data.result;
      }
      return null;
    } catch (error) {
      console.error('Telegram getMe error:', error);
      return null;
    }
  }

  async getChat(chatId: number): Promise<TelegramChat | null> {
    try {
      const response = await fetch(this.getApiUrl('getChat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId }),
      });

      const data = await response.json();
      if (data.ok) {
        return data.result;
      }
      return null;
    } catch (error) {
      console.error('Telegram getChat error:', error);
      return null;
    }
  }

  async setCommands(commands: TelegramBotCommand[]): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('setMyCommands'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Telegram setCommands error:', error);
      return false;
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('answerCallbackQuery'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram answerCallbackQuery error:', error);
      return false;
    }
  }

  isUserAllowed(userId: number): boolean {
    if (!this.config) return false;
    if (!this.config.enabled) return false;
    if (!this.config.allowedUsers || this.config.allowedUsers.length === 0) {
      return true;
    }
    return this.config.allowedUsers.includes(userId.toString());
  }
}

export const telegramService = new TelegramService();

export const DEFAULT_COMMANDS: TelegramBotCommand[] = [
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Get help' },
  { command: 'status', description: 'Check system status' },
  { command: 'search', description: 'Search the web' },
];
