/**
 * Document List Tool
 * List uploaded documents
 */

import type { Tool, ToolResult } from './tool-types';

export const documentListTool: Tool = {
  name: 'document_list',
  description: 'List uploaded documents. Use when user wants to see what documents are available.',
  parameters: {},
  execute: async (): Promise<ToolResult> => {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.initialize();

      const docs = sqlDatabase.getDocuments?.() || [];
      return {
        success: true,
        data: {
          documents: docs.map((d: any) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            created: new Date(d.createdAt).toLocaleDateString(),
          })),
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to list documents' };
    }
  },
};
