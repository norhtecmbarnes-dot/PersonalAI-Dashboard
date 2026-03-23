/**
 * Model Message Bus - Hierarchical LLM Communication
 *
 * Routes tasks between local and cloud models based on complexity.
 * Local models handle routine tasks; cloud models handle intelligence tasks.
 *
 * Architecture:
 * 1. Local triage model assesses query complexity
 * 2. Simple tasks stay local (Angel Slim, Qwen, Llama)
 * 3. Complex tasks escalate to user's preferred cloud model
 * 4. Token budget tracking minimizes cloud costs
 */

import { chatCompletion, getFirstAvailableModel, getOllamaModels } from '@/lib/models/sdk.server';

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
  preferredCloudModel?: string;
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
  isCPUFriendly?: boolean;
}

const MODEL_TIERS: ModelTier[] = [
  {
    name: 'local-small',
    models: ['angglam.slim', 'qwen3.5:2b', 'glm-4.7-flash', 'llama3.2:3b'],
    provider: 'local',
    preferredFor: ['triage', 'preprocessing', 'simple queries', 'formatting', 'routine tasks'],
    isCPUFriendly: true,
  },
  {
    name: 'local-large',
    models: ['qwen3.5:9b', 'qwen3.5:27b', 'llama3.1:8b', 'mistral-nemo'],
    provider: 'local',
    preferredFor: ['chat', 'document analysis', 'medium complexity'],
  },
  {
    name: 'cloud-fast',
    models: ['groq/llama-3.1-8b-instant', 'groq/mixtral-8x7b-32768'],
    provider: 'cloud',
    preferredFor: ['fast responses', 'simple escalations', 'speed-critical'],
  },
  {
    name: 'cloud-smart',
    models: [
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'gemini/gemini-pro',
      'deepseek/deepseek-v3',
      'minimax/minimax-2.7',
      'moonshot/kimi-2.5',
    ],
    provider: 'cloud',
    preferredFor: [
      'complex reasoning',
      'research',
      'high accuracy',
      'writing',
      'intelligence tasks',
    ],
  },
];

export interface CloudModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export const CLOUD_MODEL_OPTIONS: CloudModelOption[] = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most capable, use when you have API key',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best for long context and analysis',
  },
  {
    id: 'gemini/gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Good balance of speed and capability',
  },
  {
    id: 'deepseek/deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Strong reasoning, cost effective',
  },
  {
    id: 'minimax/minimax-2.7',
    name: 'MiniMax 2.7',
    provider: 'MiniMax',
    description: 'Fast Chinese-language support',
  },
  {
    id: 'moonshot/kimi-2.5',
    name: 'Kimi 2.5',
    provider: 'Moonshot',
    description: 'Excellent for long context windows',
  },
  {
    id: 'glm/glm-5',
    name: 'GLM-5',
    provider: 'Zhipu',
    description: 'Strong Chinese language performance',
  },
  {
    id: 'groq/llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Groq)',
    provider: 'Groq',
    description: 'Fast inference speed',
  },
  {
    id: 'groq/mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (Groq)',
    provider: 'Groq',
    description: 'Fast, good for complex tasks',
  },
];

