'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  size?: string;
  parameters?: string;
}

interface ModelContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: ModelInfo[];
  ollamaModels: ModelInfo[];
  externalModels: ModelInfo[];
  ollamaHealthy: boolean;
  loading: boolean;
  error: string | null;
  refreshModels: () => Promise<void>;
  initialized: boolean;
}

const ModelContext = createContext<ModelContextType | null>(null);

// Export the context for advanced usage
export { ModelContext };

const STORAGE_KEY = 'globalSelectedModel';
const CLOUD_DEFAULT = 'ollama/glm-5.3:cloud';
const LOCAL_PREFERRED = ['ollama/gemma4:latest', 'ollama/gemma3:27b', 'ollama/ornith-1.5:9b'];

function getFallbackModels(): ModelInfo[] {
  return [
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
      id: 'ollama/glm-4.7-flash',
      name: 'glm-4.7-flash',
      provider: 'ollama',
      description: 'Fast multilingual',
    },
    {
      id: 'ollama/mistral:7b',
      name: 'mistral:7b',
      provider: 'ollama',
      description: '7B - Efficient',
    },
    {
      id: 'ollama/phi3:mini',
      name: 'phi3:mini',
      provider: 'ollama',
      description: 'Microsoft lightweight',
    },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Most capable GPT-4' },
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
      description: 'Fast, efficient',
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
      description: 'Ultra-fast',
    },
  ];
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<string>('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [ollamaModels, setOllamaModels] = useState<ModelInfo[]>([]);
  const [externalModels, setExternalModels] = useState<ModelInfo[]>([]);
  const [ollamaHealthy, setOllamaHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshModels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');

      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.status}`);
      }

      const data = await response.json();

      const ollama = data.ollama?.models || [];
      const processedOllama = ollama.map((m: any) => ({
        id: `ollama/${m.name || m.id}`,
        name: m.name || m.id,
        provider: 'ollama',
        description: m.description || `${m.name || m.id} (local)`,
        size: m.size,
        parameters: m.parameters,
      }));
      setOllamaModels(processedOllama);

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

      const allModels = [...processedOllama, ...processedExternal];

      if (allModels.length === 0) {
        setModels(getFallbackModels());
      } else {
        setModels(allModels);
      }

      setOllamaHealthy(data.ollama?.available || false);
      setError(null);

      // Smart default: user preference > best local > cloud fallback
      if (!selectedModel) {
        // 1. Check stored preference first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && allModels.some((m: ModelInfo) => m.id === stored)) {
          setSelectedModelState(stored);
        } else {
          // 2. Pick best available local model
          const localModels = allModels.filter(m => m.provider === 'ollama' && !m.id.includes(':cloud'));
          let bestLocal: string | null = null;
          for (const preferred of LOCAL_PREFERRED) {
            if (localModels.some(m => m.id === preferred)) {
              bestLocal = preferred;
              break;
            }
          }
          if (!bestLocal && localModels.length > 0) {
            bestLocal = localModels[0].id;
          }

          if (bestLocal) {
            // 3a. Local model available — use it
            setSelectedModelState(bestLocal);
            localStorage.setItem(STORAGE_KEY, bestLocal);
          } else {
            // 3b. No local models — fall back to cloud
            setSelectedModelState(CLOUD_DEFAULT);
            localStorage.setItem(STORAGE_KEY, CLOUD_DEFAULT);
          }
        }
      }

      setInitialized(true);
    } catch (err) {
      console.error('[ModelContext] Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels(getFallbackModels());
      if (!selectedModel) {
        setSelectedModelState(CLOUD_DEFAULT);
      }
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, model);
    }
  }, []);

  // Load persisted model on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedModelState(stored);
    }
    refreshModels();
  }, []);

  // Persist selection whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedModel && initialized) {
      localStorage.setItem(STORAGE_KEY, selectedModel);
    }
  }, [selectedModel, initialized]);

  return (
    <ModelContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        models,
        ollamaModels,
        externalModels,
        ollamaHealthy,
        loading,
        error,
        refreshModels,
        initialized,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

function findBestAvailable(models: ModelInfo[]): string {
  const priority = [
    'llama3.2:latest',
    'qwen3.5:9b',
    'gemma2:9b',
    'llama3.1:8b',
    'glm-4.7-flash',
    'mistral:7b',
    'phi3:mini',
  ];

  for (const p of priority) {
    const found = models.find(
      m => m.name === p || m.id.endsWith(p) || m.id.includes(p.split(':')[0])
    );
    if (found) return found.id;
  }

  return models[0]?.id || CLOUD_DEFAULT;
}

export function useGlobalModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useGlobalModel must be used within ModelProvider');
  }
  return context;
}

export default ModelContext;
