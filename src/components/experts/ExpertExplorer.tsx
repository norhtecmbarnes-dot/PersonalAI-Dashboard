import React from 'react';
import { expertStorage, getDefaultExperts } from '@/lib/storage/experts';
import { Expert } from '@/types/index';

export function ExpertExplorer() {
  const [experts, setExperts] = React.useState<Expert[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadExperts = async () => {
      try {
        // Initialize with default experts if storage is empty
        const storageExperts = expertStorage.getAll();
        if (storageExperts.length === 0) {
          const defaults = getDefaultExperts();
          defaults.forEach(expert => {
            expertStorage.add(expert);
          });
        }
        setExperts(expertStorage.getAll());
      } catch (error) {
        console.error('Failed to load experts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExperts();
  }, []);

  function getExpertTypeClass(editable: boolean) {
    return `expert-specialization ${editable ? 'custom' : 'builtin'}`;
  }

  function renderExpertCard(expert: Expert) {
    return (
      <div key={expert.id} className="expert-card">
        <div className="expert-avatar">
          <h3>{expert.name}</h3>
          <span className={getExpertTypeClass(expert.editable)}>
            {expert.editable ? 'Custom' : 'Built-in'}
          </span>
        </div>
        <div className="expert-info">
          <h4>{expert.role}</h4>
          <p className="expert-description">{expert.description}</p>
        </div>
        <div className="expert-capabilities">
          {expert.capabilities.map((capability, index) => (
            <span key={index} className="expert-tag capability">
              {capability}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading experts...</p>
      </div>
    );
  }

  return (
    <div className="expert-explorer">
      <div className="expert-header">
        <h2>Available Experts</h2>
        <p>Choose from our panel of specialized domain experts to guide your technical discussions and decision-making processes.</p>
      </div>

      <div className="expert-grid">
        {experts.map(renderExpertCard)}
      </div>
    </div>
  );
}