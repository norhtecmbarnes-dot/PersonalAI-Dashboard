import { sqlDatabase } from '@/lib/database/sqlite';
import { router } from '@/lib/models/model-router';

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  taskType: 'intelligence' | 'security' | 'research' | 'reflection' | 'sam_check' | 'brand_task' | 'web_check' | 'memory_capture' | 'memory_archive' | 'rl_training' | 'cleanup' | 'custom';
  schedule: string;
  brandId?: string;
  projectId?: string;
  enabled: boolean;
  permanent: boolean;
  expiresAt?: number;
  lastRun?: number;
  lastResult?: string;
  lastError?: string;
  runCount: number;
  successCount: number;
  failCount: number;
  config?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface TaskExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
  data?: any;
}

export interface TaskTemplate {
  type: ScheduledTask['taskType'];
  name: string;
  description: string;
  defaultSchedule: string;
  promptTemplate?: string;
  requiresBrand?: boolean;
  requiresProject?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

// Task priorities - low priority tasks pause during active sessions
// Critical tasks always run, high runs during idle, normal/low pause during active use
const TASK_PRIORITIES: Record<ScheduledTask['taskType'], 'critical' | 'high' | 'normal' | 'low'> = {
  intelligence: 'normal',    // Can wait
  security: 'high',          // Important but not urgent
  research: 'low',           // Background task, pause during use
  reflection: 'low',         // Background task, pause during use
  sam_check: 'normal',       // Periodic check
  brand_task: 'normal',     // User initiated
  web_check: 'low',          // Background monitor
  memory_capture: 'low',     // Background, not time-sensitive
  memory_archive: 'low',     // Background, not time-sensitive
  rl_training: 'low',        // Heavy computation, pause during use
  cleanup: 'low',            // Maintenance, pause during use
  custom: 'normal',
};

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    type: 'intelligence',
    name: 'Intelligence Report',
    description: 'Generate daily intelligence report on space/commercial space news',
    defaultSchedule: 'daily',
    promptTemplate: 'Generate intelligence report covering space industry news, commercial space developments, and government contracting opportunities.',
  },
  {
    type: 'security',
    name: 'Security Scan',
    description: 'Scan system for security vulnerabilities',
    defaultSchedule: 'weekly', // Changed from every 12 hours to weekly for performance
  },
  {
    type: 'research',
    name: 'External Research',
    description: 'Research AI agent developments and improvements',
    defaultSchedule: 'every:24:hours',
    promptTemplate: 'Research the latest developments in AI agents, self-improving systems, and LLM tools.',
  },
  {
    type: 'reflection',
    name: 'Self-Reflection',
    description: 'Analyze system performance and suggest improvements',
    defaultSchedule: 'every:24:hours', // Reduced from every 6 hours to daily
    promptTemplate: 'Analyze recent system performance and suggest improvements for tool usage efficiency.',
  },
  {
    type: 'sam_check',
    name: 'SAM.gov Check',
    description: 'Check SAM.gov for new contracting opportunities',
    defaultSchedule: 'every:24:hours',
    promptTemplate: 'Check SAM.gov for new opportunities matching configured keywords.',
  },
  {
    type: 'brand_task',
    name: 'Brand Task',
    description: 'AI task for a specific brand (proposal, quote, analysis)',
    defaultSchedule: 'manual',
    requiresBrand: true,
  },
  {
    type: 'web_check',
    name: 'Website Monitor',
    description: 'Monitor a website for changes or specific content',
    defaultSchedule: 'manual', // Changed from daily to manual - only run when explicitly needed
    promptTemplate: 'Check website for specified content or changes.',
  },
  {
    type: 'memory_capture',
    name: 'Memory Auto-Capture',
    description: 'Analyze recent messages and capture important facts to memory',
    defaultSchedule: 'every:24:hours', // Reduced from every 10 minutes to daily
    promptTemplate: 'Analyze recent chat history and extract important facts, decisions, and preferences to save to persistent memory.',
  },
  {
    type: 'memory_archive',
    name: 'Memory Archive',
    description: 'Compact and archive old memories',
    defaultSchedule: 'every:24:hours',
    promptTemplate: 'Archive memories older than 30 days with low importance.',
  },
  {
    type: 'rl_training',
    name: 'RL Training',
    description: 'Run reinforcement learning training on conversation history',
    defaultSchedule: 'weekly', // Reduced from every 30 minutes to weekly
    promptTemplate: 'Analyze recent conversations, extract learning patterns, and update memory with improvements.',
  },
  {
    type: 'cleanup',
    name: 'System Cleanup',
    description: 'Clean up old logs, temporary files, and optimize database',
    defaultSchedule: 'weekly',
    promptTemplate: 'Clean up system: remove old logs (>7 days), archive old session reports (>30 days), and vacuum SQLite database.',
  },
];

