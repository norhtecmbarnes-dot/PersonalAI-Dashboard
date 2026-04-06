/**
 * SQL Query Tool
 * Execute SQL queries on the database
 */

import type { Tool, ToolResult } from './tool-types';

export const sqlQueryTool: Tool = {
  name: 'sql_query',
  description: 'Execute a SQL query on the database',
  parameters: {
    query: { type: 'string', description: 'SQL SELECT query', required: true },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.initialize();

      // Only allow SELECT queries for safety
      if (!params.query.trim().toUpperCase().startsWith('SELECT')) {
        return { success: false, error: 'Only SELECT queries are allowed' };
      }

      const results = await sqlDatabase.all(params.query);
      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
      };
    }
  },
};
