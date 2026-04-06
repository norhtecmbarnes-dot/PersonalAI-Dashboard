import type { Tool, ToolResult, ToolRegistryStats } from '@/types/tools';
import {
  vectorSearchTool,
  sqlQueryTool,
  calculateTool,
  webSearchTool,
  webFetchTool,
  calendarAddEventTool,
  calendarGetEventsTool,
  calendarDeleteEventTool,
  documentReadTool,
  documentListTool,
  documentChatTool,
  createWordDocumentTool,
  createSpreadsheetTool,
  createPresentationTool,
  listDocumentsTool,
  appendToSpreadsheetTool,
  getApiKeysTool,
  setApiKeyTool,
  removeApiKeyTool,
  getSettingsTool,
  setModelPreferenceTool,
  toggleSearchModeTool,
  listCustomToolsTool,
  createCustomToolTool,
  deleteCustomToolTool,
  toggleCustomToolTool,
  savePromptTool,
  getPromptsTool,
  usePromptTool,
  deletePromptTool,
  extractFromNoteTool,
} from './tools';

interface ToolCallRecord {
  tool: string;
  parameters: Record<string, any>;
  success: boolean;
  duration: number;
  timestamp: number;
}

class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();
  private callHistory: ToolCallRecord[] = [];
  private maxHistory: number = 1000;

  private constructor() {
    this.registerBuiltInTools();
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerBuiltInTools(): void {
    this.registerTool(vectorSearchTool);
    this.registerTool(sqlQueryTool);
    this.registerTool(calculateTool);
    this.registerTool(webSearchTool);
    this.registerTool(webFetchTool);
    this.registerTool(calendarAddEventTool);
    this.registerTool(calendarGetEventsTool);
    this.registerTool(calendarDeleteEventTool);
    this.registerTool(documentReadTool);
    this.registerTool(documentListTool);
    this.registerTool(documentChatTool);
    this.registerTool(createWordDocumentTool);
    this.registerTool(createSpreadsheetTool);
    this.registerTool(createPresentationTool);
    this.registerTool(listDocumentsTool);
    this.registerTool(appendToSpreadsheetTool);
    this.registerTool(getApiKeysTool);
    this.registerTool(setApiKeyTool);
    this.registerTool(removeApiKeyTool);
    this.registerTool(getSettingsTool);
    this.registerTool(setModelPreferenceTool);
    this.registerTool(toggleSearchModeTool);
    this.registerTool(listCustomToolsTool);
    this.registerTool(createCustomToolTool);
    this.registerTool(deleteCustomToolTool);
    this.registerTool(toggleCustomToolTool);
    this.registerTool(savePromptTool);
    this.registerTool(getPromptsTool);
    this.registerTool(usePromptTool);
    this.registerTool(deletePromptTool);
    this.registerTool(extractFromNoteTool);

    this.loadCustomTools();
  }

  private loadCustomTools(): void {
    // This is called synchronously during construction, but custom tools need async init
    // So we defer loading until first use
    this.customToolsLoaded = false;
  }

  private customToolsLoaded: boolean = false;

  async ensureCustomToolsLoaded(): Promise<void> {
    if (this.customToolsLoaded) return;

    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.initialize();

      const customTools = sqlDatabase.getCustomTools(true);

      for (const tool of customTools) {
        // Build parameters schema
        const parameters: Record<string, { type: string; description: string; required: boolean }> =
          {};
        if (tool.parameters && Array.isArray(tool.parameters)) {
          for (const param of tool.parameters) {
            parameters[param.name] = {
              type: param.type || 'string',
              description: param.description || '',
              required: param.required !== false,
            };
          }
        }

        this.registerTool({
          name: tool.name,
          description: tool.description || `Custom API: ${tool.name}`,
          parameters,
          execute: async params => {
            try {
              const response = await fetch('/api/custom-tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolName: tool.name, parameters: params }),
              });

              const result = await response.json();
              return result;
            } catch (error) {
              return { success: false, error: `Failed to execute ${tool.name}` };
            }
          },
        });
      }

      this.customToolsLoaded = true;
    } catch (error) {
      console.error('[ToolRegistry] Failed to load custom tools:', error);
    }
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async getAllToolsAsync(): Promise<Tool[]> {
    await this.ensureCustomToolsLoaded();
    return Array.from(this.tools.values());
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  async getToolDescriptionsAsync(): Promise<
    Array<{ name: string; description: string; parameters: Record<string, any> }>
  > {
    await this.ensureCustomToolsLoaded();
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  getToolDescriptions(): Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }> {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  async getToolPromptAsync(): Promise<string> {
    await this.ensureCustomToolsLoaded();
    const tools = this.getAllTools();
    if (tools.length === 0) return '';

    let prompt = 'You have access to the following tools:\n\n';

    for (const tool of tools) {
      prompt += `## ${tool.name}\n${tool.description}\n\nParameters:\n`;
      for (const [param, spec] of Object.entries(tool.parameters)) {
        prompt += `- ${param} (${spec.type}${spec.required ? ', required' : ', optional'}): ${spec.description}\n`;
      }
      prompt += '\n';
    }

    prompt += `To use a tool, respond with JSON: { "tool": "name", "parameters": { ... } }`;
    return prompt;
  }

  getToolPrompt(): string {
    const tools = this.getAllTools();
    if (tools.length === 0) return '';

    let prompt = 'You have access to the following tools:\n\n';

    for (const tool of tools) {
      prompt += `## ${tool.name}\n${tool.description}\n\nParameters:\n`;
      for (const [param, spec] of Object.entries(tool.parameters)) {
        prompt += `- ${param} (${spec.type}${spec.required ? ', required' : ', optional'}): ${spec.description}\n`;
      }
      prompt += '\n';
    }

    prompt += `To use a tool, respond with JSON: { "tool": "name", "parameters": { ... } }`;
    return prompt;
  }

  async executeTool(name: string, parameters: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    const { toolEfficiencyAnalyzer } = await import('./tool-efficiency');

    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    try {
      const result = await tool.execute(parameters);
      const duration = Date.now() - startTime;

      toolEfficiencyAnalyzer.recordToolCall(name, parameters, result, duration, result.success);

      return {
        ...result,
        metadata: { tool: name, duration },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      toolEfficiencyAnalyzer.recordToolCall(name, parameters, null, duration, false);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getStats(): ToolRegistryStats {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentCalls = this.callHistory.filter(c => c.timestamp > dayAgo);

    const byTool: Record<string, { calls: number; success: number; avgDuration: number }> = {};
    for (const call of recentCalls) {
      if (!byTool[call.tool]) {
        byTool[call.tool] = { calls: 0, success: 0, avgDuration: 0 };
      }
      byTool[call.tool].calls++;
      if (call.success) byTool[call.tool].success++;
      byTool[call.tool].avgDuration =
        (byTool[call.tool].avgDuration * (byTool[call.tool].calls - 1) + call.duration) /
        byTool[call.tool].calls;
    }

    const successCount = recentCalls.filter(c => c.success).length;
    const totalDuration = recentCalls.reduce((sum, c) => sum + c.duration, 0);

    return {
      toolsAvailable: this.tools.size,
      callsToday: recentCalls.length,
      successRate: recentCalls.length > 0 ? successCount / recentCalls.length : 0,
      avgDuration: recentCalls.length > 0 ? totalDuration / recentCalls.length : 0,
      byTool,
    };
  }
}

export const toolRegistry = ToolRegistry.getInstance();
