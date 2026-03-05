/**
 * Smart Model Router
 * 
 * Routes requests to the appropriate model based on:
 * - Task complexity
 * - Token budget
 * - Available models
 * - User activity
 * 
 * Strategy:
 * - Routine tasks (heartbeat, scheduled) → Local smaller models (glm-4.7-flash)
 * - User chat → Cloud capable model (glm-5:cloud)
 * - Complex analysis → Cloud thinking model
 * - Fallback → Local model if cloud unavailable or budget exceeded
 */

export type ModelTier = 'local-fast' | 'local-capable' | 'cloud-fast' | 'cloud-thinking';

export interface ModelInfo {
  id: string;
  name: string;
  tier: ModelTier;
  provider: 'ollama' | 'cloud';
  maxTokens: number;
  costPerToken: number; // Approximate cost in USD per 1K tokens
  available: boolean;
  capabilities: ('chat' | 'code' | 'analysis' | 'embedding')[];
  description?: string; // Optional description for the model
}

export interface TokenBudget {
  dailyLimit: number;
  used: number;
  remaining: number;
  lastReset: number;
}

export interface ModelRoutingConfig {
  preferLocal: boolean;
  tokenBudgetEnabled: boolean;
  dailyTokenLimit: number;
  cloudForChat: boolean;
  cloudForComplex: boolean;
  fallbackToLocal: boolean;
}

