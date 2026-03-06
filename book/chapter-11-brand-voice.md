# Chapter 11: Creating Your Brand Voice System

One of the most powerful features of your AI Dashboard is the ability to maintain a consistent "brand voice" across all AI-generated content. Whether you're writing proposals, emails, or social media posts, the AI will sound like *your* brand, not generic AI.

## What You'll Learn

- Understanding **brand voice** and why it matters
- Creating **document-based context** (NotebookLM-style)
- Building a **brand workspace** UI
- Linking **documents to brands and projects**
- Using brand context in **AI chat**
- Managing **brand voice profiles**

---

## What is Brand Voice?

Think about how different companies "sound":

- **Apple**: Minimalist, innovative, aspirational
- **Wendy's**: Sassy, humorous, bold
- **IBM**: Professional, trustworthy, technical

Your brand voice is the personality of your written communication. It includes:

- **Tone** — Formal vs casual
- **Vocabulary** — Technical vs simple
- **Structure** — Short vs detailed
- **Values** — What you emphasize

### Why Document-Based Context Works

Instead of trying to describe your brand voice in a few sentences, you **upload documents** that *demonstrate* it:

- Past proposals
- Email templates
- Style guides
- Marketing materials
- Client communications

The AI learns from these examples, just like a new employee would learn by reading your past work.

**This is exactly how NotebookLM works** — upload documents, then chat about them.

---

## The Brand Workspace Architecture

