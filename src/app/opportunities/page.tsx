'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface MatchedOpportunity {
  id: string;
  title: string;
  synopsis?: string;
  solicitationNumber: string;
  postedDate?: string;
  responseDeadline?: string;
  awardAmount?: string;
  naicsCode?: string;
  classificationCode?: string;
  agency?: string;
  office?: string;
  location?: string;
  url?: string;
  fitScore: number;
  reasons: string[];
  matchedKeywords: string[];
}

interface ScanStatus {
  brandId: string;
  brandName: string;
  configured: boolean;
  hasProfile: boolean;
  profileSummary: { naicsCodes: string[]; keywords: string[]; targetAgencies: string[] };
  lastRun: number | null;
  nextRun: number | null;
  stale: boolean;
  running: boolean;
  mode: 'api' | 'browser' | 'none' | null;
  totalFound: number;
  matchCount: number;
  lastMessage: string | null;
}

interface ScanSummary {
  ranAt: number;
  durationMs: number;
  mode: 'api' | 'browser' | 'none';
  queries: string[];
  totalFound: number;
  matchCount: number;
  errors: string[];
  message?: string;
}

const POLL_MS = 6000;
const MAX_POLLS = 60; // give a scan up to ~6 minutes to finish

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
  return diff < 0 ? `in ${label}` : label === 'just now' ? label : `${label} ago`;
}

