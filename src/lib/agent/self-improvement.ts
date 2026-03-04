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

    // Load from database instead of file system
    // This avoids fs/path imports at top level
    if (typeof window === 'undefined' && typeof process !== 'undefined' && typeof process.cwd === 'function') {
      try {
        // Dynamic import to avoid Edge Runtime issues
        // Config will be loaded from database
      } catch {
        console.log('Using default agent config');
      }
    }

    return defaultConfig;
  }

  private loadMetrics(): PerformanceMetrics {
    // Load from database instead of file system
    return {
      responseTime: 0,
      tokenUsage: 0,
      errorRate: 0,
      lastUpdated: Date.now(),
    };
  }

  private saveMetrics(): void {
    this.metrics.lastUpdated = Date.now();
    // Save to database instead of file system
  }

  canModify(filePath: string): boolean {
    // Check if in allowed paths
    for (const pattern of this.config.disallowedPatterns) {
      const patternStr = typeof pattern === 'string' ? pattern : pattern.source;
      if (new RegExp(patternStr, 'i').test(filePath)) return false;
    }

    const isSelfModifiable = this.config.selfModifiablePaths.some(
      p => filePath.startsWith(p)
    );

    return isSelfModifiable && this.securityRules.validate(filePath);
  }

  async analyzeAndImprove(): Promise<ImprovementLog[]> {
    const improvements: ImprovementLog[] = [];

    // Analysis only - no automatic file modifications
    // Files are modified only after human review

    this.config.improvementLog.push(...improvements);
    this.saveConfig();

    return improvements;
  }

  private async optimizeTokenUsage(): Promise<ImprovementLog[]> {
    const improvements: ImprovementLog[] = [];
    
    // Analysis only - returns recommendations
    // No automatic file modifications

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
    
    return improvements;
  }

  private getSelfModifiableFiles(): string[] {
    // Analysis only - returns list of files that could be modified
    const files: string[] = [];
    
    return files;
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
      description: `RL training: ${result.pairsProcessed} pairs, ${result.lessonsExtracted} lessons, ${result.memoriesUpdated} memories`,
      success: true,
      rlData: {
        pairsProcessed: result.pairsProcessed,
        lessonsLearned: result.lessonsExtracted,
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
    return rlTrainer.getRecommendations();
  }

  private saveConfig(): void {
    // Save to database instead of file system
    // This method is kept for API compatibility
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

// Only create instance in Node.js runtime
export const agent = typeof process !== 'undefined' && process.cwd 
  ? new SelfImprovingAgent(process.cwd()) 
  : null as any;
