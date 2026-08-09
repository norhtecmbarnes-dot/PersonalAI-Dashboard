'use client';

import { useState, useEffect } from 'react';

interface ApiKeys {
  [provider: string]: string; // 'configured' or ''
}

interface CustomTool {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  parameters?: { name: string; type: string; description: string; required: boolean }[];
  responsePath?: string;
  enabled: boolean;
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'api' | 'tools' | 'models' | 'performance'>('api');

  const [keys, setKeys] = useState<Record<string, string>>({
    ollama: '',
    tavily: '',
    brave: '',
    serpapi: '',
    openrouter: '',
    glm: '',
    deepseek: '',
    sam: '',
    openai: '',
    anthropic: '',
    gemini: '',
    groq: '',
    mistral: '',
  });

  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [editingTool, setEditingTool] = useState<Partial<CustomTool> | null>(null);
  const [newParam, setNewParam] = useState({
    name: '',
    type: 'string',
    description: '',
    required: true,
  });

  // Custom API-key providers (user-defined provider name + key, stored in SQLite)
  const [customProviders, setCustomProviders] = useState<string[]>([]);
  const [newProviderName, setNewProviderName] = useState('');

  // BitNet state
  const [bitnetPath, setBitnetPath] = useState('');
  const [bitnetEnabled, setBitnetEnabled] = useState(false);
  const [bitnetModel, setBitnetModel] = useState('bitnet-b1.58-2b');
  const [bitnetStatus, setBitnetStatus] = useState<{
    configured: boolean;
    installed: boolean;
    model: boolean;
    running: boolean;
  } | null>(null);
  const [checkingBitnet, setCheckingBitnet] = useState(false);

  // Task-specific model preferences
  const [taskModels, setTaskModels] = useState({
    local_light: 'ollama/angglam.slim',
    local_write: 'ollama/qwen3.5:9b',
    local_code: 'ollama/qwen3.5:9b',
    cloud_light: 'ollama/kimi-k2.5',
    cloud_write: 'ollama/kimi-k2.5',
    cloud_code: 'ollama/deepseek-coder-v2',
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    loadApiKeys();
    loadCustomTools();
    loadBitnetConfig();
    loadTaskModels();
  }, []);

