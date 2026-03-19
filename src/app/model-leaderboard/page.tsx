'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ModelBenchmark {
  name: string;
  provider: string;
  type: 'open-source' | 'frontier' | 'free-tier';
  parameters: string;
  contextWindow: number;
  benchmarkScores: {
    mmlu?: number;
    humanEval?: number;
    gsm8k?: number;
    hellaswag?: number;
  };
  pricing: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
    free?: { tokens: number; provider: string; link?: string };
  };
  lastUpdated: string;
  notes?: string;
}

interface FreeTokenSource {
  provider: string;
  freeTokens: number;
  conditions: string;
  models: string[];
  link: string;
  lastVerified: string;
  status: 'active' | 'deprecated' | 'unknown';
}

export default function ModelLeaderboardPage() {
  const [models, setModels] = useState<ModelBenchmark[]>([]);
  const [freeSources, setFreeSources] = useState<FreeTokenSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'mmlu' | 'price' | 'context'>('mmlu');
  const [filter, setFilter] = useState<'all' | 'open-source' | 'frontier' | 'free'>('all');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Load from database (stored by scheduled task)
      const res = await fetch('/api/model-research/leaderboard');
      const data = await res.json();
      if (data.models) setModels(data.models);
      if (data.freeSources) setFreeSources(data.freeSources);
      setLastUpdate(data.lastUpdate || new Date().toISOString());
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      // Use fallback data
      setModels(getFallbackModels());
      setFreeSources(getFallbackFreeSources());
    }
    setLoading(false);
  };

  const getFallbackModels = (): ModelBenchmark[] => [
    // Frontier Models
    {
      name: 'GPT-4o',
      provider: 'OpenAI',
      type: 'frontier',
      parameters: 'Unknown',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 88.7, humanEval: 91.0, gsm8k: 95.3 },
      pricing: { input: 5.0, output: 15.0 },
      lastUpdated: '2026-03',
    },
    {
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      type: 'frontier',
      parameters: 'Unknown',
      contextWindow: 200000,
      benchmarkScores: { mmlu: 88.7, humanEval: 92.0, gsm8k: 96.4 },
      pricing: { input: 3.0, output: 15.0 },
      lastUpdated: '2026-03',
    },
    {
      name: 'Gemini 1.5 Pro',
      provider: 'Google',
      type: 'frontier',
      parameters: 'Unknown',
      contextWindow: 1000000,
      benchmarkScores: { mmlu: 85.9, humanEval: 71.8, gsm8k: 91.7 },
      pricing: { input: 1.25, output: 5.0 },
      lastUpdated: '2026-03',
    },

    // Open Source Leaders
    {
      name: 'Llama 3.1 405B',
      provider: 'Meta',
      type: 'open-source',
      parameters: '405B',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 88.6, humanEval: 89.0, gsm8k: 96.8 },
      pricing: { input: 0, output: 0 },
      lastUpdated: '2026-03',
      notes: 'Run locally via Ollama',
    },
    {
      name: 'DeepSeek V3',
      provider: 'DeepSeek',
      type: 'open-source',
      parameters: '685B MoE',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 90.2, humanEval: 82.6, gsm8k: 91.8 },
      pricing: { input: 0.27, output: 1.1 },
      lastUpdated: '2026-03',
    },
    {
      name: 'Qwen 2.5 72B',
      provider: 'Alibaba',
      type: 'open-source',
      parameters: '72B',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 85.3, humanEval: 86.0, gsm8k: 93.2 },
      pricing: { input: 0, output: 0 },
      lastUpdated: '2026-03',
      notes: 'Free via Ollama',
    },
    {
      name: 'Qwen 3.5',
      provider: 'Alibaba',
      type: 'open-source',
      parameters: '0.5B-72B',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 82.1, humanEval: 78.0, gsm8k: 89.0 },
      pricing: { input: 0, output: 0 },
      lastUpdated: '2026-03',
      notes: 'Free via Ollama, many sizes',
    },
    {
      name: 'GLM-4',
      provider: 'Zhipu',
      type: 'open-source',
      parameters: '9B',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 81.6, humanEval: 73.2, gsm8k: 87.5 },
      pricing: { input: 0, output: 0 },
      lastUpdated: '2026-03',
      notes: 'Free via Ollama',
    },
    {
      name: 'Mistral Large 2',
      provider: 'Mistral',
      type: 'open-source',
      parameters: '123B',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 84.0, humanEval: 92.0, gsm8k: 91.2 },
      pricing: { input: 2.0, output: 6.0 },
      lastUpdated: '2026-03',
    },

    // Free Tier / Special
    {
      name: 'GPT-OSS 20B',
      provider: 'Open Source',
      type: 'free-tier',
      parameters: '20B',
      contextWindow: 8192,
      benchmarkScores: { mmlu: 72.0, humanEval: 65.0, gsm8k: 78.0 },
      pricing: {
        input: 0,
        output: 0,
        free: { tokens: 0, provider: 'Ollama', link: 'https://ollama.com' },
      },
      lastUpdated: '2026-03',
      notes: 'Free local model',
    },
    {
      name: 'Kimi K2.5',
      provider: 'Moonshot',
      type: 'free-tier',
      parameters: '9B',
      contextWindow: 128000,
      benchmarkScores: { mmlu: 78.5, humanEval: 70.0, gsm8k: 84.0 },
      pricing: { input: 0, output: 0, free: { tokens: 0, provider: 'Ollama' } },
      lastUpdated: '2026-03',
      notes: 'Excellent for writing',
    },
  ];

  const getFallbackFreeSources = (): FreeTokenSource[] => [
    {
      provider: 'OpenRouter',
      freeTokens: 1000000,
      conditions: 'New accounts',
      models: ['Various'],
      link: 'https://openrouter.ai',
      lastVerified: '2026-03',
      status: 'active',
    },
    {
      provider: 'Ollama',
      freeTokens: -1,
      conditions: 'Unlimited local',
      models: ['Llama', 'Qwen', 'GLM', 'Mistral', 'Phi', 'Gemma'],
      link: 'https://ollama.com',
      lastVerified: '2026-03',
      status: 'active',
    },
    {
      provider: 'Together AI',
      freeTokens: 25000000,
      conditions: 'Monthly free tier',
      models: ['Llama', 'Mistral'],
      link: 'https://together.ai',
      lastVerified: '2026-03',
      status: 'active',
    },
    {
      provider: 'Groq',
      freeTokens: -1,
      conditions: 'Rate limited free tier',
      models: ['Llama', 'Mixtral'],
      link: 'https://groq.com',
      lastVerified: '2026-03',
      status: 'active',
    },
    {
      provider: 'Hugging Face',
      freeTokens: 5000000,
      conditions: 'Monthly Inference API',
      models: ['Various open source'],
      link: 'https://huggingface.co',
      lastVerified: '2026-03',
      status: 'active',
    },
    {
      provider: 'Google AI Studio',
      freeTokens: 15000,
      conditions: 'Daily free tier',
      models: ['Gemini'],
      link: 'https://aistudio.google.com',
      lastVerified: '2026-03',
      status: 'active',
    },
    {
      provider: 'Anthropic',
      freeTokens: 5000000,
      conditions: 'New accounts only',
      models: ['Claude'],
      link: 'https://anthropic.com',
      lastVerified: '2026-03',
      status: 'unknown',
    },
  ];

  const filteredModels = models
    .filter(m => {
      if (filter === 'all') return true;
      if (filter === 'free') return m.pricing.input === 0 || m.pricing.free;
      return m.type === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'mmlu') return (b.benchmarkScores.mmlu || 0) - (a.benchmarkScores.mmlu || 0);
      if (sortBy === 'price') return a.pricing.input - b.pricing.input;
      if (sortBy === 'context') return b.contextWindow - a.contextWindow;
      return 0;
    });

  const formatTokens = (tokens: number) => {
    if (tokens === -1) return 'Unlimited';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-green-300';
    if (score >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'frontier':
        return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case 'open-source':
        return 'bg-green-900/50 text-green-300 border-green-700';
      case 'free-tier':
        return 'bg-blue-900/50 text-blue-300 border-blue-700';
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">LLM Leaderboard</h1>
            <p className="text-slate-400 mt-1">
              Open Source vs Frontier Models • Free Token Sources • Updated Weekly
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              ← Home
            </Link>
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 mb-4">
          Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Unknown'}
        </div>

        {/* Free Token Sources */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">🎁 Free Token Sources</h2>
          <p className="text-slate-400 text-sm mb-4">
            These providers offer free tokens. Check their websites for current offers. Add this to
            your research task to get updates.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freeSources
              .filter(s => s.status === 'active')
              .map((source, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white">{source.provider}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        source.freeTokens === -1
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-blue-900/50 text-blue-300'
                      }`}
                    >
                      {formatTokens(source.freeTokens)} tokens
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{source.conditions}</p>
                  <p className="text-slate-500 text-xs mb-2">
                    Models: {source.models.slice(0, 3).join(', ')}
                    {source.models.length > 3 ? '...' : ''}
                  </p>
                  <a
                    href={source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    Visit →
                  </a>
                </div>
              ))}
          </div>
        </div>

        {/* Model Leaderboard */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Model Benchmarks</h2>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
                className="bg-slate-700 text-white px-3 py-1 rounded border border-slate-600"
              >
                <option value="all">All Models</option>
                <option value="open-source">Open Source</option>
                <option value="frontier">Frontier</option>
                <option value="free">Free / Local</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-slate-700 text-white px-3 py-1 rounded border border-slate-600"
              >
                <option value="mmlu">Sort: MMLU Score</option>
                <option value="price">Sort: Price (Low to High)</option>
                <option value="context">Sort: Context Window</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 px-2">Model</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Params</th>
                  <th className="text-left py-2 px-2">Context</th>
                  <th className="text-center py-2 px-2">MMLU</th>
                  <th className="text-center py-2 px-2">HumanEval</th>
                  <th className="text-center py-2 px-2">GSM8K</th>
                  <th className="text-right py-2 px-2">Price (per 1M)</th>
                  <th className="text-left py-2 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 px-2">
                      <div className="font-medium text-white">{model.name}</div>
                      <div className="text-xs text-slate-500">{model.provider}</div>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${getTypeBadge(model.type)}`}
                      >
                        {model.type === 'free-tier' ? 'Free' : model.type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-300">{model.parameters}</td>
                    <td className="py-2 px-2 text-slate-300">
                      {(model.contextWindow / 1000).toFixed(0)}K
                    </td>
                    <td
                      className={`py-2 px-2 text-center font-mono ${getScoreColor(model.benchmarkScores.mmlu)}`}
                    >
                      {model.benchmarkScores.mmlu?.toFixed(1) || '-'}
                    </td>
                    <td
                      className={`py-2 px-2 text-center font-mono ${getScoreColor(model.benchmarkScores.humanEval)}`}
                    >
                      {model.benchmarkScores.humanEval?.toFixed(1) || '-'}
                    </td>
                    <td
                      className={`py-2 px-2 text-center font-mono ${getScoreColor(model.benchmarkScores.gsm8k)}`}
                    >
                      {model.benchmarkScores.gsm8k?.toFixed(1) || '-'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {model.pricing.input === 0 ? (
                        <span className="text-green-400">Free</span>
                      ) : (
                        <span className="text-slate-300">
                          ${model.pricing.input.toFixed(2)} / ${model.pricing.output.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-500 text-xs">{model.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Research Task */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Keep This Updated</h2>
          <p className="text-slate-400 mb-4">
            This leaderboard should be updated regularly. Create a scheduled task to track model
            releases and benchmark changes.
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-300">
            <p className="text-purple-400 mb-2">// PROMPT: Create Model Research Task</p>
            <p className="whitespace-pre-wrap">
              {`Create a scheduled task that:
1. Checks for new model releases weekly
2. Updates benchmark scores from:
   - Hugging Face Open LLM Leaderboard
   - LMSYS ChatBot Arena
   - Official model cards
3. Tracks free token offers from:
   - OpenRouter
   - Together AI
   - Groq
   - Hugging Face
   - Google AI Studio
4. Saves results to SQLite
5. Notifies of significant changes

The task should run every Monday at 9 AM.
Store results in the model_research table.`}
            </p>
          </div>
          <button
            onClick={() => {
              const prompt = document.querySelector('.font-mono')?.textContent || '';
              // This would open a task creation dialog
              alert(
                'To create this task:\n\n1. Go to /tasks\n2. Create new task\n3. Use the prompt above\n4. Set schedule to weekly'
              );
            }}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Create Research Task
          </button>
        </div>

        {/* Benchmark Explanations */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📚 Benchmark Guide</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-white mb-1">MMLU</h3>
              <p className="text-slate-400">
                Massive Multitask Language Understanding. Tests knowledge across 57 subjects. Higher
                = better general knowledge.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">HumanEval</h3>
              <p className="text-slate-400">
                Code generation benchmark. Tests ability to write correct Python functions. Higher =
                better at coding.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">GSM8K</h3>
              <p className="text-slate-400">
                Grade school math problems. Tests multi-step reasoning. Higher = better at math
                reasoning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
