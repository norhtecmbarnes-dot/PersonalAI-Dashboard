/**
 * Dynamic Model Hook
 * Fetches available models from the API and provides model selection utilities
 */

import { useState, useEffect, useCallback } from 'react';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  size?: string;
  parameters?: string;
}

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [ollamaModels, setOllamaModels] = useState<ModelInfo[]>([]);
  const [externalModels, setExternalModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [ollamaHealthy, setOllamaHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');
      
      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process Ollama models
      const ollama = data.ollama?.models || [];
      const processedOllama = ollama.map((m: any) => ({
        id: `ollama/${m.name || m.id}`,
        name: m.name || m.id,
        provider: 'ollama',
        description: m.description || `${m.name || m.id} (local model)`,
        size: m.size,
        parameters: m.parameters,
      }));
      setOllamaModels(processedOllama);
      
      // Process external models
      const external = data.external || [];
      const processedExternal = external.map((m: any) => ({
        id: `${m.provider}/${m.name || m.id}`,
        name: m.name || m.id,
        provider: m.provider,
        description: m.description || `${m.name || m.id} (${m.provider})`,
        size: m.size,
        parameters: m.parameters,
      }));
      setExternalModels(processedExternal);
      
      // Combine all models
      const allModels = [...processedOllama, ...processedExternal];
      setModels(allModels);
      
      // Set default model if not already selected
      if (!selectedModel && data.defaultModel) {
        setSelectedModel(data.defaultModel);
      } else if (!selectedModel && allModels.length > 0) {
        // Pick the best available model
        const bestModel = findBestModel(allModels);
        setSelectedModel(bestModel);
      }
      
      setOllamaHealthy(data.ollama?.available || false);
      setError(null);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
      // Fallback models
      setModels([
        { id: 'ollama/llama3.2', name: 'llama3.2', provider: 'ollama', description: 'Default fallback model' },
        { id: 'ollama/qwen2.5-coder', name: 'qwen2.5-coder', provider: 'ollama', description: 'Coding specialist' },
        { id: 'ollama/deepseek-r1', name: 'deepseek-r1', provider: 'ollama', description: 'Reasoning model' },
      ]);
      setSelectedModel('ollama/llama3.2');
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  // Find the best available model based on size/capability
  const findBestModel = (modelList: ModelInfo[]): string => {
    // Priority order for best models - prefer smaller, faster models
    const priorityModels = [
      'qwen3.5:2b',      // Ultra-lightweight, fast, default preference
      'qwen3.5:27b',     // Larger but more capable
      'qwen2.5:14b',
      'llama3.2',
      'llama3.2:3b',
      'glm-5:cloud',
      'kimi-k2.5:cloud',
    ];
    
    // Find the first priority model that's available
    for (const priority of priorityModels) {
      const found = modelList.find(m => 
        m.name === priority || 
        m.id.endsWith(priority) ||
        m.id.includes(priority)
      );
      if (found) {
        return found.id;
      }
    }
    
    // Fallback to first available
    return modelList[0]?.id || 'ollama/llama3.2';
  };

  // Get the most capable model for complex tasks
  const getCapableModel = (): string => {
    // Sort by estimated capability (larger models first)
    const sortedModels = [...models].sort((a, b) => {
      const sizeA = extractModelSize(a.name);
      const sizeB = extractModelSize(b.name);
      return sizeB - sizeA;
    });
    
    return sortedModels[0]?.id || selectedModel || 'ollama/llama3.2';
  };

  // Extract model size in billions from name
  const extractModelSize = (name: string): number => {
    const match = name.match(/(\d+)b/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Known model sizes
    const knownSizes: Record<string, number> = {
      'glm-5:cloud': 50,
      'glm-5': 50,
      'kimi-k2.5:cloud': 20,
      'kimi-k2.5': 20,
    };
    return knownSizes[name] || 7; // Default to 7B
  };

  // Refresh models periodically
  useEffect(() => {
    loadModels();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadModels, 60000);
    return () => clearInterval(interval);
  }, [loadModels]);

  return {
    models,
    ollamaModels,
    externalModels,
    selectedModel,
    setSelectedModel,
    ollamaHealthy,
    loading,
    error,
    loadModels,
    getCapableModel,
    refresh: loadModels,
  };
}

export default useModels;
