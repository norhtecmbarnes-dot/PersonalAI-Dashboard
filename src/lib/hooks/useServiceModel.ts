import { useState, useEffect, useCallback } from 'react';

export type ServiceType = 
  | 'chat' 
  | 'brand-workspace' 
  | 'writing' 
  | 'canvas' 
  | 'office' 
  | 'intelligence'
  | 'forms'
  | 'documents'
  | 'default';

export interface ServiceModelConfig {
  service: ServiceType;
  modelId: string;
  timestamp: number;
}

const STORAGE_KEY = 'service_model_preferences_v2';

// Default models for each service
export const SERVICE_DEFAULTS: Record<ServiceType, string> = {
  'chat': 'ollama/qwen3.5:2b',
  'brand-workspace': 'ollama/qwen3.5:2b',
  'writing': 'ollama/qwen3.5:9b',
  'canvas': 'ollama/qwen3.5:2b',
  'office': 'ollama/qwen3.5:9b',
  'intelligence': 'ollama/qwen3.5:9b',
  'forms': 'ollama/qwen3.5:2b',
  'documents': 'ollama/qwen3.5:9b',
  'default': 'ollama/qwen3.5:2b',
};

// Service descriptions for settings UI
export const SERVICE_DESCRIPTIONS: Record<ServiceType, { label: string; description: string }> = {
  'chat': { 
    label: 'Chat', 
    description: 'General conversation and Q&A' 
  },
  'brand-workspace': { 
    label: 'Brand Workspace', 
    description: 'Brand voice and document chat' 
  },
  'writing': { 
    label: 'Writing Assistant', 
    description: 'Text expansion and editing' 
  },
  'canvas': { 
    label: 'Canvas Builder', 
    description: 'UI component generation' 
  },
  'office': { 
    label: 'Office AI', 
    description: 'Document and presentation generation' 
  },
  'intelligence': { 
    label: 'Intelligence Reports', 
    description: 'Research and analysis' 
  },
  'forms': { 
    label: 'Form Builder', 
    description: 'Database form creation' 
  },
  'documents': { 
    label: 'Documents', 
    description: 'Document processing and chat' 
  },
  'default': { 
    label: 'Default Model', 
    description: 'Fallback for all services' 
  },
};

export function useServiceModel(service: ServiceType) {
  const [selectedModel, setSelectedModel] = useState<string>(SERVICE_DEFAULTS[service]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const configs: ServiceModelConfig[] = JSON.parse(stored);
        const serviceConfig = configs.find(c => c.service === service);
        if (serviceConfig?.modelId) {
          setSelectedModel(serviceConfig.modelId);
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading service model preference:', err);
      setIsLoading(false);
    }
  }, [service]);

  // Save preference when changed
  const saveModel = useCallback((modelId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const configs: ServiceModelConfig[] = stored ? JSON.parse(stored) : [];
      
      // Update existing or add new
      const existingIndex = configs.findIndex(c => c.service === service);
      const newConfig: ServiceModelConfig = {
        service,
        modelId,
        timestamp: Date.now(),
      };
      
      if (existingIndex >= 0) {
        configs[existingIndex] = newConfig;
      } else {
        configs.push(newConfig);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
      setSelectedModel(modelId);
    } catch (err) {
      console.error('Error saving service model preference:', err);
    }
  }, [service]);

  return {
    selectedModel,
    setSelectedModel: saveModel,
    defaultModel: SERVICE_DEFAULTS[service],
    isLoading,
  };
}

// Get all service model preferences
export function getAllServiceModels(): ServiceModelConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Set model for a specific service (for settings page)
export function setServiceModel(service: ServiceType, modelId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const configs: ServiceModelConfig[] = stored ? JSON.parse(stored) : [];
    
    const existingIndex = configs.findIndex(c => c.service === service);
    const newConfig: ServiceModelConfig = {
      service,
      modelId,
      timestamp: Date.now(),
    };
    
    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Error setting service model:', err);
  }
}

// Reset all service models to defaults
export function resetAllServiceModels(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export default useServiceModel;
