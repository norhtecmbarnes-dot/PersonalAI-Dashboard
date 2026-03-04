'use client';

import { useState, useEffect } from 'react';

interface ResearchFinding {
  id: string;
  title: string;
  url: string;
  source: string;
  excerpt: string;
  topics: string[];
}

interface ResearchReport {
  id: string;
  timestamp: number;
  searchQueries: string[];
  findings: ResearchFinding[];
  summary: string;
  suggestedImprovements: string[];
  totalFindings: number;
}

export default function ResearchPage() {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [history, setHistory] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await fetch('/api/research');
      const data = await response.json();
      if (data.latestReport) {
        setReport(data.latestReport);
      }
      if (data.lastResearch) {
        const histResponse = await fetch('/api/research', {
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

  const runResearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'research' }),
      });
      const data = await response.json();
      if (data.report) {
        setReport(data.report);
        loadReports();
      }
    } catch (error) {
      console.error('Error running research:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">External Research Agent</h1>
            <p className="text-gray-400 mt-1">
              Researching AI self-improving agents, OpenCode, TinyAgent, Claude Code, and related technologies
            </p>
          </div>
          <button
            onClick={runResearch}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
          >
            {loading ? 'Researching...' : 'Run Research'}
          </button>
        </div>

        {report && (
          <>
            {/* Summary Card */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg text-gray-400">Latest Research</h2>
                  <p className="text-white mt-2">{report.summary}</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {report.totalFindings} findings | {report.suggestedImprovements.length} improvement suggestions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Last Research</p>
                  <p className="text-white">{new Date(report.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Suggested Improvements */}
            {report.suggestedImprovements.length > 0 && (
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-purple-400 mb-4">Suggested Improvements</h3>
                <div className="grid gap-3">
                  {report.suggestedImprovements.map((improvement, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-purple-400 font-bold">{idx + 1}.</span>
                      <span className="text-gray-300">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research Findings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Research Findings ({report.findings.length})
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {report.findings.map((finding, idx) => (
                  <div key={idx} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-semibold flex-1">{finding.title}</h4>
                      <a
                        href={finding.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm ml-2"
                      >
                        Source
                      </a>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">{finding.excerpt}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-gray-500 text-xs">{finding.source}</span>
                      {finding.topics.map((topic, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!report && !loading && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">🔬</div>
            <p className="text-lg">No research available.</p>
            <p className="mt-2">Click "Run Research" to search for latest developments in AI agents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
