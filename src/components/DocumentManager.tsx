'use client';

import { useState } from 'react';
import { DocumentStore, Document } from '@/lib/storage/documents';
import { KnowledgeBase } from '@/lib/storage/knowledge';

export function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError('');
      setImportSuccess('');

      const text = await file.text();
      const metadata = await getFileMetadata(file);

      const doc = await DocumentStore.create({
        title: file.name,
        content: text,
        size: text.length,
        type: 'text',
        metadata
      });

      setDocuments([...documents, doc]);
      setImportSuccess(`Document "${file.name}" imported successfully`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Import Documents</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".txt,.md,.json,.csv,.xml,.pdf"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isUploading ? 'Processing...' : 'Upload Document'}
          </label>
          <p className="mt-2 text-sm text-gray-600">
            Supports: TXT, MD, JSON, CSV, XML, PDF
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          {uploadError}
        </div>
      )}

      {importSuccess && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
          {importSuccess}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Your Documents</h2>
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="p-4 bg-white rounded-lg shadow border">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{doc.title}</h3>
                <span className="text-sm text-gray-500">
                  {(doc.size / 1024).toFixed(2)} KB
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {documentPreview(doc.content)}
              </p>
              <div className="flex gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {doc.type}
                </span>
                {doc.metadata?.tags?.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function documentPreview(content: string): string {
  return content.substring(0, 200) + '...';
}

async function getFileMetadata(file: File): Promise<any> {
  try {
    if (file.name.endsWith('.json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return {
        author: parsed.author || null,
        tags: parsed.tags || [],
        summary: parsed.summary || null
      };
    }
    if (file.name.endsWith('.md')) {
      const text = await file.text();
      return {
        author: null,
        tags: [],
        summary: extractMarkdownSummary(text)
      };
    }
    return {};
  } catch {
    return {};
  }
}

async function extractMarkdownSummary(content: string): Promise<string | null> {
  const firstLine = content.split('\n')[0].trim();
  return firstLine.startsWith('#') ? firstLine.slice(1).trim() : null;
}