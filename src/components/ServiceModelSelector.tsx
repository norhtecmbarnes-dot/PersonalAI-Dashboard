import { useServiceModel, ServiceType, SERVICE_DESCRIPTIONS } from '@/lib/hooks/useServiceModel';
import { ModelSelector } from './ModelSelector';

interface ServiceModelSelectorProps {
  service: ServiceType;
  className?: string;
}

export function ServiceModelSelector({ service, className = '' }: ServiceModelSelectorProps) {
  const { selectedModel, setSelectedModel, defaultModel, isLoading } = useServiceModel(service);
  const description = SERVICE_DESCRIPTIONS[service];

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="w-full bg-slate-700 text-slate-400 rounded-lg px-4 py-2">
          Loading model preference...
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-white font-medium">{description.label}</label>
          <p className="text-sm text-slate-400">{description.description}</p>
        </div>
        {selectedModel !== defaultModel && (
          <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
            Custom
          </span>
        )}
      </div>
      <ModelSelector
        value={selectedModel}
        onChange={setSelectedModel}
        label=""
        showHealth={false}
        className="w-full"
      />
    </div>
  );
}

export default ServiceModelSelector;
