/**
 * Dynamic Model Hook
 * Fetches available models from the API and provides model selection utilities
 *
 * NOTE: For global model selection across the app, use useGlobalModel() from ModelContext.
 * This hook provides local model selection for backward compatibility.
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

  const STORAGE_KEY = 'globalSelectedModel';
  const FALLBACK_MODEL = 'ollama/llama3.2:latest';

  const getFallbackModels = useCallback(
    (): ModelInfo[] => [
      {
        id: 'ollama/llama3.2:latest',
        name: 'llama3.2:latest',
        provider: 'ollama',
        description: '2.3B - Fast, near GPT-4 mini',
      },
      {
        id: 'ollama/llama3.2:3b',
        name: 'llama3.2:3b',
        provider: 'ollama',
        description: '3B - Lightweight',
      },
      {
        id: 'ollama/qwen3.5:7b',
        name: 'qwen3.5:7b',
        provider: 'ollama',
        description: '7B - Excellent performance',
      },
      {
        id: 'ollama/qwen3.5:14b',
        name: 'qwen3.5:14b',
        provider: 'ollama',
        description: '14B - More capable',
      },
      {
        id: 'ollama/qwen3.5:32b',
        name: 'qwen3.5:32b',
        provider: 'ollama',
        description: '32B - Highly capable',
      },
      {
        id: 'ollama/qwen3.5:9b',
        name: 'qwen3.5:9b',
        provider: 'ollama',
        description: '9B - Fast & capable',
      },
      {
        id: 'ollama/glm-4.7-flash',
        name: 'glm-4.7-flash',
        provider: 'ollama',
        description: 'Fast multilingual',
      },
      {
        id: 'ollama/mistral:7b',
        name: 'mistral:7b',
        provider: 'ollama',
        description: '7B - Efficient and capable',
      },
      {
        id: 'ollama/mistral-nemo:12b',
        name: 'mistral-nemo:12b',
        provider: 'ollama',
        description: '12B - Good reasoning',
      },
      {
        id: 'ollama/angelight',
        name: 'angelight',
        provider: 'ollama',
        description: 'Lightweight CPU model',
      },
      {
        id: 'ollama/angglam.slim',
        name: 'angglam.slim',
        provider: 'ollama',
        description: 'CPU-friendly slim model',
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Most capable GPT-4',
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast and affordable',
      },
      {
        id: 'anthropic/claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        description: 'Latest Claude',
      },
      {
        id: 'gemini/gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        description: 'Fast, efficient, free tier',
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        description: 'General chat',
      },
      {
        id: 'groq/llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B (Groq)',
        provider: 'groq',
        description: 'Ultra-fast inference',
      },
    ],
    []
  );

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
        id: m.id,
        name: m.name || m.id,
        provider: m.provider,
        description: m.description || `${m.name || m.id} (${m.provider})`,
        size: m.size,
        parameters: m.parameters,
      }));
      setExternalModels(processedExternal);

      // Combine all models
      const allModels = [...processedOllama, ...processedExternal];

      if (allModels.length === 0) {
        setModels(getFallbackModels());
      } else {
        setModels(allModels);
      }

      // Initialize selected model from storage or default
      if (!selectedModel) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (
          stored &&
          (allModels.some((m: ModelInfo) => m.id === stored) ||
            getFallbackModels().some(m => m.id === stored))
        ) {
          setSelectedModel(stored);
        } else if (data.defaultModel) {
          setSelectedModel(data.defaultModel);
        } else if (allModels.length > 0) {
          const bestModel = findBestModel(allModels);
          setSelectedModel(bestModel);
        } else {
          setSelectedModel(FALLBACK_MODEL);
        }
      }

      setOllamaHealthy(data.ollama?.available || false);
      setError(null);
    } catch (err) {
      console.error('[useModels] Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels(getFallbackModels());
      if (!selectedModel) {
        setSelectedModel(FALLBACK_MODEL);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedModel, getFallbackModels]);

  // Persist selected model
  useEffect(() => {
    if (selectedModel && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, selectedModel);
    }
  }, [selectedModel]);

  const findBestModel = (modelList: ModelInfo[]): string => {
    const priorityModels = [
      'qwen3.5:9b',
      'llama3.2:latest',
      'gemma2:9b',
      'llama3.1:8b',
      'glm-4.7-flash',
      'mistral:7b',
      'phi3:mini',
    ];

    for (const priority of priorityModels) {
      const found = modelList.find(
        m =>
          m.name === priority ||
          m.id.endsWith(priority) ||
          m.id.includes(priority.replace(/:/g, '')) ||
          m.id.includes(priority.split(':')[0])
      );
      if (found) {
        return found.id;
      }
    }

    return modelList[0]?.id || FALLBACK_MODEL;
  };

  const getCapableModel = (): string => {
    const sortedModels = [...models].sort((a, b) => {
      const sizeA = extractModelSize(a.name);
      const sizeB = extractModelSize(b.name);
      return sizeB - sizeA;
    });

    return sortedModels[0]?.id || selectedModel || FALLBACK_MODEL;
  };

  const extractModelSize = (name: string): number => {
    const match = name.match(/(\d+)b/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    const knownSizes: Record<string, number> = {
      'glm-5': 50,
      'glm-4.7-flash': 29,
      'kimi-k2.5': 20,
    };
    return knownSizes[name] || 7;
  };

  // Load models on mount and refresh periodically
  useEffect(() => {
    loadModels();
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
