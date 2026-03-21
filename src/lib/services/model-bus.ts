/**
 * Model Message Bus - Hierarchical LLM Communication
 *
 * Allows small local models to delegate complex tasks to cloud models
 * when they feel overwhelmed or when token budgets are tight.
 *
 * Architecture:
 * 1. Small model acts as triage/preprocessor
 * 2. Determines if task needs escalation
 * 3. Routes to appropriate model (local large, cloud fast, cloud smart)
 * 4. Results flow back through the bus
 */

import { chatCompletion } from '@/lib/models/sdk.server';

export interface ModelMessage {
  id: string;
  timestamp: number;
  source: 'local-small' | 'local-large' | 'cloud-fast' | 'cloud-smart';
  task: string;
  context: string;
  complexity: 'low' | 'medium' | 'high' | 'unknown';
  requiresEscalation: boolean;
  escalationReason?: string;
  response?: string;
  tokensUsed?: number;
  metadata?: Record<string, any>;
}

export interface DelegationRequest {
  originalQuery: string;
  context: string;
  sourceModel: string;
  userId?: string;
  brandId?: string;
  preferredTier?: 'local' | 'cloud-fast' | 'cloud-smart';
}

export interface DelegationResponse {
  success: boolean;
  messageId: string;
  finalResponse: string;
  delegationPath: string[];
  totalTokens: number;
  costSavings?: {
    localTokens: number;
    cloudTokens: number;
    estimatedSaved: number;
  };
}

interface ModelTier {
  name: string;
  models: string[];
  provider: 'local' | 'cloud';
  preferredFor: string[];
}

const MODEL_TIERS: ModelTier[] = [
  {
    name: 'local-small',
    models: ['qwen3.5:2b', 'glm-4.7-flash'],
    provider: 'local',
    preferredFor: [' triage', 'preprocessing', 'simple queries', 'formatting'],
  },
  {
    name: 'local-large',
    models: ['qwen3.5:9b', 'qwen3.5:27b', 'llama3.1:8b', 'mistral-nemo'],
    provider: 'local',
    preferredFor: ['chat', 'document analysis', 'medium complexity'],
  },
  {
    name: 'cloud-fast',
    models: ['groq/llama-3.1-8b-instant', 'groq/mixtral-8x7b-32768', 'openrouter/quick'],
    provider: 'cloud',
    preferredFor: ['fast responses', 'simple escalations', 'speed-critical'],
  },
  {
    name: 'cloud-smart',
    models: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-pro', 'deepseek-v3'],
    provider: 'cloud',
    preferredFor: ['complex reasoning', 'research', 'high accuracy', 'writing'],
  },
];

export class ModelMessageBus {
  private messageLog: ModelMessage[] = [];
  private tokenBudget = {
    daily: 100000,
    used: 0,
    localVsCloud: { local: 0, cloud: 0 },
  };

  constructor() {
    this.loadTokenBudget();
  }