const AVAILABLE_MODELS: ModelInfo[] = [
  // Local models (free)
  // Ultra-lightweight models (CPU-friendly, no GPU required)
  { id: 'qwen3.5:2b', name: 'Qwen 3.5 2B', tier: 'local-fast', provider: 'ollama', maxTokens: 32768, costPerToken: 0, available: true, capabilities: ['chat', 'code'], description: 'Ultra-lightweight model (2B params), runs on CPU, near GPT-4 mini performance' },
  
  // Fast mid-range models
  { id: 'qwen3.5:9b', name: 'Qwen 3.5 9B', tier: 'local-fast', provider: 'ollama', maxTokens: 32768, costPerToken: 0, available: true, capabilities: ['chat', 'code', 'analysis'], description: 'Fast 9B multimodal model - excellent speed/capability balance' },
  
  // Lightweight models
  { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', tier: 'local-fast', provider: 'ollama', maxTokens: 8192, costPerToken: 0, available: true, capabilities: ['chat', 'code'] },
  
  // Capable models (require more resources)
  { id: 'qwen3.5:27b', name: 'Qwen 3.5 27B', tier: 'local-capable', provider: 'ollama', maxTokens: 32768, costPerToken: 0, available: true, capabilities: ['chat', 'code', 'analysis'], description: 'Large 27B multimodal model' },
  { id: 'lfm2:latest', name: 'LFM2', tier: 'local-capable', provider: 'ollama', maxTokens: 32768, costPerToken: 0, available: true, capabilities: ['chat', 'code'] },
  { id: 'glm-ocr', name: 'GLM OCR', tier: 'local-capable', provider: 'ollama', maxTokens: 8192, costPerToken: 0, available: true, capabilities: ['chat'] },
  
  // Cloud models (paid)
  { id: 'qwen3.5:full', name: 'Qwen 3.5 Full (Cloud)', tier: 'cloud-thinking', provider: 'cloud', maxTokens: 128000, costPerToken: 0.00001, available: true, capabilities: ['chat', 'code', 'analysis'], description: 'Full-size Qwen 3.5 multimodal model in the cloud' },
  { id: 'glm-5:cloud', name: 'GLM-5 Cloud', tier: 'cloud-thinking', provider: 'cloud', maxTokens: 128000, costPerToken: 0.00001, available: true, capabilities: ['chat', 'code', 'analysis'] },
  { id: 'kimi-k2.5:cloud', name: 'Kimi K2.5 Cloud', tier: 'cloud-fast', provider: 'cloud', maxTokens: 128000, costPerToken: 0.00001, available: true, capabilities: ['chat', 'analysis'] },
];

const TASK_MODEL_MAP: Record<string, ModelTier> = {
  // Tier 1: Housekeeping - Always use Qwen 3.5-2B for these
  'heartbeat': 'local-fast',
  'scheduled': 'local-fast',
  'health_check': 'local-fast',
  'status_check': 'local-fast',
  'task_scheduler': 'local-fast',
  'memory_archive': 'local-fast',
  'cleanup': 'local-fast',
  'maintenance': 'local-fast',
  'monitoring': 'local-fast',
  
  // Tier 2: Capable Local - Use best available local model
  'chat': 'local-capable',
  'expert_chat': 'local-capable',
  'document_processing': 'local-capable',
  'code_generation': 'local-capable',
  'coding': 'local-capable',
  'spreadsheet': 'local-capable',
  'excel': 'local-capable',
  'word': 'local-capable',
  'powerpoint': 'local-capable',
  'file_generation': 'local-capable',
  'ocr': 'local-capable',
  'intelligence': 'local-capable',
  'security': 'local-capable',
  'research': 'local-capable',
  'data_analysis': 'local-capable',
  'note_taking': 'local-capable',
  'canvas': 'local-capable',
  'feature_request': 'local-capable',
  'document_search': 'local-capable',
  
  // Tier 3: Cloud thinking - Use cloud models for complex reasoning
  'complex_analysis': 'cloud-thinking',
  'strategic_planning': 'cloud-thinking',
  'architecture_design': 'cloud-thinking',
  'decision_making': 'cloud-thinking',
  'planning': 'cloud-thinking',
  'brainstorming': 'cloud-thinking',
  'system_design': 'cloud-thinking',
  'troubleshooting': 'cloud-thinking',
  'debugging': 'cloud-thinking',
  'optimization': 'cloud-thinking',
};

const DEFAULT_CONFIG: ModelRoutingConfig = {
  preferLocal: true,
  tokenBudgetEnabled: true,
  dailyTokenLimit: 100000, // 100K tokens per day
  cloudForChat: true,
  cloudForComplex: true,
  fallbackToLocal: true,
};

class ModelRouter {
  private models: ModelInfo[];
  private config: ModelRoutingConfig;
  private budget: TokenBudget;
  private lastActivityTime: number;
  private userActive: boolean;
  
  constructor() {
    this.models = AVAILABLE_MODELS;
    this.config = DEFAULT_CONFIG;
    this.budget = this.loadBudget();
    this.lastActivityTime = Date.now();
    this.userActive = false;
    
    // Reset budget daily
    this.checkBudgetReset();
  }

  private loadBudget(): TokenBudget {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('model_token_budget');
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return {
      dailyLimit: DEFAULT_CONFIG.dailyTokenLimit,
      used: 0,
      remaining: DEFAULT_CONFIG.dailyTokenLimit,
      lastReset: Date.now(),
    };
  }

  private saveBudget(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('model_token_budget', JSON.stringify(this.budget));
    }
  }

  private checkBudgetReset(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (now - this.budget.lastReset > dayMs) {
      this.budget = {
        dailyLimit: this.config.dailyTokenLimit,
        used: 0,
        remaining: this.config.dailyTokenLimit,
        lastReset: now,
      };
      this.saveBudget();
    }
  }

  /**
   * Record user activity (they're actively chatting)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
    this.userActive = true;
  }

  /**
   * Check if user is active (within last 5 minutes)
   */
  isUserActive(): boolean {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.lastActivityTime > fiveMinutesAgo;
  }

  /**
   * Track token usage
   */
  trackTokenUsage(tokens: number, modelId: string): void {
    this.budget.used += tokens;
    this.budget.remaining = Math.max(0, this.budget.remaining - tokens);
    this.saveBudget();
    
    console.log(`[ModelRouter] Used ${tokens} tokens with ${modelId}. Remaining: ${this.budget.remaining}/${this.budget.dailyLimit}`);
  }

  /**
   * Get the best model for a task using the three-tier escalation system:
   * Tier 1 (Housekeeping): Always use Qwen 3.5-2B - ultra-lightweight
   * Tier 2 (Capable Local): Use best available local model for user's system
   * Tier 3 (Thinking): Use cloud models for complex reasoning
   */
  getModel(taskType: string, options?: {
    preferCloud?: boolean;
    minCapabilities?: ('chat' | 'code' | 'analysis' | 'embedding')[];
    maxTokens?: number;
  }): ModelInfo {
    this.checkBudgetReset();
    
    const tier = TASK_MODEL_MAP[taskType] || 'local-fast';
    
    // Get available local models (we'll filter by what's actually installed)
    const availableLocalModels = this.models.filter(m => m.provider === 'ollama' && m.available);
    
    // TIER 1: Housekeeping - Always use Qwen 3.5-2B for efficiency
    if (tier === 'local-fast') {
      const qwen2b = availableLocalModels.find(m => m.id === 'qwen3.5:2b');
      if (qwen2b) {
        console.log(`[ModelRouter] Using Qwen 3.5-2B for housekeeping task: ${taskType}`);
        return qwen2b;
      }
      // Fallback to glm-4.7-flash if Qwen 2B not available
      const glmFlash = availableLocalModels.find(m => m.id === 'glm-4.7-flash');
      if (glmFlash) {
        console.log(`[ModelRouter] Using GLM-4.7 Flash for housekeeping task: ${taskType}`);
        return glmFlash;
      }
    }
    
    // TIER 3: Cloud thinking - Use cloud models for complex reasoning
    const shouldUseCloud = this.shouldUseCloud(tier, this.isUserActive(), options?.preferCloud);
    if (shouldUseCloud && tier === 'cloud-thinking') {
      const cloudModel = this.models.find(m => m.provider === 'cloud' && m.tier === 'cloud-thinking' && m.available);
      if (cloudModel) {
        console.log(`[ModelRouter] Using cloud model for thinking task: ${taskType}`);
        return cloudModel;
      }
    }
    
    // TIER 2: Capable Local - Use best available local model
    // Sort by capability (most capable first)
    const capableModels = availableLocalModels
      .filter(m => m.tier === 'local-capable' || m.tier === 'local-fast')
      .filter(m => {
        if (options?.minCapabilities) {
          return options.minCapabilities.every(cap => m.capabilities.includes(cap));
        }
        return true;
      })
      .filter(m => !options?.maxTokens || m.maxTokens >= options.maxTokens)
      .sort((a, b) => {
        // Prefer larger models for complex tasks
        const sizeA = this.getModelSize(a.id);
        const sizeB = this.getModelSize(b.id);
        return sizeB - sizeA;
      });
    
    if (capableModels.length > 0) {
      const selected = capableModels[0];
      console.log(`[ModelRouter] Using local capable model ${selected.id} for task: ${taskType}`);
      return selected;
    }
    
    // Fallback to first available
    console.warn(`[ModelRouter] No suitable model found for ${taskType}, falling back`);
    return availableLocalModels[0] || this.models[0];
  }
  
  /**
   * Get model size (in billions of parameters) for comparison
   */
  private getModelSize(modelId: string): number {
    // Extract size from model ID (e.g., 'qwen3.5:27b' -> 27)
    const sizeMatch = modelId.match(/(\d+)b$/i);
    if (sizeMatch) {
      return parseInt(sizeMatch[1], 10);
    }
    
    // Known model sizes
    const knownSizes: Record<string, number> = {
      'glm-4.7-flash': 4,
      'glm-ocr': 4,
      'qwen3.5:2b': 2,
      'qwen3.5:9b': 9,
      'qwen3.5:27b': 27,
      'lfm2:latest': 7,
      'glm-5:cloud': 50,
      'kimi-k2.5:cloud': 20,
    };
    
    return knownSizes[modelId] || 7; // Default to 7B if unknown
  }

  /**
   * Decide whether to use cloud or local
   */
  private shouldUseCloud(tier: ModelTier, userActive: boolean, preferCloud?: boolean): boolean {
    if (preferCloud) return true;
    if (!this.config.cloudForChat) return false;
    
    // Check budget
    const budgetCritical = this.budget.remaining < this.budget.dailyLimit * 0.1;
    if (budgetCritical && this.config.fallbackToLocal) {
      console.log('[ModelRouter] Budget critical, using local models');
      return false;
    }
    
    // Cloud for thinking tier
    if (tier === 'cloud-thinking') return !budgetCritical;
    
    // Cloud for user activity
    if (userActive && tier === 'cloud-fast') return !budgetCritical;
    
    // Otherwise prefer local
    return false;
  }

  /**
   * Get recommended model for chat
   * Uses best available local model (Tier 2) - prefers larger models for coding/docs
   */
  getChatModel(): ModelInfo {
    this.recordActivity();
    
    // Prefer qwen3.5:9b for chat - excellent speed/capability balance
    const preferredModel = this.models.find(m => m.id === 'qwen3.5:9b' && m.available);
    if (preferredModel) {
      console.log(`[ModelRouter] Using qwen3.5:9b for chat (fast & capable)`);
      return preferredModel;
    }
    
    // Fallback to qwen3.5:2b for speed
    const qwen2b = this.models.find(m => m.id === 'qwen3.5:2b' && m.available);
    if (qwen2b) {
      console.log(`[ModelRouter] Using qwen3.5:2b for chat (ultra-fast)`);
      return qwen2b;
    }
    
    // Fallback to glm-4.7-flash for speed
    const glmFlash = this.models.find(m => m.id === 'glm-4.7-flash' && m.available);
    if (glmFlash) {
      console.log(`[ModelRouter] Using glm-4.7-flash for chat (fast)`);
      return glmFlash;
    }
    
    // Last resort: use first available ollama model
    const anyOllama = this.models.find(m => m.provider === 'ollama' && m.available);
    if (anyOllama) {
      console.log(`[ModelRouter] Using ${anyOllama.id} for chat (fallback)`);
      return anyOllama;
    }
    
    return this.models[0];
  }

  /**
   * Get model for scheduled/background tasks
   * Always uses Qwen 3.5-2B for maximum efficiency
   */
  getTaskModel(taskType: string): ModelInfo {
    // Housekeeping tasks always use Qwen 3.5-2B - ultra-lightweight and efficient
    const qwen2b = this.models.find(m => m.id === 'qwen3.5:2b');
    if (qwen2b && qwen2b.available) {
      console.log(`[ModelRouter] Using Qwen 3.5-2B for background task: ${taskType}`);
      return qwen2b;
    }
    
    // Fallback to GLM-4.7-Flash
    const glmFlash = this.models.find(m => m.id === 'glm-4.7-flash');
    if (glmFlash && glmFlash.available) {
      console.log(`[ModelRouter] Using GLM-4.7 Flash for background task: ${taskType}`);
      return glmFlash;
    }
    
    // Last resort fallback
    return this.models.find(m => m.tier === 'local-fast') ||
           this.models[0];
  }

  /**
   * Get model for document processing
   */
  getDocumentModel(): ModelInfo {
    // Document processing can use local capable
    return this.models.find(m => m.id === 'qwen2.5:14b') ||
           this.models.find(m => m.id === 'glm-4.7-flash')!;
  }

  /**
   * Get model for OCR tasks
   */
  getOCRModel(): ModelInfo {
    // OCR tasks use glm-ocr if available, fallback to glm-4.7-flash
    return this.models.find(m => m.id === 'glm-ocr') ||
           this.models.find(m => m.id === 'glm-4.7-flash')!;
  }

  /**
   * Get fast model for quick responses
   * Uses qwen3.5:9b or qwen3.5:2b for speed
   */
  getFastModel(): ModelInfo {
    // Prefer qwen3.5:9b for good speed/quality balance
    const qwen9b = this.models.find(m => m.id === 'qwen3.5:9b' && m.available);
    if (qwen9b) {
      console.log(`[ModelRouter] Using qwen3.5:9b for fast response`);
      return qwen9b;
    }
    
    // Fallback to qwen3.5:2b
    const qwen2b = this.models.find(m => m.id === 'qwen3.5:2b' && m.available);
    if (qwen2b) {
      console.log(`[ModelRouter] Using qwen3.5:2b for fast response`);
      return qwen2b;
    }
    
    // Fallback to glm-4.7-flash
    const glmFlash = this.models.find(m => m.id === 'glm-4.7-flash' && m.available);
    if (glmFlash) {
      console.log(`[ModelRouter] Using glm-4.7-flash for fast response`);
      return glmFlash;
    }
    
    // Last resort
    return this.models.find(m => m.provider === 'ollama' && m.available) || this.models[0];
  }

  /**
   * Get model for complex analysis
   */
  getAnalysisModel(): ModelInfo {
    // Use qwen3.5:27b for complex analysis - best local capability
    const qwen27b = this.models.find(m => m.id === 'qwen3.5:27b' && m.available);
    if (qwen27b) {
      console.log(`[ModelRouter] Using qwen3.5:27b for analysis (capable)`);
      return qwen27b;
    }
    
    // Fallback to qwen3.5:9b
    const qwen9b = this.models.find(m => m.id === 'qwen3.5:9b' && m.available);
    if (qwen9b) {
      console.log(`[ModelRouter] Using qwen3.5:9b for analysis (fast)`);
      return qwen9b;
    }
    
    return this.models.find(m => m.id === 'glm-4.7-flash') || this.models[0];
  }

  /**
   * Get model for embedding
   */
  getEmbeddingModel(): ModelInfo {
    // Embeddings always use local
    return this.models.find(m => m.capabilities.includes('embedding')) ||
           this.models.find(m => m.id === 'glm-4.7-flash')!;
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): TokenBudget {
    this.checkBudgetReset();
    return { ...this.budget };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModelRoutingConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.dailyTokenLimit) {
      this.budget.dailyLimit = config.dailyTokenLimit;
      this.budget.remaining = config.dailyTokenLimit - this.budget.used;
      this.saveBudget();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): ModelRoutingConfig {
    return { ...this.config };
  }

  /**
   * List available models
   */
  listModels(): ModelInfo[] {
    return [...this.models];
  }

  /**
   * Get optimized model ID string for API calls
   */
  getModelId(taskType: string, options?: { preferCloud?: boolean }): string {
    const model = this.getModel(taskType, options);
    return model.provider === 'cloud' ? model.id : `ollama/${model.id}`;
  }

  /**
   * Quick model ID for common use cases
   */
  static getChatModelId(): string {
    return router.getChatModel().id;
  }

  static getTaskModelId(taskType: string): string {
    return router.getTaskModel(taskType).id;
  }

  static getAnalysisModelId(): string {
    return router.getAnalysisModel().id;
  }

  static getOCRModelId(): string {
    return router.getOCRModel().id;
  }
}

// Singleton instance
export const router = new ModelRouter();

// Convenience exports
export const getChatModel = () => router.getChatModel();
export const getTaskModel = (taskType: string) => router.getTaskModel(taskType);
export const getAnalysisModel = () => router.getAnalysisModel();
export const getDocumentModel = () => router.getDocumentModel();
export const getOCRModel = () => router.getOCRModel();
export const trackTokenUsage = (tokens: number, modelId: string) => router.trackTokenUsage(tokens, modelId);
export const getBudgetStatus = () => router.getBudgetStatus();
export const recordActivity = () => router.recordActivity();

export default router;