  const loadBitnetConfig = async () => {
    try {
      const response = await fetch('/api/bitnet');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setBitnetPath(data.config.installPath || '');
          setBitnetEnabled(data.config.enabled || false);
          setBitnetModel(data.config.model || 'bitnet-b1.58-2b');
        }
        if (data.status) {
          setBitnetStatus(data.status);
        }
      }
    } catch (error) {
      console.error('Error loading BitNet config:', error);
    }
  };

  const loadTaskModels = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.modelPreferences?.taskModels) {
          setTaskModels(data.modelPreferences.taskModels);
        }
      }
    } catch (error) {
      console.error('Error loading task models:', error);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.allModels?.map((m: any) => m.id || m.name) || []);
      }
    } catch (error) {
      console.error('Error loading available models:', error);
    }
  };

  const saveTaskModels = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelPreferences: { taskModels },
        }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Task models saved!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save' });
    }
  };

  const checkBitnetInstallation = async () => {
    if (!bitnetPath) return;
    setCheckingBitnet(true);
    try {
      const response = await fetch(
        `/api/bitnet?action=check&path=${encodeURIComponent(bitnetPath)}`
      );
      const data = await response.json();
      setBitnetStatus({
        configured: data.installed || false,
        installed: data.installed || false,
        model: data.model || false,
        running: false,
      });
      if (data.error) {
        setMessage({ type: 'error', text: data.error });
      } else if (data.installed) {
        setMessage({ type: 'success', text: 'BitNet installation found!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to check BitNet installation' });
    } finally {
      setCheckingBitnet(false);
    }
  };

  const saveBitnetConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/bitnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure',
          installPath: bitnetPath,
          model: bitnetModel,
          enabled: bitnetEnabled,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'BitNet configuration saved!' });
        loadBitnetConfig();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save BitNet configuration' });
    } finally {
      setSaving(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      // Load from settings API which stores in the settings table
      const response = await fetch('/api/settings');
      const data = await response.json();
      const keyStatus: Record<string, string> = {};
      const presetIds = new Set<string>();
      const known: string[] = [];
      if (data.apiKeys) {
        for (const keyInfo of data.apiKeys) {
          keyStatus[keyInfo.provider] = keyInfo.hasKey ? 'configured' : '';
          known.push(keyInfo.provider);
        }
      }
      setApiKeys(keyStatus);

      // Custom providers = stored keys that aren't in the preset list.
      const presetSet = new Set(Object.keys(keys));
      const custom = known.filter(p => !presetSet.has(p));
      setCustomProviders(custom);
    } catch (error) {
      console.error('[REDACTED]');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          value: keys[provider as keyof typeof keys],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `${provider} API key saved!` });
        loadApiKeys();
        // Clear the input after saving
        setKeys({ ...keys, [provider]: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  const clearApiKey = async (provider: string) => {
    setSaving(true);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', provider }),
      });
      setMessage({ type: 'success', text: `${provider} API key cleared` });
      loadApiKeys();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear API key' });
    } finally {
      setSaving(false);
    }
  };

  const loadCustomTools = async () => {
    try {
      const response = await fetch('/api/custom-tools');
      const data = await response.json();
      if (data.tools) {
        setCustomTools(data.tools);
      }
    } catch (error) {
      console.error('Error loading custom tools:', error);
    }
  };

  const saveCustomTool = async () => {
    if (!editingTool?.name || !editingTool?.endpoint) {
      setMessage({ type: 'error', text: 'Tool name and endpoint are required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingTool.id ? 'update' : 'create',
          tool: editingTool,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Tool "${editingTool.name}" saved!` });
        setEditingTool(null);
        loadCustomTools();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save tool' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save custom tool' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomTool = async (id: string) => {
    if (!confirm('Delete this tool?')) return;

    try {
      await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      setMessage({ type: 'success', text: 'Tool deleted' });
      loadCustomTools();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete tool' });
    }
  };

  const toggleCustomTool = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id, enabled }),
      });
      loadCustomTools();
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  const addParameter = () => {
    if (!newParam.name) return;
    const params = [...(editingTool?.parameters || []), { ...newParam }];
    setEditingTool({ ...editingTool, parameters: params } as CustomTool);
    setNewParam({ name: '', type: 'string', description: '', required: true });
  };

  const removeParameter = (index: number) => {
    const params = [...(editingTool?.parameters || [])];
    params.splice(index, 1);
    setEditingTool({ ...editingTool, parameters: params } as CustomTool);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-6">
          Configure your AI Assistant's capabilities and integrations.
        </p>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-red-900/50 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'api'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'tools'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Custom Tools
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'models'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Model Settings
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Performance
          </button>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>
            <p className="text-gray-400 text-sm mb-4">
              Keys are stored locally in your database. For local LLMs (Ollama), you don't need
              external API keys.
            </p>

            <div className="space-y-4">
              {[
                // AI Model Providers
                {
                  id: 'ollama',
                  name: 'Ollama Cloud (Web Search)',
                  desc: 'FREE web search with Ollama - get key at ollama.com/settings/keys',
                  category: 'Web Search',
                  highlight: true,
                },
                // AI Model Providers
                {
                  id: 'gemini',
                  name: 'Google Gemini',
                  desc: 'Gemini 2.0 Flash, Pro - get key at aistudio.google.com',
                  category: 'AI Models',
                },
                {
                  id: 'openai',
                  name: 'OpenAI',
                  desc: 'GPT-4o, GPT-4, GPT-3.5 - get key at platform.openai.com',
                  category: 'AI Models',
                },
                {
                  id: 'anthropic',
                  name: 'Anthropic',
                  desc: 'Claude 3.5 Sonnet, Opus - get key at console.anthropic.com',
                  category: 'AI Models',
                },
                {
                  id: 'openrouter',
                  name: 'OpenRouter',
                  desc: 'Access 100+ AI models - get key at openrouter.ai',
                  category: 'AI Models',
                },
                {
                  id: 'glm',
                  name: 'GLM/Zhipu',
                  desc: 'GLM-4, ChatGLM models from Zhipu AI',
                  category: 'AI Models',
                },
                {
                  id: 'deepseek',
                  name: 'DeepSeek',
                  desc: 'DeepSeek V3, R1 models - get key at deepseek.com',
                  category: 'AI Models',
                },
                {
                  id: 'groq',
                  name: 'Groq',
                  desc: 'Ultra-fast inference - get key at console.groq.com',
                  category: 'AI Models',
                },
                {
                  id: 'mistral',
                  name: 'Mistral AI',
                  desc: 'Mistral Large, Medium - get key at console.mistral.ai',
                  category: 'AI Models',
                },
                // Search Providers
                {
                  id: 'tavily',
                  name: 'Tavily (Web Search)',
                  desc: 'Best for web search - get key at tavily.com',
                  category: 'Search',
                },
                {
                  id: 'brave',
                  name: 'Brave Search',
                  desc: 'Alternative search - get key at brave.com/search/api',
                  category: 'Search',
                },
                {
                  id: 'serpapi',
                  name: 'SerpAPI',
                  desc: 'Google search results - get key at serpapi.com',
                  category: 'Search',
                },
                // Government APIs
                {
                  id: 'sam',
                  name: 'SAM.gov',
                  desc: 'Government contracts API - get key at sam.gov',
                  category: 'Government',
                },
                // Writing Tools
                {
                  id: 'linguix',
                  name: 'Linguix',
                  desc: 'Grammar & style checker - get key at linguix.com/api',
                  category: 'Writing',
                  info: 'Linguix is a grammar and style checker similar to Grammarly. Free tier includes 1,000,000 characters/month. Get your free API key at linguix.com/api',
                  link: 'https://linguix.com/api/',
                },
                // Creator Tools — video, voice, and media services
                {
                  id: 'vocallab',
                  name: 'VocalLab',
                  desc: 'TTS for avatar voices - get key at vocallab.ai',
                  category: 'Creator',
                },
                {
                  id: 'elevenlabs',
                  name: 'ElevenLabs',
                  desc: 'High-quality TTS & voice cloning - get key at elevenlabs.io',
                  category: 'Creator',
                },
                {
                  id: 'heygen',
                  name: 'HeyGen',
                  desc: 'Cloud avatar lip-sync - get key at heygen.com',
                  category: 'Creator',
                },
                {
                  id: 'runway',
                  name: 'Runway',
                  desc: 'Runway ML video generation - get key at runwayml.com/api',
                  category: 'Creator',
                },
                {
                  id: 'pika',
                  name: 'Pika',
                  desc: 'Pika Labs video generation - get key at pika.art',
                  category: 'Creator',
                },
                {
                  id: 'replicate',
                  name: 'Replicate',
                  desc: 'Run open-source models - get key at replicate.com',
                  category: 'Creator',
                },
                {
                  id: 'fal',
                  name: 'fal.ai',
                  desc: 'Fast inference for media models - get key at fal.ai/dashboard/keys',
                  category: 'Creator',
                },
                {
                  id: 'together',
                  name: 'Together AI',
                  desc: 'Open models API - get key at api.together.xyz',
                  category: 'Creator',
                },
                {
                  id: 'perplexity',
                  name: 'Perplexity',
                  desc: 'Search-augmented LLM - get key at perplexity.ai/settings/api',
                  category: 'Creator',
                },
                {
                  id: 'cohere',
                  name: 'Cohere',
                  desc: 'Command models & embeddings - get key at dashboard.cohere.com',
                  category: 'Creator',
                },
              ].map(provider => (
                <div
                  key={provider.id}
                  className={`bg-gray-900 rounded p-4 ${provider.highlight ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-medium">
                      {provider.name}
                      {provider.highlight && (
                        <span className="ml-2 text-xs text-purple-400">
                          (Recommended for Web Search)
                        </span>
                      )}
                    </label>
                    {apiKeys[provider.id] === 'configured' && (
                      <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                        ● Configured
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-2">{provider.desc}</p>
                  {provider.info && (
                    <p className="text-gray-400 text-xs mb-2 flex items-center gap-2">
                      <span>ℹ️</span>
                      <span>{provider.info}</span>
                      {provider.link && (
                        <a
                          href={provider.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Learn more
                        </a>
                      )}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keys[provider.id] || ''}
                      onChange={e => setKeys({ ...keys, [provider.id]: e.target.value })}
                      placeholder={
                        apiKeys[provider.id] === 'configured'
                          ? 'Enter new key to update...'
                          : 'Enter API key...'
                      }
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    />
                    <button
                      onClick={() => saveApiKey(provider.id)}
                      disabled={saving || !keys[provider.id]}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded"
                    >
                      Save
                    </button>
                    {apiKeys[provider.id] === 'configured' && (
                      <button
                        onClick={() => clearApiKey(provider.id)}
                        className="px-4 py-2 bg-red-600/50 hover:bg-red-600 text-red-200 hover:text-white rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Providers — let creators add their own API services */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">Custom Providers</h3>
              <p className="text-gray-400 text-sm mb-4">
                Add an API key for any service not listed above. Use a lowercase identifier
                (e.g., <code className="bg-gray-900 px-1 rounded">my_service</code>) — services in
                the dashboard can read this key through the shared key resolver.
              </p>

              {customProviders.length > 0 && (
                <div className="space-y-3 mb-4">
                  {customProviders.map(provider => (
                    <div
                      key={provider}
                      className="flex items-center justify-between bg-gray-900 rounded p-3"
                    >
                      <div>
                        <span className="text-white font-medium">{provider}</span>
                        {apiKeys[provider] === 'configured' && (
                          <span className="ml-2 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                            ● Configured
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={keys[provider] || ''}
                          onChange={e => setKeys({ ...keys, [provider]: e.target.value })}
                          placeholder="Enter new key to update..."
                          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <button
                          onClick={() => saveApiKey(provider)}
                          disabled={saving || !keys[provider]}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => clearApiKey(provider)}
                          className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-red-200 hover:text-white rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProviderName}
                  onChange={e => setNewProviderName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newProviderName && !saving) {
                      setKeys({ ...keys, [newProviderName]: '' });
                      setCustomProviders([...customProviders, newProviderName]);
                      setNewProviderName('');
                    }
                  }}
                  placeholder="provider_name (lowercase, underscores ok)"
                  className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                />
                <button
                  onClick={() => {
                    if (!newProviderName) return;
                    if (customProviders.includes(newProviderName) || keys[newProviderName] !== undefined) {
                      setMessage({ type: 'error', text: 'That provider already exists' });
                      return;
                    }
                    setKeys({ ...keys, [newProviderName]: '' });
                    setCustomProviders([...customProviders, newProviderName]);
                    setNewProviderName('');
                  }}
                  disabled={!newProviderName}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded"
                >
                  + Add Provider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Custom Tools</h2>
                <button
                  onClick={() =>
                    setEditingTool({
                      name: '',
                      endpoint: '',
                      method: 'POST',
                      enabled: true,
                      parameters: [],
                    })
                  }
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                >
                  + Add Tool
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Add custom APIs that the AI can call. For local APIs, use http://localhost:PORT or
                http://127.0.0.1:PORT
              </p>

              {/* Tool List */}
              {customTools.length > 0 ? (
                <div className="space-y-2">
                  {customTools.map(tool => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between bg-gray-900 rounded p-3"
                    >
                      <div>
                        <span className="text-white font-medium">{tool.name}</span>
                        <span className="text-gray-500 ml-2">
                          {tool.method} {tool.endpoint}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCustomTool(tool.id, !tool.enabled)}
                          className={`px-3 py-1 rounded text-sm ${
                            tool.enabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {tool.enabled ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => setEditingTool(tool)}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCustomTool(tool.id)}
                          className="px-3 py-1 bg-red-600/50 text-red-300 rounded text-sm hover:bg-red-600 hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No custom tools configured yet.</p>
              )}
            </div>

            {/* Tool Editor */}
            {editingTool && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingTool.id ? 'Edit Tool' : 'New Tool'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-1">Tool Name *</label>
                    <input
                      type="text"
                      value={editingTool.name || ''}
                      onChange={e => setEditingTool({ ...editingTool, name: e.target.value })}
                      placeholder="e.g., local_api, data_fetcher"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      Use lowercase with underscores. The AI will use this name to call the tool.
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={editingTool.description || ''}
                      onChange={e =>
                        setEditingTool({ ...editingTool, description: e.target.value })
                      }
                      placeholder="What does this tool do?"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Endpoint URL *</label>
                      <input
                        type="text"
                        value={editingTool.endpoint || ''}
                        onChange={e => setEditingTool({ ...editingTool, endpoint: e.target.value })}
                        placeholder="http://localhost:3000/api/endpoint"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Method</label>
                      <select
                        value={editingTool.method || 'POST'}
                        onChange={e => setEditingTool({ ...editingTool, method: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Headers (JSON)</label>
                    <textarea
                      value={
                        editingTool.headers ? JSON.stringify(editingTool.headers, null, 2) : ''
                      }
                      onChange={e => {
                        try {
                          const headers = e.target.value ? JSON.parse(e.target.value) : undefined;
                          setEditingTool({ ...editingTool, headers });
                        } catch {}
                      }}
                      placeholder='{"Authorization": "Bearer token"}'
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Body Template (for POST/PUT)</label>
                    <textarea
                      value={editingTool.bodyTemplate || ''}
                      onChange={e =>
                        setEditingTool({ ...editingTool, bodyTemplate: e.target.value })
                      }
                      placeholder='{"query": "{{query}}", "limit": {{limit}}}'
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                      rows={3}
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      Use {'{{param}'} to insert parameter values
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Response Path (optional)</label>
                    <input
                      type="text"
                      value={editingTool.responsePath || ''}
                      onChange={e =>
                        setEditingTool({ ...editingTool, responsePath: e.target.value })
                      }
                      placeholder="data.results"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      Dot-separated path to extract from response (e.g., data.results)
                    </p>
                  </div>

                  {/* Parameters */}
                  <div>
                    <label className="block text-gray-300 mb-2">Parameters</label>
                    {editingTool.parameters && editingTool.parameters.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {editingTool.parameters.map((param, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-gray-900 rounded p-2"
                          >
                            <span className="text-white">{param.name}</span>
                            <span className="text-gray-500">({param.type})</span>
                            <span className="text-gray-600">{param.description}</span>
                            {param.required && (
                              <span className="text-red-400 text-xs">required</span>
                            )}
                            <button
                              onClick={() => removeParameter(index)}
                              className="ml-auto text-red-400 hover:text-red-300"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newParam.name}
                        onChange={e => setNewParam({ ...newParam, name: e.target.value })}
                        placeholder="Parameter name"
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      />
                      <select
                        value={newParam.type}
                        onChange={e => setNewParam({ ...newParam, type: e.target.value })}
                        className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="object">object</option>
                      </select>
                      <input
                        type="text"
                        value={newParam.description}
                        onChange={e => setNewParam({ ...newParam, description: e.target.value })}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      />
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={newParam.required}
                          onChange={e => setNewParam({ ...newParam, required: e.target.checked })}
                          className="rounded"
                        />
                        Req
                      </label>
                      <button
                        onClick={addParameter}
                        className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={saveCustomTool}
                      disabled={saving || !editingTool.name || !editingTool.endpoint}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
                    >
                      {saving ? 'Saving...' : 'Save Tool'}
                    </button>
                    <button
                      onClick={() => setEditingTool(null)}
                      className="px-6 py-2 bg-gray-700 text-gray-300 rounded hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Model Settings Tab */}
        {activeTab === 'models' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Model Settings</h2>
            <p className="text-gray-400 text-sm mb-4">
              Configure default model behavior. For local LLMs, no API keys are needed.
            </p>

            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Local Models (Ollama)</h3>
              <p className="text-gray-400 text-sm">
                Local models are served by Ollama at http://localhost:11434. Make sure Ollama is
                running and your models are pulled.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Example commands:{' '}
                <code className="bg-gray-800 px-2 py-1 rounded">ollama pull glm-4.7-flash</code> or{' '}
                <code className="bg-gray-800 px-2 py-1 rounded">ollama pull llava</code>
              </p>
            </div>

            <div className="mt-4 bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Vision Models for OCR</h3>
              <p className="text-gray-400 text-sm mb-2">
                For image processing, install a vision-capable model:
              </p>
              <ul className="text-gray-400 text-sm list-disc list-inside">
                <li>
                  <code className="bg-gray-800 px-1 rounded">llava</code> - General vision model
                </li>
                <li>
                  <code className="bg-gray-800 px-1 rounded">qwen2-vl</code> - Qwen vision model
                </li>
                <li>
                  <code className="bg-gray-800 px-1 rounded">moondream</code> - Fast vision model
                </li>
              </ul>
            </div>

            {/* Task-Specific Model Settings */}
            <div className="mt-4 bg-gray-900 rounded-lg p-4 border border-green-500/30">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="text-green-400">🎯</span>
                Task-Specific Model Selection
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Configure default models for different task types. Ollama handles local models,
                cloud models use your API keys.
              </p>

              <div className="space-y-4">
                {/* Local Light */}
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-gray-300 text-sm">Local Light</span>
                    <p className="text-gray-500 text-xs">Routine tasks</p>
                  </div>
                  <select
                    value={taskModels.local_light}
                    onChange={e => setTaskModels({ ...taskModels, local_light: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="ollama/angglam.slim">angglam.slim (CPU-friendly)</option>
                    <option value="ollama/qwen3.5:2b">qwen3.5:2b</option>
                    <option value="ollama/llama3.2:3b">llama3.2:3b</option>
                  </select>
                </div>

                {/* Local Write */}
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-gray-300 text-sm">Local Write</span>
                    <p className="text-gray-500 text-xs">Writing tasks</p>
                  </div>
                  <select
                    value={taskModels.local_write}
                    onChange={e => setTaskModels({ ...taskModels, local_write: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="ollama/qwen3.5:9b">qwen3.5:9b</option>
                    <option value="ollama/qwen3.5:27b">qwen3.5:27b</option>
                    <option value="ollama/llama3.1:8b">llama3.1:8b</option>
                  </select>
                </div>

                {/* Local Code */}
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-gray-300 text-sm">Local Code</span>
                    <p className="text-gray-500 text-xs">Code tasks</p>
                  </div>
                  <select
                    value={taskModels.local_code}
                    onChange={e => setTaskModels({ ...taskModels, local_code: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="ollama/qwen3.5:9b">qwen3.5:9b</option>
                    <option value="ollama/deepseek-coder-v2">deepseek-coder-v2</option>
                    <option value="ollama/codellama">codellama</option>
                  </select>
                </div>

                <hr className="border-gray-700" />

                {/* Cloud Light */}
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-gray-300 text-sm">Cloud Light</span>
                    <p className="text-gray-500 text-xs">Quick cloud tasks</p>
                  </div>
                  <select
                    value={taskModels.cloud_light}
                    onChange={e => setTaskModels({ ...taskModels, cloud_light: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="ollama/kimi-k2.5">kimi-k2.5 (Free)</option>
                    <option value="ollama/glm-4.7-flash">glm-4.7-flash (Free)</option>
                    <option value="openai/gpt-4o-mini">GPT-4o mini (API key)</option>
                  </select>
                </div>

                {/* Cloud Write */}
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-gray-300 text-sm">Cloud Write</span>
                    <p className="text-gray-500 text-xs">Writing tasks</p>
                  </div>
                  <select
                    value={taskModels.cloud_write}
                    onChange={e => setTaskModels({ ...taskModels, cloud_write: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="ollama/kimi-k2.5">kimi-k2.5 (Free)</option>
                    <option value="ollama/glm-5">glm-5 (Free)</option>
                    <option value="openai/gpt-4o">GPT-4o (API key)</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 (API key)</option>
                  </select>
                </div>

                {/* Cloud Code */}
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="text-gray-300 text-sm">Cloud Code</span>
                    <p className="text-gray-500 text-xs">Code tasks</p>
                  </div>
                  <select
                    value={taskModels.cloud_code}
                    onChange={e => setTaskModels({ ...taskModels, cloud_code: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="ollama/deepseek-coder-v2">deepseek-coder-v2 (Free)</option>
                    <option value="openai/gpt-4o">GPT-4o (API key)</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 (API key)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={saveTaskModels}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                Save Task Models
              </button>
            </div>

            <div className="mt-6 bg-gray-900 rounded-lg p-4 border border-purple-500/30">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <span className="text-purple-400">⚡</span>
                BitNet - CPU-Optimized 1.58-bit Models
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Run AI models on CPU without a GPU. BitNet uses 1.58-bit quantization for efficient
                inference. Perfect for machines without dedicated graphics cards.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bitnet-enabled"
                    checked={bitnetEnabled}
                    onChange={e => setBitnetEnabled(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="bitnet-enabled" className="text-gray-300">
                    Enable BitNet as fallback for CPU-only systems
                  </label>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 text-sm">
                    BitNet Installation Path
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bitnetPath}
                      onChange={e => setBitnetPath(e.target.value)}
                      placeholder="C:\path\to\BitNet or /home/user/BitNet"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                    <button
                      onClick={checkBitnetInstallation}
                      disabled={checkingBitnet || !bitnetPath}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded"
                    >
                      {checkingBitnet ? 'Checking...' : 'Check'}
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Path to BitNet directory (clone from github.com/microsoft/BitNet)
                  </p>
                </div>

                {bitnetStatus && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded ${bitnetStatus.installed ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
                    >
                      {bitnetStatus.installed ? '✓ Installed' : '✗ Not Found'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded ${bitnetStatus.model ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}
                    >
                      {bitnetStatus.model ? '✓ Model Ready' : '○ Model Not Downloaded'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-gray-300 mb-1 text-sm">Model Selection</label>
                  <select
                    value={bitnetModel}
                    onChange={e => setBitnetModel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="bitnet-b1.58-2b">BitNet b1.58 2B (Recommended)</option>
                    <option value="bitnet-b1.58-large">BitNet Large 0.7B (Fastest)</option>
                    <option value="bitnet-b1.58-3b">BitNet b1.58 3B (Better Quality)</option>
                  </select>
                  <p className="text-gray-500 text-xs mt-1">
                    Larger models = better quality but slower. 2B is recommended for most use cases.
                  </p>
                </div>

                <div className="bg-gray-800 rounded p-3 text-sm">
                  <p className="text-gray-400 mb-2">
                    <strong className="text-white">Setup Instructions:</strong>
                  </p>
                  <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                    <li>
                      Clone:{' '}
                      <code className="bg-gray-900 px-1 rounded">
                        git clone --recursive https://github.com/microsoft/BitNet.git
                      </code>
                    </li>
                    <li>
                      Install:{' '}
                      <code className="bg-gray-900 px-1 rounded">
                        cd BitNet && pip install -r requirements.txt
                      </code>
                    </li>
                    <li>
                      Download model:{' '}
                      <code className="bg-gray-900 px-1 rounded">
                        python setup_env.py -md models/BitNet-b1.58-2B-4T -q i2_s
                      </code>
                    </li>
                    <li>Enter the path to BitNet directory above</li>
                  </ol>
                  <p className="text-gray-500 text-xs mt-2">
                    Requires: Python 3.9+, CMake 3.22+, Clang 18+ (or Visual Studio 2022 on Windows)
                  </p>
                </div>

                <button
                  onClick={saveBitnetConfig}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded"
                >
                  {saving ? 'Saving...' : 'Save BitNet Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Token Optimization</h2>
              <p className="text-gray-400 mb-4">
                Reduce token usage to save costs and improve response speed.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-900 rounded p-4">
                  <h3 className="text-white font-medium mb-2">Current Settings</h3>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Max context tokens: 2048 (reduced from 4096)</li>
                    <li>• Reserved tokens: 256 (reduced from 512)</li>
                    <li>• Memory injection limit: 800 tokens (reduced from 1500)</li>
                    <li>• Conversation history: Last 20 messages (auto-trimmed)</li>
                    <li>• Memory search results: 3 items (reduced from 5)</li>
                  </ul>
                </div>

                <div className="bg-gray-900 rounded p-4">
                  <h3 className="text-white font-medium mb-2">Task Schedule Optimization</h3>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Security scans: Weekly (reduced from every 12 hours)</li>
                    <li>• Self-reflection: Weekly (reduced from daily)</li>
                    <li>• Intelligence reports: Daily (unchanged)</li>
                    <li>• Cache cleanup: Daily (new)</li>
                  </ul>
                </div>

                <div className="bg-green-900/30 border border-green-700 rounded p-4">
                  <h3 className="text-green-400 font-medium mb-2">Benefits</h3>
                  <ul className="text-green-300 text-sm space-y-2">
                    <li>✓ ~50% reduction in token usage</li>
                    <li>✓ Faster response times</li>
                    <li>✓ Lower API costs for cloud models</li>
                    <li>✓ Reduced memory footprint</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Model Routing</h2>
              <p className="text-gray-400 mb-4">
                Smart model selection based on task type to optimize performance and cost.
              </p>

              <div className="space-y-3">
                <div className="bg-gray-900 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Fast Tasks (Local 2B)</span>
                    <span className="text-green-400 text-sm">✓ Active</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Heartbeat, health checks, memory search, quick security scans
                  </p>
                </div>

                <div className="bg-gray-900 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Chat Tasks (Cloud Capable)</span>
                    <span className="text-green-400 text-sm">✓ Active</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    User chat conversations use glm-5:cloud or kimi-k2.5
                  </p>
                </div>

                <div className="bg-gray-900 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Complex Tasks (Cloud Thinking)</span>
                    <span className="text-green-400 text-sm">✓ Active</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Writing assistant, analysis, code generation use large cloud models
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Session Management</h2>
              <p className="text-gray-400 mb-4">
                Background tasks automatically pause during active chat sessions.
              </p>

              <div className="bg-gray-900 rounded p-4">
                <h3 className="text-white font-medium mb-2">Priority System</h3>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li>
                    • <strong className="text-green-400">Critical:</strong> Always run (security
                    alerts)
                  </li>
                  <li>
                    • <strong className="text-blue-400">High:</strong> Run during idle (security
                    scans)
                  </li>
                  <li>
                    • <strong className="text-yellow-400">Normal:</strong> User-initiated tasks
                  </li>
                  <li>
                    • <strong className="text-orange-400">Low:</strong> Pause during active use
                    (research, reflection, cleanup)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Telegram Bot</h2>
          <p className="text-gray-400 mb-4">Configure your Telegram bot for messaging.</p>
          <a
            href="/telegram"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Configure Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
