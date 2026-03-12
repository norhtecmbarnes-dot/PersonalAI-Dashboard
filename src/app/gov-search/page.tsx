'use client';

import { useState, useEffect } from 'react';

interface SAMOpportunity {
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
}

interface USASpendingAward {
  id: string;
  title: string;
  description?: string;
  awardAmount: number;
  awardDate: string;
  recipientName: string;
  recipientLocation: string;
  awardingAgency: string;
  fundingAgency: string;
  naicsCode?: string;
  naicsDescription?: string;
  cfdaNumber?: string;
  cfdaTitle?: string;
  awardType?: string;
  uri?: string;
}

interface Agency {
  id: number;
  name: string;
  abbreviation?: string;
}

type SearchSource = 'sam' | 'usaspending';
type AwardType = 'contracts' | 'grants' | 'direct_payments' | 'loans' | 'other';

export default function GovSearchPage() {
  const [activeSource, setActiveSource] = useState<SearchSource>('sam');
  const [loading, setLoading] = useState(false);
  const [samResults, setSamResults] = useState<SAMOpportunity[]>([]);
  const [usaResults, setUsaResults] = useState<USASpendingAward[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [samApiKey, setSamApiKey] = useState<string>('');
  const [samApiKeyConfigured, setSamApiKeyConfigured] = useState(false);
  
  const [agencies, setAgencies] = useState<Agency[]>([]);
  
  const [samQuery, setSamQuery] = useState('');
  const [samDateFrom, setSamDateFrom] = useState('');
  const [samDateTo, setSamDateTo] = useState('');
  const [samLimit, setSamLimit] = useState(10);
  
  const [usaQuery, setUsaQuery] = useState('');
  const [usaAgency, setUsaAgency] = useState('');
  const [usaNaics, setUsaNaics] = useState('');
  const [usaAwardType, setUsaAwardType] = useState<AwardType>('contracts');
  const [usaDateFrom, setUsaDateFrom] = useState('');
  const [usaDateTo, setUsaDateTo] = useState('');
  const [usaLimit, setUsaLimit] = useState(10);
  
  const [savedSamSearches, setSavedSamSearches] = useState<any[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);

  useEffect(() => {
    loadApiKey();
    loadAgencies();
    loadSavedSearches();
  }, []);

  const loadApiKey = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.apiKeys?.sam) {
          setSamApiKeyConfigured(true);
          setSamApiKey('••••••••••••');
        }
      }
    } catch (err) {
      console.error('Error loading API key:', err);
    }
  };

  const loadAgencies = async () => {
    try {
      const response = await fetch('/api/usaspending?action=agencies');
      if (response.ok) {
        const data = await response.json();
        if (data.agencies) {
          setAgencies(data.agencies);
        }
      }
    } catch (err) {
      console.error('Error loading agencies:', err);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await fetch('/api/sam-searches');
      if (response.ok) {
        const data = await response.json();
        setSavedSamSearches(data.searches || []);
      }
    } catch (err) {
      console.error('Error loading saved searches:', err);
    }
  };

  const formatDateForSAM = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(2)}B`;
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const searchSAM = async () => {
    if (!samApiKeyConfigured) {
      setError('SAM.gov API key not configured. Add it in Settings.');
      return;
    }
    if (!samQuery.trim()) {
      setError('Please enter a search keyword');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        keyword: samQuery,
        limit: samLimit.toString(),
      });

      if (samDateFrom) {
        params.set('postedFrom', formatDateForSAM(samDateFrom));
      }
      if (samDateTo) {
        params.set('postedTo', formatDateForSAM(samDateTo));
      }

      const response = await fetch(`/api/sam?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setSamResults(data.opportunities || []);
      loadSavedSearches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const searchUSASpending = async () => {
    if (!usaQuery.trim() && !usaAgency && !usaNaics) {
      setError('Please enter a search keyword, agency, or NAICS code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        action: 'search',
        awardType: usaAwardType,
        limit: usaLimit.toString(),
        offset: '0',
      });

      if (usaQuery) params.set('keyword', usaQuery);
      if (usaAgency) params.set('agency', usaAgency);
      if (usaNaics) params.set('naicsCode', usaNaics);
      if (usaDateFrom) params.set('dateFrom', usaDateFrom);
      if (usaDateTo) params.set('dateTo', usaDateTo);

      const response = await fetch(`/api/usaspending?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setUsaResults(data.awards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeSource === 'sam') {
      searchSAM();
    } else {
      searchUSASpending();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Government Search</h1>
          <p className="text-slate-400 mt-2">
            Search SAM.gov for contract opportunities and USASpending.gov for federal spending data
          </p>
        </div>

        {!samApiKeyConfigured && (
          <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-xl">⚠️</span>
              <div>
                <h3 className="text-amber-300 font-medium">SAM.gov API Key Required</h3>
                <p className="text-amber-200/70 text-sm mt-1">
                  To search SAM.gov opportunities, add your API key in{' '}
                  <a href="/settings" className="text-amber-400 hover:text-amber-300 underline">
                    Settings
                  </a>
                  . Get a free key at{' '}
                  <a href="https://sam.gov" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                    sam.gov
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveSource('sam')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSource === 'sam'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            SAM.gov Opportunities
          </button>
          <button
            onClick={() => setActiveSource('usaspending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSource === 'usaspending'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            USASpending.gov
          </button>
        </div>

        {activeSource === 'sam' && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Search Contract Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="lg:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Keyword</label>
                <input
                  type="text"
                  value={samQuery}
                  onChange={(e) => setSamQuery(e.target.value)}
                  placeholder="e.g., software development"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Posted From</label>
                <input
                  type="date"
                  value={samDateFrom}
                  onChange={(e) => setSamDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Posted To</label>
                <input
                  type="date"
                  value={samDateTo}
                  onChange={(e) => setSamDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Results</label>
                <select
                  value={samLimit}
                  onChange={(e) => setSamLimit(parseInt(e.target.value))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !samApiKeyConfigured}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                onClick={() => setShowSavedSearches(!showSavedSearches)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Saved Searches ({savedSamSearches.length})
              </button>
            </div>
          </div>
        )}

        {activeSource === 'usaspending' && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Search Federal Spending
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Keyword</label>
                <input
                  type="text"
                  value={usaQuery}
                  onChange={(e) => setUsaQuery(e.target.value)}
                  placeholder="e.g., technology"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Award Type</label>
                <select
                  value={usaAwardType}
                  onChange={(e) => setUsaAwardType(e.target.value as AwardType)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="contracts">Contracts</option>
                  <option value="grants">Grants</option>
                  <option value="direct_payments">Direct Payments</option>
                  <option value="loans">Loans</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Agency</label>
                <input
                  type="text"
                  value={usaAgency}
                  onChange={(e) => setUsaAgency(e.target.value)}
                  placeholder="e.g., DOD, NASA"
                  list="agencies-list"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <datalist id="agencies-list">
                  {agencies.slice(0, 20).map((a) => (
                    <option key={a.id} value={a.abbreviation || a.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">NAICS Code</label>
                <input
                  type="text"
                  value={usaNaics}
                  onChange={(e) => setUsaNaics(e.target.value)}
                  placeholder="e.g., 541512"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date From</label>
                <input
                  type="date"
                  value={usaDateFrom}
                  onChange={(e) => setUsaDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date To</label>
                <input
                  type="date"
                  value={usaDateTo}
                  onChange={(e) => setUsaDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Results</label>
                <select
                  value={usaLimit}
                  onChange={(e) => setUsaLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {showSavedSearches && activeSource === 'sam' && savedSamSearches.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-3">Recent Searches</h3>
            <div className="space-y-2">
              {savedSamSearches.slice(0, 5).map((search) => (
                <button
                  key={search.id}
                  onClick={() => {
                    setSamQuery(search.keywords?.[0] || '');
                    setShowSavedSearches(false);
                  }}
                  className="block w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300"
                >
                  <span className="text-white">{search.keywords?.join(', ')}</span>
                  <span className="text-slate-500 ml-2">
                    {search.results_count} results • {new Date(search.last_run).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-slate-400">Searching...</span>
          </div>
        )}

        {!loading && activeSource === 'sam' && samResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              {samResults.length} Opportunities Found
            </h2>
            {samResults.map((opp, idx) => (
              <div key={opp.id || idx} className="bg-slate-800 rounded-lg p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">{opp.title}</h3>
                  {opp.url && (
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm whitespace-nowrap ml-4"
                    >
                      View on SAM.gov →
                    </a>
                  )}
                </div>
                {opp.synopsis && (
                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">{opp.synopsis}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Solicitation #</span>
                    <p className="text-white">{opp.solicitationNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Agency</span>
                    <p className="text-white">{opp.agency || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Posted</span>
                    <p className="text-white">
                      {opp.postedDate ? new Date(opp.postedDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Deadline</span>
                    <p className="text-white">
                      {opp.responseDeadline ? new Date(opp.responseDeadline).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                {(opp.awardAmount || opp.naicsCode || opp.location) && (
                  <div className="flex gap-4 mt-3 text-sm">
                    {opp.awardAmount && (
                      <span className="text-green-400">
                        💰 {formatCurrency(parseFloat(opp.awardAmount.replace(/[^0-9.]/g, '')) || 0)}
                      </span>
                    )}
                    {opp.naicsCode && (
                      <span className="text-blue-400">NAICS: {opp.naicsCode}</span>
                    )}
                    {opp.location && (
                      <span className="text-slate-400">📍 {opp.location}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && activeSource === 'usaspending' && usaResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              {usaResults.length} Awards Found
            </h2>
            {usaResults.map((award, idx) => (
              <div key={award.id || idx} className="bg-slate-800 rounded-lg p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {award.title || award.awardingAgency}
                    </h3>
                    <p className="text-slate-400 text-sm">{award.recipientName}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(award.awardAmount)}
                    </p>
                    {award.uri && (
                      <a
                        href={award.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        View on USASpending.gov →
                      </a>
                    )}
                  </div>
                </div>
                {award.description && (
                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">{award.description}</p>
                )}
                <div className="flex gap-4 flex-wrap text-sm text-slate-400">
                  {award.awardingAgency && (
                    <span>Agency: {award.awardingAgency}</span>
                  )}
                  {award.naicsDescription && (
                    <span>NAICS: {award.naicsDescription}</span>
                  )}
                  {award.awardDate && (
                    <span>Date: {new Date(award.awardDate).toLocaleDateString()}</span>
                  )}
                  {award.awardType && (
                    <span className="text-purple-400 capitalize">
                      {award.awardType.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeSource === 'sam' && samResults.length === 0 && !error && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No opportunities found yet</p>
            <p className="text-sm mt-2">Enter a keyword and click Search to find contract opportunities</p>
          </div>
        )}

        {!loading && activeSource === 'usaspending' && usaResults.length === 0 && !error && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No awards found yet</p>
            <p className="text-sm mt-2">Enter search criteria and click Search to find federal spending</p>
          </div>
        )}
      </div>
    </div>
  );
}