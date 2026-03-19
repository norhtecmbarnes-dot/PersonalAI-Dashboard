'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  content?: string;
  category?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export function EnhancedDocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents/import?action=list');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Reading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('remember', remember.toString());

      setUploadProgress('Processing document...');

      const response = await fetch('/api/documents/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadProgress(`Imported: ${data.document.importance} importance`);
        loadDocuments();

        setTimeout(() => {
          setUploadProgress('');
          setSelectedDoc(data.document);
        }, 2000);
      } else {
        setUploadProgress('Error uploading file');
      }
    } catch (error) {
      setUploadProgress('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (
      !confirm(`Are you sure you want to delete "${docTitle}"?\n\nThis action cannot be undone.`)
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/import?id=${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(docs => docs.filter(d => d.id !== docId));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ALL ${documents.length} documents?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      let deleted = 0;
      for (const doc of documents) {
        const response = await fetch(`/api/documents/import?id=${doc.id}`, {
          method: 'DELETE',
        });
        if (response.ok) deleted++;
      }
      setDocuments([]);
      setSelectedDoc(null);
      alert(`Deleted ${deleted} documents`);
    } catch (error) {
      console.error('Error clearing documents:', error);
      alert('Error clearing documents');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChat = async () => {
    if (!selectedDoc || !chatQuestion.trim()) return;

    setIsChatting(true);
    try {
      const response = await fetch('/api/documents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          question: chatQuestion,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatAnswer(data.answer);
      }
    } catch (error) {
      console.error('Error chatting:', error);
    } finally {
      setIsChatting(false);
    }
  };

  const loadBriefing = async () => {
    try {
      const response = await fetch('/api/documents/import?action=briefing');
      const data = await response.json();
      setBriefing(data.briefing);
      setShowBriefing(true);
    } catch (error) {
      console.error('Error loading briefing:', error);
    }
  };

  const searchDocuments = async () => {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }

    try {
      const response = await fetch(
        `/api/documents/import?action=search&query=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const getImportanceColor = (tags: string[]) => {
    if (tags.includes('importance:critical')) return 'bg-red-900/50 text-red-300 border-red-700';
    if (tags.includes('importance:high'))
      return 'bg-orange-900/50 text-orange-300 border-orange-700';
    if (tags.includes('importance:medium'))
      return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    return 'bg-gray-900/50 text-gray-300 border-gray-700';
  };

  const filteredDocs = documents.filter(
    doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatSize = (content?: string) => {
    if (!content) return '0 KB';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-white mb-4">Import Document</h3>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.md,.pdf,.docx,.doc,.csv,.json,.xml,.html"
                className="hidden"
                disabled={isUploading}
              />
              <div className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-center">
                {isUploading ? 'Processing...' : 'Choose File'}
              </div>
            </label>

            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4"
              />
              Remember
            </label>
          </div>

          {uploadProgress && (
            <div className="p-2 bg-gray-700 rounded text-sm text-purple-300">{uploadProgress}</div>
          )}

          <div className="flex gap-2 mt-4">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchDocuments()}
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            />
            <button
              onClick={searchDocuments}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Search
            </button>
            <button
              onClick={loadBriefing}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm"
            >
              Weekly Briefing
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span className="text-gray-400 text-sm">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
            {filteredDocs.length > 0 &&
              ` (${filteredDocs.reduce((sum, d) => sum + (d.content?.length || 0), 0).toLocaleString()} chars)`}
          </span>
          {filteredDocs.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isDeleting}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 disabled:bg-gray-600 text-white rounded text-sm"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedDoc?.id === doc.id
                  ? 'bg-purple-900/30 border-purple-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                  <h4 className="font-medium text-white">{doc.title}</h4>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags
                      .filter(t => !t.startsWith('importance:') && !t.startsWith('type:'))
                      .slice(0, 4)
                      .map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded border ${getImportanceColor(doc.tags)}`}
                  >
                    {doc.tags.find(t => t.startsWith('importance:'))?.split(':')[1] || 'medium'}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(doc.id, doc.title);
                    }}
                    disabled={isDeleting}
                    className="text-gray-500 hover:text-red-400 disabled:text-gray-600"
                    title="Delete document"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(doc.createdAt).toLocaleDateString()} • {formatSize(doc.content)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        {showBriefing ? (
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Weekly Briefing</h3>
              <button
                onClick={() => setShowBriefing(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">{briefing}</pre>
          </div>
        ) : selectedDoc ? (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-white">{selectedDoc.title}</h3>
              <button
                onClick={() => handleDelete(selectedDoc.id, selectedDoc.title)}
                disabled={isDeleting}
                className="text-gray-500 hover:text-red-400 disabled:text-gray-600"
                title="Delete document"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {selectedDoc.category} • {new Date(selectedDoc.createdAt).toLocaleDateString()} •{' '}
              {formatSize(selectedDoc.content)}
            </p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Chat with Document</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={e => setChatQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="Ask about this document..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  disabled={isChatting}
                />
                <button
                  onClick={handleChat}
                  disabled={isChatting || !chatQuestion.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm"
                >
                  {isChatting ? '...' : 'Ask'}
                </button>
              </div>
            </div>

            {chatAnswer && (
              <div className="p-3 bg-gray-900 rounded text-sm text-gray-300 mb-4">{chatAnswer}</div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">Content Preview</h4>
                <button
                  onClick={() => setShowContent(!showContent)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {showContent ? 'Hide' : 'Show Full'}
                </button>
              </div>
              <div
                className={`p-3 bg-gray-900 rounded text-sm text-gray-400 ${showContent ? 'max-h-[500px]' : 'max-h-[200px]'} overflow-y-auto`}
              >
                {showContent
                  ? selectedDoc.content
                  : `${selectedDoc.content?.substring(0, 500)}${(selectedDoc.content?.length || 0) > 500 ? '...' : ''}`}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col items-center justify-center text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>Select a document to view details</p>
            <p className="text-sm mt-2">Or upload a new document to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
