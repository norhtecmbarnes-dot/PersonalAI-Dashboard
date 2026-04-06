import type { Tool } from '@/types/tools';

export const appendToSpreadsheetTool: Tool = {
  name: 'append_to_spreadsheet',
  description:
    'Add new rows to an existing spreadsheet. Use when user wants to add data to an existing Excel file.',
  parameters: {
    document_id: {
      type: 'string',
      description: 'ID of the spreadsheet to update',
      required: true,
    },
    data: {
      type: 'string',
      description: 'New rows to add, each row on a new line, values separated by commas',
      required: true,
    },
  },
  execute: async params => {
    try {
      const rows = params.data
        .split('\n')
        .map((row: string) => row.split(',').map((cell: string) => cell.trim()));

      const response = await fetch('/api/onlyoffice/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'appendToSpreadsheet',
          data: { documentId: params.document_id, rows: rows },
        }),
      });

      if (response.ok) {
        return { success: true, data: { message: `Added ${rows.length} rows to spreadsheet` } };
      }
      return { success: false, error: 'Failed to append to spreadsheet' };
    } catch (error) {
      return { success: false, error: 'Failed to append to spreadsheet' };
    }
  },
};