  private loadTokenBudget() {
    if (typeof window === 'undefined') {
      try {
        const saved = localStorage.getItem('modelBusBudget');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.date === new Date().toDateString()) {
            this.tokenBudget = parsed;
          }
        }
      } catch (e) {
        console.error('Error loading token budget:', e);
      }
    }
  }

  private saveTokenBudget() {
    if (typeof window === 'undefined') {
      try {
        localStorage.setItem(
          'modelBusBudget',
          JSON.stringify({
            ...this.tokenBudget,
            date: new Date().toDateString(),
          })
        );
      } catch (e) {
        console.error('Error saving token budget:', e);
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Triage a query - assess complexity without processing
   */
  async triageQuery(
    query: string,
    context?: string
  ): Promise<{
    complexity: 'low' | 'medium' | 'high' | 'unknown';
    requiresEscalation: boolean;
    reason: string;
    suggestedModel: string;
  }> {
    const assessment = await this.assessComplexity(query, context || '');
    const { model, tier } = this.selectModel(assessment.complexity);

    return {
      ...assessment,
      suggestedModel: model,
    };
  }

  /**
   * Determine task complexity based on query analysis
   */
  private async assessComplexity(
    query: string,
    context: string
  ): Promise<{
    complexity: 'low' | 'medium' | 'high' | 'unknown';
    requiresEscalation: boolean;
    reason: string;
  }> {
    const complexityIndicators = {
      high: [
        'analyze',
        'research',
        'compare',
        'evaluate',
        'design',
        'architect',
        'comprehensive',
        'detailed',
        'thorough',
        'complex',
        'multi-step',
        'explain why',
        'justify',
        'synthesize',
        'meta',
      ],
      low: [
        'what is',
        'who is',
        'when did',
        'simple',
        'quick',
        'just',
        'tell me',
        'remind me',
        'remember',
        'format',
        'list',
      ],
    };

    const queryLower = query.toLowerCase();
    const contextLength = context.length;

    let highIndicators = 0;
    let lowIndicators = 0;

    for (const indicator of complexityIndicators.high) {
      if (queryLower.includes(indicator)) highIndicators++;
    }
    for (const indicator of complexityIndicators.low) {
      if (queryLower.includes(indicator)) lowIndicators++;
    }

    // Determine complexity
    let complexity: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    let requiresEscalation = false;
    let reason = '';

    if (highIndicators >= 2 || (highIndicators >= 1 && contextLength > 2000)) {
      complexity = 'high';
      requiresEscalation = true;
      reason = 'High complexity indicators detected';
    } else if (highIndicators === 1 || contextLength > 1000) {
      complexity = 'medium';
      requiresEscalation = contextLength > 2000;
      reason = 'Medium complexity - escalation based on context length';
    } else if (lowIndicators >= 1 && highIndicators === 0) {
      complexity = 'low';
      requiresEscalation = false;
      reason = 'Simple query - no escalation needed';
    }

    // Check token budget
    const budgetRemaining = this.tokenBudget.daily - this.tokenBudget.used;
    if (budgetRemaining < 5000) {
      requiresEscalation = false; // Force local processing when budget low
      reason += ' (Cloud budget low - using local only)';
    }

    return { complexity, requiresEscalation, reason };
  }

  /**
   * Select appropriate model based on complexity and availability
   */
  private selectModel(
    complexity: 'low' | 'medium' | 'high' | 'unknown',
    preferredTier?: 'local' | 'cloud-fast' | 'cloud-smart'
  ): { model: string; tier: ModelTier } {
    let selectedTier: ModelTier;

    if (preferredTier === 'cloud-smart' || complexity === 'high') {
      selectedTier = MODEL_TIERS.find(t => t.name === 'cloud-smart')!;
    } else if (preferredTier === 'cloud-fast' || complexity === 'medium') {
      selectedTier = MODEL_TIERS.find(t => t.name === 'cloud-fast')!;
    } else if (complexity === 'low') {
      selectedTier = MODEL_TIERS.find(t => t.name === 'local-small')!;
    } else {
      selectedTier = MODEL_TIERS.find(t => t.name === 'local-large')!;
    }

    // For now, select the first model in each tier
    // In production, this could轮询 based on load or availability
    return {
      model: selectedTier.models[0],
      tier: selectedTier,
    };
  }

  /**
   * Process a message through the bus
   */
  async process(request: DelegationRequest): Promise<DelegationResponse> {
    const messageId = this.generateId();
    const delegationPath: string[] = [];

    // Step 1: Triage with small local model
    const triageStart = Date.now();
    const triageModel = 'ollama/qwen3.5:2b'; // Smallest, fastest

    delegationPath.push('local-small:triage');

    // Step 2: Assess complexity
    const { complexity, requiresEscalation, reason } = await this.assessComplexity(
      request.originalQuery,
      request.context
    );

    let response: string;
    let finalModel = triageModel;

    // Create initial message log
    const triageMessage: ModelMessage = {
      id: messageId,
      timestamp: Date.now(),
      source: 'local-small',
      task: request.originalQuery,
      context: request.context,
      complexity,
      requiresEscalation,
      escalationReason: reason,
      metadata: { triageTime: Date.now() - triageStart },
    };
    this.messageLog.push(triageMessage);

    if (requiresEscalation) {
      // Step 3: Escalate to appropriate cloud model
      const { model, tier } = this.selectModel(complexity, request.preferredTier);
      finalModel = model;
      delegationPath.push(`${tier.name}:${model}`);

      const escalationMessage: ModelMessage = {
        id: messageId,
        timestamp: Date.now(),
        source: tier.name as any,
        task: request.originalQuery,
        context: request.context,
        complexity,
        requiresEscalation: true,
        escalationReason: reason,
      };
      this.messageLog.push(escalationMessage);

      // Execute with escalated model
      try {
        const result = await chatCompletion({
          model: `ollama/${model}`,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. Provide clear, concise responses.',
            },
            {
              role: 'user',
              content:
                request.originalQuery + (request.context ? `\n\nContext:\n${request.context}` : ''),
            },
          ],
          temperature: 0.7,
          maxTokens: 2048,
        });

        response =
          typeof result.message === 'string'
            ? result.message
            : result.message?.content || 'No response';

        // Update message with response
        escalationMessage.response = response;
        escalationMessage.tokensUsed = 0; // Ollama doesn't return usage

        // Track token usage
        this.tokenBudget.used += escalationMessage.tokensUsed || 0;
        this.tokenBudget.localVsCloud.cloud += escalationMessage.tokensUsed || 0;
        this.saveTokenBudget();
      } catch (error) {
        console.error('Escalation failed, falling back to local:', error);

        // Fallback to local large model
        const { model, tier } = this.selectModel('medium', 'local');
        finalModel = model;
        delegationPath[delegationPath.length - 1] = `${tier.name}:${model}`;

        const result = await chatCompletion({
          model: `ollama/${model}`,
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant.' },
            { role: 'user', content: request.originalQuery },
          ],
          temperature: 0.7,
          maxTokens: 2048,
        });

        response =
          typeof result.message === 'string'
            ? result.message
            : result.message?.content || 'Fallback response';
        escalationMessage.source = tier.name as any;
        escalationMessage.response = response;
      }
    } else {
      // Process locally with small model
      const { model, tier } = this.selectModel(complexity);
      finalModel = model;
      delegationPath[delegationPath.length - 1] = `${tier.name}:${model}`;

      const result = await chatCompletion({
        model: `ollama/${model}`,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Be concise and efficient.' },
          { role: 'user', content: request.originalQuery },
        ],
        temperature: 0.7,
        maxTokens: 1024,
      });

      response =
        typeof result.message === 'string'
          ? result.message
          : result.message?.content || 'No response';
      triageMessage.response = response;
      triageMessage.tokensUsed = 0;

      this.tokenBudget.used += triageMessage.tokensUsed || 0;
      this.tokenBudget.localVsCloud.local += triageMessage.tokensUsed || 0;
      this.saveTokenBudget();
    }

    // Calculate cost savings (rough estimate)
    const localCostPerToken = 0;
    const cloudCostPerToken = 0.00001; // Rough estimate
    const totalTokens = this.messageLog.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    const cloudTokens = this.messageLog
      .filter(m => m.source.startsWith('cloud'))
      .reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    const localTokens = totalTokens - cloudTokens;

    return {
      success: true,
      messageId,
      finalResponse: response,
      delegationPath,
      totalTokens,
      costSavings: {
        localTokens,
        cloudTokens,
        estimatedSaved: localTokens * localCostPerToken - cloudTokens * cloudCostPerToken,
      },
    };
  }

  /**
   * Direct delegation to cloud model (bypasses triage)
   */
  async delegateDirect(
    query: string,
    context: string,
    targetModel: 'cloud-fast' | 'cloud-smart',
    apiKey?: string
  ): Promise<{ success: boolean; response: string; tokens: number }> {
    const tier = MODEL_TIERS.find(
      t => t.name === `cloud-${targetModel === 'cloud-fast' ? 'fast' : 'smart'}`
    );
    const model = tier?.models[0] || 'groq/llama-3.1-8b-instant';

    const result = await chatCompletion({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: query + (context ? `\n\nContext:\n${context}` : '') },
      ],
      temperature: 0.7,
      maxTokens: 2048,
    });

    const responseText =
      typeof result.message === 'string'
        ? result.message
        : result.message?.content || 'No response';

    return { success: true, response: responseText, tokens: 0 };
  }

  /**
   * Get message history
   */
  getHistory(limit = 50): ModelMessage[] {
    return this.messageLog.slice(-limit);
  }

  /**
   * Get current token budget status
   */
  getBudgetStatus() {
    return {
      ...this.tokenBudget,
      remaining: this.tokenBudget.daily - this.tokenBudget.used,
      percentUsed: (this.tokenBudget.used / this.tokenBudget.daily) * 100,
    };
  }

  /**
   * Reset daily budget
   */
  resetBudget() {
    this.tokenBudget.used = 0;
    this.tokenBudget.localVsCloud = { local: 0, cloud: 0 };
    this.saveTokenBudget();
  }

  /**
   * Get available models in the bus
   */
  getAvailableModels(): ModelTier[] {
    return MODEL_TIERS;
  }
}

// Singleton instance
let busInstance: ModelMessageBus | null = null;

export function getModelBus(): ModelMessageBus {
  if (!busInstance) {
    busInstance = new ModelMessageBus();
  }
  return busInstance;
}
