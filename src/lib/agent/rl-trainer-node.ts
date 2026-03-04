import * as fs from 'fs';
import * as path from 'path';
import { chatCompletion } from '@/lib/models/sdk.server';
import { memoryStore } from '@/lib/memory/persistent-store';
import { loadScratchpad, saveScratchpad } from '@/lib/memory/scratchpad';

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

const RL_DATA_DIR = path.join(process.cwd(), 'data', 'rl-training');
const CONVERSATIONS_FILE = path.join(RL_DATA_DIR, 'conversations.json');
const TRAINING_PAIRS_FILE = path.join(RL_DATA_DIR, 'training-pairs.json');
const STATS_FILE = path.join(RL_DATA_DIR, 'stats.json');

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
    
    this.ensureDataDir();
    this.loadData();
    this.initialized = true;
    console.log('[RLTrainer] Initialized with', this.conversations.length, 'conversations');
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(RL_DATA_DIR)) {
      fs.mkdirSync(RL_DATA_DIR, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        this.conversations = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf-8'));
      }
      if (fs.existsSync(TRAINING_PAIRS_FILE)) {
        this.trainingPairs = JSON.parse(fs.readFileSync(TRAINING_PAIRS_FILE, 'utf-8'));
      }
      if (fs.existsSync(STATS_FILE)) {
        this.stats = { ...this.stats, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8')) };
      }
    } catch (error) {
      console.error('[RLTrainer] Error loading data:', error);
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(this.conversations.slice(-1000), null, 2));
      fs.writeFileSync(TRAINING_PAIRS_FILE, JSON.stringify(this.trainingPairs.slice(-500), null, 2));
      fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
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
        model: 'glm-4-flash', // Fast, cheap model for scoring
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 10,
      });

      const scoreText = result.message?.content?.trim() || '0.5';
      const score = parseFloat(scoreText);
      
      if (isNaN(score) || score < 0 || score > 1) {
        return 0.5;
      }
      
      this.scoreCache.set(cacheKey, score);
      return score;
    } catch (error) {
      console.error('[RLTrainer] Scoring failed:', error);
      return 0.5;
    }
  }

  private heuristicScore(response: string): number | null {
    // Very short responses
    if (response.length < 20) return 0.3;
    
    // Error messages
    if (response.toLowerCase().includes('error') && response.length < 100) return 0.2;
    if (response.toLowerCase().includes('i cannot')) return 0.4;
    if (response.toLowerCase().includes("i don't know")) return 0.4;
    
    // Good indicators
    if (response.includes('```')) return 0.8; // Code blocks
    if (response.match(/\d+\./)) return 0.7; // Numbered lists
    if (response.length > 200 && !response.includes('error')) return 0.7;
    
    return null; // Need LLM scoring
  }

  async recordFeedback(
    conversationId: string,
    feedback: 'good' | 'bad' | 'correction',
    correction?: string
  ): Promise<void> {
    await this.initialize();
    
    const idx = this.conversations.findIndex(c => c.id === conversationId);
    if (idx < 0) {
      console.error('[RLTrainer] Conversation not found:', conversationId);
      return;
    }
    
    const conversation = this.conversations[idx];
    conversation.feedback = feedback;
    conversation.correction = correction;
    
    // Update stats
    if (feedback === 'good') {
      this.stats.goodResponses++;
      conversation.score = 1.0;
    } else if (feedback === 'bad') {
      this.stats.badResponses++;
      conversation.score = 0.0;
    } else if (feedback === 'correction' && correction) {
      this.stats.correctedResponses++;
      conversation.score = 0.3;
      
      // Generate hindsight learning
      await this.processHindsightFeedback(conversation, correction);
    }
    
    this.saveData();
  }

  private async processHindsightFeedback(
    conversation: ConversationTurn,
    correction: string
  ): Promise<void> {
    try {
      // Create training pair
      const pair: TrainingPair = {
        id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        input: conversation.userMessage,
        output: conversation.aiResponse,
        correctedOutput: correction,
        score: conversation.score || 0.3,
        source: 'hindsight',
        category: 'corrected',
        usedForTraining: false,
      };
      
      this.trainingPairs.push(pair);
      this.stats.totalTrainingPairs++;
      
      // Extract learned principle
      const prompt = HINDSIGHT_PROMPT
        .replace('{{USER_MESSAGE}}', conversation.userMessage)
        .replace('{{AI_RESPONSE}}', conversation.aiResponse)
        .replace('{{CORRECTION}}', correction);
      
      const result = await chatCompletion({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 200,
      });
      
      const lesson = result.message?.content || '';
      
      // Save to memory
      await memoryStore.initialize();
      await memoryStore.saveMemory({
        key: `lesson_${Date.now()}`,
        content: lesson,
        category: 'knowledge',
        importance: 8,
        metadata: { source: 'rl_hindsight' },
      });
      
      this.stats.improvementsLearned++;
      console.log('[RLTrainer] Learned from correction:', lesson.slice(0, 100));
      
    } catch (error) {
      console.error('[RLTrainer] Hindsight processing failed:', error);
    }
  }

  async runTrainingSession(): Promise<{
    pairsProcessed: number;
    lessonsExtracted: number;
    memoriesUpdated: number;
  }> {
    await this.initialize();
    
    console.log('[RLTrainer] Starting training session...');
    
    const untrainedPairs = this.trainingPairs.filter(p => !p.usedForTraining);
    let pairsProcessed = 0;
    let lessonsExtracted = 0;
    let memoriesUpdated = 0;
    
    // Process recent conversations for patterns
    const recentConvos = this.conversations.slice(-50);
    const lowScoreConvos = recentConvos.filter(c => (c.score || 0.5) < 0.5);
    
    for (const convo of lowScoreConvos) {
      if (!convo.correction) {
        // Try to learn what went wrong
        const analysisPrompt = `Analyze this poor AI response and suggest what should have been done differently.

User: ${convo.userMessage}
AI: ${convo.aiResponse}
Score: ${convo.score}

Provide a single principle the AI should learn from this.`;

        try {
          const result = await chatCompletion({
            model: 'glm-4-flash',
            messages: [{ role: 'user', content: analysisPrompt }],
            temperature: 0.3,
            maxTokens: 150,
          });
          
          const principle = result.message?.content || '';
          
          await memoryStore.saveMemory({
            key: `pattern_${Date.now()}`,
            content: principle,
            category: 'preference',
            importance: 7,
            metadata: { source: 'rl_pattern', score: convo.score },
          });
          
          lessonsExtracted++;
          memoriesUpdated++;
        } catch (err) {
          console.error('[RLTrainer] Pattern extraction failed:', err);
        }
      }
    }
    
    // Mark pairs as processed
    for (const pair of untrainedPairs.slice(0, 20)) {
      pair.usedForTraining = true;
      pairsProcessed++;
    }
    
    // Update stats
    this.stats.lastTrainingRun = Date.now();
    this.stats.trainingRunsCompleted++;
    this.saveData();
    
    console.log(`[RLTrainer] Training complete: ${pairsProcessed} pairs, ${lessonsExtracted} lessons, ${memoriesUpdated} memories`);
    
    return { pairsProcessed, lessonsExtracted, memoriesUpdated };
  }

  getStats(): RLTrainingStats {
    return { ...this.stats };
  }

  getRecentConversations(limit: number = 20): ConversationTurn[] {
    return this.conversations.slice(-limit);
  }

  getTrainingPairs(limit: number = 50): TrainingPair[] {
    return this.trainingPairs.slice(-limit);
  }

  getConversationById(id: string): ConversationTurn | undefined {
    return this.conversations.find(c => c.id === id);
  }

  async getRecommendations(): Promise<string[]> {
    await this.initialize();
    
    const recommendations: string[] = [];
    const recent = this.conversations.slice(-20);
    
    // Analyze patterns
    const avgScore = recent.reduce((sum, c) => sum + (c.score || 0.5), 0) / recent.length;
    
    if (avgScore < 0.6) {
      recommendations.push('Average response quality is low. Consider adjusting system prompt or model.');
    }
    
    const badCount = recent.filter(c => (c.score || 0) < 0.4).length;
    if (badCount > 5) {
      recommendations.push('Many poor responses recently. Review conversation logs for patterns.');
    }
    
    const uncorrected = recent.filter(c => c.score && c.score < 0.5 && !c.correction);
    if (uncorrected.length > 3) {
      recommendations.push('Several poor responses without corrections. Add feedback to improve training.');
    }
    
    const recentImprovements = this.trainingPairs.filter(
      p => Date.now() - p.createdAt < 24 * 60 * 60 * 1000
    ).length;
    
    if (recentImprovements > 5) {
      recommendations.push(`Good progress! ${recentImprovements} improvements captured in last 24 hours.`);
    }
    
    return recommendations;
  }

  async createTrainingPairFromFeedback(
    userMessage: string,
    originalResponse: string,
    correctedResponse: string
  ): Promise<TrainingPair> {
    await this.initialize();
    
    const pair: TrainingPair = {
      id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      input: userMessage,
      output: originalResponse,
      correctedOutput: correctedResponse,
      score: 0.9,
      source: 'feedback',
      category: 'corrected',
      usedForTraining: false,
    };
    
    this.trainingPairs.push(pair);
    this.stats.totalTrainingPairs++;
    this.stats.correctedResponses++;
    this.saveData();
    
    return pair;
  }
}

export const rlTrainer = new RLTrainer();

// Quick access functions
export async function logConversationTurn(
  userMessage: string,
  aiResponse: string,
  modelUsed: string,
  responseTimeMs: number,
  toolsUsed?: string[]
): Promise<string> {
  return rlTrainer.logConversation({
    userMessage,
    aiResponse,
    modelUsed,
    responseTimeMs,
    toolsUsed,
  });
}

export async function recordFeedback(
  conversationId: string,
  feedback: 'good' | 'bad' | 'correction',
  correction?: string
): Promise<void> {
  return rlTrainer.recordFeedback(conversationId, feedback, correction);
}

export async function runRLTrainingSession(): Promise<{
  pairsProcessed: number;
  lessonsExtracted: number;
  memoriesUpdated: number;
}> {
  return rlTrainer.runTrainingSession();
}

export function getRLStats(): RLTrainingStats {
  return rlTrainer.getStats();
}