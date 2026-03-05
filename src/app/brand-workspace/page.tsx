'use client';

import { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { PageModelSelector } from '@/components/PageModelSelector';
import type { Brand, Project, BrandDocument, ChatSession, ChatMessage } from '@/types/brand-workspace';

type ViewMode = 'brands' | 'projects' | 'documents' | 'chat';

export default function BrandWorkspacePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [brandVoiceDocs, setBrandVoiceDocs] = useState<BrandDocument[]>([]);
  const [projectDocs, setProjectDocs] = useState<BrandDocument[]>([]);
  const [uploadTarget, setUploadTarget] = useState<'brand' | 'project'>('project');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('brands');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brand-workspace/brands');
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadProjects = async (brandId: string) => {
    try {
      const response = await fetch(`/api/brand-workspace/projects?brandId=${brandId}`);
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadDocuments = async (brandId: string, projectId?: string) => {
    try {
      // Load brand voice documents (no projectId)
      const brandParams = new URLSearchParams({ id: brandId, includeDocuments: 'true' });
      const brandResponse = await fetch(`/api/brand-workspace/brands?${brandParams}`);
      const brandData = await brandResponse.json();
      const allDocs = brandData.documents || [];
      
      // Separate brand voice docs (no projectId) from project docs
      setBrandVoiceDocs(allDocs.filter((doc: BrandDocument) => !doc.projectId));
      
      // If projectId provided, also load project-specific docs
      if (projectId) {
        const projectParams = new URLSearchParams({ id: brandId, includeDocuments: 'true', projectId });
        const projectResponse = await fetch(`/api/brand-workspace/brands?${projectParams}`);
        const projectData = await projectResponse.json();
        const projectDocuments = projectData.documents || [];
        setProjectDocs(projectDocuments.filter((doc: BrandDocument) => doc.projectId === projectId));
      } else {
        setProjectDocs([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadSessions = async (projectId: string) => {
    try {
      const response = await fetch(`/api/brand-workspace/chat?projectId=${projectId}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const selectBrand = async (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedProject(null);
    setBrandVoiceDocs([]);
    setProjectDocs([]);
    setSessions([]);
    setCurrentSession(null);
    setViewMode('projects');
    await loadProjects(brand.id);
    await loadDocuments(brand.id);
  };

  const selectProject = async (project: Project) => {
    setSelectedProject(project);
    setViewMode('documents');
    await loadDocuments(project.brandId, project.id);
    await loadSessions(project.id);
  };

  const startChat = async () => {
    if (!selectedProject || !selectedBrand) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSession',
          projectId: selectedProject.id,
          brandId: selectedBrand.id,
          title: `Chat - ${new Date().toLocaleDateString()}`,
        }),
      });
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentSession(data.session);
        setViewMode('chat');
        loadSessions(selectedProject.id);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startBrandChat = async () => {
    if (!selectedBrand) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSession',
          brandId: selectedBrand.id,
          title: `Brand Chat - ${selectedBrand.name} - ${new Date().toLocaleDateString()}`,
        }),
      });
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentSession(data.session);
        setViewMode('chat');
        // Load brand-level sessions (without project filter)
        await loadBrandSessions(selectedBrand.id);
      }
    } catch (error) {
      console.error('Error creating brand chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBrandSessions = async (brandId: string) => {
    try {
      const response = await fetch(`/api/brand-workspace/chat?brandId=${brandId}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading brand sessions:', error);
    }
  };

  const selectSession = async (session: ChatSession) => {
    setCurrentSession(session);
    setViewMode('chat');
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentSession || !selectedBrand || isLoading) return;

    const message = chatInput.trim();
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          projectId: selectedProject?.id || undefined,
          brandId: selectedBrand.id,
          sessionId: currentSession.id,
          message,
        }),
      });
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentSession(data.session);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBrand = async () => {
    const name = prompt('Enter brand name:');
    if (!name) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      const data = await response.json();
      if (data.success) {
        await loadBrands();
      }
    } catch (error) {
      console.error('Error creating brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    if (!selectedBrand) return;
    const name = prompt('Enter project name:');
    if (!name) return;

    const type = prompt('Enter project type (bid/proposal/marketing/campaign/research/quote/other):', 'other') || 'other';

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          brandId: selectedBrand.id,
          name,
          type,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await loadProjects(selectedBrand.id);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBrand = async (brandId: string, brandName: string) => {
    if (!confirm(`Are you sure you want to delete "${brandName}"?\n\nThis will permanently delete:\n- The brand\n- All ${brands.find(b => b.id === brandId) ? 'brand documents' : 'documents'}\n- All projects\n- All chat sessions\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: brandId }),
      });
      const data = await response.json();
      if (data.success) {
        await loadBrands();
        if (selectedBrand?.id === brandId) {
          setSelectedBrand(null);
          setSelectedProject(null);
          setViewMode('brands');
        }
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete:\n- The project\n- All project documents\n- All chat sessions\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: projectId }),
      });
      const data = await response.json();
      if (data.success && selectedBrand) {
        await loadProjects(selectedBrand.id);
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setViewMode('projects');
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (files: FileList) => {
    if (!selectedBrand || !files.length) return;

    setIsLoading(true);
    try {
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          const extension = file.name.split('.').pop()?.toLowerCase() || 'other';
          const typeMap: Record<string, string> = {
            pdf: 'pdf', doc: 'docx', docx: 'docx', txt: 'txt',
            md: 'markdown', markdown: 'markdown', html: 'html', htm: 'html',
          };

          const response = await fetch('/api/brand-workspace/brands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'addDocumentFromText',
              brandId: selectedBrand.id,
              projectId: uploadTarget === 'project' ? selectedProject?.id : undefined,
              title: file.name.replace(/\.[^/.]+$/, ''),
              content,
              type: typeMap[extension] || 'other',
            }),
          });
          const data = await response.json();
          if (data.success) {
            await loadDocuments(selectedBrand.id, selectedProject?.id);
          }
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addUrlDocument = async () => {
    if (!selectedBrand) return;
    const url = prompt('Enter URL to import:');
    if (!url) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addDocumentFromUrl',
          brandId: selectedBrand.id,
          projectId: uploadTarget === 'project' ? selectedProject?.id : undefined,
          url,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await loadDocuments(selectedBrand.id, selectedProject?.id);
      }
    } catch (error) {
      console.error('Error adding URL document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOutput = async (type: 'proposal' | 'quote') => {
    if (!selectedProject || !selectedBrand) return;
    const requirements = prompt('Enter any specific requirements (optional):') || '';

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'proposal' ? 'generateProposal' : 'generateQuote',
          projectId: selectedProject.id,
          brandId: selectedBrand.id,
          requirements,
          sessionId: currentSession?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} generated successfully!`);
      }
    } catch (error) {
      console.error('Error generating output:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Brand Workspace</h1>
            <p className="text-gray-400 text-sm">NotebookLM-style knowledge management</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedBrand && (
              <button
                onClick={() => { setSelectedBrand(null); setSelectedProject(null); setViewMode('brands'); }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                All Brands
              </button>
            )}
            {selectedProject && (
              <button
                onClick={() => { setSelectedProject(null); setViewMode('projects'); }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                {selectedBrand?.name} Projects
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Brands List */}
            {viewMode === 'brands' && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Brands</h2>
                  <button
                    onClick={createBrand}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                  >
                    + New
                  </button>
                </div>
                <div className="space-y-2">
                  {brands.map(brand => (
                    <div key={brand.id} className="w-full">
                      <div className="flex gap-1">
                        <button
                          onClick={() => selectBrand(brand)}
                          className="flex-1 text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <div className="font-medium">{brand.name}</div>
                          {brand.industry && (
                            <div className="text-sm text-gray-400">{brand.industry}</div>
                          )}
                        </button>
                        <button
                          onClick={() => deleteBrand(brand.id, brand.name)}
                          className="px-2 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
                          title="Delete brand"
                        >
                          🗑️
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedBrand(brand);
                          startBrandChat();
                        }}
                        className="w-full mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center justify-center gap-2"
                      >
                        💬 Chat with {brand.name}
                      </button>
                    </div>
                  ))}
                  {brands.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No brands yet. Create one to get started.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Projects List */}
            {viewMode === 'projects' && selectedBrand && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{selectedBrand.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={startBrandChat}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      title="Chat with brand documents"
                    >
                      💬 Chat
                    </button>
                    <button
                      onClick={createProject}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                    >
                      + New
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {projects.map(project => (
                    <div key={project.id} className="flex gap-1">
                      <button
                        onClick={() => selectProject(project)}
                        className={`flex-1 text-left p-3 rounded-lg transition-colors ${
                          selectedProject?.id === project.id
                            ? 'bg-purple-900/50 border border-purple-500'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-600 rounded">{project.type}</span>
                          <span className="text-xs text-gray-400">{project.status}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteProject(project.id, project.name)}
                        className="px-2 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors self-start mt-3"
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-gray-500 text-sm text-center py-4">
                      <p>No projects yet.</p>
                      <button
                        onClick={startBrandChat}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        💬 Start Brand Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project Details Sidebar */}
            {(viewMode === 'documents' || viewMode === 'chat') && selectedProject && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-2">{selectedProject.name}</h2>
                  <p className="text-gray-400 text-sm mb-3">{selectedProject.description || 'No description'}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">{selectedProject.type}</span>
                    <span className="text-xs px-2 py-1 bg-gray-700 rounded">{selectedProject.status}</span>
                  </div>
                </div>

                {/* Document Actions */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Add Sources</h3>
                  
                  {/* Upload Target Toggle */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setUploadTarget('project')}
                      className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                        uploadTarget === 'project'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      To Project
                    </button>
                    <button
                      onClick={() => setUploadTarget('brand')}
                      className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                        uploadTarget === 'brand'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      To Brand Voice
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer text-center text-sm">
                      Upload Files
                      <input
                        type="file"
                        multiple
                        accept=".txt,.md,.markdown,.html,.pdf,.json,.docx"
                        className="hidden"
                        onChange={(e) => e.target.files && uploadDocument(e.target.files)}
                      />
                    </label>
                    <button
                      onClick={addUrlDocument}
                      className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {/* Chat Sessions */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Chat Sessions</h3>
                    <button
                      onClick={startChat}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                    >
                      New Chat
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => selectSession(session)}
                        className={`w-full text-left p-2 rounded text-sm ${
                          currentSession?.id === session.id
                            ? 'bg-purple-900/50 border border-purple-500'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="truncate">{session.title || 'Untitled Chat'}</div>
                        <div className="text-xs text-gray-400">
                          {session.messages.length} messages
                        </div>
                      </button>
                    ))}
                    {sessions.length === 0 && (
                      <p className="text-gray-500 text-xs text-center py-2">No chats yet</p>
                    )}
                  </div>
                </div>

                {/* Generate Actions */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Generate</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => generateOutput('proposal')}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
                    >
                      Generate Proposal
                    </button>
                    <button
                      onClick={() => generateOutput('quote')}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                    >
                      Generate Quote
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Brand Voice Upload (no project needed) */}
            {(viewMode === 'documents' || viewMode === 'projects') && selectedBrand && !selectedProject && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Brand Voice Documents</h2>
                    <p className="text-sm text-gray-400">These documents define {selectedBrand.name}'s voice and will be available across all projects</p>
                  </div>
                  <span className="text-gray-400 text-sm">{brandVoiceDocs.length} documents</span>
                </div>

                {/* Upload Area */}
                <div className="mb-6 p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700/30">
                  <div className="text-center mb-4">
                    <p className="text-gray-300 mb-2">Upload documents to build your brand voice</p>
                    <p className="text-xs text-gray-500">Supported files: .txt, .md, .markdown, .html, .pdf, .json, .docx</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <label className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer text-white font-medium transition-colors">
                      Upload Files
                      <input
                        type="file"
                        multiple
                        accept=".txt,.md,.markdown,.html,.pdf,.json,.docx"
                        className="hidden"
                        onChange={(e) => {
                          setUploadTarget('brand');
                          e.target.files && uploadDocument(e.target.files);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => {
                        setUploadTarget('brand');
                        addUrlDocument();
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {/* Brand Voice Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {brandVoiceDocs.map((doc: BrandDocument) => (
                    <div key={doc.id} className="bg-gradient-to-br from-purple-900/30 to-gray-700 rounded-lg p-4 border border-purple-500/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{doc.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">{doc.type}</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-600/50 text-purple-200 rounded">Brand Voice</span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this document?')) return;
                            await fetch('/api/brand-workspace/brands', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'deleteDocument',
                                documentId: doc.id,
                              }),
                            });
                            loadDocuments(selectedBrand.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {doc.metadata?.summary && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{doc.metadata.summary}</p>
                      )}
                      {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {doc.metadata.tags.slice(0, 5).map((tag: string) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {brandVoiceDocs.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg mb-2">No brand voice documents yet</p>
                      <p className="text-sm">Upload company guidelines, style guides, or reference materials</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents View */}
            {viewMode === 'documents' && selectedProject && (
              <div className="space-y-6">
                {/* Brand Voice Documents */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Brand Voice Documents</h2>
                      <p className="text-sm text-gray-400">Shared across all {selectedBrand?.name} projects</p>
                    </div>
                    <span className="text-gray-400 text-sm">{brandVoiceDocs.length} documents</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {brandVoiceDocs.map((doc: BrandDocument) => (
                      <div key={doc.id} className="bg-gradient-to-br from-purple-900/30 to-gray-700 rounded-lg p-4 border border-purple-500/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">{doc.type}</span>
                              <span className="text-xs px-2 py-0.5 bg-purple-600/50 text-purple-200 rounded">Brand Voice</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {doc.metadata?.size ? `${Math.round(doc.metadata.size / 1024)}KB` : ''}
                          </span>
                        </div>
                        {doc.metadata?.summary && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{doc.metadata.summary}</p>
                        )}
                        {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {doc.metadata.tags.slice(0, 5).map((tag: string) => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {brandVoiceDocs.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
                        <p className="text-sm">No brand voice documents yet</p>
                        <p className="text-xs mt-1">Add company info, URLs, or voice guidelines</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Documents */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Project Documents</h2>
                      <p className="text-sm text-gray-400">Specific to {selectedProject?.name}</p>
                    </div>
                    <span className="text-gray-400 text-sm">{projectDocs.length} documents</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectDocs.map((doc: BrandDocument) => (
                      <div key={doc.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-gray-600 rounded">{doc.type}</span>
                              <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">Project</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {doc.metadata?.size ? `${Math.round(doc.metadata.size / 1024)}KB` : ''}
                          </span>
                        </div>
                        {doc.metadata?.summary && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{doc.metadata.summary}</p>
                        )}
                        {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {doc.metadata.tags.slice(0, 5).map((tag: string) => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {projectDocs.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
                        <p className="text-sm">No project documents yet</p>
                        <p className="text-xs mt-1">Upload RFPs, specifications, or other project files</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chat View */}
            {viewMode === 'chat' && currentSession && (
              <div className="bg-gray-800 rounded-lg flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700">
                  <h2 className="font-semibold">{currentSession.title || 'Chat'}</h2>
                  <p className="text-sm text-gray-400">
                    {currentSession.messages.length} messages | {brandVoiceDocs.length + projectDocs.length} sources available ({brandVoiceDocs.length} brand, {projectDocs.length} project)
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentSession.messages.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      <p className="text-lg mb-2">Start a conversation</p>
                      <p className="text-sm">Ask questions about {selectedBrand?.name} and your documents</p>
                    </div>
                  )}
                  {currentSession.messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p>{message.content}</p>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}
                        {message.metadata?.documentsReferenced && (
                          <div className="text-xs text-gray-400 mt-2">
                            Sources: {message.metadata.documentsReferenced.length} documents referenced
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400">Thinking...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="mb-3">
                    <PageModelSelector
                      pageId="brand-workspace"
                      label="AI Model"
                      showHealth={true}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your documents, request content generation..."
                      className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 resize-none"
                      rows={3}
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !chatInput.trim()}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg self-end"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {viewMode === 'brands' && brands.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <h2 className="text-2xl font-semibold mb-4">Welcome to Brand Workspace</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create a brand to organize your documents, projects, and AI-powered workflows.
                  Similar to NotebookLM, you can add sources and chat with AI about your content.
                </p>
                <button
                  onClick={createBrand}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg"
                >
                  Create Your First Brand
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}