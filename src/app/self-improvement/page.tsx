'use client';

import { useState, useEffect } from 'react';

interface ToolStats {
  toolsAvailable: number;
  callsToday: number;
  successRate: number;
  avgDuration: number;
  byTool: Record<string, { calls: number; success: number; avgDuration: number }>;
}

interface ToolEfficiencyReport {
  id: string;
  timestamp: number;
  toolUsage: Array<{
    toolName: string;
    calls: number;
    successes: number;
    failures: number;
    avgDuration: number;
    lastUsed: number;
  }>;
  workflows: Array<{
    sequence: string[];
    frequency: number;
    avgDuration: number;
    successRate: number;
    canOptimize: boolean;
    suggestion?: string;
  }>;
  insights: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
    estimatedSavings?: {
      tokens?: number;
      time?: number;
      calls?: number;
    };
  }>;
  overallEfficiency: number;
  priorityActions: string[];
  tokenEfficiency: {
    avgTokensPerQuery: number;
    wastedTokens: number;
    recommendation: string;
  };
  cachePerformance: {
    hitRate: number;
    misses: number;
    potentialSavings: number;
  };
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export default function SelfImprovementPage() {
  const [toolStats, setToolStats] = useState<ToolStats | null>(null);
  const [efficiency, setEfficiency] = useState<ToolEfficiencyReport | null>(null);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'efficiency' | 'workflows'>('overview');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [toolsRes, reportRes] = await Promise.all([
        fetch('/api/self-improvement?action=tools'),
        fetch('/api/self-improvement?action=report'),
      ]);

      const toolsData = await toolsRes.json();
      const reportData = await reportRes.json();

      setTools(toolsData.tools || []);
      setToolStats(toolsData.stats || null);
      setEfficiency(toolsData.efficiency || reportData.toolEfficiency);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTool = async (tool: string, params: Record<string, any>) => {
    try {
      const response = await fetch('/api/self-improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute-tool', tool, parameters: params }),
      });
      const result = await response.json();
      alert(JSON.stringify(result, null, 2));
      loadData();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'medium': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'low': return 'bg-gray-700 text-gray-300 border-gray-600';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tool Efficiency</h1>
            <p className="text-gray-400 mt-1">Analyze and improve how AI uses its tools</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm">Tools Available</div>
            <div className="text-3xl font-bold mt-2">{tools.length}</div>
            <div className="text-sm text-gray-500 mt-1">Registered capabilities</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm">Tool Calls Today</div>
            <div className="text-3xl font-bold mt-2">{toolStats?.callsToday || 0}</div>
            <div className="text-sm text-gray-500 mt-1">Executions</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm">Success Rate</div>
            <div className={`text-3xl font-bold mt-2 ${getEfficiencyColor((toolStats?.successRate || 0) * 100)}`}>
              {((toolStats?.successRate || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">Successful calls</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm">Avg Duration</div>
            <div className="text-3xl font-bold mt-2">
              {formatDuration(toolStats?.avgDuration || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Per tool call</div>
          </div>
        </div>

        {/* Efficiency Score */}
        {efficiency && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">Overall Efficiency</h2>
                <div className={`text-5xl font-bold mt-2 ${getEfficiencyColor(efficiency.overallEfficiency)}`}>
                  {efficiency.overallEfficiency}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Cache Hit Rate</div>
                <div className="text-lg">{(efficiency.cachePerformance.hitRate * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-400 mt-2">Wasted Tokens</div>
                <div className="text-lg">{efficiency.tokenEfficiency.wastedTokens}</div>
              </div>
            </div>
          </div>
        )}

        {/* Priority Actions */}
        {efficiency?.priorityActions && efficiency.priorityActions.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-300 mb-2">Priority Actions</h3>
            <ul className="space-y-1">
              {efficiency.priorityActions.map((action, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          {[
            { key: 'overview', label: 'Tools' },
            { key: 'efficiency', label: `Insights (${efficiency?.insights.length || 0})` },
            { key: 'workflows', label: 'Workflows' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-t ${activeTab === tab.key ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const stats = toolStats?.byTool?.[tool.name];
              return (
                <div key={tool.name} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-purple-300">{tool.name}</h3>
                    {stats && (
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                        {stats.calls} calls
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{tool.description}</p>
                  {stats && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Success: {stats.calls > 0 ? ((stats.success / stats.calls) * 100).toFixed(0) : 0}%</div>
                      <div>Avg time: {formatDuration(stats.avgDuration)}</div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500 mb-2">Parameters:</div>
                    {Object.entries(tool.parameters).map(([name, spec]: [string, any]) => (
                      <div key={name} className="text-xs text-gray-400">
                        <span className="text-purple-400">{name}</span>
                        {spec.required && <span className="text-red-400"> *</span>}: {spec.description}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {tools.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">
                No tools registered yet. Tools will appear as they are used.
              </div>
            )}
          </div>
        )}

        {activeTab === 'efficiency' && efficiency && (
          <div className="space-y-4">
            {efficiency.insights.map((insight) => (
              <div key={insight.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getImpactColor(insight.impact)}`}>
                      {insight.impact}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700">{insight.category}</span>
                  </div>
                  {insight.estimatedSavings && (
                    <div className="text-xs text-gray-400">
                      {insight.estimatedSavings.time && `Save ~${formatDuration(insight.estimatedSavings.time)}`}
                      {insight.estimatedSavings.calls && ` | ${insight.estimatedSavings.calls} fewer calls`}
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-white">{insight.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{insight.description}</p>
                <div className="mt-2 p-2 bg-gray-900 rounded text-sm">
                  <span className="text-purple-400">Recommendation:</span> {insight.recommendation}
                </div>
              </div>
            ))}
            {efficiency.insights.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                No efficiency insights yet. Use the tools more to generate insights.
              </div>
            )}
          </div>
        )}

        {activeTab === 'workflows' && efficiency && (
          <div className="space-y-4">
            {efficiency.workflows.map((workflow, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {workflow.sequence.map((tool, j) => (
                      <span key={j} className="flex items-center">
                        <span className="px-2 py-1 bg-purple-900/50 rounded text-purple-300 text-sm">{tool}</span>
                        {j < workflow.sequence.length - 1 && <span className="mx-1 text-gray-500">→</span>}
                      </span>
                    ))}
                  </div>
                  {workflow.canOptimize && (
                    <span className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded">
                      Optimizable
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-gray-400 mt-2">
                  <span>Used {workflow.frequency}x</span>
                  <span>Avg {formatDuration(workflow.avgDuration)}</span>
                  <span>{(workflow.successRate * 100).toFixed(0)}% success</span>
                </div>
                {workflow.suggestion && (
                  <div className="mt-2 p-2 bg-gray-900 rounded text-sm text-gray-300">
                    💡 {workflow.suggestion}
                  </div>
                )}
              </div>
            ))}
            {efficiency.workflows.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                No workflow patterns detected yet. Use multiple tools in sequence to generate patterns.
              </div>
            )}
          </div>
        )}

        {/* Philosophy */}
        <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">About Tool Efficiency</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            <strong className="text-white">Humans aren't powerful without tools.</strong> We can't fly, but we build airplanes. 
            We can't breathe underwater, but we have submarines. We're poor at math, but we have calculators.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-2">
            The same applies to AI. An LLM's power comes from <strong className="text-white">knowing how to use tools</strong> — 
            vector search for knowledge, SQL for data, calculators for math, web search for current information.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-2">
            This system analyzes <strong className="text-white">how efficiently the AI uses its tools</strong> — 
            reducing redundant calls, caching results, choosing the right tool for the job, and optimizing workflows.
          </p>
        </div>
      </div>
    </div>
  );
}