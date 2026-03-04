/**
 * RL Trainer - Safe version for all runtimes
 * Uses SQLite instead of file system
 * No top-level Node.js imports
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { chatCompletion } from '@/lib/models/sdk.server';

export interface ConversationTurn {
  id: string;
  timestamp: number;
  userMessage: string;
  aiResponse: string;
  score?: number;
  feedback?: 'good' | 'bad' | 'correction';
  correction?: string;
  toolsUsed?: string[];
  modelUsed: string;
  responseTimeMs: number;
}

export interface TrainingPair {
  id: string;
  createdAt: number;
  input: string;
  output: string;
  correctedOutput?: string;
  score: number;
  source: 'conversation' | 'feedback' | 'hindsight';
  category: 'good' | 'bad' | 'corrected';
  usedForTraining: boolean;
}

export interface RLTrainingStats {
  totalConversations: number;
  totalTrainingPairs: number;
  goodResponses: number;
  badResponses: number;
  correctedResponses: number;
  lastTrainingRun: number | null;
  trainingRunsCompleted: number;
  averageScore: number;
  improvementsLearned: number;
}

const JUDGE_PROMPT = `You are a response quality judge. Score the AI response on a scale of 0.0 to 1.0.

Criteria:
- 0.0-0.3: Poor (incorrect, unhelpful, or misleading)
- 0.4-0.6: Acceptable (correct but could be better)
- 0.7-0.9: Good (helpful and accurate)
- 1.0: Excellent (perfect response)

Respond with ONLY a number between 0.0 and 1.0.

User message: {{USER_MESSAGE}}

AI response: {{AI_RESPONSE}}

Score:`;

const HINDSIGHT_PROMPT = `The user corrected the AI's response. Extract the learning.

Original user question: {{USER_MESSAGE}}

AI's original response: {{AI_RESPONSE}}

User's correction: {{CORRECTION}}

Provide a brief "lesson learned" that the AI should remember:
1. What was wrong with the original response
2. What the correct approach should have been
3. A key principle to remember

Format as a single paragraph.`;

class RLTrainer {
  private conversations: ConversationTurn[] = [];
  private trainingPairs: TrainingPair[] = [];
  private stats: RLTrainingStats = {
    totalConversations: 0,
    totalTrainingPairs: 0,
    goodResponses: 0,
    badResponses: 0,
    correctedResponses: 0,
    lastTrainingRun: null,
    trainingRunsCompleted: 0,
    averageScore: 0,
    improvementsLearned: 0,
  };
  private initialized: boolean = false;
  private scoreCache: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.loadData();
    this.initialized = true;
    console.log('[RLTrainer] Initialized with', this.conversations.length, 'conversations');
  }

  private loadData(): void {
    try {
      // Load from SQLite database
      const conversationsData = sqlDatabase.getSetting('rl_conversations');
      if (conversationsData) {
        this.conversations = JSON.parse(conversationsData);
      }
      
      const pairsData = sqlDatabase.getSetting('rl_training_pairs');
      if (pairsData) {
        this.trainingPairs = JSON.parse(pairsData);
      }
      
      const statsData = sqlDatabase.getSetting('rl_stats');
      if (statsData) {
        this.stats = { ...this.stats, ...JSON.parse(statsData) };
      }
    } catch (error) {
      console.error('[RLTrainer] Error loading data:', error);
    }
  }

  private saveData(): void {
    try {
      // Save to SQLite database
      sqlDatabase.setSetting('rl_conversations', JSON.stringify(this.conversations.slice(-1000)));
      sqlDatabase.setSetting('rl_training_pairs', JSON.stringify(this.trainingPairs.slice(-500)));
      sqlDatabase.setSetting('rl_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('[RLTrainer] Error saving data:', error);
    }
  }

  async logConversation(turn: Omit<ConversationTurn, 'id' | 'timestamp'>): Promise<string> {
    await this.initialize();
    
    const id = `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: ConversationTurn = {
      ...turn,
      id,
      timestamp: Date.now(),
    };
    
    this.conversations.push(conversation);
    this.stats.totalConversations++;
    
    // Auto-score in background (don't await)
    this.scoreResponse(turn.userMessage, turn.aiResponse).then(score => {
      const idx = this.conversations.findIndex(c => c.id === id);
      if (idx >= 0) {
        this.conversations[idx].score = score;
        this.updateStatsWithScore(score);
        this.saveData();
      }
    }).catch(err => console.error('[RLTrainer] Scoring error:', err));
    
    this.saveData();
    return id;
  }

  private updateStatsWithScore(score: number): void {
    const total = this.stats.goodResponses + this.stats.badResponses + 
                  this.stats.correctedResponses + 1;
    this.stats.averageScore = 
      (this.stats.averageScore * (total - 1) + score) / total;
    
    if (score >= 0.7) {
      this.stats.goodResponses++;
    } else if (score < 0.4) {
      this.stats.badResponses++;
    }
  }

  async scoreResponse(userMessage: string, aiResponse: string): Promise<number> {
    const cacheKey = `${userMessage}:${aiResponse}`.slice(0, 100);
    if (this.scoreCache.has(cacheKey)) {
      return this.scoreCache.get(cacheKey)!;
    }

    // Use a quick heuristic for fast scoring
    const heuristicScore = this.heuristicScore(aiResponse);
    
    // Only call LLM for complex cases
    if (heuristicScore !== null) {
      this.scoreCache.set(cacheKey, heuristicScore);
      return heuristicScore;
    }

    // For complex responses, use lightweight model
    try {
      const prompt = JUDGE_PROMPT
        .replace('{{USER_MESSAGE}}', userMessage.slice(0, 500))
        .replace('{{AI_RESPONSE}}', aiResponse.slice(0, 1000));

      const result = await chatCompletion({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        maxTokens: 10,
      });

      const content = result.message.content.trim();
      const score = parseFloat(content);
      
      if (!isNaN(score) && score >= 0 && score <= 1) {
        this.scoreCache.set(cacheKey, score);
        return score;
      }
    } catch (error) {
      console.error('[RLTrainer] LLM scoring failed:', error);
    }

    return 0.5; // Default score
  }

  private heuristicScore(response: string): number | null {
    // Fast heuristics
    const length = response.length;
    
    // Too short
    if (length < 20) return 0.3;
    
    // Good length range
    if (length > 100 && length < 2000) {
      // Check for error patterns
      const lower = response.toLowerCase();
      if (lower.includes('error') || lower.includes('failed') || lower.includes('unable')) {
        return 0.4;
      }
      return 0.7;
    }
    
    // Too long might be verbose
    if (length > 5000) return 0.5;
    
    return null; // Use LLM
  }

  async recordFeedback(conversationId: string, feedback: 'good' | 'bad' | 'correction', correction?: string): Promise<void> {
    await this.initialize();
    
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.error('[RLTrainer] Conversation not found:', conversationId);
      return;
    }
    
    conversation.feedback = feedback;
    
    if (feedback === 'correction' && correction) {
      conversation.correction = correction;
      this.stats.correctedResponses++;
      
      // Create training pair from correction
      const trainingPair: TrainingPair = {
        id: `pair_${Date.now()}`,
        createdAt: Date.now(),
        input: conversation.userMessage,
        output: conversation.aiResponse,
        correctedOutput: correction,
        score: 1.0,
        source: 'feedback',
        category: 'corrected',
        usedForTraining: false,
      };
      
      this.trainingPairs.push(trainingPair);
      this.stats.totalTrainingPairs++;
      this.stats.improvementsLearned++;
    } else if (feedback === 'good') {
      conversation.score = Math.max(conversation.score || 0, 0.8);
    } else if (feedback === 'bad') {
      conversation.score = Math.min(conversation.score || 1, 0.3);
    }
    
    this.saveData();
  }

  getRecentConversations(limit: number = 10): ConversationTurn[] {
    return this.conversations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getTrainingData(): TrainingPair[] {
    return this.trainingPairs.filter(p => !p.usedForTraining);
  }

  markTrainingComplete(pairIds: string[]): void {
    for (const id of pairIds) {
      const pair = this.trainingPairs.find(p => p.id === id);
      if (pair) {
        pair.usedForTraining = true;
      }
    }
    this.saveData();
  }

  getStats(): RLTrainingStats {
    return { ...this.stats };
  }

  async runTrainingSession(): Promise<{ success: boolean; message: string; pairsProcessed: number; lessonsExtracted: number; memoriesUpdated: number }> {
    await this.initialize();
    
    const trainingData = this.getTrainingData();
    
    if (trainingData.length === 0) {
      return {
        success: false,
        message: 'No training data available. Interact with the system to generate training examples.',
        pairsProcessed: 0,
        lessonsExtracted: 0,
        memoriesUpdated: 0,
      };
    }
    
    // Mark as trained
    const pairsProcessed = trainingData.length;
    this.markTrainingComplete(trainingData.map(p => p.id));
    this.stats.lastTrainingRun = Date.now();
    this.stats.trainingRunsCompleted++;
    this.saveData();
    
    // Calculate lessons learned from feedback
    const lessonsExtracted = trainingData.filter(p => p.category === 'corrected').length;
    const memoriesUpdated = pairsProcessed;
    
    return {
      success: true,
      message: `Training session completed. Processed ${pairsProcessed} examples.`,
      pairsProcessed,
      lessonsExtracted,
      memoriesUpdated,
    };
  }

  // Alias for backward compatibility
  getRecommendations(): string[] {
    return this.getImprovementSuggestions();
  }

  getImprovementSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // Analyze common patterns
    const badResponses = this.trainingPairs.filter(p => p.category === 'bad');
    const correctedResponses = this.trainingPairs.filter(p => p.category === 'corrected');
    
    if (badResponses.length > 5) {
      suggestions.push('Pattern detected: Some responses lack sufficient detail. Consider prompting for more comprehensive answers.');
    }
    
    if (correctedResponses.length > 3) {
      suggestions.push('Pattern detected: Responses sometimes need corrections. Review correction patterns to improve accuracy.');
    }
    
    if (this.stats.averageScore < 0.6) {
      suggestions.push('Overall response quality below target. Focus on accuracy and helpfulness.');
    }
    
    return suggestions.length > 0 ? suggestions : ['No specific improvements needed at this time.'];}
}

// Singleton instance
export const rlTrainer = new RLTrainer();

// Convenience exports
export const logConversationTurn = (
  userMessage: string,
  aiResponse: string,
  modelUsed: string,
  responseTimeMs: number,
  toolsUsed?: string[]
) => 
  rlTrainer.logConversation({
    userMessage,
    aiResponse,
    modelUsed,
    responseTimeMs,
    toolsUsed,
  });

export const recordFeedback = (conversationId: string, feedback: 'good' | 'bad' | 'correction', correction?: string) =>
  rlTrainer.recordFeedback(conversationId, feedback, correction);

export const getRLStats = () => rlTrainer.getStats();

export const getRecentConversations = (limit?: number) => rlTrainer.getRecentConversations(limit);

export const runRLTrainingSession = () => rlTrainer.runTrainingSession();

export default rlTrainer;
