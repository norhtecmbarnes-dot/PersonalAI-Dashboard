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
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'api' | 'tools' | 'models'>('api');

  const [keys, setKeys] = useState<Record<string, string>>({
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
  const [newParam, setNewParam] = useState({ name: '', type: 'string', description: '', required: true });

  useEffect(() => {
    loadApiKeys();
    loadCustomTools();
  }, []);

  const loadApiKeys = async () => {
    try {
      // Load from settings API which stores in the settings table
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.apiKeys) {
        const keyStatus: Record<string, string> = {};
        for (const keyInfo of data.apiKeys) {
          keyStatus[keyInfo.provider] = keyInfo.hasKey ? 'configured' : '';
        }
        setApiKeys(keyStatus);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
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
          value: keys[provider as keyof typeof keys] 
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
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'api' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'tools' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Custom Tools
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'models' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Model Settings
          </button>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>
            <p className="text-gray-400 text-sm mb-4">
              Keys are stored locally in your database. For local LLMs (Ollama), you don't need external API keys.
            </p>
            
            <div className="space-y-4">
              {[
                // AI Model Providers
                { id: 'gemini', name: 'Google Gemini', desc: 'Gemini 2.0 Flash, Pro - get key at aistudio.google.com', category: 'AI Models' },
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o, GPT-4, GPT-3.5 - get key at platform.openai.com', category: 'AI Models' },
                { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet, Opus - get key at console.anthropic.com', category: 'AI Models' },
                { id: 'openrouter', name: 'OpenRouter', desc: 'Access 100+ AI models - get key at openrouter.ai', category: 'AI Models' },
                { id: 'glm', name: 'GLM/Zhipu', desc: 'GLM-4, ChatGLM models from Zhipu AI', category: 'AI Models' },
                { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek V3, R1 models - get key at deepseek.com', category: 'AI Models' },
                { id: 'groq', name: 'Groq', desc: 'Ultra-fast inference - get key at console.groq.com', category: 'AI Models' },
                { id: 'mistral', name: 'Mistral AI', desc: 'Mistral Large, Medium - get key at console.mistral.ai', category: 'AI Models' },
                // Search Providers
                { id: 'tavily', name: 'Tavily (Web Search)', desc: 'Best for web search - get key at tavily.com', category: 'Search' },
                { id: 'brave', name: 'Brave Search', desc: 'Alternative search - get key at brave.com/search/api', category: 'Search' },
                { id: 'serpapi', name: 'SerpAPI', desc: 'Google search results - get key at serpapi.com', category: 'Search' },
                // Government APIs
                { id: 'sam', name: 'SAM.gov', desc: 'Government contracts API - get key at sam.gov', category: 'Government' },
              ].map((provider) => (
                <div key={provider.id} className="bg-gray-900 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-medium">{provider.name}</label>
                    {apiKeys[provider.id] === 'configured' && (
                      <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">● Configured</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-2">{provider.desc}</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keys[provider.id] || ''}
                      onChange={(e) => setKeys({ ...keys, [provider.id]: e.target.value })}
                      placeholder={apiKeys[provider.id] === 'configured' ? 'Enter new key to update...' : 'Enter API key...'}
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
          </div>
        )}

        {/* Custom Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Custom Tools</h2>
                <button
                  onClick={() => setEditingTool({ name: '', endpoint: '', method: 'POST', enabled: true, parameters: [] })}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                >
                  + Add Tool
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Add custom APIs that the AI can call. For local APIs, use http://localhost:PORT or http://127.0.0.1:PORT
              </p>

              {/* Tool List */}
              {customTools.length > 0 ? (
                <div className="space-y-2">
                  {customTools.map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between bg-gray-900 rounded p-3">
                      <div>
                        <span className="text-white font-medium">{tool.name}</span>
                        <span className="text-gray-500 ml-2">{tool.method} {tool.endpoint}</span>
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
                      onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                      placeholder="e.g., local_api, data_fetcher"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                    <p className="text-gray-500 text-sm mt-1">Use lowercase with underscores. The AI will use this name to call the tool.</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={editingTool.description || ''}
                      onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
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
                        onChange={(e) => setEditingTool({ ...editingTool, endpoint: e.target.value })}
                        placeholder="http://localhost:3000/api/endpoint"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Method</label>
                      <select
                        value={editingTool.method || 'POST'}
                        onChange={(e) => setEditingTool({ ...editingTool, method: e.target.value })}
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
                      value={editingTool.headers ? JSON.stringify(editingTool.headers, null, 2) : ''}
                      onChange={(e) => {
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
                      onChange={(e) => setEditingTool({ ...editingTool, bodyTemplate: e.target.value })}
                      placeholder='{"query": "{{query}}", "limit": {{limit}}}'
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white font-mono text-sm"
                      rows={3}
                    />
                    <p className="text-gray-500 text-sm mt-1">Use {'{{param}'} to insert parameter values</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Response Path (optional)</label>
                    <input
                      type="text"
                      value={editingTool.responsePath || ''}
                      onChange={(e) => setEditingTool({ ...editingTool, responsePath: e.target.value })}
                      placeholder="data.results"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                    <p className="text-gray-500 text-sm mt-1">Dot-separated path to extract from response (e.g., data.results)</p>
                  </div>

                  {/* Parameters */}
                  <div>
                    <label className="block text-gray-300 mb-2">Parameters</label>
                    {editingTool.parameters && editingTool.parameters.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {editingTool.parameters.map((param, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-900 rounded p-2">
                            <span className="text-white">{param.name}</span>
                            <span className="text-gray-500">({param.type})</span>
                            <span className="text-gray-600">{param.description}</span>
                            {param.required && <span className="text-red-400 text-xs">required</span>}
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
                        onChange={(e) => setNewParam({ ...newParam, name: e.target.value })}
                        placeholder="Parameter name"
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      />
                      <select
                        value={newParam.type}
                        onChange={(e) => setNewParam({ ...newParam, type: e.target.value })}
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
                        onChange={(e) => setNewParam({ ...newParam, description: e.target.value })}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      />
                      <label className="flex items-center gap-1 text-gray-300">
                        <input
                          type="checkbox"
                          checked={newParam.required}
                          onChange={(e) => setNewParam({ ...newParam, required: e.target.checked })}
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
                Local models are served by Ollama at http://localhost:11434. Make sure Ollama is running and your models are pulled.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Example commands: <code className="bg-gray-800 px-2 py-1 rounded">ollama pull glm-4.7-flash</code> or <code className="bg-gray-800 px-2 py-1 rounded">ollama pull llava</code>
              </p>
            </div>

            <div className="mt-4 bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Vision Models for OCR</h3>
              <p className="text-gray-400 text-sm mb-2">
                For image processing, install a vision-capable model:
              </p>
              <ul className="text-gray-400 text-sm list-disc list-inside">
                <li><code className="bg-gray-800 px-1 rounded">llava</code> - General vision model</li>
                <li><code className="bg-gray-800 px-1 rounded">qwen2-vl</code> - Qwen vision model</li>
                <li><code className="bg-gray-800 px-1 rounded">moondream</code> - Fast vision model</li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Telegram Bot</h2>
          <p className="text-gray-400 mb-4">
            Configure your Telegram bot for messaging.
          </p>
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
