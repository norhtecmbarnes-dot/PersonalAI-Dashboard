'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function OnlyOfficeConfigPage() {
  const [aiUrl, setAiUrl] = useState('');
  const [model, setModel] = useState('glm-4.7-flash');
  const [models, setModels] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load models
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.allModels) {
          setModels(data.allModels.map((m: any) => m.id || m.name));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Set default URL based on current host
    if (typeof window !== 'undefined') {
      setAiUrl(`${window.location.origin}/api/onlyoffice/ai`);
    }
  }, []);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/onlyoffice/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say "Connection successful!"' }],
          model: model,
          stream: false,
        }),
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message?.content) {
        setTestResult(`✅ Success: ${data.choices[0].message.content}`);
      } else {
        setTestResult(`❌ Error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">ONLYOFFICE AI Plugin Setup</h1>
            <p className="text-slate-400 mt-1">Configure AI Dashboard as an AI provider for ONLYOFFICE</p>
          </div>
          <Link href="/office" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
            ← Back to Office
          </Link>
        </div>

        {/* How It Works */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
          <div className="space-y-4 text-slate-300">
            <p>
              The ONLYOFFICE AI plugin (v3.0+) supports <strong className="text-white">custom AI providers</strong>.
              You can connect AI Dashboard as the AI backend, giving ONLYOFFICE users access to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>AI chat inside documents</li>
              <li>Text generation and completion</li>
              <li>Summarization of selected text</li>
              <li>Translation to any language</li>
              <li>Grammar and spelling correction</li>
              <li>Content rewriting</li>
            </ul>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Plugin Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2">AI Endpoint URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiUrl}
                  onChange={(e) => setAiUrl(e.target.value)}
                  className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
                  readOnly
                />
                <button
                  onClick={() => copyToClipboard(aiUrl)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Copy
                </button>
              </div>
              <p className="text-slate-500 text-sm mt-1">
                Use this URL in ONLYOFFICE AI Plugin settings as a custom provider
              </p>
            </div>

            <div>
              <label className="block text-slate-300 mb-2">AI Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
              >
                <option value="glm-4.7-flash">GLM-4.7 Flash (Fast)</option>
                <option value="glm-5:cloud">GLM-5 Cloud (Powerful)</option>
                {models.filter(m => m.includes('qwen')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={testConnection}
                disabled={testing}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                <pre className="text-sm text-white whitespace-pre-wrap">{testResult}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Setup Instructions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-purple-300 mb-2">Option 1: ONLYOFFICE Desktop</h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Install ONLYOFFICE Desktop Editors</li>
                <li>Go to <strong className="text-white">Plugins → Plugin Manager</strong></li>
                <li>Find and install the <strong className="text-white">AI</strong> plugin</li>
                <li>Open <strong className="text-white">Plugins → AI → Settings</strong></li>
                <li>Click <strong className="text-white">Add Custom Provider</strong></li>
                <li>Enter the URL above and select your model</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium text-purple-300 mb-2">Option 2: ONLYOFFICE Docs (Server)</h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Deploy ONLYOFFICE Document Server (Docker)</li>
                <li>Install the AI plugin from the marketplace</li>
                <li>Edit <strong className="text-white">/etc/onlyoffice/documentserver/local.json</strong></li>
                <li>Add custom provider configuration:</li>
              </ol>
              <pre className="mt-3 bg-slate-900 p-4 rounded-lg text-sm text-green-400 overflow-x-auto">
{`{
  "ai": {
    "providers": [
      {
        "name": "AI Dashboard",
        "url": "${aiUrl || 'http://your-server:3000/api/onlyoffice/ai'}",
        "models": ["glm-4.7-flash", "glm-5:cloud", "qwen3.5:9b"]
      }
    ]
  }
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-purple-300 mb-2">Option 3: Plugin Configuration File</h3>
              <p className="text-slate-300 mb-2">
                Create a custom provider configuration:
              </p>
              <pre className="bg-slate-900 p-4 rounded-lg text-sm text-green-400 overflow-x-auto">
{`// Add to ONLYOFFICE AI plugin settings
{
  "name": "AI Dashboard",
  "baseUrl": "${aiUrl || 'http://your-server:3000/api/onlyoffice/ai'}",
  "models": [
    { "id": "glm-4.7-flash", "name": "GLM-4.7 Flash" },
    { "id": "qwen3.5:9b", "name": "Qwen 3.5 9B" }
  ],
  "capabilities": ["chat", "completion", "summarization", "translation"]
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Available AI Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '💬', name: 'AI Chat', desc: 'Chat with AI inside documents' },
              { icon: '✍️', name: 'Text Completion', desc: 'Continue writing text' },
              { icon: '📝', name: 'Summarization', desc: 'Summarize selected text' },
              { icon: '🔄', name: 'Rewrite', desc: 'Rewrite in different styles' },
              { icon: '🌐', name: 'Translation', desc: 'Translate to any language' },
              { icon: '✓', name: 'Grammar Check', desc: 'Fix grammar and spelling' },
            ].map((feature) => (
              <div key={feature.name} className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-2xl mb-2">{feature.icon}</div>
                <div className="font-medium text-white">{feature.name}</div>
                <div className="text-sm text-slate-400">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory Integration */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Memory Integration</h2>
          <p className="text-slate-300 mb-4">
            When you use AI through ONLYOFFICE, it automatically has access to your:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
            <li><strong className="text-white">MEMORY.md</strong> - User profile, projects, brands, knowledge</li>
            <li><strong className="text-white">SOUL.md</strong> - AI personality and behavior</li>
            <li><strong className="text-white">Brand Workspace</strong> - Your brand voice and documents</li>
          </ul>
          <Link href="/memory" className="inline-block mt-4 text-purple-400 hover:text-purple-300">
            Manage your memory →
          </Link>
        </div>
      </div>
    </div>
  );
}