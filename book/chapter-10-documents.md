# Chapter 10: Adding Document Upload Features

A chat assistant that only understands text is limited. What if you could upload PDFs, Word documents, or text files and have the AI read and understand them? That's what we'll build in this chapter.

## What You'll Learn

• Handling **file uploads** in Next.js
• Reading **different document formats** (PDF, DOCX, TXT)
• **Storing documents** in your database
• Displaying **document content** to the AI
• Building a **documents page** UI
• Understanding **file streaming** and processing

---

## The Big Picture

Your document upload system needs to:

1. **Accept Files** — Handle user file selection
2. **Validate** — Check file type and size
3. **Process** — Extract text from different formats
4. **Store** — Save to database with metadata
5. **Retrieve** — Show documents in the UI
6. **Use** — Make content available to AI chat

```
User Selects File
        │
        ▼
   ┌────────────┐
   │   Browser   │
   │    Form     │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │   Upload    │
   │   to API    │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │   Extract   │
   │   Content   │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │   Store    │
   │  in SQLite │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │  Display   │
   │  in List   │
   └────────────┘
```

---

## Step 1: Create the Document Upload API

Create: `src/app/api/documents/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    await sqlDatabase.initialize();

    // Get the form data (includes the file)
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOCX, TXT, MD' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max size: 10MB' },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let content: string;

    // Extract text based on file type
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      // Text files - easy!
      content = buffer.toString('utf-8');
    } else if (file.type === 'application/pdf') {
      // PDF - we'll implement this next
      content = await extractTextFromPDF(buffer);
    } else if (file.type.includes('wordprocessingml')) {
      // Word - we'll implement this next
      content = await extractTextFromWord(buffer);
    } else {
      content = '[Binary file content not extractable]';
    }

    // Save to database
    const result = sqlDatabase.addDocument({
      title: file.name,
      content: content,
      type: file.type,
      category: 'uploaded',
      metadata: {
        originalName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      documentId: result.id,
      title: file.name,
      contentLength: content.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Placeholder functions - we'll implement these
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // For now, return placeholder
  return '[PDF content - implement with pdf-parse library]';
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  // For now, return placeholder
  return '[Word content - implement with mammoth library]';
}
```

**What's happening:**
• `request.formData()` — Gets the uploaded file
• `file.arrayBuffer()` — Reads file as binary data
• File validation — Checks type and size before processing
• `Buffer.from()` — Converts to Node.js Buffer
• `sqlDatabase.addDocument()` — Saves to SQLite

---

## Step 2: Install PDF and Word Libraries

```bash
npm install pdf-parse mammoth
```

Now update the extraction functions:

```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    return '[Error extracting PDF content]';
  }
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word parsing error:', error);
    return '[Error extracting Word content]';
  }
}
```

---

## Step 3: Create the Documents Page

Create: `src/app/documents/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  type: string;
  contentLength: number;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadProgress('Upload complete!');
        // Refresh document list
        await loadDocuments();
      } else {
        setUploadProgress(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadProgress('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      // Clear progress after 3 seconds
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text')) return '📃';
    return '📎';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">
          Upload PDFs, Word documents, or text files to use as context for AI chat.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Select File'}
          </label>
          <p className="mt-4 text-sm text-gray-500">
            Supported formats: PDF, DOCX, TXT, MD (max 10MB)
          </p>
        </div>

        {uploadProgress && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded">
            {uploadProgress}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Your Documents ({documents.length})
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">📂</p>
            <p>No documents yet. Upload your first file above!</p>
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getFileIcon(doc.type)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(doc.contentLength)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => viewDocument(doc.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function viewDocument(id: string) {
    // We'll implement this in the next step
    console.log('View document:', id);
  }
}
```

**What's happening:**
• `useEffect` — Loads documents when page loads
• `FormData` — Packages file for upload
• Hidden file input — Custom styled with label
• Document list — Shows all uploaded files
• File type icons — Visual indicators for different formats

---

## Step 4: Create Documents List API

Create: `src/app/api/documents/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    await sqlDatabase.initialize();
    
    const documents = sqlDatabase.getDocuments('uploaded');
    
    // Format for the frontend
    const formatted = documents?.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type || 'unknown',
      contentLength: doc.content?.length || 0,
      createdAt: new Date(doc.createdAt).toISOString(),
    })) || [];

    return NextResponse.json({ documents: formatted });
  } catch (error) {
    console.error('Failed to load documents:', error);
    return NextResponse.json(
      { error: 'Failed to load documents' },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Create Document View Page

Create: `src/app/documents/[id]/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

export default function DocumentViewPage() {
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadDocument(params.id as string);
    }
  }, [params.id]);

  const loadDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`);
      const data = await response.json();
      if (data.document) {
        setDocument(data.document);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Loading document...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600">Document not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/documents"
          className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
        >
          ← Back to Documents
        </a>
        <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {document.type} • Uploaded {new Date(document.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded overflow-auto max-h-[600px]">
            {document.content}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <a
          href="/chat"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
        >
          Chat About This Document
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(document.content)}
          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
        >
          Copy Content
        </button>
      </div>
    </div>
  );
}
```

Create the API: `src/app/api/documents/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sqlDatabase.initialize();
    
    const document = sqlDatabase.getDocument(params.id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Failed to load document:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Connect Documents to Chat

Update your chat API to include document context:

```typescript
// In src/app/api/chat/route.ts

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, documentIds } = body;

    // ... validation ...

    let context = '';
    
    // If document IDs provided, get their content
    if (documentIds && documentIds.length > 0) {
      const documents = documentIds.map((id: string) => 
        sqlDatabase.getDocument(id)
      ).filter(Boolean);
      
      context = documents
        .map((doc: any) => `Document "${doc.title}":\n${doc.content}`)
        .join('\n\n---\n\n');
    }

    // Build prompt with context
    const prompt = context 
      ? `Context:\n${context}\n\nUser Question: ${message}`
      : message;

    // ... send to AI ...

  } catch (error) {
    // ... error handling ...
  }
}
```

---

## Understanding File Processing

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Binary    │────▶│   Library    │────▶│    Text     │
│    Data     │     │  (parser)    │     │   Content   │
│   (Buffer)  │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                              │
                    PDF: pdf-parse
                    Word: mammoth
                    Text: direct
```

---

## PROMPT YOU CAN USE

Want to enhance document handling?

```
Add these features to the document upload system:
1. Drag-and-drop file upload area
2. Document preview before uploading
3. Search within documents
4. Document categories/tags
5. Export document content as download
6. Delete documents with confirmation

Use React and Tailwind CSS.
```

---

## Key Takeaways

✅ **FormData** — Packages files for HTTP upload

✅ **File Validation** — Always check type and size

✅ **Buffer Processing** — Convert to text for storage

✅ **PDF Parsing** — Use `pdf-parse` library

✅ **Word Parsing** — Use `mammoth` library

✅ **Database Storage** — Store content as text in SQLite

✅ **Dynamic Routes** — `[id]` creates document-specific pages

---

**Next: Chapter 11 - Creating Your Brand Voice System**
