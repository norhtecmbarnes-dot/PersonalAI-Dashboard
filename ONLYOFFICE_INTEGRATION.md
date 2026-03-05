# ONLYOFFICE Integration Guide

## Overview

ONLYOFFICE provides a powerful document editing suite that can be embedded into web applications. This guide explains how to integrate ONLYOFFICE with your AI Dashboard system.

---

## What You Can Do With ONLYOFFICE

| Feature | Description |
|---------|-------------|
| **Document Editing** | Create, edit, view documents (Word, Excel, PowerPoint, PDF) |
| **Real-time Collaboration** | Multiple users edit same document simultaneously |
| **Document Conversion** | Convert between formats (DOCX, PDF, ODT, etc.) |
| **Document Builder** | Generate documents from templates programmatically |
| **Plugins & Macros** | Extend functionality with custom plugins |

---

## Integration Options

### Option 1: ONLYOFFICE Docs Cloud (Easiest)

**Pros:**
- No server setup required
- CDN-hosted editor
- Always latest version
- Free tier available

**Cons:**
- Requires internet connection
- Data goes through ONLYOFFICE servers
- Limited customization

**Implementation:**
```html
<script src="https://static.onlyoffice.com/api/docs/release/v8.0.0/office.js"></script>
```

### Option 2: Self-Hosted ONLYOFFICE Docs (Recommended for On-Premise)

**Pros:**
- Complete control over data
- No external dependencies
- Full customization
- Works offline

**Cons:**
- Requires Docker server
- More setup complexity
- Need to manage updates

