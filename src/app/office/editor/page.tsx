'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Document {
  id: string;
  title: string;
  fileType: string;
  createdAt: number;
  updatedAt: number;
}

interface ServerStatus {
  checked: boolean;
  running: boolean;
  message: string;
}

function EditorContent() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    checked: false,
    running: false,
    message: 'Checking ONLYOFFICE...'
  });
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'word' | 'cell' | 'slide'>('word');
  const ONLYOFFICE_URL = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;
  const isOnlyOfficeConfigured = !!ONLYOFFICE_URL && ONLYOFFICE_URL.trim() !== '';
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(!isOnlyOfficeConfigured);
  
  // For local development, use localhost. For Docker-based ONLYOFFICE, use host.docker.internal
  const DASHBOARD_URL = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}`
    : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

  useEffect(() => {
    if (isOnlyOfficeConfigured) {
      checkOnlyOfficeStatus();
    } else {
      setServerStatus({
        checked: true,
        running: false,
        message: 'ONLYOFFICE not configured. Please set NEXT_PUBLIC_ONLYOFFICE_URL in .env.local'
      });
    }
    loadDocuments();
  }, []);

  // Auto-open document from URL param
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && serverStatus.running && documents.length > 0 && !currentDoc) {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        setCurrentDoc(doc);
      }
    }
  }, [searchParams, serverStatus.running, documents, currentDoc]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const checkOnlyOfficeStatus = async () => {
    try {
      const res = await fetch('/api/onlyoffice/status', { 
        cache: 'no-store',
      });
      
      const data = await res.json();
      
      setServerStatus({ 
        checked: true, 
        running: data.running, 
        message: data.running 
          ? '✅ ONLYOFFICE Document Server ready' 
          : `❌ ${data.message}`
      });
    } catch {
      setServerStatus({
        checked: true,
        running: false,
        message: '❌ Cannot check ONLYOFFICE status'
      });
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/onlyoffice/documents?action=list');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      setError('Failed to load documents');
    }
    setLoading(false);
  };

  const createDocument = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: { title: newTitle, type: newType },
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Document "${newTitle}" created`);
        setShowNewModal(false);
        setNewTitle('');
        loadDocuments();
      } else {
        setError(data.error || 'Failed to create document');
      }
    } catch (err) {
      setError('Failed to create document');
    }
    setCreating(false);
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    
    try {
      await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          data: { documentId: id },
        }),
      });
      loadDocuments();
      if (currentDoc?.id === id) {
        setCurrentDoc(null);
      }
      setSuccess('Document deleted');
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  // Local document generation (no ONLYOFFICE needed)
  const generateLocalDocument = async (docType: 'word' | 'cell' | 'slide') => {
    const title = newTitle.trim() || `New Document.${docType === 'word' ? 'docx' : docType === 'cell' ? 'xlsx' : 'pptx'}`;
    setCreating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: docType,
          content: ['Generated by AI Dashboard'],
          headers: ['Column 1', 'Column 2', 'Column 3'],
          rows: [['Data 1', 'Data 2', 'Data 3']],
          slides: [{ title: 'Slide 1', bulletPoints: ['Point 1', 'Point 2'] }]
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`Downloaded: ${title}`);
        setShowNewModal(false);
        setNewTitle('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to generate document');
      }
    } catch (err) {
      setError('Failed to generate document');
    }
    setCreating(false);
  };

  const openDocument = useCallback((doc: Document) => {
    if (!serverStatus.running) {
      setError('Start ONLYOFFICE server first');
      return;
    }
    setCurrentDoc(doc);
    setError(null);
    logEvent('document_open', { docId: doc.id, title: doc.title });
  }, [serverStatus.running]);

  // Self-improving log endpoint
  const logEvent = async (event: string, details: any) => {
    console.log(`[OnlyOffice] ${event}`, details);
    try {
      await fetch('/api/office-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: 'onlyoffice', 
          event, 
          details, 
          timestamp: Date.now() 
        })
      });
    } catch {
      // Silent fail - logging shouldn't break the app
    }
  };

  // Stable key for OnlyOffice (prevents cache/security errors)
  const getDocumentKey = (doc: Document) => {
    // Key must change for each edit session to bypass OnlyOffice cache
    // Use document updatedAt timestamp as version
    return `${doc.id}_${doc.updatedAt}`;
  };

  // Get document type for OnlyOffice
  const getDocumentType = (fileType: string): 'word' | 'cell' | 'slide' => {
    if (fileType.includes('xls')) return 'cell';
    if (fileType.includes('ppt')) return 'slide';
    return 'word';
  };

  // Generate OnlyOffice config
  const config = currentDoc ? {
    document: {
      fileType: currentDoc.fileType,
      key: getDocumentKey(currentDoc),
      title: currentDoc.title,
      url: `${DASHBOARD_URL}/api/onlyoffice/download?id=${currentDoc.id}`,
      permissions: { 
        edit: true, 
        download: true, 
        print: true,
        comment: true,
        review: true 
      },
    },
    documentType: getDocumentType(currentDoc.fileType),
    editorConfig: {
      mode: 'edit' as const,
      lang: 'en',
      callbackUrl: `${DASHBOARD_URL}/api/onlyoffice/callback`,
      user: { 
        id: 'ai-dashboard-user', 
        name: 'AI Dashboard User' 
      },
      customization: {
        autosave: true,
        forcesave: true,
        chat: false,
        comments: true,
        uiTheme: 'theme-dark',
        compactHeader: false,
        compactToolbar: false,
        hideRightMenu: false,
        toolbarNoTabs: false,
      },
    },
    width: '100%',
    height: '100%',
  } : null;

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'xlsx': return '📊';
      case 'pptx': return '📽️';
      default: return '📄';
    }
  };

  const getFileColor = (fileType: string) => {
    switch (fileType) {
      case 'xlsx': return 'text-green-400';
      case 'pptx': return 'text-orange-400';
      default: return 'text-blue-400';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Toast notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg animate-fade-in">
          {success}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Document Editor</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${
                localMode ? 'bg-blue-500' : serverStatus.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></span>
              <span className={`text-sm ${localMode ? 'text-blue-400' : serverStatus.running ? 'text-green-400' : 'text-red-400'}`}>
                {localMode ? 'Local Mode (Download)' : serverStatus.message}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Mode Toggle */}
            {isOnlyOfficeConfigured && (
              <button
                onClick={() => setLocalMode(!localMode)}
                className={`px-4 py-2 rounded-lg ${
                  localMode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {localMode ? '✓ Local Mode' : 'Use Local Mode'}
              </button>
            )}
            <button
              onClick={() => localMode ? setShowNewModal(true) : (serverStatus.running && setShowNewModal(true))}
              disabled={!localMode && !serverStatus.running}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              + New Document
            </button>
            <Link
              href="/office"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              AI Tools
            </Link>
          </div>
        </div>

        {/* Server Status Banner - Only show when NOT in local mode */}
        {localMode && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💾</span>
              <div>
                <h3 className="font-semibold text-white">Local Document Generation</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Documents are generated locally and downloaded to your computer. No external server needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {!localMode && !serverStatus.running && serverStatus.checked && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-white">ONLYOFFICE Document Server Not Running</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Start the server to edit documents in your browser, or use Local Mode to generate downloadable files.
                </p>
                <button
                  onClick={() => setLocalMode(true)}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Switch to Local Mode
                </button>
                <div className="mt-3 bg-slate-900 p-3 rounded font-mono text-sm overflow-x-auto">
                  <div className="text-slate-500"># Start existing container</div>
                  <div className="text-green-400">docker start onlyoffice</div>
                  <div className="mt-2 text-slate-500"># Or install fresh</div>
                  <div className="text-green-400">docker run -i -t -d -p 8080:80 --restart=always --name onlyoffice onlyoffice/documentserver</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Document List */}
          <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur rounded-xl p-4 max-h-[calc(100vh-200px)] overflow-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-slate-400 text-center py-8">
                <p className="text-4xl mb-2">📝</p>
                <p>No documents yet</p>
                <button
                  onClick={() => (localMode || serverStatus.running) && setShowNewModal(true)}
                  disabled={!localMode && !serverStatus.running}
                  className="mt-2 text-blue-400 hover:underline disabled:text-slate-500"
                >
                  Create your first document
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => openDocument(doc)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      currentDoc?.id === doc.id
                        ? 'bg-blue-600/30 border-2 border-blue-500'
                        : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${getFileColor(doc.fileType)}`}>
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(doc.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => window.open(`/api/onlyoffice/download?id=${doc.id}`, '_blank')}
                        className="text-xs px-2 py-1 bg-slate-600 rounded hover:bg-slate-500"
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="text-xs px-2 py-1 bg-red-600/50 rounded hover:bg-red-600"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor Area */}
          <div className="lg:col-span-3 bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            {error && (
              <div className="p-4 bg-red-900/50 border-b border-red-700 text-red-200">
                {error}
              </div>
            )}

            {!serverStatus.running ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <span className="text-6xl mb-4">🔌</span>
                <p className="text-xl font-semibold">Start ONLYOFFICE to Edit</p>
                <p className="mt-2">docker start onlyoffice</p>
              </div>
            ) : !currentDoc ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <span className="text-6xl mb-4">📝</span>
                <p className="text-xl font-semibold">Select or Create a Document</p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + New Document
                </button>
              </div>
            ) : config ? (
              <DocumentEditor
                id={`onlyoffice-editor-${currentDoc.id}`}
                documentServerUrl={ONLYOFFICE_URL || ''}
                config={config}
                events_onDocumentReady={() => {
                  setSuccess('Document ready for editing');
                  logEvent('document_ready', { docId: currentDoc.id });
                }}
                events_onError={(e: any) => {
                  setError(`Editor error: ${e?.errorDescription || 'Unknown error'}`);
                  logEvent('editor_error', { docId: currentDoc.id, error: e });
                }}
              />
            ) : null}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 bg-slate-800/50 backdrop-blur rounded-xl p-4 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-4">
            <span>Server: {ONLYOFFICE_URL}</span>
            <span>•</span>
            <span>Documents: {documents.length}</span>
            {currentDoc && (
              <>
                <span>•</span>
                <span>Editing: {currentDoc.title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              serverStatus.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></span>
            <span>{serverStatus.running ? 'Ready' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* New Document Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">New Document</h3>
            
            <div className="mb-4">
              <label className="block text-slate-400 mb-2">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="My Document"
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createDocument()}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-slate-400 mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewType('word')}
                  className={`flex-1 p-3 rounded-lg transition-colors ${
                    newType === 'word' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  📄 Word
                </button>
                <button
                  onClick={() => setNewType('cell')}
                  className={`flex-1 p-3 rounded-lg transition-colors ${
                    newType === 'cell' ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => setNewType('slide')}
                  className={`flex-1 p-3 rounded-lg transition-colors ${
                    newType === 'slide' ? 'bg-orange-600' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  📽️ Slides
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createDocument}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfficeEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}