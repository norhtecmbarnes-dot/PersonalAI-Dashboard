/**
 * Page Model Selector Component
 * 
 * A ModelSelector that persists the selected model per-page.
 * Each page can have its own preferred model that gets remembered.
 */

import { ModelSelector } from './ModelSelector';
import { usePageModel } from '@/lib/hooks/usePageModel';

interface PageModelSelectorProps {
  pageId: string;
  label?: string;
  showHealth?: boolean;
  className?: string;
}

export function PageModelSelector({
  pageId,
  label = 'AI Model',
  showHealth = true,
  className = '',
}: PageModelSelectorProps) {
  const { selectedModel, setSelectedModel, models, loading, error, initialized } = usePageModel(pageId);

  // Don't render until initialized to avoid flash of wrong model
  if (!initialized || loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && <label className="text-white font-medium">{label}</label>}
        <div className="w-full bg-slate-700 text-slate-400 border-0 rounded-lg px-4 py-2">
          Loading models...
        </div>
      </div>
    );
  }

  return (
    <ModelSelector
      value={selectedModel}
      onChange={setSelectedModel}
      label={label}
      showHealth={showHealth}
      className={className}
    />
  );
}

export default PageModelSelector;
