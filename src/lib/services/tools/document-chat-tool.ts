/**
 * Document Chat Tool
 * Chat with a specific document
 */

import type { Tool, ToolResult } from './tool-types';

export const documentChatTool: Tool = {
  name: 'document_chat',
  description:
    'Chat with a specific document. Use when user wants to ask questions about an uploaded document.',
  parameters: {
    document_id: {
      type: 'string',
      description: 'ID of the document to chat with',
      required: true,
    },
    question: {
      type: 'string',
      description: 'Question to ask about the document',
      required: true,
    },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const response = await fetch('/api/documents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: params.document_id,
          question: params.question,
        }),
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to chat with document' };
      }

      const data = await response.json();
      return { success: true, data: data.answer || data.response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to chat with document',
      };
    }
  },
};
