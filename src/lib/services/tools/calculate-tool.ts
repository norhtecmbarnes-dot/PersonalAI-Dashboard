/**
 * Calculate Tool
 * Perform mathematical calculations safely
 */

import type { Tool, ToolResult } from './tool-types';

export const calculateTool: Tool = {
  name: 'calculate',
  description: 'Perform mathematical calculations safely',
  parameters: {
    expression: {
      type: 'string',
      description: 'Mathematical expression to evaluate',
      required: true,
    },
  },
  execute: async (params): Promise<ToolResult> => {
    try {
      const { evaluate } = await import('mathjs');
      // mathjs.evaluate is safe - it parses math expressions, not arbitrary JS
      const result = evaluate(params.expression);
      return { success: true, data: { result } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
      };
    }
  },
};
