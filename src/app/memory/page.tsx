'use client';

import { useState, useEffect, useRef } from 'react';

interface MemorySection {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  lastAccessed: string;
  relatedDocuments: string[];
}

interface Brand {
  id: string;
  name: string;
  industry?: string;
  voiceProfile?: string;
  keyDocuments: string[];
}

interface MemoryFile {
  version: string;
  lastUpdated: string;
  user: {
    name: string;
    role?: string;
    organization?: string;
    preferences: Record<string, string>;
  };
  projects: Project[];
  brands: Brand[];
  knowledge: MemorySection[];
  conversations: {
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    lastSession: string;
  };
  context: {
    currentFocus?: string;
    recentFiles: string[];
    activeQueries: string[];
  };
}

export default function MemoryPage() {
  const [memory, setMemory] = useState<MemoryFile | null>(null);
  const [soul, setSoul] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'memory' | 'soul' | 'prompt'>('memory');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    setLoading(true);
    try {
      const [memRes, soulRes] = await Promise.all([
        fetch('/api/memory-file?action=memory'),
        fetch('/api/memory-file?action=soul')
      ]);
      const memData = await memRes.json();
      const soulData = await soulRes.json();
      if (memData.success) setMemory(memData.memory);
      if (soulData.success) setSoul(soulData.soul);
    } catch (e) {
      console.error('Failed to load memory:', e);
    }
    setLoading(false);
  };

  const updateUser = async () => {
    const name = prompt('Enter your name:', memory?.user.name || '');
    if (name === null) return;
    
    await fetch('/api/memory-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateUser',
        user: { ...memory?.user, name }
      })
    });
    loadMemory();
  };

  const [showAddKnowledgeModal, setShowAddKnowledgeModal] = useState(false);
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [knowledgeImportance, setKnowledgeImportance] = useState('medium');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAddKnowledgeModal = () => {
    setShowAddKnowledgeModal(true);
    setKnowledgeTitle('');
    setKnowledgeContent('');
    setKnowledgeImportance('medium');
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const closeAddKnowledgeModal = () => {
    setShowAddKnowledgeModal(false);
    setKnowledgeTitle('');
    setKnowledgeContent('');
    setKnowledgeImportance('medium');
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set title from filename
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setKnowledgeTitle(fileName);
    }
  };

  const processDocumentWithAI = async (content: string, title: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen3.5:9b',
          message: `Contextualize and summarize this document content for the knowledge base. Extract key insights, important facts, and organize it clearly:

Title: ${title}
Content: ${content.substring(0, 8000)}

Provide a structured summary with:
1. Main topic/purpose
2. Key points and insights
3. Important facts or data
4. Actionable takeaways

Format as markdown.`,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.message?.content || content;
      }
    } catch (error) {
      console.error('AI processing error:', error);
    }
    return content;
  };

  const saveKnowledgeEntry = async () => {
    if (!knowledgeTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!knowledgeContent.trim() && !selectedFile) {
      alert('Please enter content or upload a document');
      return;
    }

    setUploadingDocument(true);

    try {
      let finalContent = knowledgeContent;

      // If there's a file, process it
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('remember', 'true');

        const response = await fetch('/api/documents/import', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          finalContent = `## ${data.document.title}\n\n${data.document.summary || 'Document imported successfully'}\n\n**Original File:** ${selectedFile.name}\n\n---\n\n${knowledgeContent}`;
        } else {
          const error = await response.json();
          alert('Failed to upload document: ' + error.error);
          setUploadingDocument(false);
          return;
        }
      }

      // Process content with AI for better contextualization
      const processedContent = await processDocumentWithAI(finalContent, knowledgeTitle);

      // Save to memory file
      await fetch('/api/memory-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addKnowledge',
          section: {
            id: knowledgeTitle.toLowerCase().replace(/\s+/g, '-'),
            title: knowledgeTitle,
            content: processedContent,
            lastUpdated: new Date().toISOString(),
            importance: knowledgeImportance,
            tags: selectedFile ? ['document', 'uploaded'] : ['manual-entry'],
          }
        })
      });

      // Also add to vector lake for searchability
      try {
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'importDocument',
            data: {
              title: knowledgeTitle,
              content: processedContent,
              type: 'text',
              tags: ['knowledge-base', knowledgeImportance],
            }
          })
        });
      } catch (e) {
        console.log('Vector store update optional');
      }

      closeAddKnowledgeModal();
      loadMemory();
    } catch (error) {
      console.error('Error saving knowledge:', error);
      alert('Failed to save knowledge entry');
    }

    setUploadingDocument(false);
  };

  const addProject = async () => {
    const name = prompt('Project name:');
    if (!name) return;
    
    const description = prompt('Project description:');
    if (!description) return;
    
    await fetch('/api/memory-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addProject',
        project: {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          description,
          status: 'active',
          lastAccessed: new Date().toISOString(),
          relatedDocuments: []
        }
      })
    });
    loadMemory();
  };

  const saveSoul = async (newSoul: string) => {
    await fetch('/api/memory-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateSoul',
        soul: newSoul
      })
    });
  };

  const resetMemory = async () => {
    if (!confirm('Reset all memory? This cannot be undone.')) return;
    await fetch('/api/memory-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
    loadMemory();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading memory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">MEMORY.md</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'memory' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Memory
            </button>
            <button
              onClick={() => setActiveTab('soul')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'soul' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              SOUL.md
            </button>
            <button
              onClick={resetMemory}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>

        {activeTab === 'memory' && memory && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">User Profile</h2>
                <button
                  onClick={updateUser}
                  className="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-slate-300">
                <div>
                  <span className="text-slate-500">Name:</span> {memory.user.name || 'Not set'}
                </div>
                <div>
                  <span className="text-slate-500">Role:</span> {memory.user.role || 'Not set'}
                </div>
                <div>
                  <span className="text-slate-500">Organization:</span> {memory.user.organization || 'Not set'}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Projects ({memory.projects.length})</h2>
                <button
                  onClick={addProject}
                  className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  + Add Project
                </button>
              </div>
              <div className="grid gap-3">
                {memory.projects.length === 0 ? (
                  <div className="text-slate-500">No projects yet</div>
                ) : (
                  memory.projects.map(project => (
                    <div key={project.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{project.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          project.status === 'active' ? 'bg-green-600' :
                          project.status === 'paused' ? 'bg-yellow-600' :
                          project.status === 'completed' ? 'bg-blue-600' : 'bg-slate-600'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{project.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Brands ({memory.brands.length})</h2>
              </div>
              {memory.brands.length === 0 ? (
                <div className="text-slate-500">No brands. Add brands in the Brand Workspace.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {memory.brands.map(brand => (
                    <div key={brand.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="font-medium text-white">{brand.name}</div>
                      {brand.industry && <div className="text-sm text-slate-400">{brand.industry}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Knowledge ({memory.knowledge.length})</h2>
                <div className="flex items-center gap-2">
                <button
                  onClick={openAddKnowledgeModal}
                  className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  + Add Knowledge
                </button>
              </div>
              </div>
              <div className="space-y-3">
                {memory.knowledge.length === 0 ? (
                  <div className="text-slate-500">No knowledge entries yet</div>
                ) : (
                  memory.knowledge.map(entry => (
                    <div key={entry.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{entry.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          entry.importance === 'critical' ? 'bg-red-600' :
                          entry.importance === 'high' ? 'bg-orange-600' :
                          entry.importance === 'medium' ? 'bg-yellow-600' : 'bg-slate-600'
                        }`}>
                          {entry.importance}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mt-2 line-clamp-2">{entry.content}</div>
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {entry.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-600 rounded text-xs text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Conversation Context</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-slate-500">Last session:</span>
                  <span className="text-slate-300 ml-2">{new Date(memory.conversations.lastSession).toLocaleString()}</span>
                </div>
                {memory.conversations.keyTopics.length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-2">Key Topics:</div>
                    <div className="flex flex-wrap gap-2">
                      {memory.conversations.keyTopics.map(topic => (
                        <span key={topic} className="px-2 py-1 bg-purple-600/30 rounded text-purple-300 text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {memory.conversations.actionItems.length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-2">Action Items:</div>
                    <ul className="list-disc list-inside text-slate-300">
                      {memory.conversations.actionItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Current Context</h2>
              {memory.context.currentFocus && (
                <div className="mb-3">
                  <span className="text-slate-500">Focus:</span>
                  <span className="text-slate-300 ml-2">{memory.context.currentFocus}</span>
                </div>
              )}
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500">Recent Files:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {memory.context.recentFiles.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'soul' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">SOUL.md - AI Personality</h2>
            <textarea
              value={soul}
              onChange={(e) => {
                setSoul(e.target.value);
                saveSoul(e.target.value);
              }}
              className="w-full h-96 bg-slate-900 text-slate-300 font-mono text-sm p-4 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
              placeholder="Define the AI's personality..."
            />
            <div className="mt-4 text-slate-400 text-sm">
              This file defines the AI assistant's personality and behavior. Changes are saved automatically.
            </div>
          </div>
        )}

        <div className="mt-8 bg-slate-800/30 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-2">About MEMORY.md</h3>
          <p className="text-slate-400 text-sm">
            MEMORY.md is a structured memory file that persists across sessions. It stores:
          </p>
          <ul className="text-slate-400 text-sm mt-2 list-disc list-inside">
            <li>User profile and preferences</li>
            <li>Project context and status</li>
            <li>Brand knowledge and voice profiles</li>
            <li>Learned knowledge entries</li>
            <li>Conversation summaries and action items</li>
            <li>Current work context</li>
          </ul>
          <p className="text-slate-400 text-sm mt-3">
            The AI uses this context to provide personalized, context-aware responses.
          </p>
        </div>

        {/* Add Knowledge Modal */}
        {showAddKnowledgeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-4">Add Knowledge</h2>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setSelectedFile(null)}
                  className={`px-4 py-2 rounded-lg ${!selectedFile ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  Type Content
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2 rounded-lg ${selectedFile ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  Upload Document
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.docx"
              />

              {/* Title Input */}
              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
                  placeholder="Enter knowledge title..."
                />
              </div>

              {/* Importance Selection */}
              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Importance
                </label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high', 'critical'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setKnowledgeImportance(level)}
                      className={`px-3 py-1 rounded ${
                        knowledgeImportance === level
                          ? level === 'critical' ? 'bg-red-600 text-white' :
                            level === 'high' ? 'bg-orange-600 text-white' :
                            level === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-slate-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload Info */}
              {selectedFile && (
                <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-slate-400 text-sm">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Content Textarea */}
              {!selectedFile && (
                <div className="mb-4">
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Content
                  </label>
                  <textarea
                    value={knowledgeContent}
                    onChange={(e) => setKnowledgeContent(e.target.value)}
                    className="w-full h-48 bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Enter your knowledge content here..."
                  />
                </div>
              )}

              {/* Progress Bar */}
              {uploadingDocument && (
                <div className="mb-4">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-sm mt-2">Processing with AI...</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeAddKnowledgeModal}
                  disabled={uploadingDocument}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveKnowledgeEntry}
                  disabled={uploadingDocument || !knowledgeTitle.trim() || (!knowledgeContent.trim() && !selectedFile)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingDocument ? 'Processing...' : 'Save Knowledge'}
                </button>
              </div>

              <p className="text-slate-500 text-sm mt-4">
                {selectedFile 
                  ? 'The document will be processed with AI to extract key insights and added to the vector lake for searchability.'
                  : 'Your knowledge will be contextualized by AI and stored in the vector lake for enhanced searchability.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}