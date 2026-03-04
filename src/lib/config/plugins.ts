import { Feature } from './features';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  feature: Feature;
  initialize: () => Promise<void> | void;
  cleanup: () => Promise<void> | void;
  getConfig?: () => Record<string, any>;
  setConfig?: (config: Record<string, any>) => void;
}

export interface PluginContext {
  registerRoute: (path: string, handler: any) => void;
  registerComponent: (name: string, component: any) => void;
  getConfig: (key: string) => any;
  setConfig: (key: string, value: any) => void;
  getAPIKey: (provider: string) => string | null;
  isFeatureEnabled: (featureId: string) => boolean;
  onFeatureChange: (callback: (feature: Feature, action: 'enable' | 'disable') => void) => () => void;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;

  private constructor(context: PluginContext) {
    this.context = context;
  }

  static create(context: PluginContext): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager(context);
    }
    return PluginManager.instance;
  }

  static getInstance(): PluginManager | null {
    return PluginManager.instance;
  }

  registerPlugin(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered`);
      return false;
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} registered successfully`);
    return true;
  }

  unregisterPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      plugin.cleanup();
      this.plugins.delete(pluginId);
      return true;
    } catch (error) {
      console.error(`Error cleaning up plugin ${pluginId}:`, error);
      return false;
    }
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.plugins.values()).map(async plugin => {
      try {
        await plugin.initialize();
        console.log(`Plugin ${plugin.id} initialized`);
      } catch (error) {
        console.error(`Error initializing plugin ${plugin.id}:`, error);
      }
    });

    await Promise.all(initPromises);
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.plugins.values()).map(async plugin => {
      try {
        await plugin.cleanup();
      } catch (error) {
        console.error(`Error cleaning up plugin ${plugin.id}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
  }

  getPluginsByFeature(featureId: string): Plugin[] {
    return this.getAllPlugins().filter(p => p.feature.id === featureId);
  }

  isPluginRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }
}

export const createPluginContext = (): PluginContext => {
  return {
    registerRoute: (path: string, handler: any) => {
      console.log(`Route ${path} registered (plugin)`);
    },
    registerComponent: (name: string, component: any) => {
      console.log(`Component ${name} registered (plugin)`);
    },
    getConfig: (key: string) => {
      return null;
    },
    setConfig: (key: string, value: any) => {
      console.log(`Config ${key} set to ${value} (plugin)`);
    },
    getAPIKey: (provider: string) => {
      return null;
    },
    isFeatureEnabled: (featureId: string) => {
      return false;
    },
    onFeatureChange: (callback: (feature: Feature, action: 'enable' | 'disable') => void) => {
      return () => {};
    },
  };
};
