export interface UserPreferences {
  userName: string;
  assistantName: string;
  createdAt: number;
  updatedAt: number;
  hasCompletedSetup: boolean;
  telegram?: TelegramUserConfig;
  apiKeys?: ApiKeys;
}

export interface TelegramUserConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  username?: string;
  chatId?: string;
}

export interface ApiKeys {
  openrouter?: string;
  deepseek?: string;
  sam?: string;
  tavily?: string;
  brave?: string;
  [key: string]: string | undefined;
}

const STORAGE_KEY = 'user_preferences';

class UserPreferencesService {
  private static instance: UserPreferencesService;
  private preferences: UserPreferences;

  private constructor() {
    this.preferences = this.load();
  }

  static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService();
    }
    return UserPreferencesService.instance;
  }

  private load(): UserPreferences {
    if (typeof window === 'undefined') {
      return {
        userName: '',
        assistantName: 'AI Assistant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        hasCompletedSetup: false,
      };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }

    return {
      userName: '',
      assistantName: 'AI Assistant',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      hasCompletedSetup: false,
    };
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  getUserName(): string {
    return this.preferences.userName;
  }

  getAssistantName(): string {
    return this.preferences.assistantName;
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
      updatedAt: Date.now(),
    };
    this.save();
  }

  needsSetup(): boolean {
    return !this.preferences.hasCompletedSetup;
  }

  completeSetup(userName: string, assistantName: string): void {
    this.preferences = {
      userName,
      assistantName,
      createdAt: this.preferences.createdAt,
      updatedAt: Date.now(),
      hasCompletedSetup: true,
    };
    this.save();
  }

  needsUserName(): boolean {
    return !this.preferences.userName || this.preferences.userName.trim() === '';
  }

  needsAssistantName(): boolean {
    return !this.preferences.assistantName || this.preferences.assistantName.trim() === '';
  }

  getTelegramConfig(): TelegramUserConfig | undefined {
    return this.preferences.telegram || undefined;
  }

  setTelegramConfig(config: TelegramUserConfig): void {
    this.preferences = {
      ...this.preferences,
      telegram: config,
      updatedAt: Date.now(),
    };
    this.save();
  }

  getApiKeys(): ApiKeys {
    return this.preferences.apiKeys || {};
  }

  setApiKey(provider: string, key: string): void {
    this.preferences = {
      ...this.preferences,
      apiKeys: {
        ...this.preferences.apiKeys,
        [provider]: key,
      },
      updatedAt: Date.now(),
    };
    this.save();
  }

  getApiKey(provider: string): string | undefined {
    return this.preferences.apiKeys?.[provider];
  }
}

export const userPreferences = UserPreferencesService.getInstance();