class TaskScheduler {
  private static instance: TaskScheduler;
  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute
  
  // Session tracking - pause low priority tasks during active sessions
  private activeSession: boolean = false;
  private sessionStartTime: number = 0;
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity = session ended

  private constructor() {}

  static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }
  
  // Called when user starts actively using the system (chat, etc.)
  startSession(): void {
    this.activeSession = true;
    this.sessionStartTime = Date.now();
    // Pause low priority background tasks
    console.log('[TaskScheduler] Session started - pausing low priority background tasks');
  }
  
  // Called when user stops using the system
  endSession(): void {
    this.activeSession = false;
    console.log('[TaskScheduler] Session ended - resuming all tasks');
  }
  
  // Check if session is still active (auto-ended after timeout)
  isSessionActive(): boolean {
    if (!this.activeSession) return false;
    
    // Auto-end session after timeout
    if (Date.now() - this.sessionStartTime > this.SESSION_TIMEOUT) {
      this.activeSession = false;
      console.log('[TaskScheduler] Session auto-ended after inactivity timeout');
      return false;
    }
    
    return true;
  }
  
  // Check if a task should run based on priority and session state
  shouldRunTask(task: ScheduledTask): boolean {
    const priority = task.priority || TASK_PRIORITIES[task.taskType] || 'normal';
    
    // Critical tasks always run
    if (priority === 'critical') return true;
    
    // High priority tasks run only when not in active session
    if (priority === 'high') {
      return !this.isSessionActive();
    }
    
    // Normal priority tasks run during idle time
    if (priority === 'normal') {
      return !this.isSessionActive();
    }
    
    // Low priority tasks only run when system is completely idle
    if (priority === 'low') {
      return !this.isSessionActive();
    }
    
    return true;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Prevent duplicate initialization
    }
    
    await sqlDatabase.initialize();
    await this.ensureDefaultTasks();
    this.isInitialized = true;
  }

  private async ensureDefaultTasks(): Promise<void> {
    try {
      const existingTasks = sqlDatabase.getScheduledTasks();
      // Check for both permanent tasks by type AND by name to prevent duplicates
      const existingPermanentTypes = new Set(
        existingTasks
          .filter((t: any) => t.permanent === 1 || t.permanent === true)
          .map((t: any) => t.task_type)
      );
      
      console.log(`[TaskScheduler] Found ${existingTasks.length} existing tasks, ${existingPermanentTypes.size} permanent types`);

      // Default permanent system tasks - only create if they don't exist
      const defaultTasks: Array<{ type: string; enabled: boolean; permanent: boolean }> = [
        { type: 'intelligence', enabled: true, permanent: true },
        { type: 'security', enabled: true, permanent: true },
        { type: 'research', enabled: false, permanent: true },
        { type: 'reflection', enabled: true, permanent: true },
        { type: 'rl_training', enabled: true, permanent: true },
        { type: 'memory_capture', enabled: true, permanent: true },
        { type: 'memory_archive', enabled: true, permanent: true },
      ];

      let createdCount = 0;
      for (const defaultTask of defaultTasks) {
        if (!existingPermanentTypes.has(defaultTask.type)) {
          const template = TASK_TEMPLATES.find(t => t.type === defaultTask.type);
          if (template) {
            console.log(`[TaskScheduler] Creating default task: ${template.name}`);
            const result = sqlDatabase.addScheduledTask({
              name: template.name,
              description: template.description,
              prompt: template.promptTemplate,
              taskType: template.type,
              schedule: template.defaultSchedule,
              permanent: defaultTask.permanent,
              enabled: defaultTask.enabled,
            });
            
            if (!defaultTask.enabled && result.id) {
              sqlDatabase.disableTask(result.id);
            }
            createdCount++;
          }
        } else {
          console.log(`[TaskScheduler] Task type ${defaultTask.type} already exists, skipping`);
        }
      }
      
      if (createdCount > 0) {
        console.log(`[TaskScheduler] Created ${createdCount} new default tasks`);
      }

      // Cleanup expired non-permanent tasks
      this.cleanupExpiredTasks();
    } catch (error) {
      console.error('[TaskScheduler] Error ensuring default tasks:', error);
    }
  }

  private cleanupExpiredTasks(): void {
    try {
      const now = Date.now();
      const allTasks = sqlDatabase.getScheduledTasks();
      
      for (const task of allTasks) {
        if (!task.permanent && task.expires_at && task.expires_at < now) {
          console.log(`[TaskScheduler] Cleaning up expired task: ${task.name}`);
          sqlDatabase.deleteScheduledTask(task.id);
        }
      }
    } catch (error) {
      console.error('[TaskScheduler] Error cleaning up expired tasks:', error);
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('[TaskScheduler] Already running, skipping start');
      return;
    }
    
    if (!this.isInitialized) {
      console.log('[TaskScheduler] Not initialized, call initialize() first');
      return;
    }
    
    this.isRunning = true;
    console.log('[TaskScheduler] Starting scheduler...');
    
    // Run immediately on start
    this.runDueTasks();
    
    // Then check every minute
    this.intervalId = setInterval(() => {
      this.runDueTasks();
    }, this.CHECK_INTERVAL);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[TaskScheduler] Scheduler stopped');
  }

  private async runDueTasks(): Promise<void> {
    try {
      const dueTasks = sqlDatabase.getTasksDueNow();
      
      // Only log if there are tasks to run
      if (dueTasks.length > 0) {
        const sessionActive = this.isSessionActive();
        const pausedTasks: ScheduledTask[] = [];
        const runningTasks: ScheduledTask[] = [];
        
        for (const task of dueTasks) {
          if (this.shouldRunTask(task)) {
            runningTasks.push(task);
          } else {
            pausedTasks.push(task);
          }
        }
        
        // Log paused tasks (only if there are some)
        if (pausedTasks.length > 0 && sessionActive) {
          // Log paused tasks silently - don't spam console
        }
        
        // Run only appropriate tasks
        if (runningTasks.length > 0) {
          console.log(`[TaskScheduler] Running ${runningTasks.length} task(s), ${pausedTasks.length} paused due to active session`);
          
          for (const task of runningTasks) {
            try {
              await this.executeTask(task);
            } catch (error) {
              console.error(`[TaskScheduler] Task ${task.name} failed:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[TaskScheduler] Error checking due tasks:', error);
    }
  }

  async executeTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    // Only log on error, not on every execution
    
    try {
      let result: TaskExecutionResult;

      switch (task.taskType) {
        case 'intelligence':
          result = await this.executeIntelligenceTask(task);
          break;
        case 'security':
          result = await this.executeSecurityTask(task);
          break;
        case 'research':
          result = await this.executeResearchTask(task);
          break;
        case 'reflection':
          result = await this.executeReflectionTask(task);
          break;
        case 'sam_check':
          result = await this.executeSAMCheckTask(task);
          break;
        case 'brand_task':
          result = await this.executeBrandTask(task);
          break;
        case 'web_check':
          result = await this.executeWebCheckTask(task);
          break;
        case 'memory_capture':
          result = await this.executeMemoryCaptureTask(task);
          break;
        case 'memory_archive':
          result = await this.executeMemoryArchiveTask(task);
          break;
        case 'rl_training':
          result = await this.executeRLTrainingTask(task);
          break;
        case 'cleanup':
          result = await this.executeCleanupTask(task);
          break;
        case 'custom':
          result = await this.executeCustomTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      // Save result for viewing
      sqlDatabase.recordTaskRun(task.id, result.success, result.result, result.error);
      
      // Also save detailed result to task_results table
      sqlDatabase.addTaskResult(task.id, {
        result: result.result,
        data: result.data,
        success: result.success,
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sqlDatabase.recordTaskRun(task.id, false, undefined, errorMessage);
      
      // Save error result
      sqlDatabase.addTaskResult(task.id, {
        result: undefined,
        data: { error: errorMessage },
        success: false,
      });
      
      return { success: false, error: errorMessage };
    }
  }

  private async executeIntelligenceTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    const { intelligenceService } = await import('@/lib/intelligence/report-generator');
    
    const report = await intelligenceService.generateReport();
    const articleCount = report.newsSummary?.spaceDomainAwareness?.length || 0 
      + (report.newsSummary?.commercialSpace?.length || 0);
    
    return {
      success: true,
      result: `Intelligence report generated with ${articleCount} articles`,
      data: { articleCount, reportId: report.id },
    };
  }

  private async executeSecurityTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    const { securityAgent } = await import('@/lib/agent/security-agent');
    
    const report = await securityAgent.performSecurityScan();
    
    return {
      success: true,
      result: `Security scan completed. Risk score: ${report.riskScore}`,
      data: { riskScore: report.riskScore, findings: report.findings?.length || 0 },
    };
  }

  private async executeResearchTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    const { researchAgent } = await import('@/lib/agent/research-agent');
    
    const report = await researchAgent.performResearch();
    
    return {
      success: true,
      result: `Research completed. Found ${report.totalFindings} articles`,
      data: { findings: report.totalFindings },
    };
  }

  private async executeReflectionTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    const { metricsService } = await import('@/lib/services/metrics');
    const { codeHealthService } = await import('@/lib/services/code-health');
    const { selfImprovementService } = await import('@/lib/services/self-improvement');
    
    const metrics = metricsService.getAggregatedMetrics('day');
    const codeHealth = await codeHealthService.analyzeCodeHealth();
    const report = await selfImprovementService.generateReport(metrics, codeHealth);
    
    return {
      success: true,
      result: `Self-reflection completed. Score: ${report.healthScore}`,
      data: { score: report.healthScore, insights: report.insights?.length || 0 },
    };
  }

  private async executeSAMCheckTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    // SAM.gov integration has been removed
    return {
      success: true,
      result: 'SAM.gov integration has been removed from the system',
      data: { opportunities: 0, queriesChecked: 0 },
    };
  }

  private async executeBrandTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    if (!task.brandId) {
      return { success: false, error: 'Brand task requires brandId' };
    }

    const { brandWorkspace } = await import('@/lib/services/brand-workspace');
    const brand = await brandWorkspace.getBrandById(task.brandId);
    
    if (!brand) {
      return { success: false, error: 'Brand not found' };
    }

    // Create a chat session and execute the prompt
    const projects = await brandWorkspace.getProjects(task.brandId);
    const project = projects[0];
    
    if (!project) {
      return { success: false, error: 'No project found for brand' };
    }

    const session = await brandWorkspace.createChatSession(project.id, task.brandId, task.name);
    const context = await brandWorkspace.buildContextForChat(task.brandId, project.id);
    
    // For now, just return success - actual chat would happen through API
    return {
      success: true,
      result: `Brand task initialized for ${brand.name}`,
      data: { sessionId: session.id, brandId: task.brandId },
    };
  }

  private async executeWebCheckTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    // Web check now returns placeholder without making external HTTP calls
    // Only runs when explicitly triggered (schedule: manual)
    return {
      success: true,
      result: 'Web check is disabled. Use manual search via chat for current information.',
      data: { 
        message: 'External web checking disabled to reduce system traffic',
        suggestion: 'Use the web search feature in chat for current information'
      },
    };
  }

  private async executeRLTrainingTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    try {
      const { rlTrainer } = await import('@/lib/agent/rl-trainer');
      const { agent } = await import('@/lib/agent/self-improvement');
      
      // Check if RL is enabled
      if (!agent.isRLEnabled()) {
        return { 
          success: false, 
          error: 'RL training is disabled in agent config' 
        };
      }
      
      // Run training session
      const result = await rlTrainer.runTrainingSession();
      const stats = rlTrainer.getStats();
      
      // Get recommendations
      const recommendations = await rlTrainer.getRecommendations();
      
      return {
        success: true,
        result: `RL training complete: ${result.pairsProcessed} pairs, ${result.lessonsExtracted} lessons, ${result.memoriesUpdated} memories updated. Total conversations: ${stats.totalConversations}, Avg score: ${stats.averageScore.toFixed(2)}`,
        data: { 
          pairsProcessed: result.pairsProcessed,
          lessonsExtracted: result.lessonsExtracted,
          memoriesUpdated: result.memoriesUpdated,
          stats,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'RL training failed',
      };
    }
  }

  private async executeCustomTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    if (!task.prompt) {
      return { success: false, error: 'Custom task requires a prompt' };
    }

    // Execute custom prompt through chat API
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: router.getModelId('chat'),
          message: task.prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API returned ${response.status}`);
      }

      const data = await response.json();
      const content = data.message?.content || data.message || data.response || '';

      return {
        success: true,
        result: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        data: { fullResponse: content },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute custom task',
      };
    }
  }

  private async executeMemoryCaptureTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      const { streamChatCompletion } = await import('@/lib/models/sdk.server');
      
      // Get recent chat messages from last 10 minutes
      const recentMessages = await sqlDatabase.all(`
        SELECT * FROM chat_messages 
        WHERE timestamp > ? 
        ORDER BY timestamp DESC 
        LIMIT 50
      `, [Date.now() - 10 * 60 * 1000]);
      
      if (recentMessages.length === 0) {
        return { success: true, result: 'No recent messages to capture' };
      }
      
      // Analyze with AI to extract important facts
      const prompt = `Analyze these recent chat messages and extract important facts, decisions, and preferences to save to memory.

Messages:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract:
1. User facts (name, preferences, interests)
2. Important decisions made
3. Key topics discussed
4. Action items or tasks mentioned

Return JSON array: [{"category": "user|decision|knowledge", "content": "...", "importance": 5}]`;

      const result = await streamChatCompletion({
        model: router.getModelId('memory_capture'),
        messages: [{ role: 'user', content: prompt }],
      });
      
      const response = result.message?.content || String(result.message);
      
      // Parse and save memories
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const memories = JSON.parse(jsonMatch[0]);
          for (const memory of memories.slice(0, 5)) {
            await sqlDatabase.run(`
              INSERT INTO memory (id, content, category, importance, source, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
              memory.content,
              memory.category || 'knowledge',
              memory.importance || 5,
              'memory_capture',
              Date.now()
            ]);
          }
        }
      } catch (e) {
        console.log('[MemoryCapture] Failed to parse memories:', e);
      }
      
      return {
        success: true,
        result: `Captured from ${recentMessages.length} messages`,
        data: { messageCount: recentMessages.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Memory capture failed',
      };
    }
  }

  private async executeMemoryArchiveTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      
      // Archive memories older than 30 days with low importance
      const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const oldMemories = await sqlDatabase.all(`
        SELECT * FROM memory 
        WHERE created_at < ? AND importance <= 5
        ORDER BY created_at ASC
        LIMIT 100
      `, [cutoffDate]);
      
      if (oldMemories.length === 0) {
        return { success: true, result: 'No memories to archive' };
      }
      
      // Archive memories by marking them as archived
      let archivedCount = 0;
      for (const memory of oldMemories) {
        try {
          await sqlDatabase.run(`
            UPDATE memory 
            SET category = 'archived', 
                importance = 1,
                updated_at = ?
            WHERE id = ?
          `, [Date.now(), memory.id]);
          archivedCount++;
        } catch (e) {
          console.log('[MemoryArchive] Failed to archive:', memory.id, e);
        }
      }
      
      return {
        success: true,
        result: `Archived ${archivedCount} memories`,
        data: { archivedCount },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Memory archive failed',
      };
    }
  }

  private async executeCleanupTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    // Skip file system operations in Edge Runtime - only run in Node.js
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
      console.log('[TaskScheduler] Cleanup skipped - not in Node.js runtime');
      return {
        success: true,
        result: 'Cleanup skipped - file system operations require Node.js runtime'
      };
    }
    
    try {
      const results: string[] = [];
      
      // Note: File cleanup operations have been disabled to avoid Edge Runtime errors
      // File system cleanup (logs, reports) should be done manually or via Node.js-only scripts
      console.log('[TaskScheduler] Database cleanup only - file operations disabled');
      
      // 1. Vacuum SQLite database
      try {
        sqlDatabase.vacuum();
        results.push('Database optimized (VACUUM)');
      } catch (e) {
        console.log('Database vacuum optional:', e);
      }
      
      // 4. Clean old task results (>90 days)
      try {
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const oldTasks = sqlDatabase.getScheduledTasks(false)
          .filter(t => t.lastRun && t.lastRun < ninetyDaysAgo && !t.permanent);
        
        let tasksCleaned = 0;
        for (const task of oldTasks) {
          if (task.runCount === 0) {
            sqlDatabase.deleteScheduledTask(task.id);
            tasksCleaned++;
          }
        }
        
        if (tasksCleaned > 0) {
          results.push(`Removed ${tasksCleaned} old unused tasks`);
        }
      } catch (e) {
        console.log('Task cleanup optional:', e);
      }
      
      return {
        success: true,
        result: results.length > 0 ? results.join(', ') : 'No cleanup needed',
        data: { actions: results },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      };
    }
  }

  // Public methods for task management
  getTasks(enabledOnly: boolean = false): ScheduledTask[] {
    try {
      return sqlDatabase.getScheduledTasks(enabledOnly) || [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  getTask(id: string): ScheduledTask | null {
    try {
      return sqlDatabase.getScheduledTaskById(id);
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  createTask(task: {
    name: string;
    description?: string;
    prompt?: string;
    taskType: ScheduledTask['taskType'];
    schedule: string;
    brandId?: string;
    projectId?: string;
    config?: Record<string, any>;
    enabled?: boolean;
    permanent?: boolean;
    expiresAt?: number;
  }): ScheduledTask {
    // Check for duplicates by type and name (for permanent tasks) or type/name/brand combination
    const existingTasks = sqlDatabase.getScheduledTasks();
    const duplicateKey = `${task.taskType}:${task.name}:${task.brandId || 'none'}`;
    
    const existingDuplicate = existingTasks.find((t: any) => {
      const key = `${t.task_type}:${t.name}:${t.brand_id || 'none'}`;
      return key === duplicateKey;
    });
    
    if (existingDuplicate) {
      console.log(`[TaskScheduler] Duplicate task detected: ${task.name} (${task.taskType}). Returning existing task.`);
      return existingDuplicate;
    }

    const result = sqlDatabase.addScheduledTask({
      name: task.name,
      description: task.description,
      prompt: task.prompt,
      taskType: task.taskType,
      schedule: task.schedule,
      brandId: task.brandId,
      projectId: task.projectId,
      config: task.config,
      permanent: task.permanent ?? false,
      expiresAt: task.expiresAt,
    });

    const newTask = sqlDatabase.getScheduledTaskById(result.id);
    
    if (task.enabled === false && newTask) {
      sqlDatabase.disableTask(result.id);
      return sqlDatabase.getScheduledTaskById(result.id);
    }
    
    return newTask;
  }

  updateTask(id: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
    sqlDatabase.updateScheduledTask(id, {
      name: updates.name,
      description: updates.description,
      prompt: updates.prompt,
      schedule: updates.schedule,
      enabled: updates.enabled,
      permanent: updates.permanent,
      expiresAt: updates.expiresAt,
      config: updates.config,
    });
    return sqlDatabase.getScheduledTaskById(id);
  }

  deleteTask(id: string): boolean {
    // Don't delete permanent tasks
    const task = sqlDatabase.getScheduledTaskById(id);
    if (task?.permanent) {
      console.log(`[TaskScheduler] Cannot delete permanent task: ${task.name}`);
      return false;
    }
    return sqlDatabase.deleteScheduledTask(id);
  }

  enableTask(id: string): void {
    sqlDatabase.enableTask(id);
  }

  disableTask(id: string): void {
    sqlDatabase.disableTask(id);
  }

  async runTaskNow(id: string): Promise<TaskExecutionResult> {
    const task = sqlDatabase.getScheduledTaskById(id);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    return this.executeTask(task);
  }

  getTaskTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES;
  }

  getStatus(): { isRunning: boolean; checkInterval: number; sessionActive: boolean } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      sessionActive: this.activeSession,
    };
  }

  getTaskResults(taskId: string, limit: number = 10): any[] {
    return sqlDatabase.getTaskResults(taskId, limit);
  }

  getLatestTaskResult(taskId: string): any | null {
    return sqlDatabase.getLatestTaskResult(taskId);
  }

  cleanupOldResults(daysToKeep: number = 30): void {
    sqlDatabase.cleanupOldTaskResults(daysToKeep);
  }
}

export const taskScheduler = TaskScheduler.getInstance();