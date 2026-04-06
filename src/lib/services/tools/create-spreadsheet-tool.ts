import type { Tool } from '@/types/tools';

export const createSpreadsheetTool: Tool = {
  name: 'create_spreadsheet',
  description:
    'Create a new Excel spreadsheet with data. Use when user wants to create a table, track data, budget, or organize information in rows and columns.',
  parameters: {
    title: { type: 'string', description: 'Title of the spreadsheet', required: true },
    headers: {
      type: 'string',
      description: 'Column headers separated by commas (e.g., "Name, Amount, Date")',
      required: true,
    },
    data: {
      type: 'string',
      description: 'Rows of data, each row on a new line, values separated by commas',
      required: true,
    },
  },
  execute: async params => {
    try {
      const headers = params.headers.split(',').map((h: string) => h.trim());
      const rows = params.data
        .split('\n')
        .map((row: string) => row.split(',').map((cell: string) => cell.trim()));

      const response = await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createWithContent',
          data: {
            title: params.title,
            type: 'cell',
            headers: headers,
            rows: rows,
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
            message: `Created spreadsheet: ${data.document.title} with ${rows.length} rows. Open it at /onlyoffice`,
          },
        };
      }
      return { success: false, error: 'Failed to create spreadsheet' };
    } catch (error) {
      return { success: false, error: 'Failed to create spreadsheet' };
    }
  },
};
