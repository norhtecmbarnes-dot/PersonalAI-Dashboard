/**
 * Model Selector Component
 * Dynamic dropdown for selecting AI models with auto-selection of best available
 */

import { useModels } from '@/lib/hooks/useModels';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  label?: string;
  showHealth?: boolean;
  autoSelectBest?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  label = 'Model',
  showHealth = true,
  autoSelectBest = false,
  className = '',
}: ModelSelectorProps) {
  const { models, ollamaHealthy, loading, error, getCapableModel } = useModels();

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.provider || 'other';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  // Provider display names and order
  const providerInfo: Record<string, { name: string; order: number }> = {
    'ollama': { name: '🖥️ Local Models (Ollama)', order: 1 },
    'gemini': { name: '🔷 Google Gemini', order: 2 },
    'openai': { name: '🟢 OpenAI GPT', order: 3 },
    'anthropic': { name: '🟠 Anthropic Claude', order: 4 },
    'groq': { name: '⚡ Groq (Ultra-Fast)', order: 5 },
    'mistral': { name: '🔵 Mistral', order: 6 },
    'deepseek': { name: '🟣 DeepSeek', order: 7 },
    'glm': { name: '🟡 GLM (Zhipu)', order: 8 },
    'openrouter': { name: '🔀 OpenRouter', order: 9 },
    'other': { name: '📋 Other Models', order: 10 },
  };

  // Auto-select best model if enabled and no value selected
  if (autoSelectBest && !value && models.length > 0) {
    const bestModel = getCapableModel();
    if (bestModel && bestModel !== value) {
      onChange(bestModel);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-white font-medium">{label}</label>
        {showHealth && (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${ollamaHealthy ? 'text-green-400' : 'text-red-400'}`}>
              {ollamaHealthy ? '● Ollama Online' : '● Ollama Offline'}
            </span>
          </div>
        )}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id.split('/').pop()}
                      {model.size ? ` (${model.size})` : ''}
                      {model.description ? ` - ${model.description}` : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      )}
      
      {!loading && models.length === 0 && (
        <p className="text-slate-400 text-sm">No models available. Please check Ollama connection.</p>
      )}
      
      {models.length > 0 && (
        <p className="text-slate-500 text-xs">
          {models.length} model{models.length !== 1 ? 's' : ''} available
          ({models.filter(m => m.provider === 'ollama').length} local, 
          {models.filter(m => m.provider !== 'ollama').length} cloud)
        </p>
      )}
    </div>
  );
}

export default ModelSelector;
