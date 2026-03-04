'use client';

import { useState, useEffect } from 'react';

interface Settings {
  defaultModel: string;
  autoRoute: boolean;
  preferLocal: boolean;
  cloudForChat: boolean;
  searchMode: boolean;
}

interface ApiKeyInfo {
  provider: string;
  hasKey: boolean;
}

interface ModelInfo {
  name: string;
  provider: string;
  size?: number;
}

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    defaultModel: 'glm-4.7-flash',
    autoRoute: true,
    preferLocal: true,
    cloudForChat: false,
    searchMode: false,
  });
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [ollamaHealthy, setOllamaHealthy] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          defaultModel: data.modelPreferences?.defaultModel || 'glm-4.7-flash',
          autoRoute: data.modelPreferences?.autoRoute ?? true,
          preferLocal: data.modelPreferences?.preferLocal ?? true,
          cloudForChat: data.modelPreferences?.cloudForChat ?? false,
          searchMode: data.searchMode ?? false,
        });
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.allModels || []);
        setOllamaHealthy(data.ollama?.available ?? false);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<Settings>) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelPreferences: newSettings }),
      });
      if (response.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSearchMode = async () => {
    const newValue = !settings.searchMode;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchMode: newValue }),
      });
      setSettings(prev => ({ ...prev, searchMode: newValue }));
    } catch (error) {
      console.error('Error toggling search mode:', error);
    }
  };

  const saveApiKey = async (provider: string) => {
    if (!newKeyValue.trim()) return;
    
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, value: newKeyValue }),
      });
      await loadSettings();
      setEditingProvider(null);
      setNewKeyValue('');
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteApiKey = async (provider: string) => {
    if (!confirm(`Remove ${provider} API key?`)) return;
    
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', provider }),
      });
      await loadSettings();
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const providerNames: Record<string, string> = {
    // AI Models
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    openrouter: 'OpenRouter',
    glm: 'GLM (Zhipu)',
    deepseek: 'DeepSeek',
    groq: 'Groq',
    mistral: 'Mistral AI',
    // Search
    tavily: 'Tavily (Web Search)',
    brave: 'Brave Search',
    serpapi: 'SerpAPI',
    // Government
    sam: 'SAM.gov',
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-3 rounded-lg transition-colors bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Model Settings */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Model Preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Default Model</label>
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => saveSettings({ defaultModel: e.target.value })}
                    className="w-full bg-slate-700 text-white border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                  >
                    <optgroup label="Ollama (Local)">
                      {models.filter(m => m.provider === 'ollama').map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Cloud Models">
                      <option value="glm-5:cloud">GLM-5 Cloud</option>
                      <option value="glm-4.7-flash">GLM-4.7 Flash</option>
                      <option value="kimi-k2.5:cloud">Kimi K2.5 Cloud</option>
                    </optgroup>
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-sm ${ollamaHealthy ? 'text-green-400' : 'text-red-400'}`}>
                      {ollamaHealthy ? '● Ollama Online' : '● Ollama Offline'}
                    </span>
                    <span className="text-sm text-gray-500">|</span>
                    <span className="text-sm text-gray-400">{models.length} models available</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white">Auto-route models</label>
                    <p className="text-sm text-gray-400">Automatically select the best model for each task</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ autoRoute: !settings.autoRoute })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      settings.autoRoute ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-300'
                    }`}
                  >
                    {settings.autoRoute ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white">Prefer local models</label>
                    <p className="text-sm text-gray-400">Use Ollama models when available (free)</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ preferLocal: !settings.preferLocal })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      settings.preferLocal ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-300'
                    }`}
                  >
                    {settings.preferLocal ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white">Cloud for chat</label>
                    <p className="text-sm text-gray-400">Use cloud models for interactive chat</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ cloudForChat: !settings.cloudForChat })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      settings.cloudForChat ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-300'
                    }`}
                  >
                    {settings.cloudForChat ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Settings */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Search Mode</h3>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white">Web Search</label>
                  <p className="text-sm text-gray-400">Enable web search for responses (requires API key)</p>
                </div>
                <button
                  onClick={toggleSearchMode}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    settings.searchMode ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-300'
                  }`}
                >
                  {settings.searchMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* API Keys */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">API Keys</h3>
              <p className="text-sm text-gray-400 mb-3">
                Stored securely in your local database. API keys enable external services.
              </p>
              
              <div className="space-y-2">
                {apiKeys.map(key => (
                  <div key={key.provider} className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white">{providerNames[key.provider] || key.provider}</span>
                      {key.hasKey ? (
                        <span className="text-xs text-green-400">● Configured</span>
                      ) : (
                        <span className="text-xs text-gray-500">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {key.hasKey && (
                        <button
                          onClick={() => deleteApiKey(key.provider)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        onClick={() => setEditingProvider(key.provider)}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        {key.hasKey ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </div>
                ))}
                
                {editingProvider && (
                  <div className="bg-slate-700 rounded-lg p-4 mt-2">
                    <label className="block text-sm text-gray-400 mb-2">
                      Enter {providerNames[editingProvider] || editingProvider} API Key
                    </label>
                    <input
                      type="password"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-slate-600 text-white border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => { setEditingProvider(null); setNewKeyValue(''); }}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveApiKey(editingProvider)}
                        disabled={isSaving || !newKeyValue.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}