# Chapter 10: Adding Document Upload Features

A chat assistant that only understands text is limited. What if you could upload PDFs, Word documents, or text files and have the AI read and understand them? That's what we'll build in this chapter.

## What You'll Learn

• Handling **file uploads** in Next.js
• Reading **different document formats** (PDF, DOCX, TXT)
• **Storing documents** in your database
• Displaying **document content** to the AI
• Building with **prompts** - test each piece, then enhance

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

> **Start with minimum code** - We'll test this first, then add more.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    sqlDatabase.initialize();

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
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. For now, only TXT and MD files work.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max size: 10MB' },
        { status: 400 }
      );
    }

    // Read file content (text files only for now)
    const content = await file.text();

    // Save to database
    const result = sqlDatabase.addNote({
      title: file.name,
      content: content,
      category: 'document',
      tags: ['uploaded', file.type],
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
```

---

### 📝 PROMPT: Test Basic File Upload

**Copy this prompt to your AI:**

```
I'm building a document upload system. I've created a basic API that handles 
text file uploads. Please help me:

1. Create a simple test page at /test-upload with:
   - A file input that accepts .txt and .md files
   - A submit button
   - Display of the upload result (success or error)

2. The test page should POST to /api/documents/upload

3. Keep it minimal - no styling needed yet, just prove it works

Use React and Next.js App Router (pages in src/app/).
```

**Expected Result:** You can upload a text file and see a success message with the file name and size.

---

### 📝 PROMPT: If Upload Doesn't Work

**Copy this prompt:**

```
My file upload isn't working. Here's what I see:

[PASTE YOUR ERROR MESSAGE HERE]

My upload route is at src/app/api/documents/upload/route.ts
My test page is at src/app/test-upload/page.tsx

Please help debug this. Check:
1. Is FormData being received correctly?
2. Is the file type being detected?
3. Is the database connection working?

Suggest fixes and explain what was wrong.
```

---

## Step 2: Add PDF and Word Support

Once text upload works, add support for binary files.

First, install the libraries:

```bash
npm install pdf-parse mammoth
```

> **Note:** pdf-parse v2+ uses a class-based API. The old `pdfParse(buffer)` function no longer works.

Update your extraction functions:

```typescript
// At the top of your route file
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// Add these helper functions

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2+ uses PDFParse class
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy(); // IMPORTANT: Clean up resources
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

Now update your POST handler:

```typescript
export async function POST(request: NextRequest) {
  try {
    sqlDatabase.initialize();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Expanded file types
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    const allowedExtensions = ['txt', 'md', 'pdf', 'docx', 'doc'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Read file content based on type
    let content: string;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (extension === 'pdf') {
      content = await extractTextFromPDF(buffer);
    } else if (extension === 'docx' || extension === 'doc') {
      content = await extractTextFromWord(buffer);
    } else {
      // Text files
      content = buffer.toString('utf-8');
    }

    // Save to database
    const result = sqlDatabase.addNote({
      title: file.name,
      content: content,
      category: 'document',
      tags: ['uploaded', extension],
    });

    return NextResponse.json({
      success: true,
      documentId: result.id,
      title: file.name,
      contentLength: content.length,
      extractedText: content.substring(0, 500) + '...', // Preview
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload', details: String(error) },
      { status: 500 }
    );
  }
}
```

---

### 📝 PROMPT: Test PDF Upload

```
I've added PDF and Word support to my upload API. Please help me:

1. Update my test page to accept .pdf and .docx files
2. Show the extracted text preview in the result
3. Handle the case where PDF text extraction fails gracefully

The extraction functions are:
• extractTextFromPDF() - uses pdf-parse v2 API with PDFParse class
• extractTextFromWord() - uses mammoth library

Current test page is at src/app/test-upload/page.tsx
```

---

### 📝 PROMPT: Debug PDF Issues

```
My PDF upload is failing with this error:

[PASTE YOUR ERROR]

The pdf-parse library I'm using is version 2.x which has a different API.
My code looks like:

const parser = new PDFParse({ data: buffer });
const data = await parser.getText();

Please help fix this. Also add TypeScript type definitions for pdf-parse v2.
```

---

## Step 3: Create the Documents Page

Now build the UI for viewing uploaded documents.

```tsx
// src/app/documents/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  type: string;
  contentLength: number;
  createdAt: string;
  preview?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
        setUploadProgress(`Uploaded! Extracted ${data.contentLength} characters.`);
        await loadDocuments();
      } else {
        setUploadProgress(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadProgress('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(''), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Documents</h1>

      {/* Upload Area */}
      <div className="mb-8 p-6 border-2 border-dashed rounded-lg">
        <input
          type="file"
          accept=".txt,.md,.pdf,.docx"
          onChange={handleUpload}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </label>
        <p className="mt-2 text-sm text-gray-500">
          Supported: PDF, DOCX, TXT, MD (max 10MB)
        </p>
        {uploadProgress && (
          <p className="mt-4 text-sm bg-gray-100 p-2 rounded">{uploadProgress}</p>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-4">
        {documents.length === 0 ? (
          <p className="text-gray-500">No documents uploaded yet.</p>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="p-4 border rounded-lg">
              <h3 className="font-medium">{doc.title}</h3>
              <p className="text-sm text-gray-500">
                {doc.contentLength} characters • {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

### 📝 PROMPT: Enhance Document List

```
I have a basic documents page that shows uploaded files. Please enhance it with:

1. A search bar to filter documents by title
2. Click on a document to see its full content
3. A delete button for each document (with confirmation)
4. File type icons (📄 PDF, 📝 DOCX, 📃 TXT)
5. Better styling with Tailwind CSS gradients

The current page is at src/app/documents/page.tsx
Documents are fetched from /api/documents (GET) which returns { documents: Document[] }
```

---

## Step 4: Create the Documents List API

```typescript
// src/app/api/documents/route.ts
import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    sqlDatabase.initialize();
    
    // Get all documents from the notes table with category 'document'
    const notes = sqlDatabase.getNotes('document');
    
    const documents = notes.map(note => ({
      id: note.id,
      title: note.title,
      type: note.tags?.find(t => ['pdf', 'docx', 'txt', 'md'].includes(t)) || 'txt',
      contentLength: note.content?.length || 0,
      createdAt: note.createdAt,
    }));

    return NextResponse.json({ documents });
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

### 📝 PROMPT: Add Search and Filter

```
Add search and filtering to my documents API. Here's the current endpoint 
at /api/documents:

[CURRENT CODE]

Please add:
1. Query parameter ?search=term to filter by title/content
2. Query parameter ?type=pdf to filter by file type
3. Query parameter ?limit=10 for pagination
4. Return the count of total matching documents

Example: GET /api/documents?search=report&type=pdf&limit=5
```

---

## Step 5: Chat with Documents

Now connect documents to the AI chat so users can ask questions about their files.

```typescript
// src/app/api/documents/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    const { documentId, question } = await request.json();

    if (!documentId || !question) {
      return NextResponse.json(
        { error: 'Missing documentId or question' },
        { status: 400 }
      );
    }

    // Get document content
    sqlDatabase.initialize();
    const notes = sqlDatabase.getNotes('document');
    const doc = notes.find(n => n.id === documentId);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Build prompt with document context
    const prompt = `You are an AI assistant helping the user understand a document.

Document Title: ${doc.title}
Document Content:
${doc.content}

User Question: ${question}

Please answer based on the document content. Be specific and cite relevant parts.`;

    // Send to AI model (forward to your chat API)
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        model: 'glm-4.7-flash', // Or your preferred model
      }),
    });

    const data = await chatResponse.json();

    return NextResponse.json({
      answer: data.message || data.content,
      documentTitle: doc.title,
      question: question,
    });
  } catch (error) {
    console.error('Document chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
```

---

### 📝 PROMPT: Build Document Chat UI

```
I have a document chat API at /api/documents/chat that takes:
{ documentId: string, question: string }

Please create a document chat page at /documents/[id]/chat that:
1. Shows the document content in a scrollable sidebar
2. Has a chat interface on the right
3. Sends questions to the API
4. Displays the AI response with streaming if possible
5. Shows conversation history

Use React and Tailwind CSS. The layout should be:
• Left: Document preview (scrollable, max 400px wide)
• Right: Chat messages + input box
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
            PDF: pdf-parse (PDFParse class)
            Word: mammoth
            Text: direct conversion
```

**pdf-parse v2 API Changes:**
• Old: `await pdfParse(buffer)` returns `{ text, numpages, ... }`
• New: `new PDFParse({ data: buffer }).getText()` returns `{ text, total, info, ... }`
• Always call `await parser.destroy()` to free memory
• Can also extract images and tables with `getImage()`, `getTable()`

---

## 📝 PROMPT: Complete Document System

**Use this to build the full system:**

```
Build a complete document management system for my AI Dashboard:

PHASE 1 - Basic Upload:
• Create /api/documents/upload route for file uploads
• Support TXT, MD files initially
• Store in SQLite database (use sqlDatabase.addNote)
• Test with http://localhost:3000/api/documents/upload

PHASE 2 - PDF Support:
• Add pdf-parse: npm install pdf-parse
• IMPORTANT: pdf-parse v2+ uses PDFParse class, not function call
• Create extractTextFromPDF() helper (see code in chapter)
• Always call parser.destroy() to free memory
• Support PDF uploads

PHASE 3 - Word Support:
• Add mammoth: npm install mammoth
• Create extractTextFromWord() helper
• Support DOCX uploads

PHASE 4 - Documents Page:
• Create /documents page with upload UI
• List all uploaded documents
• Show file type, size, date

PHASE 5 - Document Chat:
• Create /api/documents/chat endpoint
• Get document content from database
• Send to AI with context
• Return answer

Use the existing codebase at:
• Database: src/lib/database/sqlite.ts (sqlDatabase)
• Chat API: src/app/api/chat/route.ts

Use Next.js App Router and Tailwind CSS.
```

---

## Common Issues and Fixes

### PDF Not Extracting Text

**Problem:** PDF uploads but returns empty text.

**Check:**
```typescript
// Are you using the new pdf-parse v2 API?
// OLD (won't work):
const data = await pdfParse(buffer);

// NEW (correct):
const parser = new PDFParse({ data: buffer });
const data = await parser.getText();
await parser.destroy();
```

**Debug:**
```typescript
console.log('PDF result:', {
  textLength: data.text?.length,
  total: data.total,
  info: data.info,
});
```

### File Type Not Detected

**Problem:** File uploads but type is unknown.

**Fix:** Use both MIME type AND extension:
```typescript
const extension = file.name.split('.').pop()?.toLowerCase();
const allowedExtensions = ['pdf', 'docx', 'txt', 'md'];

if (!allowedExtensions.includes(extension || '')) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
}
```

### Database Not Storing Content

**Problem:** Document saved but content is empty.

**Fix:** Check database initialization:
```typescript
// Make sure to initialize before use
sqlDatabase.initialize();
```

---

## Key Takeaways

✅ **Start Simple** — Build text files first, then add binary

✅ **Test Each Step** — Verify before adding complexity

✅ **Use Prompts** — Let AI help you debug and enhance

✅ **FormData** — Packages files for HTTP upload

✅ **Buffer Processing** — Convert binary to text for extraction

✅ **PDF Parsing** — pdf-parse v2+ uses PDFParse class

✅ **Always Clean Up** — Call `parser.destroy()` for PDFs

✅ **Database Storage** — Store content as text in SQLite

---

## Next Steps

1. Test basic text upload ✓
2. Add PDF support ✓
3. Add Word support ✓
4. Build documents page ✓
5. Add document chat ✓
6. Integrate with main chat (automatically include recent documents)

---

**Next: Chapter 11 - Creating Your Brand Voice System**