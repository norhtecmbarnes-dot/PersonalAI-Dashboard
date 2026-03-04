'use client';

import { useState, useEffect } from 'react';

interface Brand {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  voiceProfile?: {
    tone?: string;
    style?: string;
    keyMessages?: string[];
    avoidPhrases?: string[];
    customInstructions?: string;
  };
}

interface BrandVoiceSelectorProps {
  onBrandSelect: (brandId: string | null) => void;
  selectedBrandId: string | null;
}

export function BrandVoiceSelector({ onBrandSelect, selectedBrandId }: BrandVoiceSelectorProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brand-workspace/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
        Loading brands...
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="text-slate-500 text-sm">
        No brands available. Create brands in the Brand Workspace.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">Brand Voice:</span>
        <select
          value={selectedBrandId || ''}
          onChange={(e) => onBrandSelect(e.target.value || null)}
          className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none min-w-[200px]"
        >
          <option value="">No Brand (Generic)</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        
        {selectedBrand && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-purple-400 text-sm hover:text-purple-300 underline"
          >
            {showDetails ? 'Hide Details' : 'View Voice'}
          </button>
        )}
      </div>

      {showDetails && selectedBrand && (
        <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <h4 className="font-medium text-white mb-2">{selectedBrand.name} Voice Profile</h4>
          
          {selectedBrand.description && (
            <p className="text-slate-400 text-sm mb-2">{selectedBrand.description}</p>
          )}
          
          <div className="space-y-2 text-sm">
            {selectedBrand.voiceProfile?.tone && (
              <div className="flex gap-2">
                <span className="text-slate-500">Tone:</span>
                <span className="text-slate-300">{selectedBrand.voiceProfile.tone}</span>
              </div>
            )}
            
            {selectedBrand.voiceProfile?.style && (
              <div className="flex gap-2">
                <span className="text-slate-500">Style:</span>
                <span className="text-slate-300">{selectedBrand.voiceProfile.style}</span>
              </div>
            )}
            
            {selectedBrand.voiceProfile?.keyMessages && selectedBrand.voiceProfile.keyMessages.length > 0 && (
              <div>
                <span className="text-slate-500">Key Messages:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBrand.voiceProfile.keyMessages.map((msg, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs">
                      {msg}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedBrand.voiceProfile?.avoidPhrases && selectedBrand.voiceProfile.avoidPhrases.length > 0 && (
              <div>
                <span className="text-slate-500">Avoid:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBrand.voiceProfile.avoidPhrases.map((phrase, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded text-xs">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
