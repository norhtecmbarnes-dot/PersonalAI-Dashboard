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
      const response = await fetch(`/api/documents/import?action=search&query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const getImportanceColor = (tags: string[]) => {
    if (tags.includes('importance:critical')) return 'bg-red-900/50 text-red-300 border-red-700';
    if (tags.includes('importance:high')) return 'bg-orange-900/50 text-orange-300 border-orange-700';
    if (tags.includes('importance:medium')) return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    return 'bg-gray-900/50 text-gray-300 border-gray-700';
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4"
              />
              Remember
            </label>
          </div>

          {uploadProgress && (
            <div className="p-2 bg-gray-700 rounded text-sm text-purple-300">
              {uploadProgress}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchDocuments()}
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

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedDoc?.id === doc.id
                  ? 'bg-purple-900/30 border-purple-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-white">{doc.title}</h4>
                <span className={`text-xs px-2 py-1 rounded border ${getImportanceColor(doc.tags)}`}>
                  {doc.tags.find(t => t.startsWith('importance:'))?.split(':')[1] || 'medium'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {doc.tags.filter(t => !t.startsWith('importance:') && !t.startsWith('type:')).slice(0, 4).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                    {tag}
                  </span>
                ))}
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
            <h3 className="text-lg font-semibold text-white mb-2">{selectedDoc.title}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {selectedDoc.category} • {new Date(selectedDoc.createdAt).toLocaleDateString()}
            </p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Chat with Document</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
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
              <div className="p-3 bg-gray-900 rounded text-sm text-gray-300 mb-4">
                {chatAnswer}
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Content Preview</h4>
              <div className="p-3 bg-gray-900 rounded text-sm text-gray-400 max-h-[300px] overflow-y-auto">
                {selectedDoc.content?.substring(0, 2000)}...
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 h-full flex items-center justify-center text-gray-500">
            Select a document to view details
          </div>
        )}
      </div>
    </div>
  );
}
