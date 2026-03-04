'use client';

import { EnhancedDocumentManager } from '@/components/EnhancedDocumentManager';

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 mt-1">
            Import, vectorize, and chat with your documents
          </p>
        </div>

        <EnhancedDocumentManager />
      </div>
    </div>
  );
}
