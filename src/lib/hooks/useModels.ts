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
      // Fallback models - prefer 7-9B range
      setModels([
        { id: 'ollama/qwen2.5:7b', name: 'qwen2.5:7b', provider: 'ollama', description: '7B - good balance of speed and capability' },
        { id: 'ollama/llama3.1:8b', name: 'llama3.1:8b', provider: 'ollama', description: '8B - excellent middle ground' },
        { id: 'ollama/gemma2:9b', name: 'gemma2:9b', provider: 'ollama', description: '9B - great performance' },
        { id: 'ollama/llama3.2', name: 'llama3.2', provider: 'ollama', description: '3B - lightweight fallback' },
      ]);
      setSelectedModel('ollama/qwen2.5:7b');
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  // Find the best available model based on size/capability
  const findBestModel = (modelList: ModelInfo[]): string => {
    // Priority order - prefer 7-9B range for good balance of speed/capability
    const priorityModels = [
      'qwen2.5:7b',      // 7B - good balance, near 9B performance
      'qwen2.5-coder:7b', // 7B coding model
      'gemma2:9b',       // 9B - excellent balance
      'llama3.2',        // 3B - lightweight fallback
      'llama3.1:8b',     // 8B - good middle ground
      'qwen3.5:2b',      // 2B - ultra-lightweight
      'qwen3.5:27b',     // 27B - only if nothing else available
      'glm-5:cloud',
      'kimi-k2.5:cloud',
    ];
    
    // Find the first priority model that's available
    for (const priority of priorityModels) {
      const found = modelList.find(m => 
        m.name === priority || 
        m.id.endsWith(priority) ||
        m.id.includes(priority.replace(/:/g, '')) ||
        m.id.includes(priority.split(':')[0])
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
