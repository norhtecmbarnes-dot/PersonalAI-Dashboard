import type { Expert } from '@/types/index';

interface ExpertProfileProps {
  expert: Expert;
  onBack: () => void;
}

export function ExpertProfile({ expert, onBack }: ExpertProfileProps) {
  return (
    <div className="expert-profile">
      <div className="profile-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Experts
        </button>
        <div className="expert-info">
          <h1>{expert.name}</h1>
          <h2>{expert.role}</h2>
          <span className={`expert-level ${expert.editable ? 'custom' : 'builtin'}`}>
            {expert.editable ? 'Custom' : 'Built-in'} Expert
          </span>
        </div>
      </div>

      <div className="profile-content">
        <section className="profile-section">
          <h3>Description</h3>
          <p>{expert.description}</p>
        </section>

        <section className="profile-section">
          <h3>Capabilities</h3>
          <ul>
            {expert.capabilities.map(capability => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </section>

        {expert.personality && (
          <section className="profile-section">
            <h3>Personality</h3>
            <p>{expert.personality}</p>
          </section>
        )}
      </div>
    </div>
  );
}