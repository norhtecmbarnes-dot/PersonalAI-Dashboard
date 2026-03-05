import { sqlDatabase } from '@/lib/database/sqlite';

export interface APIKeyConfig {
  provider: string;
  key: string;
  endpoint?: string;
  model?: string;
  enabled: boolean;
  addedAt?: number;
  lastUsed?: number;
}

export interface AppConfig {
  mode: 'out-of-the-box' | 'custom';
  apiKeys: Record<string, APIKeyConfig>;
  features: Record<string, boolean>;
  settings: AppSettings;
}

export interface AppSettings {
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  theme: 'dark' | 'light' | 'system';
  language: string;
  autoSave: boolean;
  streaming: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: 'glm-4.7-flash',
  maxTokens: 2000,
  temperature: 0.7,
  theme: 'dark',
  language: 'en',
  autoSave: true,
  streaming: false,
};

const DEFAULT_OUT_OF_THE_BOX_CONFIG: AppConfig = {
  mode: 'out-of-the-box',
  apiKeys: {},
  features: {
    chat: true,
    'document-import': true,
    'vector-memory': true,
    notes: true,
    experts: true,
    'token-optimization': true,
    ollama: true,
    glm: true,
    websearch: false,
    openrouter: false,
    deepseek: false,
    'self-improvement': false,
  },
  settings: DEFAULT_SETTINGS,
};

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private initialized: boolean = false;

  private constructor() {
    this.config = { ...DEFAULT_OUT_OF_THE_BOX_CONFIG };
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await sqlDatabase.initialize();
      
      // Load config from database
      const docs = sqlDatabase.getDocuments(undefined, 'app_config');
      if (docs && docs.length > 0) {
        try {
          const savedConfig = JSON.parse(docs[0].content || '{}');
          this.config = {
            ...DEFAULT_OUT_OF_THE_BOX_CONFIG,
            ...savedConfig,
            settings: {
              ...DEFAULT_SETTINGS,
              ...(savedConfig.settings || {}),
            },
          };
        } catch (e) {
          console.error('[ConfigManager] Error parsing config:', e);
        }
      }
      
      this.initialized = true;
    } catch (e) {
      console.error('[ConfigManager] Error initializing:', e);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const docs = sqlDatabase.getDocuments(undefined, 'app_config');
      const content = JSON.stringify(this.config);
      
      if (docs && docs.length > 0) {
        sqlDatabase.updateDocument(docs[0].id, { content });
      } else {
        sqlDatabase.addDocument({
          title: 'App Config',
          content,
          category: 'app_config',
          tags: ['config', 'app'],
        });
      }
    } catch (e) {
      console.error('[ConfigManager] Error saving config:', e);
    }
  }

  async getConfig(): Promise<AppConfig> {
    await this.ensureInitialized();
    return { ...this.config };
  }

  async getMode(): Promise<'out-of-the-box' | 'custom'> {
    await this.ensureInitialized();
    return this.config.mode;
  }

  async setMode(mode: 'out-of-the-box' | 'custom'): Promise<void> {
    await this.ensureInitialized();
    this.config.mode = mode;
    await this.saveConfig();
  }

  async isOutOfTheBox(): Promise<boolean> {
    await this.ensureInitialized();
    return this.config.mode === 'out-of-the-box';
  }

  async getAPIKey(provider: string): Promise<string | null> {
    await this.ensureInitialized();
    const keyConfig = this.config.apiKeys[provider];
    return keyConfig?.enabled ? keyConfig.key : null;
  }

  async setAPIKey(provider: string, key: string, endpoint?: string, model?: string): Promise<void> {
    await this.ensureInitialized();
    this.config.apiKeys[provider] = {
      provider,
      key,
      endpoint,
      model,
      enabled: true,
      addedAt: Date.now(),
    };
    this.config.mode = 'custom';
    await this.saveConfig();
  }

  async removeAPIKey(provider: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.config.apiKeys[provider]) {
      delete this.config.apiKeys[provider];
      await this.saveConfig();
      return true;
    }
    return false;
  }

  async getEnabledProviders(): Promise<string[]> {
    await this.ensureInitialized();
    return Object.entries(this.config.apiKeys)
      .filter(([_, config]) => config.enabled)
      .map(([provider]) => provider);
  }

  async isProviderEnabled(provider: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.config.apiKeys[provider]?.enabled ?? false;
  }

  async getFeatureState(featureId: string): Promise<boolean> {
    await this.ensureInitialized();
    if (featureId in this.config.features) {
      return this.config.features[featureId];
    }
    return DEFAULT_OUT_OF_THE_BOX_CONFIG.features[featureId] ?? false;
  }

  async setFeatureState(featureId: string, enabled: boolean): Promise<void> {
    await this.ensureInitialized();
    this.config.features[featureId] = enabled;
    this.config.mode = 'custom';
    await this.saveConfig();
  }

  async getFeatures(): Promise<Record<string, boolean>> {
    await this.ensureInitialized();
    return { ...this.config.features };
  }

  async getSettings(): Promise<AppSettings> {
    await this.ensureInitialized();
    return { ...this.config.settings };
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    await this.ensureInitialized();
    this.config.settings = { ...this.config.settings, ...settings };
    await this.saveConfig();
  }

  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    await this.ensureInitialized();
    return this.config.settings[key];
  }

  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.ensureInitialized();
    this.config.settings[key] = value;
    await this.saveConfig();
  }

  async resetToDefaults(): Promise<void> {
    await this.ensureInitialized();
    this.config = { ...DEFAULT_OUT_OF_THE_BOX_CONFIG };
    await this.saveConfig();
  }

  async resetToOutOfTheBox(): Promise<void> {
    await this.ensureInitialized();
    this.config = {
      ...DEFAULT_OUT_OF_THE_BOX_CONFIG,
      apiKeys: this.config.apiKeys,
    };
    await this.saveConfig();
  }

  exportConfig(): string {
    const exportObj = {
      ...this.config,
      exportedAt: Date.now(),
    };
    return JSON.stringify(exportObj, null, 2);
  }

  async importConfig(configJson: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const imported = JSON.parse(configJson);
      this.config = {
        ...DEFAULT_OUT_OF_THE_BOX_CONFIG,
        ...imported,
        mode: 'custom',
      };
      await this.saveConfig();
      return true;
    } catch (error) {
      console.error('[ConfigManager] Error importing config:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    await this.ensureInitialized();
    const models: string[] = [];
    
    // Check which Ollama models are actually available
    if (this.config.features['ollama']) {
      try {
        const { getOllamaModels } = await import('@/lib/models/sdk.server');
        const ollamaModels = await getOllamaModels();
        const availableOllamaModels = ollamaModels.map(m => `ollama/${m.name}`);
        
        // Add available models, with fallback defaults if none found
        if (availableOllamaModels.length > 0) {
          models.push(...availableOllamaModels);
        } else {
          // Fallback defaults - prioritize lightweight CPU-friendly models
          console.log('[ConfigManager] No Ollama models found, using defaults');
          models.push(
            'ollama/qwen3.5:2b',  // Ultra-lightweight, CPU-friendly, near GPT-4 mini performance
            'ollama/llama3.2',     // Reliable fallback
            'ollama/qwen2.5:14b', // Good coding model
            'ollama/deepseek-r1'   // Reasoning model
          );
        }
      } catch (error) {
        console.log('[ConfigManager] Could not fetch Ollama models:', error);
        // Fallback to defaults - prioritize lightweight CPU-friendly models
        models.push(
          'ollama/qwen3.5:2b',  // Ultra-lightweight, CPU-friendly, near GPT-4 mini performance
          'ollama/llama3.2',     // Reliable fallback
          'ollama/qwen2.5:14b', // Good coding model
          'ollama/deepseek-r1'   // Reasoning model
        );
      }
    }
    if (this.config.features['glm']) {
      models.push('glm-4.7-flash');
    }
    if (this.config.apiKeys['openrouter']?.enabled && this.config.features['openrouter']) {
      models.push('openrouter/gpt-4o-mini', 'openrouter/gpt-4o');
    }
    if (this.config.apiKeys['deepseek']?.enabled && this.config.features['deepseek']) {
      models.push('deepseek/deepseek-chat');
    }

    return models;
  }
}

// Export both instance and async getter
export const configManager = ConfigManager.getInstance();

// Helper for syncing with environment variables
export async function syncApiKeysToEnv(): Promise<void> {
  const openRouterKey = await configManager.getAPIKey('openrouter');
  if (openRouterKey && !process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = openRouterKey;
  }
  
  const deepSeekKey = await configManager.getAPIKey('deepseek');
  if (deepSeekKey && !process.env.DEEPSEEK_API_KEY) {
    process.env.DEEPSEEK_API_KEY = deepSeekKey;
  }
  
  const glmKey = await configManager.getAPIKey('glm');
  if (glmKey && !process.env.GLM_API_KEY) {
    process.env.GLM_API_KEY = glmKey;
  }
}