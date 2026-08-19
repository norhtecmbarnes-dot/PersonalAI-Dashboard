'use client';

import Link from 'next/link';
import { useGlobalModel } from '@/lib/context/ModelContext';
import { useState } from 'react';

export function TopNav() {
  const {
    selectedModel,
    setSelectedModel,
    models,
    ollamaHealthy,
    loading,
    refreshModels,
    initialized,
  } = useGlobalModel();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshModels();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const modelGroups = models.reduce(
    (acc, model) => {
      const provider = model.provider || 'other';
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, typeof models>
  );

  const providerInfo: Record<string, { name: string; order: number }> = {
    ollama: { name: 'Local', order: 1 },
    gemini: { name: 'Gemini', order: 2 },
    openai: { name: 'OpenAI', order: 3 },
    anthropic: { name: 'Claude', order: 4 },
    groq: { name: 'Groq', order: 5 },
    mistral: { name: 'Mistral', order: 6 },
    deepseek: { name: 'DeepSeek', order: 7 },
    glm: { name: 'GLM', order: 8 },
    openrouter: { name: 'OpenRouter', order: 9 },
    other: { name: 'Other', order: 10 },
  };

  const selectedModelName = selectedModel
    ? models.find(m => m.id === selectedModel)?.name || selectedModel.split('/').pop()
    : 'Model';

  return (
    <nav className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-between h-10">
          {/* Left: Home */}
          <Link
            href="/"
            className="flex items-center gap-1 text-white hover:text-purple-400 transition-colors px-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </Link>

          {/* Center: Navigation */}
          <div className="flex items-center gap-0.5 overflow-x-auto flex-1 px-2">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/calendar">Calendar</NavLink>
            <NavLink href="/tasks">Tasks</NavLink>
            <NavLink href="/notes">Notes</NavLink>
            <NavLink href="/writing-studio">Writing</NavLink>
            <NavLink href="/office">Office</NavLink>
            <NavLink href="/builder">Proposal</NavLink>
            <NavLink href="/opportunities">Matches</NavLink>
            <NavLink href="/brand-workspace">Brands</NavLink>
            <NavLink href="/canvas">Tracker</NavLink>
            <NavLink href="/space-invaders">Invaders</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </div>

          {/* Right: Model Selector (compact) */}
          <div className="relative flex items-center gap-1">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={!initialized || loading}
              className="bg-slate-700 text-white text-xs border border-slate-600 rounded px-2 py-1 pr-6 focus:ring-1 focus:ring-purple-500 focus:outline-none appearance-none cursor-pointer min-w-[120px] max-w-[160px] truncate"
              title={selectedModel}
            >
              <option value="" disabled>
                {loading ? '...' : 'Select'}
              </option>
              {Object.entries(modelGroups)
                .sort(([a], [b]) => (providerInfo[a]?.order || 99) - (providerInfo[b]?.order || 99))
                .map(([provider, providerModels]) => (
                  <optgroup key={provider} label={providerInfo[provider]?.name || provider}>
                    {providerModels
                      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
                      .map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name || model.id.split('/').pop()}
                        </option>
                      ))}
                  </optgroup>
                ))}
            </select>

            {/* Status indicator + Refresh */}
            <div className="flex items-center gap-0.5">
              <span
                className={`w-2 h-2 rounded-full ${ollamaHealthy ? 'bg-green-400' : 'bg-red-400'}`}
                title={ollamaHealthy ? 'Ollama Online' : 'Ollama Offline'}
              />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="text-slate-400 hover:text-white text-xs disabled:opacity-50"
                title="Refresh models"
              >
                {isRefreshing ? '⟳' : '↻'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

export default TopNav;
