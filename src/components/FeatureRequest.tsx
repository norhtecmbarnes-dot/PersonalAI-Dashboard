'use client';

import { useState, useEffect } from 'react';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed';
  proposedChanges?: ProposedChange[];
  createdAt: number;
  updatedAt: number;
}

export interface ProposedChange {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  originalContent?: string;
  description: string;
  approved: boolean;
}

interface OpenCodeStatus {
  available: boolean;
  version?: string;
  error?: string;
}

interface FeatureRequestComponentProps {
  onSubmitFeature?: (request: FeatureRequest) => void;
  existingRequests?: FeatureRequest[];
}

export function FeatureRequestComponent({ 
  onSubmitFeature, 
  existingRequests = [] 
}: FeatureRequestComponentProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requests, setRequests] = useState<FeatureRequest[]>(existingRequests);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [opencodeStatus, setOpencodeStatus] = useState<OpenCodeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    checkOpenCodeStatus();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/features/request?action=list');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  const checkOpenCodeStatus = async () => {
    try {
      const response = await fetch('/api/features/request?action=opencode-status');
      if (response.ok) {
        const data = await response.json();
        setOpencodeStatus(data.status);
      }
    } catch (err) {
      console.error('Error checking OpenCode status:', err);
      setOpencodeStatus({ available: false, error: 'Failed to check OpenCode status' });
    }
  };

  const submitFeature = async () => {
    if (!title.trim() || !description.trim()) return;

    setIsLoading(true);
    setError(null);

    const newRequest: FeatureRequest = {
      id: Date.now().toString(36),
      title: title.trim(),
      description: description.trim(),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const response = await fetch('/api/features/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', request: newRequest }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(prev => [...prev, data.request]);
        setTitle('');
        setDescription('');
        onSubmitFeature?.(data.request);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting feature request:', error);
      setError('Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  const approveChange = async (requestId: string, changeIndex: number) => {
    try {
      const response = await fetch('/api/features/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approveChange', 
          requestId, 
          changeIndex 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(prev => prev.map(r => 
          r.id === requestId ? data.request : r
        ));
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(data.request);
        }
      }
    } catch (error) {
      console.error('Error approving change:', error);
    }
  };

  const rejectChange = async (requestId: string, changeIndex: number) => {
    try {
      const response = await fetch('/api/features/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'rejectChange', 
          requestId, 
          changeIndex 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(prev => prev.map(r => 
          r.id === requestId ? data.request : r
        ));
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(data.request);
        }
      }
    } catch (error) {
      console.error('Error rejecting change:', error);
    }
  };

  const applyChanges = async (requestId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/features/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', requestId }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(prev => prev.map(r => 
          r.id === requestId ? data.request : r
        ));
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(data.request);
        }
      }
    } catch (error) {
      console.error('Error applying changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const implementWithOpenCode = async (requestId: string) => {
    if (!opencodeStatus?.available) {
      setError('OpenCode is not available. ' + (opencodeStatus?.error || ''));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/features/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'implement', requestId }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(prev => prev.map(r => 
          r.id === requestId ? data.request : r
        ));
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(data.request);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Implementation failed');
      }
    } catch (error) {
      console.error('Error implementing feature:', error);
      setError('Failed to implement feature');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'in_progress': return 'text-blue-400';
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'completed': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="w-1/3 border-r border-gray-700 pr-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">Feature Requests</h3>
            {opencodeStatus && (
              <span className={`text-xs px-2 py-1 rounded ${opencodeStatus.available ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'}`}>
                OpenCode: {opencodeStatus.available ? 'Available' : 'Unavailable'}
              </span>
            )}
          </div>
          
          {error && (
            <div className="mb-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Feature title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <textarea
            placeholder="Describe the feature you want..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          />
          <button
            onClick={submitFeature}
            disabled={isLoading || !title.trim() || !description.trim()}
            className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
          >
            {isLoading ? 'Processing...' : 'Submit Request'}
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[400px]">
          {requests.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No feature requests yet
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedRequest?.id === request.id 
                    ? 'bg-purple-900/50 border border-purple-500' 
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-white">{request.title}</span>
                  <span className={`text-xs ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {request.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="w-2/3">
            {selectedRequest ? (
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedRequest.title}</h3>
                <p className="text-gray-400 mt-1">{selectedRequest.description}</p>
              </div>
              <div className="flex gap-2">
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'rejected') && (
                  <button
                    onClick={() => implementWithOpenCode(selectedRequest.id)}
                    disabled={isLoading || !opencodeStatus?.available}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
                  >
                    {isLoading ? 'Implementing...' : 'Implement with OpenCode'}
                  </button>
                )}
                {selectedRequest.status === 'completed' && (
                  <span className="px-4 py-2 bg-green-600 text-white rounded text-sm">
                    ✓ Implemented
                  </span>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <span className="px-4 py-2 bg-blue-600 text-white rounded text-sm animate-pulse">
                    Implementing...
                  </span>
                )}
              </div>
            </div>

            {selectedRequest.proposedChanges && selectedRequest.proposedChanges.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-white font-medium">Implementation Results</h4>
                {selectedRequest.proposedChanges.map((change, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded border ${
                      change.approved 
                        ? 'bg-green-900/20 border-green-700' 
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        change.action === 'create' ? 'bg-green-700' :
                        change.action === 'modify' ? 'bg-blue-700' :
                        'bg-red-700'
                      } text-white`}>
                        {change.action}
                      </span>
                      <span className="text-white font-mono text-sm">
                        {change.filePath}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{change.description}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedRequest.status === 'pending' && (
              <div className="text-gray-500 italic mt-4">
                Click "Implement with OpenCode" to automatically build this feature.
                OpenCode will explore the codebase and implement the feature directly.
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a feature request to view details
          </div>
        )}
      </div>
    </div>
  );
}
