export interface Feature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'ai' | 'storage' | 'integration' | 'utility';
  enabled: boolean;
  required: boolean;
  config?: Record<string, any>;
  dependencies?: string[];
  version: string;
  author: string;
}

export interface FeatureRegistry {
  features: Map<string, Feature>;
  categories: Set<string>;
}

export class FeatureManager {
  private static instance: FeatureManager;
  private features: Map<string, Feature> = new Map();
  private listeners: Set<(feature: Feature, action: 'enable' | 'disable') => void> = new Set();

  private constructor() {
    this.registerDefaultFeatures();
  }

  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  private registerDefaultFeatures(): void {
    const defaultFeatures: Feature[] = [
      {
        id: 'chat',
        name: 'AI Chat',
        description: 'Basic chat interface with AI models',
        category: 'core',
        enabled: true,
        required: true,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'ollama',
        name: 'Ollama Integration',
        description: 'Connect to local Ollama models',
        category: 'ai',
        enabled: true,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'glm',
        name: 'GLM-4.7-flash',
        description: 'Support for GLM-4.7-flash model',
        category: 'ai',
        enabled: true,
        required: false,
        version: '1.0.0',
        author: 'User',
      },
      {
        id: 'document-import',
        name: 'Document Import',
        description: 'Import and store documents',
        category: 'storage',
        enabled: true,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'vector-memory',
        name: 'Vector Memory',
        description: 'Semantic memory using embeddings',
        category: 'storage',
        enabled: true,
        required: false,
        dependencies: ['document-import'],
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'notes',
        name: 'Notes System',
        description: 'Create and manage notes',
        category: 'storage',
        enabled: true,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'experts',
        name: 'Expert Agents',
        description: 'Pre-prompted expert agents',
        category: 'ai',
        enabled: true,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'websearch',
        name: 'Web Search',
        description: 'Research and web search capabilities',
        category: 'integration',
        enabled: false,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access to OpenRouter models',
        category: 'ai',
        enabled: false,
        required: false,
        version: '1.0.0',
        author: 'User',
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'Access to DeepSeek models',
        category: 'ai',
        enabled: false,
        required: false,
        version: '1.0.0',
        author: 'User',
      },
      {
        id: 'self-improvement',
        name: 'Self-Improving Agent',
        description: 'Agent can improve its own code',
        category: 'utility',
        enabled: false,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
      {
        id: 'token-optimization',
        name: 'Token Optimization',
        description: 'Optimize token usage for cost savings',
        category: 'utility',
        enabled: true,
        required: false,
        version: '1.0.0',
        author: 'System',
      },
    ];

    defaultFeatures.forEach(f => this.features.set(f.id, f));
  }

  getFeature(id: string): Feature | undefined {
    return this.features.get(id);
  }

  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  getEnabledFeatures(): Feature[] {
    return this.getAllFeatures().filter(f => f.enabled);
  }

  getFeaturesByCategory(category: string): Feature[] {
    return this.getAllFeatures().filter(f => f.category === category);
  }

  enableFeature(id: string): boolean {
    const feature = this.features.get(id);
    if (!feature) return false;

    if (feature.dependencies) {
      for (const depId of feature.dependencies) {
        const dep = this.features.get(depId);
        if (!dep || !dep.enabled) {
          console.warn(`Cannot enable ${id}: dependency ${depId} not enabled`);
          return false;
        }
      }
    }

    feature.enabled = true;
    this.notifyListeners(feature, 'enable');
    return true;
  }

  disableFeature(id: string): boolean {
    const feature = this.features.get(id);
    if (!feature || feature.required) return false;

    for (const [depId, dep] of Array.from(this.features.entries())) {
      if (dep.enabled && dep.dependencies?.includes(id)) {
        console.warn(`Cannot disable ${id}: ${depId} depends on it`);
        return false;
      }
    }

    feature.enabled = false;
    this.notifyListeners(feature, 'disable');
    return true;
  }

  addFeature(feature: Feature): void {
    this.features.set(feature.id, feature);
  }

  removeFeature(id: string): boolean {
    const feature = this.features.get(id);
    if (!feature || feature.required) return false;
    return this.features.delete(id);
  }

  onChange(listener: (feature: Feature, action: 'enable' | 'disable') => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(feature: Feature, action: 'enable' | 'disable'): void {
    this.listeners.forEach(listener => listener(feature, action));
  }

  toConfig(): Record<string, boolean> {
    const config: Record<string, boolean> = {};
    this.features.forEach((feature, id) => {
      config[id] = feature.enabled;
    });
    return config;
  }

  loadConfig(config: Record<string, boolean>): void {
    Object.entries(config).forEach(([id, enabled]) => {
      const feature = this.features.get(id);
      if (feature) {
        if (enabled && !feature.enabled) {
          this.enableFeature(id);
        } else if (!enabled && feature.enabled) {
          this.disableFeature(id);
        }
      }
    });
  }

  getCategories(): string[] {
    return Array.from(new Set(this.getAllFeatures().map(f => f.category)));
  }

  resetToDefaults(): void {
    this.features.clear();
    this.registerDefaultFeatures();
  }
}

export const featureManager = FeatureManager.getInstance();
