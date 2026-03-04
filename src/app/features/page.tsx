import { FeatureRequestComponent } from '@/components/FeatureRequest';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Feature Request System</h1>
        <p className="text-gray-400 mb-6">
          Describe a feature you want, and OpenCode will help implement it.
        </p>
        
        <div className="bg-gray-800 rounded-lg p-6 h-[600px]">
          <FeatureRequestComponent />
        </div>
      </div>
    </div>
  );
}
