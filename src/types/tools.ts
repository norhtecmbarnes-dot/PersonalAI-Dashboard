export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required: boolean;
    enum?: string[];
  }>;
  execute: (params: Record<string, any>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tool: string;
    duration: number;
    tokens?: number;
  };
}

export interface ToolRegistryStats {
  toolsAvailable: number;
  callsToday: number;
  successRate: number;
  avgDuration: number;
  byTool: Record<string, { calls: number; success: number; avgDuration: number }>;
}