```
┌─────────────────────────────────────────────────┐
│                  BRAND                          │
│         (Company/Organization)                 │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  Documents (Brand Voice)               │  │
│  │  - Style guides                        │  │
│  │  - Past proposals                      │  │
│  │  - Email templates                     │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │    PROJECT 1    │  │    PROJECT 2    │     │
│  │   (Website)     │  │   (Campaign)    │     │
│  │                 │  │                 │     │
│  │ ┌─────────────┐│  │ ┌─────────────┐│     │
│  │ │ Documents   ││  │ │ Documents   ││     │
│  │ │ - Brief     ││  │ │ - Strategy  ││     │
│  │ │ - Research  ││  │ │ - Assets    ││     │
│  │ └─────────────┘│  │ └─────────────┘│     │
│  │                 │  │                 │     │
│  │ ┌─────────────┐│  │ ┌─────────────┐│     │
│  │ │   Chat      ││  │ │   Chat      ││     │
│  │ │  (Context   ││  │ │  (Context   ││     │
│  │ │  aware)     ││  │ │  aware)     ││     │
│  │ └─────────────┘│  │ └─────────────┘│     │
│  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Key insight**: Documents can be at **brand level** (apply to all projects) or **project level** (apply to specific work).

---

## Step 1: Database Schema

The database tables are automatically created when you first run the application. Here's what they look like:

```sql
-- Brands table (for organizations)
CREATE TABLE IF NOT EXISTS brands_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  website TEXT,
  logo TEXT,
  voice_profile TEXT,    -- JSON: tone, vocabulary, style
  settings TEXT,          -- JSON: brand-specific settings
  tags TEXT,              -- JSON: array of tags
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Projects table (work under a brand)
CREATE TABLE IF NOT EXISTS projects_v2 (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,     -- Links to brand
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,         -- 'proposal', 'website', 'campaign', etc.
  status TEXT DEFAULT 'active',
  requirements TEXT,          -- JSON: project requirements
  deliverables TEXT,          -- JSON: expected deliverables
  deadline INTEGER,
  metadata TEXT,
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Brand documents (for AI context)
CREATE TABLE IF NOT EXISTS brand_documents (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT,
  type TEXT NOT NULL,        -- 'brand_voice', 'project_doc', etc.
  source TEXT NOT NULL,
  project_id TEXT,           -- Optional: link to specific project
  content TEXT,              -- Full document text
  compacted_content TEXT,    -- Summarized version
  metadata TEXT,             -- JSON
  vectorized INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Chat sessions (context-aware conversations)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  title TEXT,
  messages TEXT,             -- JSON array of messages
  context TEXT,              -- JSON: active context
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Key Insight:** Documents can belong to a brand (global context) or a specific project (targeted context).

---

## Step 2: Brand Service Layer

Create: `src/lib/services/brand-workspace.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

export interface Brand {
  id: string;
  name: string;
  description?: string;
  voiceProfile?: VoiceProfile;
}

export interface VoiceProfile {
  tone: string;
  vocabulary: string;
  structure: string;
  values: string[];
}

export interface Project {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
}

export interface BrandDocument {
  id: string;
  brandId?: string;
  projectId?: string;
  title: string;
  content: string;
  fileType?: string;
  documentType: 'brand_voice' | 'project';
  metadata?: Record<string, any>;
}

export class BrandWorkspaceService {
  // Brand Operations
  async createBrand(name: string, description?: string): Promise<Brand> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO brands (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, description || '', now, now]
    );
    
    return {
      id,
      name,
      description,
    };
  }

  async getBrands(): Promise<Brand[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run('SELECT * FROM brands ORDER BY name');
    return result?.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      voiceProfile: row.voice_profile ? JSON.parse(row.voice_profile) : undefined,
    })) || [];
  }

  // Project Operations
  async createProject(
    brandId: string,
    name: string,
    description?: string
  ): Promise<Project> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO projects (id, brand_id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, brandId, name, description || '', now, now]
    );
    
    return {
      id,
      brandId,
      name,
      description,
      status: 'active',
    };
  }

  async getProjects(brandId: string): Promise<Project[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run(
      'SELECT * FROM projects WHERE brand_id = ? ORDER BY name',
      [brandId]
    );
    
    return result?.map((row: any) => ({
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      status: row.status,
    })) || [];
  }

  // Document Operations
  async addDocument(doc: Omit<BrandDocument, 'id'>): Promise<string> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO brand_documents 
       (id, brand_id, project_id, title, content, file_type, document_type, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        doc.brandId || null,
        doc.projectId || null,
        doc.title,
        doc.content,
        doc.fileType || null,
        doc.documentType,
        doc.metadata ? JSON.stringify(doc.metadata) : null,
        now,
        now,
      ]
    );
    
    return id;
  }

  async getDocuments(options: {
    brandId?: string;
    projectId?: string;
    documentType?: 'brand_voice' | 'project';
  } = {}): Promise<BrandDocument[]> {
    await sqlDatabase.initialize();
    
    let query = 'SELECT * FROM brand_documents WHERE 1=1';
    const params: any[] = [];
    
    if (options.brandId) {
      query += ' AND (brand_id = ? OR brand_id IS NULL)';
      params.push(options.brandId);
    }
    
    if (options.projectId) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(options.projectId);
    }
    
    if (options.documentType) {
      query += ' AND document_type = ?';
      params.push(options.documentType);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = sqlDatabase.run(query, params);
    
    return result?.map((row: any) => ({
      id: row.id,
      brandId: row.brand_id,
      projectId: row.project_id,
      title: row.title,
      content: row.content,
      fileType: row.file_type,
      documentType: row.document_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    })) || [];
  }

  // Get context for AI
  async getContextForChat(projectId: string): Promise<string> {
    const project = await this.getProjectById(projectId);
    if (!project) return '';

    // Get brand voice documents
    const brandDocs = await this.getDocuments({
      brandId: project.brandId,
      documentType: 'brand_voice',
    });

    // Get project-specific documents
    const projectDocs = await this.getDocuments({
      projectId: projectId,
      documentType: 'project',
    });

    // Build context string
    const allDocs = [...brandDocs, ...projectDocs];
    
    if (allDocs.length === 0) return '';

    return allDocs
      .map((doc) => `## ${doc.title}\n\n${doc.content}`)
      .join('\n\n---\n\n');
  }

  private async getProjectById(id: string): Promise<Project | null> {
    const result = sqlDatabase.run('SELECT * FROM projects WHERE id = ?', [id]);
    if (!result || result.length === 0) return null;
    
    const row = result[0];
    return {
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      status: row.status,
    };
  }
}

export const brandWorkspace = new BrandWorkspaceService();
```

---

## Step 3: Brand Workspace UI

Create: `src/app/brand-workspace/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { brandWorkspace, Brand, Project } from '@/lib/services/brand-workspace';

