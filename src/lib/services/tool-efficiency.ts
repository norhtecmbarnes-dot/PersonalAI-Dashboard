export interface ToolUsageMetrics {
  toolName: string;
  calls: number;
  successes: number;
  failures: number;
  avgDuration: number;
  avgResultSize: number;
  commonErrors: string[];
  lastUsed: number;
}

export interface EfficiencyInsight {
  id: string;
  category: 'tool_usage' | 'token_efficiency' | 'workflow' | 'caching' | 'context';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  estimatedSavings?: {
    tokens?: number;
    time?: number;
    calls?: number;
  };
  example?: string;
}

export interface WorkflowAnalysis {
  sequence: string[];
  frequency: number;
  avgDuration: number;
  successRate: number;
  canOptimize: boolean;
  suggestion?: string;
}

export interface SelfReflectionReport {
  id: string;
  timestamp: number;
  
  toolUsage: ToolUsageMetrics[];
  workflows: WorkflowAnalysis[];
  insights: EfficiencyInsight[];
  
  tokenEfficiency: {
    avgTokensPerQuery: number;
    avgTokensPerTool: Record<string, number>;
    wastedTokens: number;
    recommendation: string;
  };
  
  contextUsage: {
    avgContextSize: number;
    relevantContextRatio: number;
    suggestedOptimizations: string[];
  };
  
  cachePerformance: {
    hitRate: number;
    misses: number;
    potentialSavings: number;
  };
  
  overallEfficiency: number;
  priorityActions: string[];
}

class ToolEfficiencyAnalyzer {
  private static instance: ToolEfficiencyAnalyzer;
  private toolCalls: Array<{
    tool: string;
    parameters: Record<string, any>;
    result: any;
    duration: number;
    timestamp: number;
    success: boolean;
    tokensUsed?: number;
    contextUsed?: number;
  }> = [];
  
  private workloads: Array<{
    query: string;
    toolsUsed: string[];
    totalDuration: number;
    totalTokens: number;
    success: boolean;
    timestamp: number;
  }> = [];
  
  private readonly STORAGE_KEY = 'ai_tool_efficiency';

  private constructor() {
    this.loadData();
  }

  static getInstance(): ToolEfficiencyAnalyzer {
    if (!ToolEfficiencyAnalyzer.instance) {
      ToolEfficiencyAnalyzer.instance = new ToolEfficiencyAnalyzer();
    }
    return ToolEfficiencyAnalyzer.instance;
  }

