'use client';

import { useState, useEffect } from 'react';

interface SecurityFinding {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  location?: string;
  recommendation: string;
  detectedAt: number;
}

interface SecurityReport {
  id: string;
  timestamp: number;
  status: string;
  scanDuration: number;
  findings: SecurityFinding[];
  summary: string;
  riskScore: number;
  recommendations: string[];
}

export default function SecurityPage() {
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [history, setHistory] = useState<SecurityReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await fetch('/api/security');
      const data = await response.json();
      if (data.latestReport) {
        setReport(data.latestReport);
      }
      if (data.lastScan) {
        const histResponse = await fetch('/api/security', {
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

  const runScan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });
      const data = await response.json();
      if (data.report) {
        setReport(data.report);
        loadReports();
      }
    } catch (error) {
      console.error('Error running scan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 20) return 'text-green-400';
    if (score < 40) return 'text-yellow-400';
    if (score < 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const findingsBySeverity = report ? {
    critical: report.findings.filter(f => f.severity === 'critical').length,
    high: report.findings.filter(f => f.severity === 'high').length,
    medium: report.findings.filter(f => f.severity === 'medium').length,
    low: report.findings.filter(f => f.severity === 'low').length,
    info: report.findings.filter(f => f.severity === 'info').length,
  } : { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Security Agent</h1>
            <p className="text-gray-400 mt-1">
              Automated security scanning and vulnerability detection
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
          >
            {loading ? 'Scanning...' : 'Run Security Scan'}
          </button>
        </div>

        {report && (
          <>
            {/* Summary Card */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg text-gray-400">Security Risk Score</h2>
                  <div className={`text-5xl font-bold mt-2 ${getScoreColor(report.riskScore)}`}>
                    {report.riskScore}/100
                  </div>
                  <p className="text-gray-400 mt-2">{report.summary}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Last Scan</p>
                  <p className="text-white">{new Date(report.timestamp).toLocaleString()}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Duration: {report.scanDuration}ms
                  </p>
                </div>
              </div>

              {/* Findings Summary */}
              <div className="flex gap-4 mt-6">
                {Object.entries(findingsBySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(severity)}`}>
                      {severity}: {count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {report.recommendations.length > 0 && (
                <div className="mt-6 p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                  <h3 className="text-purple-400 font-semibold mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {report.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Findings List */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Security Findings</h3>
              <div className="space-y-4">
                {report.findings.map((finding, idx) => (
                  <div key={idx} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(finding.severity)}`}>
                            {finding.severity}
                          </span>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-gray-400 text-xs">{finding.category}</span>
                        </div>
                        <h4 className="text-white font-semibold mt-2">{finding.title}</h4>
                        <p className="text-gray-400 text-sm mt-1">{finding.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-gray-800 rounded">
                      <p className="text-purple-400 text-sm">
                        <span className="font-semibold">Recommendation:</span> {finding.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!report && !loading && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-lg">No security scan available.</p>
            <p className="mt-2">Click "Run Security Scan" to analyze the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