**Implementation:**
```bash
docker run -i -t -d -p 80:80 --restart=always onlyoffice/documentserver
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Dashboard                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Document Editor                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │   Create    │  │   Edit      │  │   View      │          │ │
│  │  │   Document  │  │   Document  │  │   Document  │          │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     ONLYOFFICE Docs                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │  Document   │  │  Spreadsheet│  │ Presentation│          │ │
│  │  │   Editor     │  │   Editor    │  │   Editor    │          │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    SQLite Storage                             │ │
│  │              (Document metadata & content)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Create ONLYOFFICE Service

Create `src/lib/integrations/onlyoffice.ts`:

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export interface OnlyOfficeDocument {
  id: string;
  title: string;
  fileType: string;
  content?: string;
  url: string;
  key: string;
  ownerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OnlyOfficeConfig {
  documentServerUrl: string;
  callbackUrl: string;
  jwtSecret?: string;
}

class OnlyOfficeService {
  private static instance: OnlyOfficeService;
  private config: OnlyOfficeConfig | null = null;

  private constructor() {}

  static getInstance(): OnlyOfficeService {
    if (!OnlyOfficeService.instance) {
      OnlyOfficeService.instance = new OnlyOfficeService();
    }
    return OnlyOfficeService.instance;
  }

  configure(config: OnlyOfficeConfig): void {
    this.config = config;
  }

  // Generate unique document key for caching
  generateDocumentKey(): string {
    return uuidv4().replace(/-/g, '').substring(0, 20);
  }

  // Get document type from file extension
  getDocumentType(filename: string): 'word' | 'cell' | 'slide' | 'pdf' {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const wordExts = ['doc', 'docm', 'docx', 'dot', 'dotm', 'dotx', 'odt', 'rtf', 'txt', 'html', 'htm', 'md'];
    const cellExts = ['xls', 'xlsm', 'xlsx', 'ods', 'csv'];
    const slideExts = ['ppt', 'pptm', 'pptx', 'odp'];
    const pdfExts = ['pdf', 'djvu', 'xps', 'oxps'];

    if (wordExts.includes(ext || '')) return 'word';
    if (cellExts.includes(ext || '')) return 'cell';
    if (slideExts.includes(ext || '')) return 'slide';
    if (pdfExts.includes(ext || '')) return 'pdf';
    
    return 'word'; // Default
  }

  // Create editor configuration
  createEditorConfig(
    document: OnlyOfficeDocument,
    mode: 'edit' | 'view' = 'edit',
    userId?: string,
    userName?: string
  ): any {
    if (!this.config) {
      throw new Error('ONLYOFFICE not configured. Call configure() first.');
    }

    const config = {
      document: {
        fileType: document.fileType,
        key: document.key,
        title: document.title,
        url: document.url,
        permissions: {
          comment: true,
          download: true,
          edit: mode === 'edit',
          print: true,
          review: true,
        },
      },
      documentType: this.getDocumentType(document.title),
      editorConfig: {
        callbackUrl: `${this.config.callbackUrl}/api/onlyoffice/callback`,
        lang: 'en',
        mode: mode,
        user: {
          id: userId || 'anonymous',
          name: userName || 'Anonymous User',
        },
        customization: {
          autosave: true,
          chat: true,
          comments: true,
          compactHeader: false,
          compactToolbar: false,
          feedback: {
            url: 'https://example.com/feedback',
            visible: false,
          },
          forcesave: true,
          help: true,
          hideRightMenu: false,
          hideRulers: false,
          logo: {
            image: 'https://example.com/logo.png',
            imageEmbedded: 'https://example.com/logo.png',
            url: 'https://example.com',
          },
          reviewDisplay: 'markup',
          showReviewChanges: true,
          spellcheck: true,
          toolbarNoTabs: false,
          unit: 'cm',
          zoom: 100,
        },
      },
      type: 'desktop',
      width: '100%',
      height: '100%',
    };

    // Add JWT token if configured
    if (this.config.jwtSecret) {
      // You'll need a JWT library for this
      // config.token = jwt.sign(config, this.config.jwtSecret);
    }

    return config;
  }

  // Save document to database
  async saveDocument(doc: Partial<OnlyOfficeDocument>): Promise<OnlyOfficeDocument> {
    await sqlDatabase.initialize();
    
    const id = doc.id || uuidv4();
    const now = Date.now();

    const document: OnlyOfficeDocument = {
      id,
      title: doc.title || 'Untitled',
      fileType: doc.fileType || 'docx',
      url: doc.url || '',
      key: doc.key || this.generateDocumentKey(),
      createdAt: doc.createdAt || now,
      updatedAt: now,
    };

    // Store in database
    sqlDatabase.addDocument({
      id: document.id,
      title: document.title,
      content: document.content,
      category: 'onlyoffice',
      tags: [`type:${document.fileType}`, 'onlyoffice'],
    });

    return document;
  }

  // List documents
  async listDocuments(): Promise<OnlyOfficeDocument[]> {
    await sqlDatabase.initialize();
    
    const notes = sqlDatabase.getNotes('onlyoffice');
    
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      fileType: note.tags?.find(t => t.startsWith('type:'))?.split(':')[1] || 'docx',
      content: note.content,
      url: '', // URL would be constructed based on storage
      key: note.id, // Use note ID as key
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));
  }

  // Handle callback from ONLYOFFICE (save, etc.)
  async handleCallback(body: any): Promise<{ error: number }> {
    const { status, key, url } = body;

    switch (status) {
      case 1: // Document is being edited
        return { error: 0 };

      case 2: // Document is ready for saving
        // Download document from url and save
        if (url) {
          // await this.downloadAndSave(key, url);
        }
        return { error: 0 };

      case 3: // Document saving error
        console.error('ONLYOFFICE document save error:', body);
        return { error: 0 };

      case 4: // Document closed with no changes
        return { error: 0 };

      case 6: // Document is being edited, but current document state is saved
        // Forced save - download and save
        if (url) {
          // await this.downloadAndSave(key, url);
        }
        return { error: 0 };

      case 7: // Error while force saving
        console.error('ONLYOFFICE force save error:', body);
        return { error: 0 };

      default:
        return { error: 0 };
    }
  }

  // Create new document from template
  async createDocument(
    title: string,
    type: 'word' | 'cell' | 'slide',
    template?: string
  ): Promise<OnlyOfficeDocument> {
    const extensions: Record<string, string> = {
      word: 'docx',
      cell: 'xlsx',
      slide: 'pptx',
    };

    const document: OnlyOfficeDocument = {
      id: uuidv4(),
      title: title.endsWith(`.${extensions[type]}`) 
        ? title 
        : `${title}.${extensions[type]}`,
      fileType: extensions[type],
      url: template || '',
      key: this.generateDocumentKey(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.saveDocument(document);
  }
}

export const onlyOfficeService = OnlyOfficeService.getInstance();
```

### Step 2: Create API Routes

Create `src/app/api/onlyoffice/documents/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { onlyOfficeService } from '@/lib/integrations/onlyoffice';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        const documents = await onlyOfficeService.listDocuments();
        return NextResponse.json({ success: true, documents });

      case 'config':
        const docId = searchParams.get('docId');
        const mode = searchParams.get('mode') || 'edit';
        // Return editor configuration
        return NextResponse.json({ 
          success: true, 
          config: onlyOfficeService.createEditorConfig(
            { id: docId, title: 'Document', fileType: 'docx', url: '', key: docId },
            mode as 'edit' | 'view'
          )
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ONLYOFFICE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create':
        const doc = await onlyOfficeService.createDocument(
          data.title,
          data.type || 'word'
        );
        return NextResponse.json({ success: true, document: doc });

      case 'configure':
        onlyOfficeService.configure({
          documentServerUrl: data.documentServerUrl,
          callbackUrl: data.callbackUrl,
          jwtSecret: data.jwtSecret,
        });
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ONLYOFFICE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

Create `src/app/api/onlyoffice/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { onlyOfficeService } from '@/lib/integrations/onlyoffice';

