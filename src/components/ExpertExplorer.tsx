import { useState } from 'react';
import { getDefaultExperts } from '@/lib/storage/experts';
import type { Expert } from '@/types/index';
import { ExpertProfile } from './ExpertProfile';
import { ExpertChat } from './ExpertChat';

export function ExpertExplorer() {
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);

  if (selectedExpert) {
    return (
      <ExpertChat
        expert={selectedExpert}
        onBack={() => setSelectedExpert(null)}
      />
    );
  }

  return (
    <div className="expert-explorer">
      <div className="expert-header">
        <h2>Expert Selector</h2>
        <p>Select an expert to begin consultation</p>
      </div>

      <div className="expert-grid">
        {getDefaultExperts().map((expert) => (
          <div
            key={expert.id}
            className="expert-card"
            onClick={() => setSelectedExpert(expert)}
          >
            <div className="expert-avatar">
              <h3>{expert.name}</h3>
              <span className="expert-specialization">
                {expert.editable ? 'Custom' : 'Built-in'}
              </span>
            </div>
            <div className="expert-info">
              <h4>{expert.role}</h4>
              <p className="expert-description">{expert.description}</p>
            </div>
            <div className="expert-capabilities">
              {expert.capabilities.slice(0, 3).map((capability: string) => (
                <span key={capability} className="expert-tag capability">
                  {capability}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}