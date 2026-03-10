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
      console.log('[useModels] API response:', { ollamaAvailable: data.ollama?.available, ollamaModels: data.ollama?.models?.length });
      
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
      
      // Process external models - they already have provider prefix in ID
      const external = data.external || [];
      const processedExternal = external.map((m: any) => ({
        id: m.id, // Already has provider prefix from EXTERNAL_MODELS
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
      } else if (!selectedModel && allModels.length === 0) {
        // No models available - this means Ollama is offline and no API keys set
        // The fallback list below will be used
        console.warn('[useModels] No models available - Ollama may be offline and no cloud API keys configured');
      }
      
      setOllamaHealthy(data.ollama?.available || false);
      setError(null);
    } catch (err) {
      console.error('[useModels] Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
      // Fallback models - comprehensive list of commonly available models
      setModels([
        // Local models (Ollama)
        { id: 'ollama/qwen3.5:2b', name: 'qwen3.5:2b', provider: 'ollama', description: '2.3B - Fast, near GPT-4 mini' },
        { id: 'ollama/qwen3.5:7b', name: 'qwen3.5:7b', provider: 'ollama', description: '7B - Excellent performance' },
        { id: 'ollama/qwen3.5:14b', name: 'qwen3.5:14b', provider: 'ollama', description: '14B - More capable reasoning' },
        { id: 'ollama/qwen3.5:32b', name: 'qwen3.5:32b', provider: 'ollama', description: '32B - Highly capable' },
        { id: 'ollama/qwen3.5:9b', name: 'qwen3.5:9b', provider: 'ollama', description: '9B - Fast & capable multimodal' },
        { id: 'ollama/qwen3-coder-next:latest', name: 'qwen3-coder-next', provider: 'ollama', description: '79.7B - Code specialist' },
        { id: 'ollama/llama3.2', name: 'llama3.2', provider: 'ollama', description: '3B - Lightweight fallback' },
        { id: 'ollama/llama3.2:1b', name: 'llama3.2:1b', provider: 'ollama', description: '1B - Ultra lightweight' },
        { id: 'ollama/llama3.1:8b', name: 'llama3.1:8b', provider: 'ollama', description: '8B - Good middle ground' },
        { id: 'ollama/llama3.1:70b', name: 'llama3.1:70b', provider: 'ollama', description: '70B - Very capable (needs GPU)' },
        { id: 'ollama/llama4:scout', name: 'llama4:scout', provider: 'ollama', description: '108.6B - Very capable (needs GPU)' },
        { id: 'ollama/glm-4.7-flash', name: 'glm-4.7-flash', provider: 'ollama', description: '29.9B - Multilingual model' },
        { id: 'ollama/glm-4:9b', name: 'glm-4:9b', provider: 'ollama', description: '9B - Good for general use' },
        { id: 'ollama/gemma2:9b', name: 'gemma2:9b', provider: 'ollama', description: '9B - Great performance' },
        { id: 'ollama/gemma2:27b', name: 'gemma2:27b', provider: 'ollama', description: '27B - Excellent (needs GPU)' },
        { id: 'ollama/mistral:7b', name: 'mistral:7b', provider: 'ollama', description: '7B - Efficient and capable' },
        { id: 'ollama/mistral-nemo:12b', name: 'mistral-nemo:12b', provider: 'ollama', description: '12B - Good reasoning' },
        { id: 'ollama/codellama:7b', name: 'codellama:7b', provider: 'ollama', description: '7B - Code generation' },
        { id: 'ollama/codellama:34b', name: 'codellama:34b', provider: 'ollama', description: '34B - Advanced code (needs GPU)' },
        { id: 'ollama/deepseek-coder:6.7b', name: 'deepseek-coder:6.7b', provider: 'ollama', description: '6.7B - Code specialist' },
        { id: 'ollama/deepseek-r1:7b', name: 'deepseek-r1:7b', provider: 'ollama', description: '7B - Reasoning model' },
        { id: 'ollama/phi3:mini', name: 'phi3:mini', provider: 'ollama', description: '3.8B - Microsoft lightweight' },
        { id: 'ollama/phi3:medium', name: 'phi3:medium', provider: 'ollama', description: '14B - Microsoft medium' },
        
        // Cloud models - Gemini
        { id: 'gemini/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', description: 'Fast, efficient, free tier' },
        { id: 'gemini/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', description: 'Advanced reasoning' },
        { id: 'gemini/gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', description: 'Fast multimodal' },
        
        // Cloud models - OpenAI
        { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Most capable GPT-4' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast and affordable' },
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', description: 'Previous flagship' },
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', description: 'Fast and cheap' },
        
        // Cloud models - Anthropic
        { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', description: 'Latest Claude' },
        { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', description: 'Most powerful Claude' },
        { id: 'anthropic/claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', description: 'Fast and efficient' },
        
        // Cloud models - Groq (ultra-fast)
        { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'groq', description: 'Ultra-fast inference' },
        { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', provider: 'groq', description: 'Fastest inference' },
        { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)', provider: 'groq', description: 'Fast mixture of experts' },
        
        // Cloud models - Mistral
        { id: 'mistral/mistral-large-latest', name: 'Mistral Large', provider: 'mistral', description: 'Flagship Mistral' },
        { id: 'mistral/mistral-medium-latest', name: 'Mistral Medium', provider: 'mistral', description: 'Balanced performance' },
        { id: 'mistral/codestral-latest', name: 'Codestral', provider: 'mistral', description: 'Code generation' },
        
        // Cloud models - DeepSeek
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', description: 'General chat' },
        { id: 'deepseek/deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek', description: 'Advanced reasoning' },
        
        // Cloud models - GLM
        { id: 'glm/glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'glm', description: 'Fast multilingual' },
        { id: 'glm/glm-4-plus', name: 'GLM-4 Plus', provider: 'glm', description: 'Advanced GLM' },
        
        // Cloud models - OpenRouter
        { id: 'openrouter/auto', name: 'OpenRouter Auto', provider: 'openrouter', description: 'Auto-select best' },
      ]);
      setSelectedModel('ollama/qwen3.5:2b');
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  // Find the best available model based on size/capability
  const findBestModel = (modelList: ModelInfo[]): string => {
    // Priority order - prefer qwen3.5:9b for best speed/capability balance
    const priorityModels = [
      'qwen3.5:9b',      // 9B - excellent speed/capability balance
      'qwen3.5:2b',      // 2B - ultra-lightweight
      'qwen3.5:27b',     // 27B - only if nothing else available
      'gemma2:9b',       // 9B - excellent balance
      'llama3.2',        // 3B - lightweight fallback
      'llama3.1:8b',     // 8B - good middle ground
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
