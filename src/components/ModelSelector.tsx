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
          
          {/* Local Models */}
          {models.filter(m => m.provider === 'ollama').length > 0 && (
            <optgroup label="Local Models (Ollama)">
              {models
                .filter(m => m.provider === 'ollama')
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.description ? `- ${model.description}` : ''}
                  </option>
                ))}
            </optgroup>
          )}
          
          {/* Cloud Models */}
          {models.filter(m => m.provider !== 'ollama').length > 0 && (
            <optgroup label="Cloud Models">
              {models
                .filter(m => m.provider !== 'ollama')
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.description ? `- ${model.description}` : ''}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      )}
      
      {!loading && models.length === 0 && (
        <p className="text-slate-400 text-sm">No models available. Please check Ollama connection.</p>
      )}
    </div>
  );
}

export default ModelSelector;
