/**
 * Model Selector Component
 * Dynamic dropdown for selecting AI models with auto-selection of best available
 *
 * When value/onChange are provided, uses local state (controlled).
 * When not provided, uses global ModelContext.
 */

'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { useModels } from '@/lib/hooks/useModels';
import { ModelContext, useGlobalModel } from '@/lib/context/ModelContext';

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  label?: string;
  showHealth?: boolean;
  autoSelectBest?: boolean;
  className?: string;
  showRefresh?: boolean;
}

export function ModelSelector({
  value: propValue,
  onChange: propOnChange,
  label = 'Model',
  showHealth = true,
  autoSelectBest = false,
  className = '',
  showRefresh = true,
}: ModelSelectorProps) {
  // Try to use global context
  const globalContext = useContext(ModelContext);
  const isGlobalMode = !propValue && !propOnChange && globalContext;

  const { models, ollamaHealthy, loading, error, getCapableModel, refresh } = useModels();
  const hasAutoSelected = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get current value from props or global context
  const currentValue =
    propValue ?? (isGlobalMode && globalContext ? globalContext.selectedModel : '');
  const handleChange = (modelId: string) => {
    if (propOnChange) {
      propOnChange(modelId);
    } else if (isGlobalMode && globalContext) {
      globalContext.setSelectedModel(modelId);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    if (isGlobalMode && globalContext) {
      await globalContext.refreshModels();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      const provider = model.provider || 'other';
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, typeof models>
  );

  // Provider display names and order
  const providerInfo: Record<string, { name: string; order: number }> = {
    ollama: { name: '🖥️ Local (Ollama)', order: 1 },
    gemini: { name: '☁️ Cloud - Google Gemini', order: 2 },
    openai: { name: '☁️ Cloud - OpenAI GPT', order: 3 },
    anthropic: { name: '☁️ Cloud - Anthropic Claude', order: 4 },
    groq: { name: '☁️ Cloud - Groq', order: 5 },
    mistral: { name: '☁️ Cloud - Mistral', order: 6 },
    deepseek: { name: '☁️ Cloud - DeepSeek', order: 7 },
    glm: { name: '☁️ Cloud - GLM (Zhipu)', order: 8 },
    openrouter: { name: '☁️ Cloud - OpenRouter', order: 9 },
    other: { name: '📋 Other Models', order: 10 },
  };

  // Auto-select best model in useEffect to avoid setState during render
  useEffect(() => {
    if (autoSelectBest && !currentValue && models.length > 0 && !hasAutoSelected.current) {
      const bestModel = getCapableModel();
      if (bestModel && bestModel !== currentValue) {
        hasAutoSelected.current = true;
        handleChange(bestModel);
      }
    }
  }, [autoSelectBest, currentValue, models.length, getCapableModel]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-white font-medium">{label}</label>
        <div className="flex items-center gap-3">
          {showHealth && (
            <span className={`text-sm ${ollamaHealthy ? 'text-green-400' : 'text-red-400'}`}>
              {ollamaHealthy ? '● Ollama Online' : '● Ollama Offline'}
            </span>
          )}
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50"
              title="Refresh models"
            >
              {isRefreshing ? '⟳' : '↻'}
            </button>
          )}
        </div>
      </div>

      {loading && models.length === 0 ? (
        <div className="w-full bg-slate-700 text-slate-400 border-0 rounded-lg px-4 py-2">
          Loading models...
        </div>
      ) : error ? (
        <div className="w-full bg-slate-700 text-red-400 border-0 rounded-lg px-4 py-2">
          {error}
        </div>
      ) : (
        <select
          value={currentValue}
          onChange={e => handleChange(e.target.value)}
          className="w-full bg-slate-700 text-white border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Select a model...</option>

          {/* Group models by provider */}
          {Object.entries(groupedModels)
            .sort(([a], [b]) => (providerInfo[a]?.order || 99) - (providerInfo[b]?.order || 99))
            .map(([provider, providerModels]) => (
              <optgroup key={provider} label={providerInfo[provider]?.name || provider}>
                {providerModels
                  .sort((a, b) => {
                    // Sort by name within provider
                    const nameA = a.name || a.id;
                    const nameB = b.name || b.id;
                    return nameA.localeCompare(nameB);
                  })
                  .slice(0, 15) // Limit to 15 models per provider for dropdown performance
                  .map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id.split('/').pop()}
                      {model.size ? ` (${model.size})` : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      )}

      {!loading && models.length === 0 && (
        <p className="text-slate-400 text-sm">
          No models available. Please check Ollama connection or run the refresh button.
        </p>
      )}

      {models.length > 0 && (
        <p className="text-slate-500 text-xs">
          {models.length} model{models.length !== 1 ? 's' : ''} available (
          {models.filter(m => m.provider === 'ollama').length} local,{' '}
          {models.filter(m => m.provider !== 'ollama').length} cloud)
        </p>
      )}
    </div>
  );
}

export default ModelSelector;
