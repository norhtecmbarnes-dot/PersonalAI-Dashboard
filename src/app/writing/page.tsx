'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModelSelector } from '@/components/ModelSelector';

interface ActionResult {
  action: string;
  result: string;
  model: string;
}

export default function WritingAssistantPage() {
  const [input, setInput] = useState('');
  const [action, setAction] = useState<'expand' | 'outline' | 'continue' | 'rewrite' | 'simplify' | 'elaborate' | 'structure'>('expand');
  const [style, setStyle] = useState('professional');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved model on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedModel');
      if (saved) setModel(saved);
    }
  }, []);

  const handleModelChange = (modelId: string) => {
    setModel(modelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', modelId);
    }
  };

  const actions = [
    { id: 'expand', name: 'Expand', icon: '📄', desc: 'Add more detail, examples, depth (2-3x longer)' },
    { id: 'outline', name: 'Create Outline', icon: '📋', desc: 'Detailed hierarchical outline' },
    { id: 'continue', name: 'Continue', icon: '✍️', desc: 'Continue writing naturally' },
    { id: 'rewrite', name: 'Rewrite', icon: '🔄', desc: 'Rewrite in a different style' },
    { id: 'simplify', name: 'Simplify', icon: '💡', desc: 'Make easier to understand' },
    { id: 'elaborate', name: 'Elaborate', icon: '📝', desc: 'Add examples and evidence' },
    { id: 'structure', name: 'Structure', icon: '📊', desc: 'Organize with headers and bullets' },
  ] as const;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    // Use Gemma 3 27B by default - excellent for English writing via Ollama Cloud
    const modelToUse = model || 'gemma3:27b';
    console.log('[Writing] Submitting with model:', modelToUse);

    try {
      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: input,
          style: action === 'rewrite' ? style : undefined,
          model: modelToUse,
          stream: false,
        }),
      });

      const data = await response.json();
      console.log('[Writing] Response:', data);

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to process');
      }
    } catch (err) {
      console.error('[Writing] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setLoading(false);
  };

  const copyResult = () => {
    if (result?.result) {
      navigator.clipboard.writeText(result.result);
    }
  };

  const useAsInput = () => {
    if (result?.result) {
      setInput(result.result);
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Writing Assistant</h1>
            <p className="text-slate-400 mt-1">Expand, outline, and enhance your writing with AI</p>
          </div>
          <div className="flex gap-2">
            <Link href="/office" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Office
            </Link>
            <Link href="/" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              ← Chat
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            {/* Action Selection */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Select Action</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {actions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      action === a.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="text-lg mr-2">{a.icon}</span>
                    <span className="font-medium">{a.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-sm mt-3">
                {actions.find(a => a.id === action)?.desc}
              </p>
            </div>

            {/* Style (for rewrite) */}
            {action === 'rewrite' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
                <h2 className="text-lg font-semibold text-white mb-3">Rewrite Style</h2>
                <div className="flex flex-wrap gap-2">
                  {['professional', 'casual', 'academic', 'creative', 'technical', 'persuasive'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        style === s
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Model</h2>
              <ModelSelector
                value={model}
                onChange={handleModelChange}
                label=""
                showHealth={true}
                className="w-full"
              />
            </div>

            {/* Input Text */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Input Text</h2>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  action === 'outline'
                    ? 'Enter a topic or content to create an outline from...'
                    : action === 'expand'
                    ? 'Enter text to expand with more detail...'
                    : action === 'continue'
                    ? 'Enter the beginning of text to continue...'
                    : 'Enter your text here...'
                }
                className="w-full h-64 bg-slate-900 text-white p-4 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-slate-500 text-sm">{input.length} characters</span>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <span className="animate-spin">◐</span>}
                  {loading ? 'Processing...' : actions.find(a => a.id === action)?.name || 'Process'}
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Result</h2>
              {result && (
                <div className="flex gap-2">
                  <button
                    onClick={useAsInput}
                    className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-sm"
                  >
                    Use as Input
                  </button>
                  <button
                    onClick={copyResult}
                    className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-sm"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}

            {!result && !error && !loading && (
              <div className="h-96 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <p>Your result will appear here</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl animate-pulse mb-3">🤖</div>
                  <p className="text-slate-400">Processing with {model}...</p>
                </div>
              </div>
            )}

            {result && (
              <div className="h-96 overflow-auto">
                <pre className="text-slate-200 whitespace-pre-wrap text-sm p-4 bg-slate-900 rounded-lg">
                  {result.result}
                </pre>
                <div className="mt-2 text-slate-500 text-xs">
                  Generated with {result.model} • {result.result.length} characters
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tips for Best Results</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-purple-400 font-medium mb-1">Expand</h4>
              <p className="text-slate-400 text-sm">
                Provide a clear paragraph or concept. The AI will add examples, explanations, and depth.
              </p>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-1">Outline</h4>
              <p className="text-slate-400 text-sm">
                Enter a topic, thesis statement, or existing content to generate a detailed outline.
              </p>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-1">Continue</h4>
              <p className="text-slate-400 text-sm">
                End your input mid-sentence or at a natural break point for best continuation.
              </p>
            </div>
          </div>
        </div>

        {/* API Usage */}
        <div className="mt-6 bg-slate-800/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">API Usage</h3>
          <pre className="bg-slate-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`// POST /api/writing
{
  "action": "expand",  // expand | outline | continue | rewrite | simplify | elaborate | structure
  "text": "Your text here...",
  "style": "professional",  // only for rewrite
  "model": "glm-4.7-flash",
  "stream": false
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}