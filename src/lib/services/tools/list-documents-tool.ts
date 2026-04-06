import type { Tool } from '@/types/tools';

export const listDocumentsTool: Tool = {
  name: 'list_documents',
  description:
    'List all ONLYOFFICE documents (Word, Excel, PowerPoint). Use when user wants to see their documents.',
  parameters: {},
  execute: async () => {
    try {
      const response = await fetch('/api/onlyoffice/documents?action=list');
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: {
            documents: data.documents.map((d: any) => ({
              id: d.id,
              title: d.title,
              type: d.fileType,
              created: new Date(d.createdAt).toLocaleDateString(),
            })),
          },
        };
      }
      return { success: false, error: 'Failed to list documents' };
    } catch (error) {
      return { success: false, error: 'Failed to list documents' };
    }
  },
};
