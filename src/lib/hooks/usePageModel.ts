import { useState, useEffect, useCallback } from 'react';
import { useModels, ModelInfo } from './useModels';

export interface PageModelConfig {
  pageId: string;
  modelId: string;
  timestamp: number;
}

const STORAGE_KEY = 'page_model_preferences';

export function usePageModel(pageId: string) {
  const { models, selectedModel: defaultModel, setSelectedModel: setDefaultModel, loading, error } = useModels();
  const [pageModel, setPageModel] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  // Load page-specific model from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const configs: PageModelConfig[] = JSON.parse(stored);
        const pageConfig = configs.find(c => c.pageId === pageId);
        if (pageConfig?.modelId) {
          // Verify the model still exists in available models
          const modelExists = models.some(m => m.id === pageConfig.modelId);
          if (modelExists) {
            setPageModel(pageConfig.modelId);
          } else if (defaultModel) {
            // Fall back to default if stored model not available
            setPageModel(defaultModel);
          }
        } else if (defaultModel) {
          setPageModel(defaultModel);
        }
      } else if (defaultModel) {
        setPageModel(defaultModel);
      }
      setInitialized(true);
    } catch (err) {
      console.error('Error loading page model preference:', err);
      if (defaultModel) setPageModel(defaultModel);
      setInitialized(true);
    }
  }, [pageId, models, defaultModel]);

  // Save page-specific model to localStorage
  const savePageModel = useCallback((modelId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const configs: PageModelConfig[] = stored ? JSON.parse(stored) : [];
      
      // Update existing or add new
      const existingIndex = configs.findIndex(c => c.pageId === pageId);
      const newConfig: PageModelConfig = {
        pageId,
        modelId,
        timestamp: Date.now(),
      };
      
      if (existingIndex >= 0) {
        configs[existingIndex] = newConfig;
      } else {
        configs.push(newConfig);
      }
      
      // Keep only last 50 page configs to avoid storage bloat
      const trimmedConfigs = configs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedConfigs));
      setPageModel(modelId);
      
      // Also update the global default
      setDefaultModel(modelId);
    } catch (err) {
      console.error('Error saving page model preference:', err);
    }
  }, [pageId, setDefaultModel]);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    savePageModel(modelId);
  }, [savePageModel]);

  return {
    models,
    selectedModel: pageModel || defaultModel,
    setSelectedModel: handleModelChange,
    loading,
    error,
    initialized,
  };
}

// Helper function to get all page model preferences
export function getAllPageModelPreferences(): PageModelConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper function to clear all page model preferences
export function clearAllPageModelPreferences(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export default usePageModel;
