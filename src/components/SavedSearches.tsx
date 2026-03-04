'use client';

import { useState, useEffect, useCallback } from 'react';

interface SavedSearch {
  id: string;
  keywords: string[];
  filters?: {
    naicsCodes?: string[];
    agencies?: string[];
    opportunityTypes?: string[];
    postedFromDate?: string;
    postedToDate?: string;
    minAward?: number;
    maxAward?: number;
    locations?: string[];
    schedule?: string;
  };
  status: string;
  results_count: number;
  created_at: number;
  last_run: number | null;
}

interface SAMOpportunity {
  id: string;
  title: string;
  synopsis: string;
  solicitationNumber: string;
  postedDate: string;
  responseDeadline: string;
  awardAmount: string;
  naicsCode: string;
  agency: string;
  office: string;
  location: string;
  url: string;
  opportunityType: string;
}

interface SearchResult {
  opportunities: SAMOpportunity[];
  total: number;
  error?: string;
}

export function SavedSearches({ onSelectOpportunity }: { onSelectOpportunity?: (opp: SAMOpportunity) => void }) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    keywords: '',
    naicsCodes: '',
    agencies: '',
    opportunityTypes: '',
    postedFromDate: '',
    postedToDate: '',
    minAward: '',
    maxAward: '',
  });

  const loadSearches = useCallback(async () => {
    try {
      const res = await fetch('/api/sam/searches');
      const data = await res.json();
      setSearches(data.searches || []);
    } catch (error) {
      console.error('Error loading searches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  const handleSaveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sam/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          keywords: form.keywords,
          naicsCodes: form.naicsCodes ? form.naicsCodes.split(',').map(s => s.trim()) : undefined,
          agencies: form.agencies ? form.agencies.split(',').map(s => s.trim()) : undefined,
          opportunityTypes: form.opportunityTypes ? form.opportunityTypes.split(',').map(s => s.trim()) : undefined,
          postedFromDate: form.postedFromDate || undefined,
          postedToDate: form.postedToDate || undefined,
          minAward: form.minAward ? parseFloat(form.minAward) : undefined,
          maxAward: form.maxAward ? parseFloat(form.maxAward) : undefined,
        }),
      });
      
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', keywords: '', naicsCodes: '', agencies: '', opportunityTypes: '', postedFromDate: '', postedToDate: '', minAward: '', maxAward: '' });
        loadSearches();
      }
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const handleDeleteSearch = async (id: string) => {
    if (!confirm('Delete this saved search?')) return;
    try {
      await fetch('/api/sam/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      loadSearches();
      if (selectedSearchId === id) {
        setSelectedSearchId(null);
        setSearchResults(null);
      }
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const handleRunSearch = async (searchId: string) => {
    setResultsLoading(true);
    setSelectedSearchId(searchId);
    try {
      const res = await fetch('/api/sam/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', searchId }),
      });
      const data = await res.json();
      setSearchResults({ opportunities: data.opportunities || [], total: data.total || 0, error: data.error });
      loadSearches();
    } catch (error) {
      console.error('Error running search:', error);
      setSearchResults({ opportunities: [], total: 0, error: 'Failed to run search' });
    } finally {
      setResultsLoading(false);
    }
  };

  const handleAddToInterested = async (opp: SAMOpportunity) => {
    try {
      const res = await fetch('/api/sam/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addToInterested', opportunity: opp }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Added "${opp.title}" to Interested`);
        if (onSelectOpportunity) onSelectOpportunity(opp);
      } else {
        alert(data.error || 'Failed to add');
      }
    } catch (error) {
      console.error('Error adding to interested:', error);
      alert('Failed to add opportunity');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatLastRun = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return <div className="text-gray-400 p-4">Loading saved searches...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">SAM.gov Saved Searches</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
        >
          + New Search
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Create Saved Search</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveSearch} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Search Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="e.g., IT Services Opportunities"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Keywords *</label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="software, IT services, cloud (comma separated)"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">NAICS Codes</label>
                  <input
                    type="text"
                    value={form.naicsCodes}
                    onChange={(e) => setForm({ ...form, naicsCodes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="541511, 541512"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Agencies</label>
                  <input
                    type="text"
                    value={form.agencies}
                    onChange={(e) => setForm({ ...form, agencies: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="DOD, GSA, DHS"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Posted From</label>
                  <input
                    type="date"
                    value={form.postedFromDate}
                    onChange={(e) => setForm({ ...form, postedFromDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Posted To</label>
                  <input
                    type="date"
                    value={form.postedToDate}
                    onChange={(e) => setForm({ ...form, postedToDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Award ($)</label>
                  <input
                    type="number"
                    value={form.minAward}
                    onChange={(e) => setForm({ ...form, minAward: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Award ($)</label>
                  <input
                    type="number"
                    value={form.maxAward}
                    onChange={(e) => setForm({ ...form, maxAward: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="10000000"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium">Save Search</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {searches.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-8 text-center">
          <p className="text-gray-400">No saved searches yet. Create one to start tracking opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((search) => (
            <div
              key={search.id}
              className={`bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
                selectedSearchId === search.id ? 'border-purple-500' : 'border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-medium truncate flex-1">{search.keywords?.join(', ')}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${search.status === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                  {search.status}
                </span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>{search.results_count || 0} results</div>
                <div>Last run: {formatLastRun(search.last_run)}</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleRunSearch(search.id)}
                  disabled={resultsLoading}
                  className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded disabled:opacity-50"
                >
                  {resultsLoading && selectedSearchId === search.id ? 'Running...' : 'Run Now'}
                </button>
                <button
                  onClick={() => handleDeleteSearch(search.id)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-red-400 text-sm rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchResults && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">
              Results ({searchResults.opportunities.length} of {searchResults.total})
            </h3>
            {searchResults.error && <span className="text-red-400 text-sm">{searchResults.error}</span>}
          </div>
          
          {searchResults.opportunities.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-8 text-center">
              <p className="text-gray-400">No opportunities found. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.opportunities.map((opp) => (
                <div key={opp.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{opp.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        {opp.agency} • {opp.solicitationNumber}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-500">Posted: {formatDate(opp.postedDate)}</span>
                        <span className="text-yellow-400">Due: {formatDate(opp.responseDeadline)}</span>
                        {opp.awardAmount && <span className="text-green-400">{opp.awardAmount}</span>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {opp.naicsCode && <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">NAICS: {opp.naicsCode}</span>}
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{opp.opportunityType}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleAddToInterested(opp)}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
                      >
                        + Interested
                      </button>
                      <a
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}