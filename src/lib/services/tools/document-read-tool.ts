import type { Tool } from '@/types/tools';

export const documentReadTool: Tool = {
  name: 'document_read',
  description: 'Read a document from storage',
  parameters: {
    id: { type: 'string', description: 'Document ID', required: true },
  },
  execute: async params => {
    const { DocumentStore } = await import('@/lib/storage/documents');
    const doc = DocumentStore.getById(params.id);
    if (doc) {
      return { success: true, data: doc };
    }
    return { success: false, error: 'Document not found' };
  },
};
