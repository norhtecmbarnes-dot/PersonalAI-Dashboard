'use client';

import { useState, useEffect } from 'react';

interface SensitiveEntry {
  id: string;
  service: string;
  type: 'api_key' | 'password' | 'credential' | 'secret' | 'token';
  key?: string;
  maskedValue: string;
  username?: string;
  url?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  lastUsed?: number;
}

interface ApiKeyStatus {
  provider: string;
  hasKey: boolean;
  keyId?: string;
  lastUsed?: number;
}

export default function SecureStoragePage() {
  const [entries, setEntries] = useState<SensitiveEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [stats, setStats] = useState<{ total: number; byType: Record<string, number> } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formService, setFormService] = useState('');
  const [formType, setFormType] = useState<
    'api_key' | 'password' | 'credential' | 'secret' | 'token'
  >('api_key');
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Export/Import
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // New API key form
  const [apiKeyProvider, setApiKeyProvider] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [listRes, keysRes, statsRes] = await Promise.all([
        fetch('/api/secure-storage?action=list'),
        fetch('/api/secure-storage?action=api-keys'),
        fetch('/api/secure-storage?action=stats'),
      ]);

      const listData = await listRes.json();
      const keysData = await keysRes.json();
      const statsData = await statsRes.json();

      if (listData.success) setEntries(listData.entries || []);
      if (keysData.success) setApiKeys(keysData.keys || []);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!formService || !formValue) return;

    try {
      const response = await fetch('/api/secure-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          service: formService,
          type: formType,
          key: formKey || undefined,
          value: formValue,
          username: formUsername || undefined,
          url: formUrl || undefined,
          notes: formNotes || undefined,
        }),
      });

      if (response.ok) {
        setShowAddForm(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;

    try {
      await fetch('/api/secure-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleAddApiKey = async () => {
    if (!apiKeyProvider || !apiKeyValue) return;

    try {
      await fetch('/api/secure-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          service: apiKeyProvider,
          type: 'api_key',
          value: apiKeyValue,
        }),
      });
      setApiKeyProvider('');
      setApiKeyValue('');
      loadData();
    } catch (error) {
      console.error('Error adding API key:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/secure-storage?action=export');
      const data = await response.json();
      if (data.success) {
        setExportData(JSON.stringify(data.data, null, 2));
        setShowExport(true);
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    try {
      const parsed = JSON.parse(importData);
      const response = await fetch('/api/secure-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          entries: parsed.entries,
          merge: true,
        }),
      });

      if (response.ok) {
        setShowImport(false);
        setImportData('');
        loadData();
        alert('Import successful!');
      }
    } catch (error) {
      alert('Invalid import data. Please check the format.');
    }
  };

  const handlePurge = async () => {
    if (
      !confirm(
        '⚠️ DELETE ALL SENSITIVE DATA?\n\nThis will permanently delete all API keys, passwords, and credentials.\n\nThis action CANNOT be undone.'
      )
    )
      return;
    if (!confirm('Are you really sure? Type "DELETE" to confirm.')) return;

    try {
      const response = await fetch('/api/secure-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge' }),
      });

      const data = await response.json();
      if (data.success) {
        loadData();
        alert(`Deleted ${data.deleted} entries`);
      }
    } catch (error) {
      console.error('Error purging:', error);
    }
  };

  const resetForm = () => {
    setFormService('');
    setFormType('api_key');
    setFormKey('');
    setFormValue('');
    setFormUsername('');
    setFormUrl('');
    setFormNotes('');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      api_key: '🔑',
      password: '🔒',
      credential: '🔐',
      secret: '🙈',
      token: '🎫',
      pdf: '📄',
      docx: '📝',
      txt: '📃',
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Secure Storage</h1>
            <p className="text-gray-400 mt-1">Manage API keys, passwords, and sensitive data</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Export
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Import
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              + Add Entry
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Entries</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{stats.byType?.api_key || 0}</div>
              <div className="text-sm text-gray-400">API Keys</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.byType?.password || 0}
              </div>
              <div className="text-sm text-gray-400">Passwords</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {stats.byType?.credential || 0}
              </div>
              <div className="text-sm text-gray-400">Credentials</div>
            </div>
          </div>
        )}

        {/* API Keys Section */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">API Keys</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {apiKeys.map(key => (
              <div
                key={key.provider}
                className={`bg-gray-700 rounded p-3 border-2 ${key.hasKey ? 'border-green-600' : 'border-gray-600'}`}
              >
                <div className="font-medium text-white capitalize">{key.provider}</div>
                <div className="text-sm text-gray-400">
                  {key.hasKey ? '✓ Configured' : '○ Not set'}
                </div>
                {key.lastUsed && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last used: {formatDate(key.lastUsed)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Provider</label>
                <input
                  type="text"
                  value={apiKeyProvider}
                  onChange={e => setApiKeyProvider(e.target.value)}
                  placeholder="e.g., openai, anthropic, gemini"
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-sm text-gray-400 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKeyValue}
                  onChange={e => setApiKeyValue(e.target.value)}
                  placeholder="Enter API key..."
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddApiKey}
                disabled={!apiKeyProvider || !apiKeyValue}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded"
              >
                Add Key
              </button>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4">All Entries</h2>
          {entries.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No entries stored yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-gray-700 rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTypeIcon(entry.type)}</span>
                      <span className="font-medium text-white">{entry.service}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300 capitalize">
                        {entry.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Value:{' '}
                      <code className="bg-gray-800 px-2 py-0.5 rounded">{entry.maskedValue}</code>
                    </div>
                    {entry.username && (
                      <div className="text-sm text-gray-500">Username: {entry.username}</div>
                    )}
                    {entry.url && <div className="text-sm text-gray-500">URL: {entry.url}</div>}
                    {entry.notes && <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>}
                    <div className="text-xs text-gray-500 mt-2">
                      Created: {formatDate(entry.createdAt)}
                      {entry.lastUsed && ` • Last used: ${formatDate(entry.lastUsed)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mt-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">⚠️ Danger Zone</h2>
          <p className="text-gray-400 text-sm mb-4">
            Permanently delete all stored sensitive data. This cannot be undone.
          </p>
          <button
            onClick={handlePurge}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Purge All Data
          </button>
        </div>

        {/* Add Entry Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">Add New Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="api_key">API Key</option>
                    <option value="password">Password</option>
                    <option value="credential">Credential</option>
                    <option value="secret">Secret</option>
                    <option value="token">Token</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Service/Name *</label>
                  <input
                    type="text"
                    value={formService}
                    onChange={e => setFormService(e.target.value)}
                    placeholder="e.g., github, aws, email"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Key/Identifier</label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={e => setFormKey(e.target.value)}
                    placeholder="Optional identifier"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Value *</label>
                  <input
                    type="password"
                    value={formValue}
                    onChange={e => setFormValue(e.target.value)}
                    placeholder="Secret value"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">URL</label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={!formService || !formValue}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">Export Data</h3>
              <p className="text-gray-400 text-sm mb-4">
                This data is encrypted and can be imported on another device. Keep it safe!
              </p>
              <textarea
                readOnly
                value={exportData}
                className="w-full h-64 bg-gray-700 text-white rounded p-3 font-mono text-xs border border-gray-600"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigator.clipboard.writeText(exportData)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowExport(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">Import Data</h3>
              <p className="text-gray-400 text-sm mb-4">
                Paste exported data from another device. This will merge with existing data.
              </p>
              <textarea
                value={importData}
                onChange={e => setImportData(e.target.value)}
                placeholder="Paste exported JSON here..."
                className="w-full h-64 bg-gray-700 text-white rounded p-3 font-mono text-xs border border-gray-600"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleImport}
                  disabled={!importData}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowImport(false);
                    setImportData('');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
