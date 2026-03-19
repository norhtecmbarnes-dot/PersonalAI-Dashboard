'use client';

import { useState, useEffect } from 'react';

interface DashboardMetrics {
  chats: {
    total: number;
    today: number;
    avgResponseTime: string;
  };
  documents: {
    total: number;
    indexed: number;
    totalSize: string;
  };
  memory: {
    entries: number;
    categories: number;
    lastSync: string;
  };
  tasks: {
    pending: number;
    completed: number;
    scheduled: number;
  };
  models: {
    available: number;
    local: number;
    cloud: number;
  };
  security: {
    riskScore: number;
    lastScan: string;
    issues: number;
  };
}

export default function QuickInsightsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/quick-insights');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Quick Insights</h1>
            <p className="text-gray-300">Real-time dashboard metrics</p>
          </div>
          <button
            onClick={loadMetrics}
            disabled={refreshing}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-gray-500 text-white rounded-lg backdrop-blur-sm"
          >
            {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Chats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">💬</div>
              <h2 className="text-xl font-semibold text-white">Chat Activity</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Conversations</span>
                <span className="text-white font-bold">{metrics?.chats.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Today</span>
                <span className="text-green-400 font-bold">{metrics?.chats.today || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Response</span>
                <span className="text-blue-400 font-bold">
                  {metrics?.chats.avgResponseTime || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">📄</div>
              <h2 className="text-xl font-semibold text-white">Documents</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Documents</span>
                <span className="text-white font-bold">{metrics?.documents.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Indexed</span>
                <span className="text-green-400 font-bold">{metrics?.documents.indexed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Size</span>
                <span className="text-blue-400 font-bold">
                  {metrics?.documents.totalSize || '0 MB'}
                </span>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🧠</div>
              <h2 className="text-xl font-semibold text-white">Memory</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Entries</span>
                <span className="text-white font-bold">{metrics?.memory.entries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Categories</span>
                <span className="text-purple-400 font-bold">{metrics?.memory.categories || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Last Sync</span>
                <span className="text-gray-400 text-sm">{metrics?.memory.lastSync || 'Never'}</span>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">✅</div>
              <h2 className="text-xl font-semibold text-white">Tasks</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Pending</span>
                <span className="text-yellow-400 font-bold">{metrics?.tasks.pending || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Completed</span>
                <span className="text-green-400 font-bold">{metrics?.tasks.completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Scheduled</span>
                <span className="text-blue-400 font-bold">{metrics?.tasks.scheduled || 0}</span>
              </div>
            </div>
          </div>

          {/* Models */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🤖</div>
              <h2 className="text-xl font-semibold text-white">AI Models</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Available</span>
                <span className="text-white font-bold">{metrics?.models.available || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Local</span>
                <span className="text-green-400 font-bold">{metrics?.models.local || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cloud</span>
                <span className="text-blue-400 font-bold">{metrics?.models.cloud || 0}</span>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🔒</div>
              <h2 className="text-xl font-semibold text-white">Security</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Risk Score</span>
                <span
                  className={`font-bold ${
                    (metrics?.security.riskScore || 0) < 30
                      ? 'text-green-400'
                      : (metrics?.security.riskScore || 0) < 60
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {metrics?.security.riskScore !== undefined
                    ? `${metrics.security.riskScore}/100`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Last Scan</span>
                <span className="text-gray-400 text-sm">
                  {metrics?.security.lastScan || 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Issues</span>
                <span className="text-red-400 font-bold">{metrics?.security.issues || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Start Chat
            </a>
            <a
              href="/documents"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Manage Documents
            </a>
            <a
              href="/tasks"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              View Tasks
            </a>
            <a
              href="/memory"
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
            >
              Browse Memory
            </a>
            <a
              href="/security"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Security Scan
            </a>
            <a
              href="/settings"
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
            >
              Settings
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>AI Dashboard v2.3.2 • Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