// ONLYOFFICE calls this URL when documents are saved
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('ONLYOFFICE callback:', body);

    const result = await onlyOfficeService.handleCallback(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('ONLYOFFICE callback error:', error);
    return NextResponse.json({ error: 0 });
  }
}
```

### Step 3: Create Editor Component

Create `src/components/OnlyOfficeEditor.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

interface OnlyOfficeEditorProps {
  documentId: string;
  documentTitle: string;
  fileType: 'docx' | 'xlsx' | 'pptx' | 'pdf';
  mode?: 'edit' | 'view';
  onSave?: () => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    DocsAPI: {
      DocEditor: new (
        containerId: string,
        config: any
      ) => {
        destroyEditor: () => void;
      };
    };
  }
}

export function OnlyOfficeEditor({
  documentId,
  documentTitle,
  fileType,
  mode = 'edit',
  onSave,
  onClose,
}: OnlyOfficeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initEditor = async () => {
      try {
        // Load ONLYOFFICE API script
        if (!window.DocsAPI) {
          await loadScript('https://static.onlyoffice.com/api/docs/release/v8.0.0/office.js');
        }

        // Get editor config from backend
        const response = await fetch(
          `/api/onlyoffice/documents?action=config&docId=${documentId}&mode=${mode}`
        );
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to get editor config');
        }

        const config = {
          ...data.config,
          document: {
            ...data.config.document,
            title: documentTitle,
            fileType: fileType,
          },
          editorConfig: {
            ...data.config.editorConfig,
            callbacks: {
              onDocumentReady: () => {
                setLoading(false);
                console.log('Document ready');
              },
              onError: (event: any) => {
                setLoading(false);
                setError(`Editor error: ${event?.data || 'Unknown error'}`);
                console.error('ONLYOFFICE error:', event);
              },
            },
          },
          events: {
            onDocumentStateChange: (event: any) => {
              if (event.data) {
                console.log('Document modified');
              }
            },
            onRequestSaveAs: (event: any) => {
              console.log('Save as requested:', event);
              onSave?.();
            },
          },
        };

        if (containerRef.current) {
          editorRef.current = new window.DocsAPI.DocEditor(
            containerRef.current.id,
            config
          );
        }
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to load editor');
        console.error('Editor init error:', err);
      }
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroyEditor();
      }
    };
  }, [documentId, documentTitle, fileType, mode]);

  return (
    <div className="onlyoffice-container w-full h-full">
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading document editor...</div>
        </div>
      )}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}
      <div
        ref={containerRef}
        id="onlyoffice-editor"
        className="w-full"
        style={{ height: loading ? '0' : 'calc(100vh - 200px)' }}
      />
    </div>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
```

### Step 4: Create Documents Page

Create `src/app/onlyoffice/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { OnlyOfficeEditor } from '@/components/OnlyOfficeEditor';