export default function BrandWorkspacePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    const data = await brandWorkspace.getBrands();
    setBrands(data);
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    
    await brandWorkspace.createBrand(newBrandName);
    setNewBrandName('');
    setIsCreatingBrand(false);
    await loadBrands();
  };

  const handleSelectBrand = async (brand: Brand) => {
    setSelectedBrand(brand);
    const brandProjects = await brandWorkspace.getProjects(brand.id);
    setProjects(brandProjects);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Brand Workspace</h1>
        <p className="text-gray-600">
          Manage brands, projects, and documents for context-aware AI chat.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Brands Sidebar */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">Brands</h2>
              <button
                onClick={() => setIsCreatingBrand(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + New
              </button>
            </div>

            {isCreatingBrand && (
              <div className="p-4 border-b">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Brand name"
                  className="w-full border rounded px-3 py-2 mb-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBrand()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBrand}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setIsCreatingBrand(false)}
                    className="text-gray-600 px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleSelectBrand(brand)}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${
                    selectedBrand?.id === brand.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <h3 className="font-medium">{brand.name}</h3>
                  {brand.description && (
                    <p className="text-sm text-gray-500 truncate">
                      {brand.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {selectedBrand ? (
            <BrandDetail 
              brand={selectedBrand} 
              projects={projects}
              onProjectsChange={() => handleSelectBrand(selectedBrand)}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-4xl mb-4">🏢</p>
              <p className="text-gray-500">
                Select a brand or create a new one to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Brand Detail Component
function BrandDetail({ 
  brand, 
  projects,
  onProjectsChange 
}: { 
  brand: Brand; 
  projects: Project[];
  onProjectsChange: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'projects' | 'documents'>('projects');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    await brandWorkspace.createProject(brand.id, newProjectName);
    setNewProjectName('');
    setIsCreatingProject(false);
    onProjectsChange();
  };

  return (
    <div>
      {/* Brand Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold">{brand.name}</h2>
        {brand.description && (
          <p className="text-gray-600 mt-2">{brand.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'projects'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'documents'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              Brand Voice Documents
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'projects' ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Projects</h3>
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  + New Project
                </button>
              </div>

              {isCreatingProject && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full border rounded px-3 py-2 mb-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProject}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreatingProject(false)}
                      className="text-gray-600 px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/brand-workspace/projects/${project.id}`}
                    className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition"
                  >
                    <h4 className="font-medium text-lg">{project.name}</h4>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        project.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm text-gray-600 capitalize">
                        {project.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <BrandDocuments brandId={brand.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// Brand Documents Component
function BrandDocuments({ brandId }: { brandId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, [brandId]);

  const loadDocuments = async () => {
    const docs = await brandWorkspace.getDocuments({
      brandId,
      documentType: 'brand_voice',
    });
    setDocuments(docs);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Brand Voice Documents</h3>
          <p className="text-sm text-gray-500">
            These documents teach the AI your brand's writing style.
          </p>
        </div>
        <a
          href={`/brand-workspace/brands/${brandId}/upload`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Upload Document
        </a>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">📄</p>
          <p>No brand voice documents yet.</p>
          <p className="text-sm mt-2">
            Upload style guides, past proposals, or example content.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="py-4 flex justify-between items-center"
            >
              <div>
                <h4 className="font-medium">{doc.title}</h4>
                <p className="text-sm text-gray-500">
                  {doc.content?.length || 0} characters
                </p>
              </div>
              <span className="text-sm text-blue-600">Brand Voice</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 4: Project Chat with Context

Create: `src/app/brand-workspace/projects/[id]/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState({ brand: 0, project: 0 });

  useEffect(() => {
    // Load context info when page loads
    loadContextInfo();
  }, [projectId]);

  const loadContextInfo = async () => {
    try {
      const response = await fetch(`/api/brand-workspace/projects/${projectId}/context`);
      const data = await response.json();
      setContextInfo(data);
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: userMessage.content,
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <a
              href="/brand-workspace"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Workspace
            </a>
            <h1 className="text-xl font-bold mt-1">Project Chat</h1>
          </div>
          <div className="text-sm text-gray-600">
            Context: {contextInfo.brand} brand docs, {contextInfo.project} project docs
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">💬</p>
            <p>Start chatting with AI that knows your brand voice.</p>
            <p className="text-sm mt-2">
              Upload documents to the project for better context.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 rounded-lg p-4 shadow">
              <p>Thinking with brand context...</p>
            </div>
          </div>
        )}
      </main>

      {/* Input */}
      <footer className="bg-white border-t p-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your project..."
            disabled={isLoading}
            className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  );
}
```

---

## PROMPT YOU CAN USE

Enhance the brand workspace:

```
Add these features to the Brand Workspace:
1. Document upload with drag-and-drop
2. Voice profile editor (tone, vocabulary, examples)
3. Generated content templates (proposals, emails)
4. Export chat history as Markdown
5. Search across all documents
6. Document preview modal

Focus on making the brand voice system feel like NotebookLM.
```

---

## Key Takeaways

✅ **Brand Voice** — Consistent tone through document examples

✅ **NotebookLM-style** — Upload docs, chat with context

✅ **Hierarchy** — Brands → Projects → Documents

✅ **Context Building** — Combine brand + project documents

✅ **Service Layer** — Encapsulate business logic

✅ **Dynamic Routes** — `[id]` for project-specific pages

---

**Next: Chapter 12 - Building Intelligence Reports**
