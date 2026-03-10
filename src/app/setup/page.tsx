'use client';

import { useState, useEffect } from 'react';
import { userPreferences } from '@/lib/config/user-preferences';

export default function SetupPage() {
  const [userName, setUserName] = useState('');
  const [assistantName, setAssistantName] = useState('AI Assistant');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup',
          userName,
          assistantName,
        }),
      });

      if (response.ok) {
        // Update local storage preferences
        userPreferences.completeSetup(userName, assistantName);
        // Add delay to ensure database write is committed
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-3xl font-bold text-white">Welcome!</h1>
            <p className="text-gray-400 mt-2">Let's set up your AI Assistant</p>
          </div>

          {step === 1 && (
            <div>
              <div className="mb-6">
                <label className="block text-white mb-2">What's your name?</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!userName.trim()}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <label className="block text-white mb-2">What would you like to name your AI Assistant?</label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="AI Assistant"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-sm mt-2">
                  This is what the AI will call itself
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !assistantName.trim()}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
                >
                  {loading ? 'Setting up...' : 'Get Started'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
