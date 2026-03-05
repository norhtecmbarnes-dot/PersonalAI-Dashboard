'use client';

import { useState } from 'react';
import { ServiceModelSelector } from '@/components/ServiceModelSelector';
import { ServiceType, SERVICE_DESCRIPTIONS, resetAllServiceModels } from '@/lib/hooks/useServiceModel';
import { ModelSelector } from '@/components/ModelSelector';
import { useModels } from '@/lib/hooks/useModels';

const SERVICES: ServiceType[] = [
  'chat',
  'brand-workspace',
  'writing',
  'canvas',
  'office',
  'intelligence',
  'forms',
  'documents',
];

export function ModelSettingsPanel() {
  const { setSelectedModel: setDefaultModel, selectedModel: defaultModel } = useModels();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReset = () => {
    resetAllServiceModels();
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
    // Reload page to apply defaults
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Model Configuration</h2>
        <p className="text-slate-400 mb-6">
          Configure which AI model to use for each service. Each service can have its own preferred model
          based on the type of work you do.
        </p>

        {/* Global Default */}
        <div className="mb-8 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <h3 className="text-lg font-semibold text-white mb-2">Global Default Model</h3>
          <p className="text-sm text-slate-400 mb-4">
            This is the fallback model used when no service-specific model is configured.
          </p>
          <ModelSelector
            value={defaultModel}
            onChange={setDefaultModel}
            label="Default Model"
            showHealth={true}
            className="w-full"
          />
        </div>

        {/* Service-Specific Models */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white">Service-Specific Models</h3>
          <p className="text-slate-400 mb-4">
            Customize which model each service uses. Choose smaller models for speed, larger models for quality.
          </p>

          <div className="grid gap-4">
            {SERVICES.map((service) => (
              <ServiceModelSelector
                key={service}
                service={service}
              />
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Reset All to Defaults
          </button>
          
          {showConfirmation && (
            <p className="mt-2 text-green-400 text-sm">
              ✓ All models reset to defaults. Reloading page...
            </p>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-slate-700/50 rounded-lg">
          <h4 className="font-semibold text-white mb-2">💡 Tips</h4>
          <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
            <li><strong>Small models (2B-7B):</strong> Fast responses, good for chat and simple tasks</li>
            <li><strong>Medium models (14B):</strong> Better quality for writing and analysis</li>
            <li><strong>Large models (27B+):</strong> Best quality but slow on CPU
            </li>
            <li>Your selections are automatically saved and persist across sessions</li>
            <li>Each service remembers its own model preference</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ModelSettingsPanel;
