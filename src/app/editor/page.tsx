'use client';

import { useState, useEffect, useCallback } from 'react';
import { CollabEditor } from '@/components/CollabEditor';
import type { CollabDocument, TrackedChange, Comment } from '@/types/collab-editor';

function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const defaultDocument: CollabDocument = {
  id: generateDocumentId(),
  title: 'Untitled Document',
  content: '',
  changes: [],
  comments: [],
  versions: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  author: 'User',
  documentType: 'general',
  metadata: {
    wordCount: 0,
    charCount: 0,
    pendingChanges: 0,
    unresolvedComments: 0,
    autoSaved: false,
  },
};

interface Brand {
  id: string;
  name: string;
  voice: string;
}

interface Project {
  id: string;
  name: string;
  files: string[];
}

export default function CollabEditorPage() {
  const [doc, setDoc] = useState<CollabDocument>(defaultDocument);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'html' | 'json'>('markdown');

  useEffect(() => {
    loadBrands();
    loadProjects();
    loadFromLocalStorage();
  }, []);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brand-workspace?action=list');
      const data = await response.json();
      if (data.brands) {
        setBrands(data.brands.map((b: any) => ({
          id: b.id,
          name: b.name,
          voice: b.voice || '',
        })));
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects?action=list');
      const data = await response.json();
      if (data.projects) {
        setProjects(data.projects.map((p: any) => ({
          id: p.id,
          name: p.name,
          files: p.files || [],
        })));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('collab_editor_document');
      if (saved) {
        const parsed = JSON.parse(saved);
        setDoc(parsed);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  const saveToLocalStorage = useCallback((document: CollabDocument) => {
    try {
      localStorage.setItem('collab_editor_document', JSON.stringify(document));
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (saveStatus === 'unsaved') {
        saveToLocalStorage(doc);
      }
    }, 2000);
    return () => clearTimeout(autoSave);
  }, [doc, saveStatus, saveToLocalStorage]);

  const handleDocumentChange = (updatedDoc: CollabDocument) => {
    setDoc(updatedDoc);
    setSaveStatus('unsaved');
  };

  const handleAIAction = async (action: string, selection?: { start: number; end: number; text: string }) => {
    setIsLoading(true);
    try {
      const brand = selectedBrandId ? brands.find(b => b.id === selectedBrandId) : null;
      const project = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

      const response = await fetch('/api/collab-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          documentId: doc.id,
          selection,
          context: {
            brandVoice: brand?.voice,
            projectFiles: project?.files,
            documentType: doc.documentType,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI action failed');
      }

      setDoc(prevDoc => {
        const newChanges: TrackedChange[] = data.changes.map((change: TrackedChange) => ({
          ...change,
          position: selection?.start || 0,
          positionEnd: selection?.end || 0,
        }));

        const newComments: Comment[] = data.comments || [];

        return {
          ...prevDoc,
          changes: [...prevDoc.changes, ...newChanges],
          comments: [...prevDoc.comments, ...newComments],
          updatedAt: Date.now(),
          metadata: {
            ...prevDoc.metadata,
            pendingChanges: prevDoc.metadata.pendingChanges + newChanges.length,
            unresolvedComments: prevDoc.metadata.unresolvedComments + newComments.length,
          },
        };
      });

      setSaveStatus('unsaved');
    } catch (error) {
      console.error('Error in AI action:', error);
      alert(error instanceof Error ? error.message : 'AI action failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    let content = '';
    let filename = doc.title || 'document';
    let mimeType = 'text/plain';

    if (exportFormat === 'markdown') {
      content = doc.content;
      filename += '.md';
      mimeType = 'text/markdown';
    } else if (exportFormat === 'html') {
      const pendingChanges = doc.changes.filter(c => c.status === 'pending');
      content = `<!DOCTYPE html>
<html>
<head>
  <title>${doc.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .insert { background-color: #d4edda; text-decoration: none; }
    .delete { background-color: #f8d7da; text-decoration: line-through; color: #721c24; }
    .comment { border-left: 3px solid #007bff; padding-left: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  <div class="metadata">
    <p>Author: ${doc.author}</p>
    <p>Pending Changes: ${pendingChanges.length}</p>
    <p>Unresolved Comments: ${doc.comments.filter(c => !c.resolved).length}</p>
  </div>
  <hr>
  <div class="content">
    ${doc.content.split('\n').map(p => `<p>${p}</p>`).join('\n    ')}
  </div>
  ${pendingChanges.length > 0 ? `
  <hr>
  <h2>Pending Changes</h2>
  <ul>
    ${pendingChanges.map(c => `
      <li class="${c.type}">
        <strong>${c.author === 'ai' ? 'AI' : 'User'}:</strong> ${c.type === 'delete' ? 'Delete' : c.type === 'insert' ? 'Insert' : 'Format'}
        ${c.originalText ? `<del>${c.originalText.slice(0, 50)}...</del>` : ''}
        ${c.newText ? `<ins>${c.newText.slice(0, 50)}...</ins>` : ''}
      </li>
    `).join('')}
  </ul>
  ` : ''}
  ${doc.comments.length > 0 ? `
  <hr>
  <h2>Comments</h2>
  ${doc.comments.map(c => `
    <div class="comment">
      <strong>${c.author === 'ai' ? 'AI' : 'User'}:</strong> ${c.text}
      ${c.resolved ? ' <em>(resolved)</em>' : ''}
    </div>
  `).join('')}
  ` : ''}
</body>
</html>`;
      filename += '.html';
      mimeType = 'text/html';
    } else if (exportFormat === 'json') {
      content = JSON.stringify(doc, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleNewDocument = () => {
    if (doc.content && !window.confirm('Create a new document? Unsaved changes will be lost.')) {
      return;
    }
    setDoc({
      ...defaultDocument,
      id: generateDocumentId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setSaveStatus('unsaved');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;

        if (file.name.endsWith('.json')) {
          const imported = JSON.parse(content) as CollabDocument;
          setDoc(imported);
        } else {
          setDoc(prev => ({
            ...prev,
            content,
            title: file.name.replace(/\.[^/.]+$/, ''),
            updatedAt: Date.now(),
          }));
        }
        setSaveStatus('unsaved');
      } catch (error) {
        alert('Failed to import document');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const brandVoice = selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.voice : undefined;
  const projectFiles = selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.files : [];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h1 className="text-lg font-semibold text-white">Editor</h1>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          <input
            type="text"
            value={doc.title}
            onChange={(e) => setDoc(prev => ({ ...prev, title: e.target.value }))}
            className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            placeholder="Untitled Document"
          />
          
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            saveStatus === 'saved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            saveStatus === 'saving' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-slate-700/50 text-slate-400 border border-slate-600'
          }`}>
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Brand Selector */}
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500 mr-1">Brand:</label>
            <select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value || null)}
              className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="">None</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>

          {/* Project Selector */}
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500 mr-1">Project:</label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="">None</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <select
            value={doc.documentType}
            onChange={(e) => setDoc(prev => ({ ...prev, documentType: e.target.value as any }))}
            className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="general">General</option>
            <option value="proposal">Proposal</option>
            <option value="book">Book</option>
            <option value="article">Article</option>
            <option value="report">Report</option>
          </select>

          <div className="h-5 w-px bg-slate-700 mx-1" />

          <button
            onClick={handleNewDocument}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg transition-all flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>

          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg cursor-pointer transition-all flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
            <input
              type="file"
              accept=".md,.txt,.json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-all flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </header>

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        <CollabEditor
          document={doc}
          onChange={handleDocumentChange}
          onAIAction={handleAIAction}
          brandVoice={brandVoice}
          projectContext={projectFiles}
          researchHistory={[]}
        />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Export Document</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'markdown', label: 'Markdown', icon: '📝' },
                    { value: 'html', label: 'HTML', icon: '🌐' },
                    { value: 'json', label: 'JSON', icon: '{ }' },
                  ].map(format => (
                    <button
                      key={format.value}
                      onClick={() => setExportFormat(format.value as any)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        exportFormat === format.value
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-lg mb-1">{format.icon}</div>
                      <div className="text-sm">{format.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-400">
                {exportFormat === 'markdown' && '📄 Export as plain Markdown file for universal editing'}
                {exportFormat === 'html' && '🌐 Export as HTML with tracked changes and comments visible in browser'}
                {exportFormat === 'json' && '📦 Export full document with all metadata, changes, and comments for backup'}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}