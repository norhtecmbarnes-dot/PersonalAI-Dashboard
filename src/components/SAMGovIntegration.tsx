import { useState, useEffect } from 'react';

interface SAMOpportunity {
  id: string;
  title: string;
  synopsis: string;
  solicitationNumber: string;
  postedDate: string;
  responseDeadline: string;
  awardAmount?: string;
  naicsCode?: string;
  classificationCode?: string;
  agency?: string;
  office?: string;
  location?: string;
  url: string;
  keywords?: string[];
  matchedKeywords?: string[];
}

interface SearchQuery {
  id: string;
  keywords: string[];
  createdAt: number;
  lastRun?: number;
  status: 'active' | 'paused' | 'completed';
  resultsCount: number;
}

export function SAMGovIntegration() {
  const [opportunities, setOpportunities] = useState<SAMOpportunity[]>([]);
  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasActiveKey, setHasActiveKey] = useState(false);
  const [expiringKeys, setExpiringKeys] = useState<any[]>([]);
  const [filterKeyword, setFilterKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oppRes, queryRes, keyRes] = await Promise.all([
        fetch('/api/sam?action=opportunities'),
        fetch('/api/sam?action=queries'),
        fetch('/api/sam?action=keys'),
      ]);

      const oppData = await oppRes.json();
      const queryData = await queryRes.json();
      const keyData = await keyRes.json();

      setOpportunities(oppData.opportunities || []);
      setQueries(queryData.queries || []);
      setHasActiveKey(keyData.hasActiveKey);
      setExpiringKeys(keyData.expiringKeys || []);
    } catch (error) {
      console.error('Error loading SAM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuery = async () => {
    if (!selectedKeywords.trim()) return;

    const keywords = selectedKeywords.split(',').map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;

    try {
      const response = await fetch('/api/sam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addQuery',
          data: { keywords },
        }),
      });

      if (response.ok) {
        setSelectedKeywords('');
        loadData();
      }
    } catch (error) {
      console.error('Error adding query:', error);
    }
  };

  const handleRunSearch = async (queryId: string) => {
    setSearching(true);
    try {
      await fetch('/api/sam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'runSearch', data: { queryId } }),
      });
      loadData();
    } catch (error) {
      console.error('Error running search:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await fetch('/api/sam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteQuery', data: { queryId } }),
      });
      loadData();
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  };

  const handleToggleQuery = async (query: SearchQuery) => {
    const action = query.status === 'active' ? 'pauseQuery' : 'resumeQuery';
    try {
      await fetch('/api/sam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: { queryId: query.id } }),
      });
      loadData();
    } catch (error) {
      console.error('Error toggling query:', error);
    }
  };

  const filteredOpportunities = filterKeyword
    ? opportunities.filter(opp =>
        opp.title.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        (opp.synopsis?.toLowerCase() || '').includes(filterKeyword.toLowerCase()) ||
        (opp.agency?.toLowerCase() || '').includes(filterKeyword.toLowerCase()) ||
        (opp.naicsCode || '').includes(filterKeyword)
      )
    : opportunities;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Demo Data Warning */}
      {!hasActiveKey && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.154 0 1.938.827.893 1.72L13.5 20a2 2 0 01-2.1-.03l-4.38-3.79c-.777-.67-.186-1.18.868-1.18h8.224z" />
            </svg>
            <div>
              <h4 className="text-yellow-400 font-medium">Demo Data</h4>
              <p className="text-yellow-300 text-sm mt-1">
                Showing sample opportunities. Configure your SAM.gov API key in{' '}
                <a href="/settings" className="underline hover:text-yellow-200">Settings</a> to search live opportunities.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">SAM.gov Opportunities</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${hasActiveKey ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
            <span className="text-sm text-gray-400">
              {hasActiveKey ? 'API Key Active' : 'Demo Mode'}
            </span>
          </div>
        </div>

        {expiringKeys.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
            <p className="text-yellow-400 text-sm font-medium">API Key Expiring Soon</p>
            {expiringKeys.map((k, i) => (
              <p key={i} className="text-yellow-300 text-xs">
                {k.key} - expires in {k.daysUntilExpiry} days
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={selectedKeywords}
            onChange={(e) => setSelectedKeywords(e.target.value)}
            placeholder="Enter keywords (comma-separated)..."
            className="flex-1 bg-slate-700 text-white border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddQuery()}
          />
          <button
            onClick={handleAddQuery}
            disabled={!selectedKeywords.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg"
          >
            Add Search
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Active Searches</h4>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-sm text-gray-400 hover:text-white"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {queries.length === 0 ? (
          <p className="text-gray-400 text-sm">No searches configured. Add keywords above to start.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {queries.map((query) => (
              <div key={query.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                <div>
                  <p className="text-white text-sm">{query.keywords.join(', ')}</p>
                  <p className="text-gray-400 text-xs">
                    {query.resultsCount} results • Last run: {query.lastRun ? formatDate(new Date(query.lastRun).toISOString()) : 'Never'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleQuery(query)}
                    className={`text-xs px-2 py-1 rounded ${
                      query.status === 'active'
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {query.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleRunSearch(query.id)}
                    disabled={searching || query.status !== 'active'}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-white"
                  >
                    {searching ? 'Searching...' : 'Run'}
                  </button>
                  <button
                    onClick={() => handleDeleteQuery(query.id)}
                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Opportunities ({filteredOpportunities.length})</h4>
          <input
            type="text"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="Filter opportunities..."
            className="bg-slate-700 text-white border-0 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading opportunities...</p>
        ) : filteredOpportunities.length === 0 ? (
          <p className="text-gray-400">No opportunities found. Add a search and run it to find opportunities.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredOpportunities.map((opp) => (
              <div key={opp.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="text-white font-medium">{opp.title}</h5>
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View on SAM.gov
                  </a>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  {opp.synopsis ? opp.synopsis.substring(0, 200) : 'No description'}...
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-slate-600 text-gray-300 px-2 py-1 rounded">
                    {opp.solicitationNumber}
                  </span>
                  <span className="bg-slate-600 text-gray-300 px-2 py-1 rounded">
                    NAICS: {opp.naicsCode || 'N/A'}
                  </span>
                  {opp.awardAmount && (
                    <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded">
                      {opp.awardAmount}
                    </span>
                  )}
                  <span className="bg-purple-900/50 text-purple-400 px-2 py-1 rounded">
                    Posted: {formatDate(opp.postedDate)}
                  </span>
                  <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded">
                    Due: {formatDate(opp.responseDeadline)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