function formatCurrency(amount?: string): string | null {
  if (!amount) return null;
  const n = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  if (n <= 0) return null;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fitColor(score: number): string {
  if (score >= 60) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  if (score >= 30) return 'bg-purple-500/15 text-purple-300 border-purple-500/40';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/40';
}

export default function OpportunitiesPage() {
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [matches, setMatches] = useState<MatchedOpportunity[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState(1);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [started, setStarted] = useState<Record<string, string>>({}); // match key -> project id
  const [startError, setStartError] = useState<string | null>(null);

  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (brandId) params.set('brandId', brandId);
        const res = await fetch(`/api/sam-scan?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load matches');
        setStatus(data.status);
        setMatches(data.matches || []);
        setSummary(data.summary || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    },
    [brandId]
  );

  // Load brands once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/brand-workspace/brands');
        if (res.ok) {
          const data = await res.json();
          const list = (data.brands || []).map((b: any) => ({ id: b.id, name: b.name }));
          setBrands(list);
          const urlBrand = new URLSearchParams(window.location.search).get('brandId');
          setBrandId(urlBrand || list[0]?.id || '');
        }
      } catch {
        /* brand list is optional */
      }
    })();
  }, []);

  // Load scan data when brand changes (the GET lazily triggers a daily scan if stale)
  useEffect(() => {
    if (!brandId) return;
    loadData();
  }, [brandId, loadData]);

  // Poll while a scan is running
  useEffect(() => {
    if (!status?.running) {
      pollCount.current = 0;
      return;
    }
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = setTimeout(async () => {
      pollCount.current += 1;
      await loadData({ silent: true });
      if (pollCount.current >= MAX_POLLS) {
        pollCount.current = 0;
        setStatus(s => (s ? { ...s, running: false } : s));
      }
    }, POLL_MS);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [status?.running, loadData]);

  const runScanNow = async () => {
    setError(null);
    try {
      const res = await fetch('/api/sam-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start scan');
      pollCount.current = 0;
      // Optimistically flip to running; the poll loop takes it from here.
      setStatus(s => (s ? { ...s, running: true } : s));
      await loadData({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start scan');
    }
  };

  // Turn a matched opportunity into a project (bid workflow) for the active
  // company. The customer knowledge base is seeded at the same time, so the
  // "invisible proposal" starts building immediately.
  const handleStartBid = async (m: MatchedOpportunity) => {
    if (!brandId) {
      setStartError('Select a company first');
      return;
    }
    const key = m.id || m.solicitationNumber || m.url || `${m.title}-${m.agency}`;
    if (started[key]) return;
    setStartingId(key);
    setStartError(null);
    try {
      const res = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          brandId,
          opportunityId: key,
          opportunityData: {
            title: m.title,
            synopsis: m.synopsis || '',
            agency: m.agency || '',
            office: m.office || '',
            solicitation_number: m.solicitationNumber || '',
            response_deadline: m.responseDeadline || '',
            award_amount: m.awardAmount || '',
            url: m.url || '',
            naicsCode: m.naicsCode || '',
          },
          projectName: m.title,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start bid');
      }
      setStarted(s => ({ ...s, [key]: data.project?.id || '' }));
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Failed to start bid');
    } finally {
      setStartingId(null);
    }
  };

  const filtered = matches.filter(m => {
    if (m.fitScore < minScore) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      (m.agency || '').toLowerCase().includes(q) ||
      (m.naicsCode || '').includes(q) ||
      m.solicitationNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">SAM.gov Daily Matches</h1>
          <p className="text-slate-400 mt-2">
            A targeted scan of new contract opportunities, run automatically once a day against your
            company profile (NAICS codes + keywords).{' '}
            <a href="/gov-search" className="text-purple-400 hover:text-purple-300 underline">
              Manual SAM.gov search →
            </a>
          </p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 rounded-lg p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company</label>
              <select
                value={brandId}
                onChange={e => setBrandId(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                {brands.length === 0 && <option value="">Loading companies…</option>}
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runScanNow}
              disabled={loading || status?.running || !brandId}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {status?.running ? 'Scanning…' : 'Run scan now'}
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${
                  status?.configured
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                }`}
                title={
                  status?.configured
                    ? 'SAM.gov API key is configured — fast, reliable searches'
                    : 'No SAM.gov API key — using browser scrape. Add a free key in Settings for reliability.'
                }
              >
                {status?.configured ? 'SAM API' : 'Browser scrape'}
              </span>
              {status?.mode && (
                <span className="px-2 py-1 rounded-md bg-slate-700 text-slate-300 text-xs">
                  Last run: {status.mode === 'api' ? 'API' : status.mode === 'browser' ? 'Scrape' : 'None'}
                </span>
              )}
              {!status?.configured && (
                <a href="/settings" className="text-purple-400 hover:text-purple-300 text-xs underline">
                  Add API key
                </a>
              )}
            </div>
          </div>

          {/* Scan status line */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <span>
              Last scan: <span className="text-white">{timeAgo(status?.lastRun || null)}</span>
            </span>
            <span>
              Next auto: <span className="text-white">{status?.nextRun ? timeAgo(status.nextRun) : '—'}</span>
            </span>
            <span>
              Found: <span className="text-white">{status?.totalFound ?? 0}</span>
            </span>
            <span>
              Matches: <span className="text-emerald-300 font-medium">{status?.matchCount ?? 0}</span>
            </span>
            {status?.brandName && (
              <span>
                Target: <span className="text-white">{status.brandName}</span>
              </span>
            )}
          </div>

          {status?.running && (
            <div className="mt-4 flex items-center gap-3 text-purple-300 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              Scanning SAM.gov for new opportunities… this can take a couple of minutes.
            </div>
          )}

          {status?.lastMessage && !status.running && (
            <div className="mt-4 text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {status.lastMessage}
            </div>
          )}

          {status?.profileSummary && status.profileSummary.naicsCodes.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Targeting:</span>
              {status.profileSummary.naicsCodes.map(n => (
                <span key={n} className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">
                  NAICS {n}
                </span>
              ))}
              {status.profileSummary.keywords.slice(0, 5).map(k => (
                <span key={k} className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {startError && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{startError}</p>
            <button
              onClick={() => setStartError(null)}
              className="text-red-300 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by title, agency, NAICS…"
            className="flex-1 min-w-[220px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <select
            value={minScore}
            onChange={e => setMinScore(parseInt(e.target.value))}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value={1}>All matches</option>
            <option value={10}>Fit ≥ 10</option>
            <option value={25}>Fit ≥ 25</option>
            <option value={50}>Fit ≥ 50 (strong)</option>
          </select>
        </div>

        {loading && !status ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-slate-400">Loading matches…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <p className="text-lg text-slate-300">
              {search || minScore > 1 ? 'No matches match your filters' : 'No matches yet'}
            </p>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              {search || minScore > 1
                ? 'Try clearing the search or lowering the fit-score filter.'
                : 'Run a scan to search SAM.gov for opportunities matching your company profile. Matches appear here automatically every day — start a bid from any match to turn it into a project.'}
            </p>
            {!search && minScore <= 1 && (
              <button
                onClick={runScanNow}
                disabled={status?.running || !brandId}
                className="mt-4 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                {status?.running ? 'Scanning…' : 'Run your first scan'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
              </h2>
              {summary?.ranAt && (
                <span className="text-xs text-slate-500">
                  scored from {summary.totalFound} found ·{' '}
                  {summary.queries.length} queries · {Math.round(summary.durationMs / 1000)}s
                </span>
              )}
            </div>
            <div className="space-y-4">
              {filtered.map((m, idx) => (
                <div key={m.id || `${m.solicitationNumber}-${idx}`} className="bg-slate-800 rounded-lg p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold border ${fitColor(m.fitScore)}`}
                          title={`Fit score ${m.fitScore}/100`}
                        >
                          {m.fitScore}% fit
                        </span>
                        {m.naicsCode && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-xs">
                            NAICS {m.naicsCode}
                          </span>
                        )}
                        {m.classificationCode && (
                          <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                            {m.classificationCode}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white mt-2">{m.title}</h3>
                      {m.synopsis && (
                        <p className="text-slate-300 text-sm mt-1 line-clamp-2">{m.synopsis}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {formatCurrency(m.awardAmount) && (
                        <p className="text-green-400 font-semibold">{formatCurrency(m.awardAmount)}</p>
                      )}
                      {m.url && (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-xs"
                        >
                          View on SAM.gov →
                        </a>
                      )}
                    </div>
                  </div>

                  {m.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.matchedKeywords.slice(0, 8).map(k => (
                        <span key={k} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-xs">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.reasons.length > 0 && (
                    <ul className="mt-3 space-y-0.5 text-xs text-slate-400">
                      {m.reasons.slice(0, 4).map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                    <div>
                      <span className="text-slate-500">Solicitation #</span>
                      <p className="text-white">{m.solicitationNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Agency</span>
                      <p className="text-white">{m.agency || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Posted</span>
                      <p className="text-white">{m.postedDate ? new Date(m.postedDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Deadline</span>
                      <p className="text-white">
                        {m.responseDeadline ? new Date(m.responseDeadline).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between">
                    {(() => {
                      const key = m.id || m.solicitationNumber || m.url || `${m.title}-${m.agency}`;
                      const projectId = started[key];
                      if (projectId) {
                        return (
                          <span className="flex items-center gap-2 text-sm text-emerald-300">
                            <span>✓ Started as a project</span>
                            <a
                              href="/brand-workspace"
                              className="text-purple-400 hover:text-purple-300 underline"
                            >
                              Open in Company Workspace →
                            </a>
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs text-slate-500">
                          Start a bid to build the capture strategy with your AI partner.
                        </span>
                      );
                    })()}
                    {!started[m.id || m.solicitationNumber || m.url || `${m.title}-${m.agency}`] && (
                      <button
                        onClick={() => handleStartBid(m)}
                        disabled={
                          startingId === (m.id || m.solicitationNumber || m.url || `${m.title}-${m.agency}`)
                        }
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {startingId === (m.id || m.solicitationNumber || m.url || `${m.title}-${m.agency}`)
                          ? 'Starting…'
                          : 'Start Bid'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Explainer */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-lg p-5 text-sm text-slate-400">
          <h3 className="text-white font-medium mb-2">How this works</h3>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              The scan runs automatically once per day — the first time you open this page after 24
              hours, or via <span className="text-slate-300">Run scan now</span>.
            </li>
            <li>
              Queries are built from your company&apos;s Opportunity Scout profile: one per NAICS code,
              plus your top (win-proven) keywords.
            </li>
            <li>
              With a free SAM.gov API key (Settings → API Keys), searches use the official API with
              NAICS filters. Without one, the browser-scrape fallback searches the public SAM.gov UI.
            </li>
            <li>
              Every opportunity is scored against your profile — NAICS match (+25), target agency
              (+15), product match (+10), keyword matches — and only positive-fit results are listed.
            </li>
            <li>
              <span className="text-emerald-300">Start Bid</span> on any match turns it into a
              project under your company — the agency is seeded into your customer knowledge base
              and the bid workflow begins in the Company Workspace.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