export default function OnlyOfficePage() {
  const [showEditor, setShowEditor] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<{
    id: string;
    title: string;
    type: 'docx' | 'xlsx' | 'pptx';
  } | null>(null);

  const handleCreateDocument = (type: 'word' | 'cell' | 'slide') => {
    const extensions: Record<string, string> = {
      word: 'docx',
      cell: 'xlsx',
      slide: 'pptx',
    };

    setCurrentDoc({
      id: `doc_${Date.now()}`,
      title: `New Document.${extensions[type]}`,
      type: extensions[type],
    });
    setShowEditor(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Documents</h1>
            <p className="text-gray-400 mt-1">
              Create and edit documents with ONLYOFFICE
            </p>
          </div>
        </div>

        {showEditor && currentDoc ? (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <span className="text-white font-medium">{currentDoc.title}</span>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setCurrentDoc(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Close
              </button>
            </div>
            <OnlyOfficeEditor
              documentId={currentDoc.id}
              documentTitle={currentDoc.title}
              fileType={currentDoc.type}
              mode="edit"
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <button
              onClick={() => handleCreateDocument('word')}
              className="bg-gray-800 rounded-lg p-8 text-center hover:bg-gray-700 transition-colors"
            >
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-white mb-2">Document</h3>
              <p className="text-gray-400">Create a new text document</p>
              <p className="text-sm text-gray-500 mt-2">.docx, .odt, .rtf, .txt</p>
            </button>

            <button
              onClick={() => handleCreateDocument('cell')}
              className="bg-gray-800 rounded-lg p-8 text-center hover:bg-gray-700 transition-colors"
            >
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">Spreadsheet</h3>
              <p className="text-gray-400">Create a new spreadsheet</p>
              <p className="text-sm text-gray-500 mt-2">.xlsx, .ods, .csv</p>
            </button>

            <button
              onClick={() => handleCreateDocument('slide')}
              className="bg-gray-800 rounded-lg p-8 text-center hover:bg-gray-700 transition-colors"
            >
              <div className="text-6xl mb-4">📽️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Presentation</h3>
              <p className="text-gray-400">Create a new presentation</p>
              <p className="text-sm text-gray-500 mt-2">.pptx, .odp</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 5: Add Navigation

Add to `src/components/TopNav.tsx`:

```typescript
<NavLink href="/onlyoffice">Documents</NavLink>
```

---

## AI Integration

### Enable AI to Create/Edit Documents

Add to `src/lib/services/tool-registry.ts`:

```typescript
this.registerTool({
  name: 'create_document',
  description: 'Create a new document (Word, Excel, PowerPoint)',
  parameters: {
    title: { type: 'string', description: 'Document title', required: true },
    type: { type: 'string', description: 'Document type: word, cell, or slide', required: true },
  },
  execute: async (params) => {
    const { title, type } = params;
    
    try {
      const response = await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: { title, type },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          data: { 
            documentId: data.document.id,
            message: `Created ${type} document: ${title}` 
          } 
        };
      }
      return { success: false, error: 'Failed to create document' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});
```

### AI Prompt Integration

The AI can now:
- "Create a Word document called Meeting Notes"
- "Create a spreadsheet for budget tracking"
- "Make a presentation about our project"

---

## Configuration Options

### Environment Variables

Add to `.env.local`:

```bash
# ONLYOFFICE Configuration
ONLYOFFICE_DOCUMENT_SERVER_URL=http://localhost:8080
ONLYOFFICE_CALLBACK_URL=http://localhost:3000
ONLYOFFICE_JWT_SECRET=your-jwt-secret-key
```

### Self-Hosted Setup (Docker)

```yaml
# docker-compose.yml
version: '3.8'
services:
  onlyoffice:
    image: onlyoffice/documentserver:latest
    ports:
      - "8080:80"
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=your-jwt-secret-key
    volumes:
      - ./data/onlyoffice/logs:/var/log/onlyoffice
      - ./data/onlyoffice/data:/var/www/onlyoffice/Data
      - ./data/onlyoffice/fonts:/usr/share/fonts/truetype/custom
```

---

## Security Considerations

### JWT Authentication

For production, enable JWT:

```typescript
import jwt from 'jsonwebtoken';

function signConfig(config: any, secret: string): string {
  return jwt.sign(config, secret, { algorithm: 'HS256' });
}
```

### CORS Configuration

Ensure your callback URL is whitelisted:

```typescript
// In ONLYOFFICE Document Server config
// Set allowed origins
```

---

## Testing Checklist

- [ ] ONLYOFFICE Document Server running (Docker or Cloud)
- [ ] API routes responding correctly
- [ ] Editor loads in browser
- [ ] Documents can be created
- [ ] Documents can be edited
- [ ] Changes are saved
- [ ] AI can create documents via tool

---

## Resources

- [ONLYOFFICE API Documentation](https://api.onlyoffice.com/)
- [ONLYOFFICE GitHub Samples](https://github.com/ONLYOFFICE/document-server-integration)
- [Docker Image](https://hub.docker.com/r/onlyoffice/documentserver)
- [Next.js Integration Example](https://github.com/ONLYOFFICE/onlyoffice-nextjs)

---

## Estimated Implementation Time

| Task | Time |
|------|------|
| Set up ONLYOFFICE server (Docker) | 30 min |
| Create service file | 1 hour |
| Create API routes | 1 hour |
| Create editor component | 2 hours |
| Create documents page | 1 hour |
| Add AI tool integration | 30 min |
| Testing | 1 hour |
| **Total** | **~7 hours** |

---

## Notes for AI Dashboard

This integration fits perfectly with the AI Dashboard's architecture:

1. **SQLite Storage**: Documents stored alongside existing data
2. **Tool Registry**: AI can create/edit documents
3. **Messaging Integration**: Send document links via Telegram
4. **Calendar**: Schedule document reviews
5. **Task Scheduler**: Auto-generate reports

The integration maintains your on-premise architecture - no data leaves your servers.