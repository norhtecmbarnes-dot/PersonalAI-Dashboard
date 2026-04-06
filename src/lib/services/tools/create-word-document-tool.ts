import type { Tool } from '@/types/tools';

export const createWordDocumentTool: Tool = {
  name: 'create_word_document',
  description:
    'Create a new Word document with text content. Use when user wants to write a document, letter, report, or any text content.',
  parameters: {
    title: { type: 'string', description: 'Title of the document', required: true },
    content: {
      type: 'string',
      description: 'Text content to put in the document',
      required: false,
    },
  },
  execute: async params => {
    try {
      const paragraphs = params.content
        ? params.content.split('\n\n').filter((p: string) => p.trim())
        : [];

      const response = await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createWithContent',
          data: {
            title: params.title,
            type: 'word',
            content: params.content,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: {
            documentId: data.document.id,
            title: data.document.title,
            message: `Created Word document: ${data.document.title}. Open it at /onlyoffice`,
          },
        };
      }
      return { success: false, error: 'Failed to create document' };
    } catch (error) {
      return { success: false, error: 'Failed to create document' };
    }
  },
};
