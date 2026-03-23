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

interface OutlineNode {
  level: number;
  text: string;
  children: OutlineNode[];
  expanded: boolean;
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

    const modelToUse = model || 'ollama/qwen3.5:2b';

    try {
      // Build topic with requirements included
      const fullTopic = `Create a ${detailLevel} ${outlineType} outline for: "${topic}"

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
      }`;

      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outline',
          text: fullTopic,
          model: modelToUse,
          stream: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const content = data.result;
        localStorage.setItem('outline-content', content);
        window.location.href = '/writing';
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

  const parseOutlineToTree = (content: string): OutlineNode[] => {
    const lines = content.split('\n');
    const root: OutlineNode[] = [];
    const stack: { node: OutlineNode; level: number }[] = [];

    for (const line of lines) {
      const match = line.match(/^(#{1,4})\s+(.+)/);
      if (!match) continue;

      const level = match[1].length;
      const text = match[2].trim();

      const node: OutlineNode = {
        level,
        text,
        children: [],
        expanded: level <= 2,
      };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, level });
    }

    return root;
  };

  const toggleExpanded = (paths: number[][], path: number[]): number[][] => {
    const exists = paths.some(p => JSON.stringify(p) === JSON.stringify(path));
    if (exists) {
      return paths.filter(p => JSON.stringify(p) !== JSON.stringify(path));
    }
    return [...paths, path];
  };

  const renderOutlineNode = (node: OutlineNode, path: number[]): JSX.Element => {
    const headingClasses: Record<number, string> = {
      1: 'text-2xl font-bold mb-3 text-purple-400',
      2: 'text-xl font-semibold mb-2 mt-4 text-purple-300 cursor-pointer hover:text-purple-200',
      3: 'text-lg font-medium mb-1 mt-3 text-blue-300 cursor-pointer hover:text-blue-200',
      4: 'text-base font-normal mb-1 ml-4 text-slate-300',
    };

    const hasChildren = node.children.length > 0;
    const isExpanded = expandedPaths.some(p => JSON.stringify(p) === JSON.stringify(path));

    return (
      <div key={path.join('-')} className="animate-fadeIn">
        <div
          className={`flex items-center gap-2 ${headingClasses[node.level]} ${
            hasChildren ? 'cursor-pointer' : ''
          }`}
          onClick={() => hasChildren && setExpandedPaths(toggleExpanded(expandedPaths, path))}
        >
          {hasChildren && <span className="text-sm mr-1">{isExpanded ? '▼' : '▶'}</span>}
          {node.text}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-slate-700 pl-4">
            {node.children.map((child, i) => renderOutlineNode(child, [...path, i]))}
          </div>
        )}
      </div>
    );
  };

  const [expandedPaths, setExpandedPaths] = useState<number[][]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'markdown'>('tree');

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
              {loading ? 'Generating & sending to editor...' : '📋 Generate & Send to Editor'}
            </button>
          </div>

          {/* Output Section - Simplified for direct-to-editor flow */}
          <div className="lg:col-span-2">
            <div
              className={`${cardClasses} rounded-xl p-4 h-full flex items-center justify-center`}
            >
              {loading ? (
                <div className="text-center">
                  <div className="text-4xl animate-pulse mb-3">🤖</div>
                  <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
                    Generating outline and opening editor...
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <p className={theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}>
                    Enter a topic, select options, and click Generate to create your outline in the
                    editor
                  </p>
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
