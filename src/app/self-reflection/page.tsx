'use client';

import { useState, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface SuggestedTool {
  name: string;
  description: string;
  purpose: string;
  implementationComplexity: 'simple' | 'medium' | 'complex';
  estimatedBenefit: 'low' | 'medium' | 'high';
}

interface ModelRecommendation {
  modelName: string;
  reason: string;
  useCase: string;
  costImpact: 'lower' | 'same' | 'higher';
}

interface SelfReflectionReport {
  id: string;
  timestamp: number;
  status: string;
  currentCapabilities: string[];
  identifiedGaps: string[];
  inefficiencies: string[];
  suggestions: Suggestion[];
  suggestedTools: SuggestedTool[];
  modelRecommendations: ModelRecommendation[];
  summary: string;
  overallScore: number;
}

export default function SelfReflectionPage() {
  const [report, setReport] = useState<SelfReflectionReport | null>(null);
  const [history, setHistory] = useState<SelfReflectionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'summary' | 'gaps' | 'suggestions' | 'tools' | 'models'
  >('summary');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await fetch('/api/self-reflection');
      const data = await response.json();
      if (data.latestReport) {
        setReport(data.latestReport);
      }
      if (data.reportCount > 0) {
        const histResponse = await fetch('/api/self-reflection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'history' }),
        });
        const histData = await histResponse.json();
        setHistory(histData.reports || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const runReflection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      });
      const data = await response.json();
      if (data.report) {
        setReport(data.report);
        loadReports();
      }
    } catch (error) {
      console.error('Error running reflection:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-900/50 text-red-300 border-red-700';
      case 'medium':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'low':
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const getBenefitColor = (benefit: string) => {
    switch (benefit) {
      case 'high':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Self-Reflection & Improvement</h1>
            <p className="text-gray-400 mt-1">
              AI analyzes itself and suggests improvements. Use "Copy as Prompt" to work with
              OpenCode or another AI to implement changes.
            </p>
          </div>
          <button
            onClick={runReflection}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
          >
            {loading ? 'Analyzing...' : 'Run Self-Analysis'}
          </button>
        </div>

        {report && (
          <>
            {/* Score Card */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg text-gray-400">Overall System Health Score</h2>
                  <div className={`text-5xl font-bold mt-2 ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}/100
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Last Analysis</p>
                  <p className="text-white">{new Date(report.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-700/50 rounded">
                <p className="text-gray-300">{report.summary}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'summary', label: 'Capabilities' },
                { key: 'gaps', label: 'Gaps & Issues' },
                { key: 'suggestions', label: `Suggestions (${report.suggestions.length})` },
                { key: 'tools', label: `Tools (${report.suggestedTools.length})` },
                { key: 'models', label: `Models (${report.modelRecommendations.length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="grid gap-4">
              {activeTab === 'summary' && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Current Capabilities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.currentCapabilities.map((cap, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-300">
                        <span className="text-green-400">✓</span>
                        {cap}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'gaps' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Identified Gaps</h3>
                    <div className="space-y-3">
                      {report.identifiedGaps.map((gap, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-gray-300">
                          <span className="text-orange-400 mt-1">⚠</span>
                          {gap}
                        </div>
                      ))}
                      {report.identifiedGaps.length === 0 && (
                        <p className="text-gray-500">No gaps identified</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Inefficiencies</h3>
                    <div className="space-y-3">
                      {report.inefficiencies.map((ineff, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-gray-300">
                          <span className="text-red-400 mt-1">✗</span>
                          {ineff}
                        </div>
                      ))}
                      {report.inefficiencies.length === 0 && (
                        <p className="text-gray-500">No inefficiencies identified</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'suggestions' && (
                <div className="space-y-4">
                  {report.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white">{suggestion.title}</h3>
                        <span
                          className={`px-3 py-1 rounded border text-sm ${getPriorityColor(suggestion.priority)}`}
                        >
                          {suggestion.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 mt-2">{suggestion.description}</p>
                      <p className="text-purple-400 mt-2 text-sm">
                        Impact: {suggestion.estimatedImpact}
                      </p>
                      <button
                        onClick={() => {
                          const prompt = `I want to improve my AI Dashboard. Please help me implement this suggestion:

**Title:** ${suggestion.title}

**Description:** ${suggestion.description}

**Priority:** ${suggestion.priority}

**Expected Impact:** ${suggestion.estimatedImpact}

Please:
1. Explain the implementation approach
2. Show me the code changes needed
3. Consider token efficiency and memory safety

The project is at C:\\ai_dashboard and uses Next.js, TypeScript, and SQLite.`;
                          navigator.clipboard.writeText(prompt);
                          alert('Prompt copied! Paste it into OpenCode or another AI assistant.');
                        }}
                        className="mt-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                      >
                        📋 Copy as Prompt
                      </button>
                    </div>
                  ))}
                  {report.suggestions.length === 0 && (
                    <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
                      No suggestions at this time
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-4">
                  {report.suggestedTools.map((tool, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
                        <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getBenefitColor(tool.estimatedBenefit)} bg-gray-700`}
                          >
                            {tool.estimatedBenefit} benefit
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-blue-900/50 text-blue-300">
                            {tool.implementationComplexity}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 mt-2">{tool.description}</p>
                      <p className="text-purple-400 mt-2 text-sm">Purpose: {tool.purpose}</p>
                      <button
                        onClick={() => {
                          const prompt = `I want to add a new tool/feature to my AI Dashboard:

**Name:** ${tool.name}

**Description:** ${tool.description}

**Purpose:** ${tool.purpose}

**Complexity:** ${tool.implementationComplexity}

**Benefit:** ${tool.estimatedBenefit}

Please help me:
1. Design the component structure
2. Create the necessary files
3. Integrate it with existing features

The project uses Next.js 15, TypeScript, Tailwind CSS, and SQLite.`;
                          navigator.clipboard.writeText(prompt);
                          alert('Prompt copied! Paste it into OpenCode or another AI assistant.');
                        }}
                        className="mt-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                      >
                        📋 Copy as Prompt
                      </button>
                    </div>
                  ))}
                  {report.suggestedTools.length === 0 && (
                    <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
                      No tool suggestions at this time
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'models' && (
                <div className="space-y-4">
                  {report.modelRecommendations.map((rec, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white">{rec.modelName}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            rec.costImpact === 'lower'
                              ? 'bg-green-900/50 text-green-300'
                              : rec.costImpact === 'higher'
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {rec.costImpact} cost
                        </span>
                      </div>
                      <p className="text-gray-400 mt-2">{rec.reason}</p>
                      <p className="text-purple-400 mt-2 text-sm">Use when: {rec.useCase}</p>
                      <button
                        onClick={() => {
                          const prompt = `I want to optimize my AI Dashboard's model usage:

**Recommended Model:** ${rec.modelName}

**Reason:** ${rec.reason}

**Use Case:** ${rec.useCase}

**Cost Impact:** ${rec.costImpact}

Please help me:
1. Update the model router to use this model for the specified use cases
2. Ensure token efficiency is maintained
3. Test the model selection

The model router is at src/lib/models/model-router.ts`;
                          navigator.clipboard.writeText(prompt);
                          alert('Prompt copied! Paste it into OpenCode or another AI assistant.');
                        }}
                        className="mt-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                      >
                        📋 Copy as Prompt
                      </button>
                    </div>
                  ))}
                  {report.modelRecommendations.length === 0 && (
                    <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
                      No model recommendations at this time
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {!report && !loading && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg">No self-reflection report available.</p>
            <p className="mt-2">Click "Run Self-Analysis" to analyze the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
