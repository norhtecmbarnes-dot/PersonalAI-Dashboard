/**
 * Model Message Bus - Hierarchical LLM Communication
 *
 * Uses self-assessment: local model decides if it can handle a task
 * or needs to escalate to a smarter cloud model.
 *
 * Architecture:
 * 1. Small local model receives query with self-assessment prompt
 * 2. Model honestly evaluates: can I answer this well?
 * 3. If yes, process locally (cheap, fast)
 * 4. If no, escalate to user's preferred cloud model
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
  selfAssessment?: {
    canHandle: boolean;
    reason: string;
    suggestedTier: number;
  };
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
    preferredFor: ['triage', 'routine tasks', 'formatting', 'simple queries'],
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
    preferredFor: ['fast responses', 'simple escalations'],
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
    preferredFor: ['complex reasoning', 'research', 'high accuracy', 'intelligence tasks'],
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

interface SelfAssessment {
  canHandle: boolean;
  reason: string;
  suggestedTier: number;
}

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

  private getSelfAssessmentPrompt(): string {
    return `You are a tiny local AI model with limited capabilities. Your job is to be HONEST about what you can handle.

Analyze the user's query and decide:
1. Can you answer this COMPLETELY and ACCURATELY right now?
2. Would the user be SATISFIED with your answer?
3. Should this go to a smarter cloud model?

Rules:
- If the query is a simple fact, definition, calculation, format, or routine task → canHandle: true
- If the query requires deep reasoning, up-to-date knowledge, creative writing, complex analysis → canHandle: false
- If you're UNSURE, lean toward canHandle: false
- If the query is in a language you weren't trained on, lean toward canHandle: false

Answer ONLY with valid JSON, no markdown, no explanation:
{"canHandle": true/false, "reason": "one sentence explaining why", "suggestedTier": 2}

suggestedTier meaning:
- 2 = local large model (medium complexity, can try local first)
- 3 = cloud fast model (needs cloud but not the smartest)
- 4 = cloud smart model (complex reasoning, research, accuracy critical)`;
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
    const assessment = await this.selfAssess(query, context || '');
    const triageModel = await getFirstAvailableModel();

    return {
      complexity: assessment.canHandle ? 'low' : 'high',
      requiresEscalation: !assessment.canHandle,
      reason: assessment.reason,
      suggestedModel: triageModel,
      localModels,
    };
  }

  private async selfAssess(query: string, context: string): Promise<SelfAssessment> {
    const triageModel = await getFirstAvailableModel();
    const fullPrompt = this.getSelfAssessmentPrompt();
    const userMessage = query + (context ? `\n\nContext: ${context}` : '');

    try {
      const result = await chatCompletion({
        model: triageModel,
        messages: [
          { role: 'system', content: fullPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        maxTokens: 200,
      });

      const content =
        typeof result.message === 'string' ? result.message : result.message?.content || '';

      const parsed = this.parseAssessmentResponse(content);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.error('Self-assessment failed:', error);
    }

    return {
      canHandle: context.length < 500,
      reason: 'Self-assessment failed, defaulting based on context length',
      suggestedTier: context.length < 500 ? 2 : 4,
    };
  }

  private parseAssessmentResponse(content: string): SelfAssessment | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.canHandle === 'boolean') {
          return {
            canHandle: parsed.canHandle,
            reason: parsed.reason || 'No reason provided',
            suggestedTier: parsed.suggestedTier || 2,
          };
        }
      }
    } catch {
      // JSON parse failed
    }
    return null;
  }

  private async selectCloudModel(preferredModel?: string, suggestedTier?: number): Promise<string> {
    if (preferredModel) {
      return preferredModel;
    }

    if (suggestedTier === 3) {
      const tier = MODEL_TIERS.find(t => t.name === 'cloud-fast');
      return tier?.models[0] || 'groq/llama-3.1-8b-instant';
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

    const selfAssessment = await this.selfAssess(request.originalQuery, request.context);

    let response: string;
    let finalModel = triageModel;

    const triageMessage: ModelMessage = {
      id: messageId,
      timestamp: Date.now(),
      source: 'local-small',
      task: request.originalQuery,
      context: request.context,
      complexity: selfAssessment.canHandle ? 'low' : 'high',
      requiresEscalation: !selfAssessment.canHandle,
      escalationReason: selfAssessment.reason,
      metadata: { triageTime: Date.now() - triageStart, selfAssessment },
    };
    this.messageLog.push(triageMessage);

    if (!selfAssessment.canHandle) {
      const cloudModel = await this.selectCloudModel(
        request.preferredCloudModel,
        selfAssessment.suggestedTier
      );
      finalModel = cloudModel;
      delegationPath.push(`cloud:${cloudModel}`);

      const escalationMessage: ModelMessage = {
        id: messageId,
        timestamp: Date.now(),
        source: 'cloud-smart',
        task: request.originalQuery,
        context: request.context,
        complexity: 'high',
        requiresEscalation: true,
        escalationReason: selfAssessment.reason,
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
    }

    return {
      success: true,
      messageId,
      finalResponse: response,
      delegationPath,
      totalTokens: 0,
      selfAssessment,
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

export interface ProcessQueryResult {
  response: string;
  modelUsed: string;
  tier: number;
  escalated: boolean;
  tokensUsed: number;
  costEstimate?: number;
}

export async function processQuery(
  query: string,
  expertMode: boolean = false
): Promise<ProcessQueryResult> {
  const bus = getModelBus();

  const result = await bus.process({
    originalQuery: query,
    context: expertMode ? 'expert mode enabled' : '',
    sourceModel: 'api',
  });

  return {
    response: result.finalResponse,
    modelUsed: result.delegationPath[result.delegationPath.length - 1] || 'unknown',
    tier: result.selfAssessment?.suggestedTier || 2,
    escalated: result.selfAssessment?.canHandle === false,
    tokensUsed: result.totalTokens,
    costEstimate: result.costSavings?.estimatedSaved,
  };
}

let busInstance: ModelMessageBus | null = null;

export function getModelBus(): ModelMessageBus {
  if (!busInstance) {
    busInstance = new ModelMessageBus();
  }
  return busInstance;
}