  private loadData(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.toolCalls = data.toolCalls || [];
        this.workloads = data.workloads || [];
      }
    } catch {
      this.toolCalls = [];
      this.workloads = [];
    }
  }

  private saveData(): void {
    if (typeof window === 'undefined') return;
    try {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.toolCalls = this.toolCalls.filter(c => c.timestamp > cutoff);
      this.workloads = this.workloads.filter(w => w.timestamp > cutoff);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        toolCalls: this.toolCalls.slice(-1000),
        workloads: this.workloads.slice(-500),
      }));
    } catch {
      // Storage full
    }
  }

  recordToolCall(
    tool: string,
    parameters: Record<string, any>,
    result: any,
    duration: number,
    success: boolean,
    tokensUsed?: number
  ): void {
    this.toolCalls.push({
      tool,
      parameters,
      result: success ? 'success' : result,
      duration,
      timestamp: Date.now(),
      success,
      tokensUsed,
    });
    this.saveData();
  }

  recordWorkload(
    query: string,
    toolsUsed: string[],
    totalDuration: number,
    totalTokens: number,
    success: boolean
  ): void {
    this.workloads.push({
      query,
      toolsUsed,
      totalDuration,
      totalTokens,
      success,
      timestamp: Date.now(),
    });
    this.saveData();
  }

  analyzeToolUsage(): ToolUsageMetrics[] {
    const metrics: Map<string, ToolUsageMetrics> = new Map();

    for (const call of this.toolCalls) {
      if (!metrics.has(call.tool)) {
        metrics.set(call.tool, {
          toolName: call.tool,
          calls: 0,
          successes: 0,
          failures: 0,
          avgDuration: 0,
          avgResultSize: 0,
          commonErrors: [],
          lastUsed: 0,
        });
      }

      const m = metrics.get(call.tool)!;
      m.calls++;
      if (call.success) m.successes++;
      else m.failures++;
      m.avgDuration = (m.avgDuration * (m.calls - 1) + call.duration) / m.calls;
      m.lastUsed = Math.max(m.lastUsed, call.timestamp);
    }

    return Array.from(metrics.values());
  }

  analyzeWorkflows(): WorkflowAnalysis[] {
    const sequences: Map<string, { count: number; duration: number; success: number }> = new Map();

    for (const workload of this.workloads) {
      if (workload.toolsUsed.length < 2) continue;
      
      const key = workload.toolsUsed.join(' → ');
      if (!sequences.has(key)) {
        sequences.set(key, { count: 0, duration: 0, success: 0 });
      }
      
      const s = sequences.get(key)!;
      s.count++;
      s.duration += workload.totalDuration;
      s.success += workload.success ? 1 : 0;
    }

    const workflows: WorkflowAnalysis[] = [];
    for (const [sequence, data] of sequences) {
      const tools = sequence.split(' → ');
      const canOptimize = this.canOptimizeSequence(tools);
      
      workflows.push({
        sequence: tools,
        frequency: data.count,
        avgDuration: data.duration / data.count,
        successRate: data.success / data.count,
        canOptimize,
        suggestion: canOptimize ? this.getOptimizationSuggestion(tools) : undefined,
      });
    }

    return workflows.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  }

  private canOptimizeSequence(tools: string[]): boolean {
    // Check for redundant calls
    const uniqueTools = new Set(tools);
    if (uniqueTools.size < tools.length) return true;

    // Check for inefficient patterns
    const patterns = [
      ['vector_search', 'document_read'], // Could combine
      ['sql_query', 'sql_query'], // Could batch
      ['ocr_process', 'ocr_process'], // Could batch
    ];

    for (const pattern of patterns) {
      if (pattern.length === 2) {
        for (let i = 0; i < tools.length - 1; i++) {
          if (tools[i] === pattern[0] && tools[i + 1] === pattern[1]) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private getOptimizationSuggestion(tools: string[]): string {
    // Redundant tool calls
    const counts: Record<string, number> = {};
    for (const tool of tools) {
      counts[tool] = (counts[tool] || 0) + 1;
    }

    for (const [tool, count] of Object.entries(counts)) {
      if (count > 1) {
        switch (tool) {
          case 'sql_query':
            return `Combine ${count} SQL queries into a single query with JOINs to reduce database round-trips`;
          case 'vector_search':
            return `Use a single vector search with aggregated queries instead of ${count} separate searches`;
          case 'ocr_process':
            return `Batch ${count} OCR operations together for parallel processing`;
          default:
            return `Consider caching results from ${tool} to avoid ${count} redundant calls`;
        }
      }
    }

    // Specific patterns
    const toolStr = tools.join(' → ');
    if (toolStr.includes('vector_search → document_read')) {
      return 'Vector search could return document content directly, avoiding a second call';
    }
    if (toolStr.includes('sql_query → vector_search')) {
      return 'Consider indexing SQL data in vector store for direct semantic search';
    }

    return 'Review this workflow for parallel execution opportunities';
  }

  generateInsights(): EfficiencyInsight[] {
    const insights: EfficiencyInsight[] = [];
    const toolUsage = this.analyzeToolUsage();
    const workflows = this.analyzeWorkflows();

    // Analyze slow tools
    for (const tool of toolUsage) {
      if (tool.avgDuration > 2000 && tool.calls >= 5) {
        insights.push({
          id: `slow_tool_${tool.toolName}`,
          category: 'tool_usage',
          title: `Slow Tool: ${tool.toolName}`,
          description: `Averaging ${Math.round(tool.avgDuration)}ms over ${tool.calls} calls`,
          impact: tool.avgDuration > 5000 ? 'high' : 'medium',
          recommendation: this.getSlowToolRecommendation(tool.toolName, tool.avgDuration),
          estimatedSavings: { time: tool.avgDuration * 0.3 * tool.calls },
        });
      }

      if (tool.failures > 0 && tool.failures / tool.calls > 0.1) {
        insights.push({
          id: `unreliable_tool_${tool.toolName}`,
          category: 'tool_usage',
          title: `Unreliable Tool: ${tool.toolName}`,
          description: `${Math.round(tool.failures / tool.calls * 100)}% failure rate (${tool.failures}/${tool.calls} calls)`,
          impact: 'high',
          recommendation: 'Add retry logic with exponential backoff, or use fallback tools',
          estimatedSavings: { calls: Math.round(tool.failures * 0.5) },
        });
      }
    }

    // Analyze workflows
    for (const workflow of workflows.filter(w => w.canOptimize)) {
      if (workflow.frequency >= 3) {
        insights.push({
          id: `workflow_${workflow.sequence.join('_')}`,
          category: 'workflow',
          title: `Optimizable Workflow Pattern`,
          description: `"${workflow.sequence.join(' → ')}" used ${workflow.frequency} times`,
          impact: workflow.frequency >= 10 ? 'high' : 'medium',
          recommendation: workflow.suggestion || 'Review for optimization opportunities',
          estimatedSavings: { time: workflow.avgDuration * 0.3 * workflow.frequency },
        });
      }
    }

    // Token efficiency
    const totalTokens = this.workloads.reduce((sum, w) => sum + w.totalTokens, 0);
    const avgTokens = this.workloads.length > 0 ? totalTokens / this.workloads.length : 0;
    
    if (avgTokens > 3000) {
      insights.push({
        id: 'high_token_usage',
        category: 'token_efficiency',
        title: 'High Average Token Usage',
        description: `Averaging ${Math.round(avgTokens)} tokens per query`,
        impact: 'high',
        recommendation: 'Reduce context size by fetching only relevant documents, use summarization for long conversations',
        estimatedSavings: { tokens: Math.round((avgTokens - 1500) * this.workloads.length) },
      });
    }

    // Check for unused tools (tools registered but rarely called)
    const registeredTools = [
      'vector_search', 'sql_query', 'document_read', 'document_upload',
      'ocr_process', 'calculate', 'web_search', 'web_fetch', 'math_solve',
    ];
    
    const usedTools = new Set(toolUsage.map(t => t.toolName));
    const unusedTools = registeredTools.filter(t => !usedTools.has(t));
    
    if (unusedTools.length > 0) {
      insights.push({
        id: 'unused_tools',
        category: 'tool_usage',
        title: 'Underutilized Tools Available',
        description: `Tools not being used: ${unusedTools.join(', ')}`,
        impact: 'low',
        recommendation: 'Consider if these tools could help solve problems more efficiently',
        example: `For example, use ${unusedTools[0]} instead of asking the LLM to compute manually`,
      });
    }

    return insights;
  }

  private getSlowToolRecommendation(toolName: string, avgDuration: number): string {
    switch (toolName) {
      case 'vector_search':
        return 'Consider caching frequent searches, reducing result limit, or pre-computing embeddings';
      case 'sql_query':
        return 'Add indexes to frequently queried columns, use query caching, or denormalize data';
      case 'ocr_process':
        return 'Pre-process images (resize, rotate), use batch processing, or cache results';
      case 'web_fetch':
        return 'Cache responses, use parallel requests, or reduce timeout values';
      case 'calculate':
        return 'Cache common calculations, use simpler math operations, or pre-compute values';
      default:
        return 'Profile the tool implementation for bottlenecks';
    }
  }

  analyzeTokenEfficiency(): SelfReflectionReport['tokenEfficiency'] {
    const toolTokens: Record<string, number[]> = {};
    let totalTokens = 0;
    let totalQueries = 0;

    for (const call of this.toolCalls) {
      if (call.tokensUsed) {
        if (!toolTokens[call.tool]) toolTokens[call.tool] = [];
        toolTokens[call.tool].push(call.tokensUsed);
        totalTokens += call.tokensUsed;
      }
    }
    totalQueries = this.workloads.length || 1;

    const avgTokensPerTool: Record<string, number> = {};
    for (const [tool, tokens] of Object.entries(toolTokens)) {
      avgTokensPerTool[tool] = tokens.reduce((a, b) => a + b, 0) / tokens.length;
    }

    // Estimate wasted tokens (failed calls, redundant queries)
    const wastedTokens = this.toolCalls
      .filter(c => !c.success)
      .reduce((sum, c) => sum + (c.tokensUsed || 0), 0);

    let recommendation = 'Token usage is efficient';
    if (wastedTokens > totalTokens * 0.1) {
      recommendation = 'Reduce failed tool calls to save tokens';
    } else if (totalTokens / totalQueries > 5000) {
      recommendation = 'Consider using smaller context windows or summarizing mid-conversation';
    }

    return {
      avgTokensPerQuery: totalTokens / totalQueries,
      avgTokensPerTool: avgTokensPerTool,
      wastedTokens,
      recommendation,
    };
  }

  analyzeContextUsage(): SelfReflectionReport['contextUsage'] {
    // Simplified analysis based on vector search results
    const vectorCalls = this.toolCalls.filter(c => c.tool === 'vector_search');
    
    let totalResults = 0;
    let relevantResults = 0;
    
    // These would come from actual usage data
    for (const call of vectorCalls) {
      totalResults += (call.parameters as any)?.limit || 5;
    }
    relevantResults = Math.round(totalResults * 0.7); // Estimate

    const avgContextSize = vectorCalls.length > 0 
      ? totalResults * 500 // Estimate 500 tokens per result
      : 0;

    const suggestedOptimizations: string[] = [];
    
    if (relevantResults < totalResults * 0.6) {
      suggestedOptimizations.push('Increase similarity threshold to filter less relevant results');
    }
    if (totalResults > 10) {
      suggestedOptimizations.push('Reduce default result limit to focus on most relevant context');
    }
    if (vectorCalls.length > 50) {
      suggestedOptimizations.push('Consider caching frequent queries to reduce vector search calls');
    }

    return {
      avgContextSize,
      relevantContextRatio: totalResults > 0 ? relevantResults / totalResults : 0,
      suggestedOptimizations,
    };
  }

  analyzeCachePerformance(): SelfReflectionReport['cachePerformance'] {
    // Estimate cache performance based on repeated queries
    const queryCounts: Map<string, number> = new Map();
    
    for (const call of this.toolCalls) {
      const key = JSON.stringify({ tool: call.tool, params: call.parameters });
      queryCounts.set(key, (queryCounts.get(key) || 0) + 1);
    }

    const cacheable = Array.from(queryCounts.values()).filter(c => c > 1);
    const hits = cacheable.reduce((sum, c) => sum + (c - 1), 0);
    const total = this.toolCalls.length || 1;

    return {
      hitRate: hits / total,
      misses: total - hits,
      potentialSavings: hits * 500, // Estimate 500ms saved per cache hit
    };
  }

  generateReport(): SelfReflectionReport {
    const toolUsage = this.analyzeToolUsage();
    const workflows = this.analyzeWorkflows();
    const insights = this.generateInsights();
    const tokenEfficiency = this.analyzeTokenEfficiency();
    const contextUsage = this.analyzeContextUsage();
    const cachePerformance = this.analyzeCachePerformance();

    // Calculate overall efficiency score
    let efficiencyScore = 100;
    
    // Penalize for slow tools
    for (const tool of toolUsage) {
      if (tool.avgDuration > 1000) {
        efficiencyScore -= Math.min(10, tool.avgDuration / 1000);
      }
      if (tool.failures > tool.successes * 0.1) {
        efficiencyScore -= 5;
      }
    }
    
    // Penalize for wasted tokens
    if (tokenEfficiency.wastedTokens > 0) {
      efficiencyScore -= Math.min(10, tokenEfficiency.wastedTokens / 1000);
    }
    
    // Penalize for poor cache hit rate
    if (cachePerformance.hitRate < 0.3) {
      efficiencyScore -= 5;
    }
    
    // Reward for efficient context usage
    if (contextUsage.relevantContextRatio > 0.8) {
      efficiencyScore += 5;
    }

    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

    // Generate priority actions
    const priorityActions: string[] = [];
    
    const highImpact = insights.filter(i => i.impact === 'high');
    for (const insight of highImpact.slice(0, 3)) {
      priorityActions.push(insight.recommendation);
    }
    
    if (tokenEfficiency.wastedTokens > 0) {
      priorityActions.push(`Reduce failed tool calls to save ${tokenEfficiency.wastedTokens} tokens`);
    }
    
    if (cachePerformance.hitRate < 0.5) {
      priorityActions.push('Implement caching for frequently repeated queries');
    }

    return {
      id: `efficiency_${Date.now()}`,
      timestamp: Date.now(),
      toolUsage,
      workflows,
      insights,
      tokenEfficiency,
      contextUsage,
      cachePerformance,
      overallEfficiency: Math.round(efficiencyScore),
      priorityActions,
    };
  }

  getRecommendationsForQuery(query: string, availableTools: string[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze query for tool opportunities
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('lookup')) {
      if (availableTools.includes('vector_search')) {
        recommendations.push('Use vector_search to find relevant documents semantically');
      }
      if (availableTools.includes('sql_query')) {
        recommendations.push('Use sql_query for structured data lookups');
      }
    }
    
    if (lowerQuery.includes('calculate') || lowerQuery.includes('compute') || /\d+\s*[\+\-\*\/]\s*\d+/.test(query)) {
      if (availableTools.includes('calculate')) {
        recommendations.push('Use calculate tool for accurate mathematical operations');
      }
    }
    
    if (lowerQuery.includes('image') || lowerQuery.includes('picture') || lowerQuery.includes('scan')) {
      if (availableTools.includes('ocr_process')) {
        recommendations.push('Use ocr_process to extract text from images');
      }
    }
    
    if (lowerQuery.includes('website') || lowerQuery.includes('url') || lowerQuery.includes('http')) {
      if (availableTools.includes('web_fetch')) {
        recommendations.push('Use web_fetch to retrieve and analyze web content');
      }
    }

    // Check historical patterns
    const similarWorkflows = this.workloads
      .filter(w => w.query.toLowerCase().includes(lowerQuery.split(' ')[0]))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);

    if (similarWorkflows.length > 0 && similarWorkflows[0].toolsUsed.length > 0) {
      recommendations.push(`Similar queries used: ${similarWorkflows[0].toolsUsed.join(' → ')}`);
    }

    return recommendations;
  }

  clearData(): void {
    this.toolCalls = [];
    this.workloads = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

export const toolEfficiencyAnalyzer = ToolEfficiencyAnalyzer.getInstance();