export class ModelMessageBus {
  private messageLog: ModelMessage[] = [];
  private tokenBudget = {
    daily: 100000,
    used: 0,
    localVsCloud: { local: 0, cloud: 0 },
  };
  private userPreferredCloudModel: string = 'deepseek/deepseek-v3';

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
        const prefSaved = localStorage.getItem('modelBusPreferredCloud');
        if (prefSaved) {
          this.userPreferredCloudModel = prefSaved;
        }
      } catch (e) {
        console.error('Error loading model bus state:', e);
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

  private savePreferredCloudModel() {
    if (typeof window === 'undefined') {
      try {
        localStorage.setItem('modelBusPreferredCloud', this.userPreferredCloudModel);
      } catch (e) {
        console.error('Error saving preferred cloud model:', e);
      }
    }
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async getLocalModels(): Promise<string[]> {
    try {
      const models = await getOllamaModels();
      return models.map(m => m.name);
    } catch {
      return [];
    }
  }

  async triageQuery(
    query: string,
    context?: string
  ): Promise<{
    complexity: 'low' | 'medium' | 'high' | 'unknown';
    requiresEscalation: boolean;
    reason: string;
    suggestedModel: string;
    localModels: string[];
  }> {
    const localModels = await this.getLocalModels();
    const assessment = await this.assessComplexity(query, context || '');
    const triageModel = await getFirstAvailableModel();

    return {
      ...assessment,
      suggestedModel: triageModel,
      localModels,
    };
  }

  private async assessComplexity(
    query: string,
    context: string
  ): Promise<{
    complexity: 'low' | 'medium' | 'high' | 'unknown';
    requiresEscalation: boolean;
    reason: string;
  }> {
    const routineKeywords = [
      'what is',
      'who is',
      'when did',
      'where is',
      'tell me',
      'remind me',
      'remember',
      'format',
      'list',
      'summarize',
      'translate',
      'check',
      'simple',
      'quick',
      'just',
      'calculate',
      'convert',
      'remind',
    ];

    const intelligenceKeywords = [
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
      'think',
      'reason',
      'solve',
      'creative',
      'innovative',
      'imagine',
      'hypothesize',
      'investigate',
    ];

    const queryLower = query.toLowerCase();
    const contextLength = context.length;

    let routineScore = 0;
    let intelligenceScore = 0;

    for (const keyword of routineKeywords) {
      if (queryLower.includes(keyword)) routineScore++;
    }
    for (const keyword of intelligenceKeywords) {
      if (queryLower.includes(keyword)) intelligenceScore++;
    }

    let complexity: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    let requiresEscalation = false;
    let reason = '';

    if (intelligenceScore >= 2 || (intelligenceScore >= 1 && contextLength > 2000)) {
      complexity = 'high';
      requiresEscalation = true;
      reason = 'Complex intelligence task detected';
    } else if (intelligenceScore === 1 || contextLength > 1500) {
      complexity = 'medium';
      requiresEscalation = contextLength > 2000 || intelligenceScore > 0;
      reason = requiresEscalation
        ? 'Medium complexity - benefits from smarter model'
        : 'Medium complexity - local processing sufficient';
    } else if (routineScore >= 1 && intelligenceScore === 0) {
      complexity = 'low';
      requiresEscalation = false;
      reason = 'Routine task - using local model';
    } else {
      complexity = 'unknown';
      requiresEscalation = contextLength > 1000;
      reason = requiresEscalation
        ? 'Defaulting to escalation for long context'
        : 'Defaulting to local processing';
    }

    const budgetRemaining = this.tokenBudget.daily - this.tokenBudget.used;
    if (budgetRemaining < 5000 && requiresEscalation) {
      requiresEscalation = false;
      reason += ' (Cloud budget low - using local only)';
    }

    return { complexity, requiresEscalation, reason };
  }

  private async selectCloudModel(preferredModel?: string): Promise<string> {
    if (preferredModel) {
      return preferredModel;
    }
    return this.userPreferredCloudModel;
  }

  setPreferredCloudModel(model: string) {
    this.userPreferredCloudModel = model;
    this.savePreferredCloudModel();
  }

  getPreferredCloudModel(): string {
    return this.userPreferredCloudModel;
  }

  getCloudModelOptions(): CloudModelOption[] {
    return CLOUD_MODEL_OPTIONS;
  }

  async process(request: DelegationRequest): Promise<DelegationResponse> {
    const messageId = this.generateId();
    const delegationPath: string[] = [];

    const triageStart = Date.now();
    const triageModel = await getFirstAvailableModel();
    delegationPath.push(`local-small:${triageModel.replace('ollama/', '')}`);

    const { complexity, requiresEscalation, reason } = await this.assessComplexity(
      request.originalQuery,
      request.context
    );

    let response: string;
    let finalModel = triageModel;

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
      const cloudModel = await this.selectCloudModel(request.preferredCloudModel);
      finalModel = cloudModel;
      delegationPath.push(`cloud:${cloudModel}`);

      const escalationMessage: ModelMessage = {
        id: messageId,
        timestamp: Date.now(),
        source: 'cloud-smart',
        task: request.originalQuery,
        context: request.context,
        complexity,
        requiresEscalation: true,
        escalationReason: reason,
      };
      this.messageLog.push(escalationMessage);

      try {
        const result = await chatCompletion({
          model: cloudModel,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
            },
            {
              role: 'user',
              content:
                request.originalQuery + (request.context ? `\n\nContext:\n${request.context}` : ''),
            },
          ],
          temperature: 0.7,
          maxTokens: 4096,
        });

        response =
          typeof result.message === 'string'
            ? result.message
            : result.message?.content || 'No response';

        escalationMessage.response = response;
        escalationMessage.tokensUsed = 0;

        this.tokenBudget.used += 0;
        this.tokenBudget.localVsCloud.cloud += 0;
        this.saveTokenBudget();
      } catch (error) {
        console.error('Cloud escalation failed, falling back to local:', error);

        const fallbackModel = await getFirstAvailableModel();
        finalModel = fallbackModel;
        delegationPath[delegationPath.length - 1] =
          `local-large:${fallbackModel.replace('ollama/', '')}`;

        const result = await chatCompletion({
          model: fallbackModel,
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
        escalationMessage.source = 'local-large';
        escalationMessage.response = response;
      }
    } else {
      finalModel = triageModel;
      delegationPath[delegationPath.length - 1] =
        `local-small:${triageModel.replace('ollama/', '')}`;

      const result = await chatCompletion({
        model: triageModel,
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

      this.tokenBudget.used += 0;
      this.tokenBudget.localVsCloud.local += 0;
      this.saveTokenBudget();
    }

    return {
      success: true,
      messageId,
      finalResponse: response,
      delegationPath,
      totalTokens: 0,
    };
  }

  async delegateDirect(
    query: string,
    context: string,
    targetModel?: string,
    apiKey?: string
  ): Promise<{ success: boolean; response: string; tokens: number }> {
    const model = targetModel || this.userPreferredCloudModel;

    const result = await chatCompletion({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: query + (context ? `\n\nContext:\n${context}` : '') },
      ],
      temperature: 0.7,
      maxTokens: 4096,
    });

    const responseText =
      typeof result.message === 'string'
        ? result.message
        : result.message?.content || 'No response';

    return { success: true, response: responseText, tokens: 0 };
  }

  getHistory(limit = 50): ModelMessage[] {
    return this.messageLog.slice(-limit);
  }

  getBudgetStatus() {
    return {
      ...this.tokenBudget,
      remaining: this.tokenBudget.daily - this.tokenBudget.used,
      percentUsed: (this.tokenBudget.used / this.tokenBudget.daily) * 100,
    };
  }

  resetBudget() {
    this.tokenBudget.used = 0;
    this.tokenBudget.localVsCloud = { local: 0, cloud: 0 };
    this.saveTokenBudget();
  }

  getAvailableModels(): ModelTier[] {
    return MODEL_TIERS;
  }
}

let busInstance: ModelMessageBus | null = null;

export function getModelBus(): ModelMessageBus {
  if (!busInstance) {
    busInstance = new ModelMessageBus();
  }
  return busInstance;
}
