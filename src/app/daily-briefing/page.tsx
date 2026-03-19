'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DailyBriefing {
  date: string;
  intelligence: {
    topNews: Array<{ title: string; summary: string; url: string }>;
    bidOpportunities: Array<{ title: string; agency: string; amount?: string; deadline?: string }>;
  };
  tasks: {
    pending: Array<{ title: string; dueDate?: string; priority: string }>;
    completed: number;
  };
  calendar: {
    upcoming: Array<{ title: string; date: string; type: string }>;
  };
  memory: {
    recentLearnings: Array<{ key: string; content: string }>;
  };
}

export default function DailyBriefingPage() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/daily-briefing');
      if (!response.ok) {
        throw new Error('Failed to load briefing');
      }
      const data = await response.json();
      setBriefing(data.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBriefing = async () => {
    setRegenerating(true);
    try {
      const response = await fetch('/api/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setBriefing(data.briefing);
      }
    } catch (err) {
      console.error('Error regenerating briefing:', err);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading your daily briefing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/50 border border-red-700 rounded p-4 text-red-400">
            <h2 className="text-xl font-bold mb-2">Error Loading Briefing</h2>
            <p>{error}</p>
            <button
              onClick={loadBriefing}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Daily Briefing</h1>
            <p className="text-gray-400">{briefing?.date || new Date().toLocaleDateString()}</p>
          </div>
          <button
            onClick={regenerateBriefing}
            disabled={regenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
          >
            {regenerating ? 'Generating...' : '↻ Regenerate'}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Intelligence Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📰 Intelligence Summary</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">Top News</h3>
                {briefing?.intelligence?.topNews?.length ? (
                  <ul className="space-y-2">
                    {briefing.intelligence.topNews.slice(0, 5).map((news, i) => (
                      <li key={i} className="bg-gray-900 rounded p-3">
                        <a
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 font-medium"
                        >
                          {news.title}
                        </a>
                        <p className="text-gray-500 text-sm mt-1">{news.summary}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No news items available</p>
                )}
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">🎯 Bid Opportunities</h3>
                {briefing?.intelligence?.bidOpportunities?.length ? (
                  <ul className="space-y-2">
                    {briefing.intelligence.bidOpportunities.slice(0, 3).map((opp, i) => (
                      <li key={i} className="bg-gray-900 rounded p-3">
                        <div className="text-white font-medium">{opp.title}</div>
                        <div className="text-gray-500 text-sm">
                          {opp.agency}
                          {opp.amount && ` • ${opp.amount}`}
                          {opp.deadline && ` • Due: ${opp.deadline}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No new bid opportunities</p>
                )}
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">✅ Tasks</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-medium">Pending Tasks</h3>
                  <span className="text-gray-500 text-sm">
                    {briefing?.tasks?.completed || 0} completed
                  </span>
                </div>
                {briefing?.tasks?.pending?.length ? (
                  <ul className="space-y-2">
                    {briefing.tasks.pending.map((task, i) => (
                      <li key={i} className="bg-gray-900 rounded p-3 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            task.priority === 'high'
                              ? 'bg-red-500'
                              : task.priority === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                        />
                        <span className="text-white flex-1">{task.title}</span>
                        {task.dueDate && (
                          <span className="text-gray-500 text-xs">{task.dueDate}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No pending tasks</p>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📅 Upcoming Events</h2>

            {briefing?.calendar?.upcoming?.length ? (
              <ul className="space-y-2">
                {briefing.calendar.upcoming.map((event, i) => (
                  <li key={i} className="bg-gray-900 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-medium">{event.title}</div>
                        <div className="text-gray-500 text-sm">{event.type}</div>
                      </div>
                      <div className="text-purple-400 text-sm font-medium">{event.date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No upcoming events</p>
            )}
          </div>

          {/* Memory Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🧠 Recent Learnings</h2>

            {briefing?.memory?.recentLearnings?.length ? (
              <ul className="space-y-2">
                {briefing.memory.recentLearnings.map((item, i) => (
                  <li key={i} className="bg-gray-900 rounded p-3">
                    <div className="text-purple-400 font-medium text-sm">{item.key}</div>
                    <div className="text-gray-400 text-sm mt-1">{item.content}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No recent learnings</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/intelligence')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              View Full Intelligence
            </button>
            <button
              onClick={() => router.push('/tasks')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Manage Tasks
            </button>
            <button
              onClick={() => router.push('/calendar')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              View Calendar
            </button>
            <button
              onClick={() => router.push('/memory')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Browse Memory
            </button>
            <button
              onClick={() => router.push('/bid-workflow')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
            >
              Bid Opportunities
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
