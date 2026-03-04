'use client';

import { useState, useEffect } from 'react';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  description?: string;
  color?: string;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  contacts: string[];
  notes: string;
  tags: string[];
  documents?: string[];
  persona?: string;
  systemPrompt?: string;
  voiceStyle?: string;
  industry?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  folderId?: string;
  brandId?: string;
  status: 'active' | 'completed' | 'archived';
}

interface Document {
  id: string;
  title: string;
  content?: string;
  category?: string;
  tags: string[];
  createdAt: number;
}

type TabType = 'folders' | 'brands' | 'projects' | 'documents';

export function WorkspaceManager() {
  const [activeTab, setActiveTab] = useState<TabType>('folders');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [projectBrandId, setProjectBrandId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Brand Voice states
  const [brandPersona, setBrandPersona] = useState('');
  const [brandSystemPrompt, setBrandSystemPrompt] = useState('');
  const [brandVoiceStyle, setBrandVoiceStyle] = useState('professional');
  const [brandIndustry, setBrandIndustry] = useState('');
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandDocs, setBrandDocs] = useState<Document[]>([]);
  const [availableDocs, setAvailableDocs] = useState<Document[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [foldersRes, brandsRes, projectsRes, docsRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/brands'),
        fetch('/api/projects'),
        fetch('/api/documents/import?action=list'),
      ]);
      
      const foldersData = await foldersRes.json();
      const brandsData = await brandsRes.json();
      const projectsData = await projectsRes.json();
      const docsData = await docsRes.json();
      
      setFolders(foldersData.folders || []);
      setBrands(brandsData.brands || []);
      setProjects(projectsData.projects || []);
      setDocuments(docsData.documents || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          folder: { name: newFolderName, parentId: selectedFolder?.id || null }
        }),
      });
      setNewFolderName('');
      loadData();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete this folder?')) return;
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', folder: { id } }),
      });
      loadData();
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const createBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          brand: { name: newBrandName, contacts: [], notes: '', tags: [] }
        }),
      });
      setNewBrandName('');
      loadData();
    } catch (error) {
      console.error('Error creating brand:', error);
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand profile?')) return;
    try {
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', brand: { id } }),
      });
      loadData();
    } catch (error) {
      console.error('Error deleting brand:', error);
    }
  };

  const updateBrandVoice = async () => {
    if (!selectedBrand) return;
    try {
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          brand: {
            id: selectedBrand.id,
            persona: brandPersona,
            systemPrompt: brandSystemPrompt,
            voiceStyle: brandVoiceStyle,
            industry: brandIndustry,
          }
        }),
      });
      setIsEditingBrand(false);
      loadData();
    } catch (error) {
      console.error('Error updating brand voice:', error);
    }
  };

  const addDocumentToBrand = async (docId: string) => {
    if (!selectedBrand) return;
    try {
      const currentDocs = selectedBrand.documents || [];
      if (!currentDocs.includes(docId)) {
        await fetch('/api/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addDocument',
            brand: { id: selectedBrand.id, documentId: docId }
          }),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error adding document to brand:', error);
    }
  };

  const removeDocumentFromBrand = async (docId: string) => {
    if (!selectedBrand) return;
    try {
      const currentDocs = (selectedBrand.documents || []).filter(d => d !== docId);
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          brand: { id: selectedBrand.id, documents: currentDocs }
        }),
      });
      loadData();
    } catch (error) {
      console.error('Error removing document from brand:', error);
    }
  };

  const openBrandEditor = (brand: Brand) => {
    setSelectedBrand(brand);
    setBrandPersona(brand.persona || '');
    setBrandSystemPrompt(brand.systemPrompt || '');
    setBrandVoiceStyle(brand.voiceStyle || 'professional');
    setBrandIndustry(brand.industry || '');
    
    const brandDocIds = brand.documents || [];
    const brandDocsList = documents.filter(d => brandDocIds.includes(d.id));
    setBrandDocs(brandDocsList);
    setAvailableDocs(documents.filter(d => !brandDocIds.includes(d.id)));
    setIsEditingBrand(true);
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          project: { 
            name: newProjectName, 
            brandId: projectBrandId || undefined,
            folderId: selectedFolder?.id,
            status: 'active',
            tags: []
          }
        }),
      });
      setNewProjectName('');
      setProjectBrandId('');
      loadData();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', project: { id } }),
      });
      loadData();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100));
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('remember', 'true');

        const response = await fetch('/api/documents/import', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      setUploadStatus({ type: 'success', message: `Successfully uploaded ${files.length} file(s)` });
      loadData();
      
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('remember', 'true');

        const response = await fetch('/api/documents/import', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      
      setUploadStatus({ type: 'success', message: `Successfully uploaded ${files.length} file(s)` });
      loadData();
      
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = [
    { id: 'folders', label: 'Folders', icon: '📁' },
    { id: 'brands', label: 'Brand Profiles', icon: '🏢' },
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'documents', label: 'Documents', icon: '📄' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-b-2 border-purple-500 text-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Folders Tab */}
      {activeTab === 'folders' && (
        <div className="flex-1 flex gap-4">
          <div className="w-1/3">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Create Folder</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                />
                <button
                  onClick={createFolder}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Folders</h3>
              <div className="space-y-2">
                {folders.filter(f => !f.parentId).map(folder => (
                  <div key={folder.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <button
                      onClick={() => setSelectedFolder(folder)}
                      className="text-white hover:text-purple-400 flex items-center gap-2"
                    >
                      <span>📁</span> {folder.name}
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg p-4">
            {selectedFolder ? (
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{selectedFolder.name}</h3>
                
                {/* Documents in folder */}
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-2">Documents:</p>
                  {documents.filter(d => {
                    const folderTag = d.tags?.find(t => t.startsWith('folder:'));
                    return folderTag === `folder:${selectedFolder.id}`;
                  }).length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {documents.filter(d => {
                        const folderTag = d.tags?.find(t => t.startsWith('folder:'));
                        return folderTag === `folder:${selectedFolder.id}`;
                      }).map(doc => (
                        <div key={doc.id} className="p-2 bg-gray-700 rounded flex justify-between items-center">
                          <span className="text-white text-sm">📄 {doc.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">No documents in this folder</p>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-2">Projects in this folder:</p>
                <div className="space-y-2">
                  {projects.filter(p => p.folderId === selectedFolder.id).map(project => (
                    <div key={project.id} className="p-3 bg-gray-700 rounded flex justify-between items-center">
                      <div>
                        <span className="text-white">{project.name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          project.status === 'active' ? 'bg-green-900 text-green-300' :
                          project.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <button onClick={() => deleteProject(project.id)} className="text-gray-500 hover:text-red-400">
                        ×
                      </button>
                    </div>
                  ))}
                  {projects.filter(p => p.folderId === selectedFolder.id).length === 0 && (
                    <p className="text-gray-500 text-sm">No projects in this folder</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a folder to view its contents
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="flex-1 flex gap-4">
          <div className="w-1/3">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Create Brand Profile</h3>
              <p className="text-gray-400 text-sm mb-4">
                Build a knowledge base about companies or people with brochures, weblinks, and information.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Brand/Company name..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                />
                <button
                  onClick={createBrand}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Brand Profiles</h3>
              <div className="space-y-2">
                {brands.map(brand => (
                  <div
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand)}
                    className={`p-3 rounded cursor-pointer ${
                      selectedBrand?.id === brand.id ? 'bg-purple-900/50 border border-purple-500' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-white font-medium">{brand.name}</div>
                        {brand.website && (
                          <div className="text-gray-400 text-xs">{brand.website}</div>
                        )}
                        <div className="flex gap-2 mt-1">
                          {brand.voiceStyle && (
                            <span className="text-xs px-1 py-0.5 bg-purple-800 text-purple-300 rounded">{brand.voiceStyle}</span>
                          )}
                          {(brand as any).documents?.length > 0 && (
                            <span className="text-xs px-1 py-0.5 bg-blue-800 text-blue-300 rounded">{(brand as any).documents.length} docs</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openBrandEditor(brand); }}
                          className="text-gray-400 hover:text-purple-400 text-xs px-2 py-1"
                          title="Configure Brand Voice"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteBrand(brand.id); }}
                          className="text-gray-500 hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg p-4">
            {selectedBrand ? (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedBrand.name}</h3>
                    {selectedBrand.description && (
                      <p className="text-gray-400 mt-1">{selectedBrand.description}</p>
                    )}
                    {selectedBrand.website && (
                      <a
                        href={selectedBrand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 text-sm hover:underline"
                      >
                        {selectedBrand.website}
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-700 rounded p-4">
                    <h4 className="text-white font-medium mb-2">Contacts</h4>
                    {selectedBrand.contacts.length > 0 ? (
                      <ul className="text-gray-300 text-sm space-y-1">
                        {selectedBrand.contacts.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No contacts added</p>
                    )}
                  </div>
                  <div className="bg-gray-700 rounded p-4">
                    <h4 className="text-white font-medium mb-2">Tags</h4>
                    {selectedBrand.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedBrand.tags.map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No tags</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 bg-gray-700 rounded p-4">
                  <h4 className="text-white font-medium mb-2">Notes & Knowledge Base</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">
                    {selectedBrand.notes || 'No notes yet. Add information about this brand...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a brand profile to view details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="flex-1">
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4">Create Project</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name (e.g., RFP for Company X)..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
              <select
                value={projectBrandId}
                onChange={(e) => setProjectBrandId(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              >
                <option value="">Select Brand (optional)</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button
                onClick={createProject}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
              >
                Create
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const brand = brands.find(b => b.id === project.brandId);
              const folder = folders.find(f => f.id === project.folderId);
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`p-4 rounded-lg cursor-pointer ${
                    selectedProject?.id === project.id ? 'bg-purple-900/50 border border-purple-500' : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-medium">{project.name}</h4>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                      className="text-gray-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                  {project.description && (
                    <p className="text-gray-400 text-sm mb-2">{project.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      project.status === 'active' ? 'bg-green-900 text-green-300' :
                      project.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {project.status}
                    </span>
                    {brand && (
                      <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                        🏢 {brand.name}
                      </span>
                    )}
                    {folder && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded">
                        📁 {folder.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="flex-1 flex flex-col">
          {/* Upload Area */}
          <div 
            className="bg-gray-800 rounded-lg p-6 mb-4 border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl">📄</div>
              <div className="text-center">
                <p className="text-white font-medium">Drop files here to upload</p>
                <p className="text-gray-400 text-sm">or click the button below</p>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    onChange={handleDocumentUpload}
                    accept=".txt,.md,.pdf,.docx,.csv,.json,.xml,.html"
                    multiple
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium inline-block">
                    {isUploading ? 'Uploading...' : 'Select Files'}
                  </div>
                </label>
                
                <span className="text-gray-400 text-sm">
                  TXT, MD, PDF, DOCX, CSV, JSON, XML, HTML
                </span>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="w-full max-w-md">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm text-center mt-1">Processing...</p>
                </div>
              )}

              {/* Upload Status */}
              {uploadStatus && (
                <div className={`px-4 py-2 rounded-lg ${
                  uploadStatus.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                }`}>
                  {uploadStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Document List Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              Documents ({documents.length})
            </h3>
            <button
              onClick={loadData}
              className="text-gray-400 hover:text-white text-sm"
            >
              Refresh
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📁</div>
                <p>No documents yet. Upload a document to get started.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-800 sticky top-0">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Tags</th>
                    <th className="p-3">Uploaded</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                      <td className="p-3">
                        <div className="text-white font-medium truncate max-w-xs">{doc.title}</div>
                        <div className="text-gray-500 text-xs truncate max-w-xs">
                          {doc.content?.substring(0, 60)}...
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-300 text-sm capitalize">{doc.category}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                              +{doc.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <button className="text-purple-400 hover:text-purple-300 text-sm">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Brand Voice Editor Modal */}
      {isEditingBrand && selectedBrand && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Configure Brand Voice: {selectedBrand.name}</h2>
                <button
                  onClick={() => setIsEditingBrand(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Voice Style */}
                <div>
                  <label className="block text-white font-medium mb-2">Voice Style</label>
                  <select
                    value={brandVoiceStyle}
                    onChange={(e) => setBrandVoiceStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-white font-medium mb-2">Industry</label>
                  <input
                    type="text"
                    value={brandIndustry}
                    onChange={(e) => setBrandIndustry(e.target.value)}
                    placeholder="e.g., Defense Contracting, Food & Beverage..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  />
                </div>

                {/* Persona */}
                <div>
                  <label className="block text-white font-medium mb-2">Brand Persona</label>
                  <textarea
                    value={brandPersona}
                    onChange={(e) => setBrandPersona(e.target.value)}
                    placeholder="Describe the brand's personality and how it should communicate..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  />
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-white font-medium mb-2">Custom Instructions</label>
                  <textarea
                    value={brandSystemPrompt}
                    onChange={(e) => setBrandSystemPrompt(e.target.value)}
                    placeholder="Any additional instructions for the AI when responding on behalf of this brand..."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  />
                </div>

                {/* Documents */}
                <div>
                  <label className="block text-white font-medium mb-2">Brand Documents</label>
                  <p className="text-gray-400 text-sm mb-3">
                    Add documents to this brand's knowledge base. The AI will use these when chatting.
                  </p>
                  
                  {/* Current Documents */}
                  {brandDocs.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-gray-300 text-sm font-medium mb-2">Current Documents ({brandDocs.length})</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {brandDocs.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center bg-gray-700 rounded p-2">
                            <span className="text-white text-sm truncate">{doc.title}</span>
                            <button
                              onClick={() => removeDocumentFromBrand(doc.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Documents */}
                  {availableDocs.length > 0 && (
                    <div>
                      <h4 className="text-gray-300 text-sm font-medium mb-2">Available Documents</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {availableDocs.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center bg-gray-700 rounded p-2">
                            <span className="text-white text-sm truncate">{doc.title}</span>
                            <button
                              onClick={() => addDocumentToBrand(doc.id)}
                              className="text-green-400 hover:text-green-300 text-xs"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setIsEditingBrand(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateBrandVoice}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                  >
                    Save Brand Voice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
