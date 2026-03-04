/**
 * Self Improving Agent - Safe version for all runtimes
 * Uses SQLite instead of file system
 * No top-level Node.js imports
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { rlTrainer, getRLStats, runRLTrainingSession } from './rl-trainer';

export interface AgentConfig {
  maxFileSize: number;
  allowedExtensions: string[];
  disallowedPatterns: (string | RegExp)[];
  selfModifiablePaths: string[];
  improvementLog: ImprovementLog[];
  rlEnabled: boolean;
}

export interface ImprovementLog {
  id: string;
  timestamp: number;
  type: 'optimization' | 'fix' | 'enhancement' | 'security' | 'rl_training';
  file: string;
  description: string;
  tokensSaved?: number;
  success: boolean;
  rlData?: {
    pairsProcessed?: number;
    lessonsLearned?: number;
  };
}

export interface PerformanceMetrics {
  responseTime: number;
  tokenUsage: number;
  errorRate: number;
  lastUpdated: number;
  rlStats?: {
    totalConversations: number;
    averageScore: number;
    improvementsLearned: number;
  };
}

export class SelfImprovingAgent {
  private config: AgentConfig;
  private rootDir: string;
  private metrics: PerformanceMetrics;
  private securityRules: SecurityRules;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.config = this.loadConfig();
    this.metrics = this.loadMetrics();
    this.securityRules = new SecurityRules();
  }

  private loadConfig(): AgentConfig {
    const defaultConfig: AgentConfig = {
      maxFileSize: 1024 * 1024,
      allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'],
      disallowedPatterns: [
        /password/i,
        /secret/i,
        /api[_-]?key/i,
        /credential/i,
        /\.env/i,
        /node_modules/,
        /\.git/,
      ],
      selfModifiablePaths: ['src/lib/', 'src/components/', 'src/app/api/'],
      improvementLog: [],
      rlEnabled: true,
    };

    try {
      const configJson = sqlDatabase.getSetting('agent_config');
      if (configJson) {
        return { ...defaultConfig, ...JSON.parse(configJson) };
      }
    } catch {
      console.log('[SelfImprovingAgent] Using default agent config');
    }

    return defaultConfig;
  }

  private loadMetrics(): PerformanceMetrics {
    try {
      const metricsJson = sqlDatabase.getSetting('agent_metrics');
      if (metricsJson) {
        return JSON.parse(metricsJson);
      }
    } catch {}
    
    return {
      responseTime: 0,
      tokenUsage: 0,
      errorRate: 0,
      lastUpdated: Date.now(),
    };
  }

  private saveMetrics(): void {
    this.metrics.lastUpdated = Date.now();
    try {
      sqlDatabase.setSetting('agent_metrics', JSON.stringify(this.metrics));
    } catch (e) {
      console.error('[SelfImprovingAgent] Could not save metrics:', e);
    }
  }

  canModify(filePath: string): boolean {
    // Simple path validation without Node.js path module
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    if (normalizedPath.includes('..')) return false;
    
    for (const pattern of this.config.disallowedPatterns) {
      const patternStr = typeof pattern === 'string' ? pattern : pattern.source;
      if (new RegExp(patternStr, 'i').test(normalizedPath)) return false;
    }

    const isSelfModifiable = this.config.selfModifiablePaths.some(
      p => normalizedPath.startsWith(p)
    );

    return isSelfModifiable && this.securityRules.validate(filePath);
  }

  async analyzeAndImprove(): Promise<ImprovementLog[]> {
    const improvements: ImprovementLog[] = [];

    const tokenImprovements = await this.optimizeTokenUsage();
    improvements.push(...tokenImprovements);

    const codeImprovements = await this.optimizeCode();
    improvements.push(...codeImprovements);

    this.config.improvementLog.push(...improvements);
    this.saveConfig();

    return improvements;
  }

  private async optimizeTokenUsage(): Promise<ImprovementLog[]> {
    // Analysis only - no file modifications in Edge Runtime
    const improvements: ImprovementLog[] = [];
    
    // In Edge Runtime, we can only analyze, not modify files
    // This would need to be run in a Node.js API route instead
    console.log('[SelfImprovingAgent] Token optimization analysis (Edge Runtime - no file access)');

    return improvements;
  }

  private removeRedundantComments(code: string): string {
    // SAFETY: Only removes excessive whitespace, NOT comments or TODOs
    // Comments contain valuable context and should never be auto-removed
    let result = code;
    
    // Only collapse multiple blank lines into double newlines
    result = result.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n\n');
    
    // Remove trailing whitespace on lines (safe)
    result = result.replace(/[ \t]+$/gm, '');
    
    return result;
  }

  private async optimizeCode(): Promise<ImprovementLog[]> {
    // SAFETY: Analysis only - does NOT modify files automatically
    // Returns recommendations for human review
    const improvements: ImprovementLog[] = [];
    
    console.log('[SelfImprovingAgent] Code optimization analysis (Edge Runtime - no file access)');

    return improvements;
  }

  private getSelfModifiableFiles(): string[] {
    // Cannot access file system in Edge Runtime
    // This would need to be run in a Node.js API route
    console.log('[SelfImprovingAgent] File listing not available in Edge Runtime');
    return [];
  }

  private optimizeImports(content: string): string {
    const imports = new Map<string, string[]>();
    const lines = content.split('\n');
    const nonImportLines: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^import\s+.*from\s+['"]/)) {
        const match = line.match(/import\s+\{?([^}]*)\}?\s+from\s+['"]([^'"]+)['"]/);
        if (match) {
          const [, importsStr, source] = match;
          const imported = importsStr.split(',').map(s => s.trim()).filter(Boolean);
          
          if (!imports.has(source)) {
            imports.set(source, []);
          }
          imports.get(source)!.push(...imported);
        }
      } else if (!line.match(/^import\s+['"]/)) {
        nonImportLines.push(line);
      }
    }
    
    let result = '';
    for (const [source, items] of Array.from(imports.entries())) {
      if (items.length > 0) {
        result += `import { ${items.join(', ')} } from '${source}';\n`;
      }
    }
    result += '\n' + nonImportLines.join('\n');
    
    return result;
  }

  private removeDuplicateTypes(content: string): string {
    const typeMap = new Map<string, string>();
    const lines = content.split('\n');
    const result: string[] = [];
    
    for (const line of lines) {
      const match = line.match(/^export\s+interface\s+(\w+)\s+\{/);
      if (match) {
        const typeName = match[1];
        if (typeMap.has(typeName)) {
          continue;
        }
        typeMap.set(typeName, line);
      }
      result.push(line);
    }
    
    return result.join('\n');
  }

  recordSuccess(responseTime: number, tokensUsed: number): void {
    this.metrics.responseTime = (this.metrics.responseTime * 0.9) + (responseTime * 0.1);
    this.metrics.tokenUsage += tokensUsed;
    this.saveMetrics();
  }

  recordError(): void {
    const currentErrorRate = this.metrics.errorRate;
    this.metrics.errorRate = (currentErrorRate * 0.95) + (0.05);
    this.saveMetrics();
  }

  getMetrics(): PerformanceMetrics {
    const rlStats = getRLStats();
    return { 
      ...this.metrics,
      rlStats: {
        totalConversations: rlStats.totalConversations,
        averageScore: rlStats.averageScore,
        improvementsLearned: rlStats.improvementsLearned,
      }
    };
  }

  getImprovementLog(): ImprovementLog[] {
    return [...this.config.improvementLog].slice(-50);
  }

  // RL Training Methods
  async runRLTraining(): Promise<ImprovementLog> {
    if (!this.config.rlEnabled) {
      throw new Error('RL training is disabled');
    }

    console.log('[SelfImprovingAgent] Running RL training session...');
    
    const result = await runRLTrainingSession();
    
    const log: ImprovementLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'rl_training',
      file: 'rl-trainer',
      description: result.message,
      success: result.success,
      rlData: {
        pairsProcessed: result.success ? 1 : 0,
        lessonsLearned: result.success ? 1 : 0,
      },
    };
    
    this.config.improvementLog.push(log);
    this.saveConfig();
    
    return log;
  }

  getRLStats() {
    return getRLStats();
  }

  isRLEnabled(): boolean {
    return this.config.rlEnabled;
  }

  setRLEnabled(enabled: boolean): void {
    this.config.rlEnabled = enabled;
    this.saveConfig();
  }

  async getRLRecommendations(): Promise<string[]> {
    return rlTrainer.getImprovementSuggestions();
  }

  private saveConfig(): void {
    try {
      sqlDatabase.setSetting('agent_config', JSON.stringify(this.config));
    } catch (e) {
      console.error('[SelfImprovingAgent] Could not save config:', e);
    }
  }

  validateSecurity(filePath: string, content: string): boolean {
    return this.securityRules.validate(filePath) && 
           this.securityRules.checkContent(content);
  }

  getAllowedPaths(): string[] {
    return [...this.config.selfModifiablePaths];
  }
}

class SecurityRules {
  private dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /exec\s*\(/,
    /spawn\s*\(/,
    /execSync\s*\(/,
    /process\.exit/,
    /rm\s*-rf/,
    /del\s*\/s/,
  ];

  validate(filePath: string): boolean {
    const normalized = filePath.toLowerCase();
    return !normalized.includes('..') && 
           !normalized.includes('node_modules') &&
           !normalized.includes('.git');
  }

  checkContent(content: string): boolean {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }
    return true;
  }
}

export const agent = new SelfImprovingAgent('.');
