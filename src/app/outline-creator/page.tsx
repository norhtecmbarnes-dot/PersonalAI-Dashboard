'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModelSelector } from '@/components/ModelSelector';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface OutlineResult {
  title: string;
  content: string;
  model: string;
  levels: number;
  sections: number;
}

export default function OutlineCreatorPage() {
  const [topic, setTopic] = useState('');
  const [detailLevel, setDetailLevel] = useState<
    'basic' | 'standard' | 'detailed' | 'comprehensive'
  >('standard');
  const [outlineType, setOutlineType] = useState<
    'general' | 'proposal' | 'blog' | 'academic' | 'business'
  >('general');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutlineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel) setModel(savedModel);
      const savedTheme = localStorage.getItem('writing-theme');
      if (savedTheme) setTheme(savedTheme as 'dark' | 'light');
    }
  }, []);

  const handleModelChange = (modelId: string) => {
    setModel(modelId);
    localStorage.setItem('selectedModel', modelId);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('writing-theme', newTheme);
  };

  const generateOutline = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic or title');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const modelToUse = model || 'kimi-k2.5';

    try {
      const prompt = `Create a ${detailLevel} ${outlineType} outline for: "${topic}"

Requirements:
- Use Markdown formatting (# for title, ## for sections, ### for subsections)
- ${
        detailLevel === 'basic'
          ? '3-4 main sections with 1-2 subsections each'
          : detailLevel === 'standard'
            ? '4-6 main sections with 2-3 subsections each'
            : detailLevel === 'detailed'
              ? '5-7 main sections with 3-4 subsections each, include bullet points'
              : '7-10 main sections with 4-5 subsections each, include detailed bullet points and examples'
      }
- Ensure logical flow and progression
- ${
        outlineType === 'proposal'
          ? 'Include: Problem Statement, Solution, Methodology, Budget, Timeline'
          : outlineType === 'blog'
            ? 'Include: Hook, Main Points, Examples, Call-to-Action'
            : outlineType === 'academic'
              ? 'Include: Introduction, Literature Review, Methodology, Results, Discussion, Conclusion'
              : outlineType === 'business'
                ? 'Include: Executive Summary, Market Analysis, Strategy, Financials, Implementation'
                : 'Adapt structure to topic naturally'
      }

Provide ONLY the outline, no explanations.`;

      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outline',
          text: prompt,
          model: modelToUse,
          stream: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const content = data.result;
        const sections = (content.match(/## /g) || []).length;
        const subsections = (content.match(/### /g) || []).length;
        const levels = subsections > 0 ? 3 : 2;

        setResult({
          title: topic,
          content,
          model: modelToUse,
          levels,
          sections: sections + subsections,
        });
      } else {
        setError(data.error || 'Failed to generate outline');
      }
    } catch (err) {
      console.error('[Outline] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setLoading(false);
  };

  const copyOutline = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
    }
  };

  const exportOutline = async (format: 'txt' | 'md' | 'docx' | 'pdf') => {
    if (!result?.content) return;

    try {
      const response = await fetch('/api/writing/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: result.content,
          title: result.title,
          format,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.title}.${format === 'docx' ? 'docx' : format === 'pdf' ? 'pdf' : 'txt'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };

  const themeClasses =
    theme === 'dark'
      ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'
      : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900';

  const cardClasses =
    theme === 'dark' ? 'bg-slate-800/50 backdrop-blur' : 'bg-white/80 backdrop-blur shadow-lg';

  return (
    <div className={`min-h-screen ${themeClasses} p-6 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              Outline Creator
            </h1>
            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mt-1`}>
              Generate structured outlines for any topic with AI
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-slate-700 text-yellow-400' : 'bg-gray-200 text-gray-700'
              }`}
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link
              href="/writing"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
              }`}
            >
              ← Writing Assistant
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1 space-y-4">
            {/* Topic Input */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                Topic / Title
              </h2>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter your topic, thesis, or title..."
                className={`w-full h-32 p-3 rounded-lg border focus:outline-none ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white border-slate-700 focus:border-purple-500'
                    : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500'
                }`}
              />
              <div className="flex justify-between items-center mt-2">
                <span
                  className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}
                >
                  {topic.length} characters
                </span>
              </div>
            </div>

            {/* Detail Level */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                Detail Level
              </h2>
              <div className="space-y-2">
                {[
                  { id: 'basic', label: 'Basic', desc: '3-4 sections, quick overview' },
                  { id: 'standard', label: 'Standard', desc: '4-6 sections, balanced' },
                  { id: 'detailed', label: 'Detailed', desc: '5-7 sections, thorough' },
                  {
                    id: 'comprehensive',
                    label: 'Comprehensive',
                    desc: '7-10 sections, exhaustive',
                  },
                ].map(level => (
                  <button
                    key={level.id}
                    onClick={() => setDetailLevel(level.id as any)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      detailLevel === level.id
                        ? 'bg-purple-600 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-medium">{level.label}</div>
                    <div
                      className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}
                    >
                      {level.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Outline Type */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                Outline Type
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'general', label: 'General', icon: '📋' },
                  { id: 'proposal', label: 'Proposal', icon: '💼' },
                  { id: 'blog', label: 'Blog', icon: '📝' },
                  { id: 'academic', label: 'Academic', icon: '🎓' },
                  { id: 'business', label: 'Business', icon: '📊' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setOutlineType(type.id as any)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      outlineType === type.id
                        ? 'bg-purple-600 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className={`${cardClasses} rounded-xl p-4`}>
              <h2
                className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}
              >
                AI Model
              </h2>
              <ModelSelector
                value={model}
                onChange={handleModelChange}
                label=""
                showHealth={true}
                className="w-full"
                autoSelectBest={true}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={generateOutline}
              disabled={loading || !topic.trim()}
              className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                theme === 'dark'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && <span className="animate-spin">◐</span>}
              {loading ? 'Generating...' : '📋 Generate Outline'}
            </button>
          </div>

          {/* Output Section */}
          <div className="lg:col-span-2">
            <div className={`${cardClasses} rounded-xl p-4 h-full`}>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  Outline Result
                </h2>
                {result && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyOutline}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-gray-200 text-gray-700'
                      } hover:opacity-80`}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => exportOutline('md')}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-gray-200 text-gray-700'
                      } hover:opacity-80`}
                    >
                      Export MD
                    </button>
                    <button
                      onClick={() => exportOutline('docx')}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-gray-200 text-gray-700'
                      } hover:opacity-80`}
                    >
                      Export DOCX
                    </button>
                    <button
                      onClick={() => exportOutline('pdf')}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-gray-200 text-gray-700'
                      } hover:opacity-80`}
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 mb-4">
                  {error}
                </div>
              )}

              {!result && !error && !loading && (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className={theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}>
                      Your outline will appear here
                    </p>
                    <p
                      className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-600'}`}
                    >
                      Enter a topic and click Generate
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl animate-pulse mb-3">🤖</div>
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
                      Generating outline with {model}...
                    </p>
                  </div>
                </div>
              )}

              {result && (
                <div>
                  <div
                    className={`mb-3 flex gap-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}
                  >
                    <span>📊 {result.sections} sections</span>
                    <span>📈 {result.levels} levels</span>
                    <span>🤖 {result.model}</span>
                  </div>
                  <div
                    className={`h-[600px] overflow-auto rounded-lg p-4 ${
                      theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
                    }`}
                  >
                    <MarkdownRenderer content={result.content} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className={`mt-6 ${cardClasses} rounded-xl p-6`}>
          <h3
            className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}
          >
            Quick Start Templates
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: 'Blog Post', example: 'How to Build an AI Dashboard in 2026', type: 'blog' },
              {
                title: 'Business Proposal',
                example: 'Q2 Marketing Strategy Proposal',
                type: 'business',
              },
              { title: 'Research Paper', example: 'Impact of AI on Healthcare', type: 'academic' },
              {
                title: 'Grant Proposal',
                example: 'SBIR Phase I: AI-Powered Analytics',
                type: 'proposal',
              },
              { title: 'Tutorial', example: 'Getting Started with Next.js 15', type: 'blog' },
              { title: 'Project Plan', example: 'Website Redesign Project', type: 'business' },
            ].map((template, i) => (
              <button
                key={i}
                onClick={() => {
                  setTopic(template.example);
                  setOutlineType(template.type as any);
                }}
                className={`p-3 rounded-lg text-left transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium">{template.title}</div>
                <div
                  className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}
                >
                  {template.example}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
