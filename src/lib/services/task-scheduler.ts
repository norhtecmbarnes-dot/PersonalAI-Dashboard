import { sqlDatabase } from '@/lib/database/sqlite';
import { router } from '@/lib/models/model-router';
import fs from 'fs';
import {
  executeIntelligenceTask,
  executeSecurityTask,
  executeResearchTask,
  executeReflectionTask,
  executeBrandTask,
  executeWebCheckTask,
  executeMemoryCaptureTask,
  executeMemoryArchiveTask,
  executeRLTrainingTask,
  executeCleanupTask,
  executeCleanupDuplicateTasksTask,
  executeSecurityFixTask,
  executeCustomTask,
} from './tasks/handlers';

async function executeTaskInternal(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    let result: TaskExecutionResult;

    switch (task.taskType) {
      case 'intelligence':
        result = await executeIntelligenceTask(task);
        break;
      case 'security':
        result = await executeSecurityTask(task);
        break;
      case 'research':
        result = await executeResearchTask(task);
        break;
      case 'reflection':
        result = await executeReflectionTask(task);
        break;
      case 'brand_task':
        result = await executeBrandTask(task);
        break;
      case 'web_check':
        result = await executeWebCheckTask(task);
        break;
      case 'memory_capture':
        result = await executeMemoryCaptureTask(task);
        break;
      case 'memory_archive':
        result = await executeMemoryArchiveTask(task);
        break;
      case 'rl_training':
        result = await executeRLTrainingTask(task);
        break;
      case 'cleanup':
        result = await executeCleanupTask(task);
        break;
      case 'cleanup_duplicate_tasks':
        result = await executeCleanupDuplicateTasksTask(task);
        break;
      case 'security_fix':
        result = await executeSecurityFixTask(task);
        break;
      case 'custom':
        result = await executeCustomTask(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.taskType}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  taskType:
    | 'intelligence'
    | 'security'
    | 'research'
    | 'reflection'
    | 'brand_task'
    | 'web_check'
    | 'memory_capture'
    | 'memory_archive'
    | 'rl_training'
    | 'cleanup'
    | 'cleanup_duplicate_tasks'
    | 'security_fix'
    | 'custom';
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
  intelligence: 'normal', // Can wait
  security: 'high', // Important but not urgent
  research: 'low', // Background task, pause during use
  reflection: 'low', // Background task, pause during use
  brand_task: 'normal', // User initiated
  web_check: 'low', // Background monitor
  memory_capture: 'low', // Background, not time-sensitive
  memory_archive: 'low', // Background, not time-sensitive
  rl_training: 'low', // Heavy computation, pause during use
  cleanup: 'low', // Maintenance, pause during use
  cleanup_duplicate_tasks: 'high', // Important for database hygiene
  security_fix: 'critical', // Security issues need immediate attention
  custom: 'normal',
};

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    type: 'intelligence',
    name: 'Intelligence Report',
    description: 'Generate daily intelligence report on space/commercial space news',
    defaultSchedule: 'daily',
    promptTemplate:
      'Generate intelligence report covering space industry news, commercial space developments, and government contracting opportunities.',
  },
  {
    type: 'security',
    name: 'Security Scan',
    description: 'Scan system for security vulnerabilities',
    defaultSchedule: 'weekly', // Changed from every 12 hours to weekly for performance
  },
  {
    type: 'cleanup',
    name: 'Cache Cleanup',
    description: 'Clear expired cache entries and old temporary data',
    defaultSchedule: 'daily',
  },
  {
    type: 'research',
    name: 'External Research',
    description: 'Research AI agent developments and improvements',
    defaultSchedule: 'every:24:hours',
    promptTemplate:
      'Research the latest developments in AI agents, self-improving systems, and LLM tools.',
  },
  {
    type: 'reflection',
    name: 'Self-Reflection',
    description: 'Analyze system performance and suggest improvements',
    defaultSchedule: 'weekly', // Reduced from daily to weekly for performance
    promptTemplate:
      'Analyze recent system performance and suggest improvements for tool usage efficiency.',
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
    promptTemplate:
      'Analyze recent chat history and extract important facts, decisions, and preferences to save to persistent memory.',
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
    promptTemplate:
      'Analyze recent conversations, extract learning patterns, and update memory with improvements.',
  },
  {
    type: 'cleanup',
    name: 'System Cleanup',
    description: 'Clean up old logs, temporary files, and optimize database',
    defaultSchedule: 'weekly',
    promptTemplate:
      'Clean up system: remove old logs (>7 days), archive old session reports (>30 days), and vacuum SQLite database.',
  },
  {
    type: 'cleanup_duplicate_tasks',
    name: 'Cleanup Duplicate Tasks',
    description: 'Find and remove duplicate tasks from the task list',
    defaultSchedule: 'daily',
    promptTemplate:
      'Analyze all tasks in the system. Find tasks that are duplicates (same or very similar title/description). Remove the older duplicate, keeping the most recent one. Report how many duplicates were found and removed.',
  },
  {
    type: 'security_fix',
    name: 'Security Fixer',
    description: 'Automatically fix identified security vulnerabilities',
    defaultSchedule: 'daily',
    promptTemplate:
      'Run a security scan, identify vulnerabilities, and automatically apply fixes where possible. For issues that cannot be auto-fixed, document them in the security report with recommended manual actions. Priority: fix API key exposure, SQL injection risks, and XSS vulnerabilities.',
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

  private readonly MAX_TASK_RESULTS = 100; // Keep only 100 most recent task results

  private readonly TASK_EXPIRY = 90 * 24 * 60 * 60 * 1000; // 90 days

  // Aging task notification threshold (tasks older than this will prompt user)
  private readonly TASK_AGING_THRESHOLD = 60 * 24 * 60 * 60 * 1000; // 60 days - prompt before expiry
  private readonly TASK_AGING_REVIEW_KEY = 'task_aging_review_pending';

  // Concurrency protection
  private runningTasks: Set<string> = new Set();
  private readonly MAX_CONCURRENT_TASKS = 3;

  // Task timeout protection
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly TASK_TIMEOUTS: Record<ScheduledTask['taskType'], number> = {
    intelligence: 10 * 60 * 1000, // 10 minutes
    security: 5 * 60 * 1000, // 5 minutes
    research: 15 * 60 * 1000, // 15 minutes
    reflection: 5 * 60 * 1000, // 5 minutes
    brand_task: 10 * 60 * 1000, // 10 minutes
    web_check: 2 * 60 * 1000, // 2 minutes
    memory_capture: 3 * 60 * 1000, // 3 minutes
    memory_archive: 5 * 60 * 1000, // 5 minutes
    rl_training: 30 * 60 * 1000, // 30 minutes (heavy computation)
    cleanup: 10 * 60 * 1000, // 10 minutes
    cleanup_duplicate_tasks: 5 * 60 * 1000, // 5 minutes - find and remove duplicate tasks
    security_fix: 10 * 60 * 1000, // 10 minutes - fix security issues
    custom: 10 * 60 * 1000, // 10 minutes
  };

  // Resource thresholds
  private readonly MAX_MEMORY_USAGE_MB = 1024; // Don't run tasks if memory > 1GB (Next.js baseline)
  private readonly MAX_CPU_PERCENT = 80; // Don't run tasks if CPU > 80%

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
    // Pause low priority background tasks - logged to debugger for production
    if (process.env.NODE_ENV === 'development') {
      console.log('[TaskScheduler] Session started - pausing low priority background tasks');
    }
  }

  // Called when user stops using the system
  endSession(): void {
    this.activeSession = false;
    if (process.env.NODE_ENV === 'development') {
      console.log('[TaskScheduler] Session ended - resuming all tasks');
    }
  }

  // Check if session is still active (auto-ended after timeout)
  isSessionActive(): boolean {
    if (!this.activeSession) return false;

    // Auto-end session after timeout
    if (Date.now() - this.sessionStartTime > this.SESSION_TIMEOUT) {
      this.activeSession = false;
      if (process.env.NODE_ENV === 'development') {
        console.log('[TaskScheduler] Session auto-ended after inactivity timeout');
      }
      return false;
    }

    return true;
  }

  // Check if a task should run based on priority and session state
  shouldRunTask(task: ScheduledTask): boolean {
    const priority = task.priority || TASK_PRIORITIES[task.taskType] || 'normal';

    // Check if already running (concurrency protection)
    if (this.runningTasks.has(task.id)) {
      return false;
    }

    // Check concurrency limit
    if (this.runningTasks.size >= this.MAX_CONCURRENT_TASKS) {
      return false;
    }

    // Critical tasks always run (unless at concurrency limit)
    if (priority === 'critical') return true;

    // Check session state for non-critical tasks
    if (this.isSessionActive()) {
      return false;
    }

    // Check resource usage before running - with rate limiting
    if (!this.checkResourcesAvailable()) {
      return false;
    }

    return true;
  }

  // Check if system has enough resources to run tasks
  private lastMemoryWarning: number | undefined;
  private checkResourcesAvailable(): boolean {
    try {
      // Check memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

      // If heap usage is very high, don't start new tasks
      if (heapUsedMB > this.MAX_MEMORY_USAGE_MB) {
        // Only log once per minute to prevent spam
        const now = Date.now();
        if (!this.lastMemoryWarning || now - this.lastMemoryWarning > 60000) {
          console.warn(
            `[TaskScheduler] Memory usage high (${heapUsedMB.toFixed(0)}MB), deferring tasks`
          );
          this.lastMemoryWarning = now;
        }
        return false;
      }

      return true;
    } catch (error) {
      // If we can't check resources, allow task to run
      return true;
    }
  }

  // Get current resource status
  getResourceStatus(): { memoryMB: number; runningTasks: number; canRunMore: boolean } {
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      memoryMB,
      runningTasks: this.runningTasks.size,
      canRunMore:
        this.runningTasks.size < this.MAX_CONCURRENT_TASKS && memoryMB < this.MAX_MEMORY_USAGE_MB,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Prevent duplicate initialization
    }

    sqlDatabase.initialize();
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

      console.log(
        `[TaskScheduler] Found ${existingTasks.length} existing tasks, ${existingPermanentTypes.size} permanent types`
      );

      // Default permanent system tasks - only create if they don't exist
      const defaultTasks: Array<{ type: string; enabled: boolean; permanent: boolean }> = [
        { type: 'intelligence', enabled: true, permanent: true },
        { type: 'security', enabled: true, permanent: true },
        { type: 'research', enabled: false, permanent: true },
        { type: 'reflection', enabled: true, permanent: true },
        { type: 'rl_training', enabled: true, permanent: true },
        { type: 'memory_capture', enabled: true, permanent: true },
        { type: 'memory_archive', enabled: true, permanent: true },
        { type: 'cleanup_duplicate_tasks', enabled: true, permanent: true },
        { type: 'security_fix', enabled: true, permanent: true },
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
    if (typeof process === 'undefined' || !process.cwd) {
      return;
    }

    // Skip file operations if only database is available
    if (!fs.existsSync(process.cwd())) {
      try {
        sqlDatabase.vacuum();
      } catch (e) {
        // Database vacuum is optional
      }
      return;
    }

    try {
      const tasks = sqlDatabase.getScheduledTasks();
      const expired = tasks.filter(t => Date.now() - t.createdAt > this.TASK_EXPIRY);
      expired.forEach(t => this.deleteTask(t.id));
    } catch (error) {
      // Task cleanup is optional - continue silently
    }
  }

  start(): void {
    if (this.isRunning) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[TaskScheduler] Already running, skipping start');
      }
      return;
    }

    if (!this.isInitialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[TaskScheduler] Not initialized, call initialize() first');
      }
      return;
    }

    this.isRunning = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('[TaskScheduler] Starting scheduler...');
    }

    // Run immediately on start
    this.runDueTasks();

    // Then check every minute
    this.intervalId = setInterval(() => {
      this.runDueTasks();
      // Prune old results every 10 runs to prevent memory growth
      if (Math.random() < 0.1) {
        this.pruneOldTaskResults();
      }
    }, this.CHECK_INTERVAL);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear all task timeouts
    this.taskTimeouts.forEach(timeout => clearTimeout(timeout));
    this.taskTimeouts.clear();

    // Clear running tasks set
    this.runningTasks.clear();

    this.isRunning = false;
    if (process.env.NODE_ENV === 'development') {
      console.log('[TaskScheduler] Scheduler stopped');
    }
  }

  private async runDueTasks(): Promise<void> {
    try {
      const dueTasks = sqlDatabase.getTasksDueNow();

      // Only process if there are tasks
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

        // Execute running tasks with concurrency limit
        const executionPromises = runningTasks
          .slice(0, this.MAX_CONCURRENT_TASKS)
          .map(task => this.executeTask(task));
        await Promise.allSettled(executionPromises);

        // Cleanup old task results to prevent memory growth
        if (Math.random() < 0.1) {
          this.pruneOldTaskResults();
        }
      }
    } catch (error) {
      // Silently handle errors to prevent memory leaks from error objects
    }
  }

  private pruneOldTaskResults(): void {
    // Task result pruning handled by database cleanup
    // This method is kept for API compatibility
  }

  async executeTask(task: ScheduledTask): Promise<TaskExecutionResult> {
    // Check if task can run
    if (!this.shouldRunTask(task)) {
      return {
        success: false,
        error: 'Task cannot run: concurrency limit reached or resource constraints',
      };
    }

    // Mark task as running
    this.runningTasks.add(task.id);
    const timeoutMs = this.TASK_TIMEOUTS[task.taskType] || 10 * 60 * 1000;

    // Set up timeout
    let timeoutId: NodeJS.Timeout | null = null;
    let timedOut = false;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<TaskExecutionResult>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          reject(new Error(`Task timed out after ${timeoutMs / 60000} minutes`));
        }, timeoutMs);
      });

      // Race between task execution and timeout
      const result = await Promise.race([executeTaskInternal(task), timeoutPromise]);

      // Clear timeout on success
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Save result
      sqlDatabase.recordTaskRun(task.id, result.success, result.result, result.error);
      sqlDatabase.addTaskResult(task.id, {
        result: result.result,
        data: result.data,
        success: result.success,
      });

      return result;
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const finalError = timedOut ? errorMessage : errorMessage;

      sqlDatabase.recordTaskRun(task.id, false, undefined, finalError);
      sqlDatabase.addTaskResult(task.id, {
        result: undefined,
        data: { error: finalError, timedOut },
        success: false,
      });

      return { success: false, error: finalError };
    } finally {
      // Always remove from running set
      this.runningTasks.delete(task.id);
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
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[TaskScheduler] Duplicate task detected: ${task.name} (${task.taskType}). Returning existing task.`
        );
      }
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

  getStatus(): {
    isRunning: boolean;
    checkInterval: number;
    sessionActive: boolean;
    runningTasks: string[];
    maxConcurrentTasks: number;
    resources: { memoryMB: number; canRunMore: boolean };
  } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      sessionActive: this.activeSession,
      runningTasks: Array.from(this.runningTasks),
      maxConcurrentTasks: this.MAX_CONCURRENT_TASKS,
      resources: this.getResourceStatus(),
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

  // Task aging management - get tasks that need user review before expiration
  getTasksNeedingReview(): Array<ScheduledTask & { age: number; daysUntilExpiry: number }> {
    const now = Date.now();
    const tasks = sqlDatabase.getScheduledTasks(false);

    return tasks
      .filter(task => {
        // Only non-permanent tasks that haven't been flagged for review
        if (task.permanent) return false;
        if (task.config?.reviewPending) return false;

        const age = now - task.createdAt;
        return age >= this.TASK_AGING_THRESHOLD && age < this.TASK_EXPIRY;
      })
      .map(task => ({
        ...task,
        age: now - task.createdAt,
        daysUntilExpiry: Math.ceil(
          (this.TASK_EXPIRY - (now - task.createdAt)) / (24 * 60 * 60 * 1000)
        ),
      }))
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  // Get all tasks pending user review decision
  getPendingReviewTasks(): ScheduledTask[] {
    const tasks = sqlDatabase.getScheduledTasks(false);
    return tasks.filter(task => task.config?.reviewPending === true);
  }

  // Mark a task for review - user will be prompted
  markTaskForReview(taskId: string): boolean {
    const task = sqlDatabase.getScheduledTaskById(taskId);
    if (!task) return false;

    sqlDatabase.updateScheduledTask(taskId, {
      config: {
        ...task.config,
        reviewPending: true,
        reviewDate: Date.now(),
      },
    });
    return true;
  }

  // Process user's decision on an aging task
  processAgingTaskDecision(
    taskId: string,
    decision: 'keep' | 'modify' | 'delete' | 'snooze',
    modifications?: { name?: string; schedule?: string; description?: string }
  ): { success: boolean; message: string } {
    const task = sqlDatabase.getScheduledTaskById(taskId);
    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    switch (decision) {
      case 'keep':
        // Reset the aging timer - extend the task's life
        sqlDatabase.updateScheduledTask(taskId, {
          config: {
            ...task.config,
            reviewPending: false,
            keptAt: Date.now(),
            // Reset creation date to effectively reset the aging clock
          },
        });
        // Update createdAt to reset aging
        sqlDatabase.run('UPDATE scheduled_tasks SET created_at = ? WHERE id = ?', [
          Date.now(),
          taskId,
        ]);
        return { success: true, message: `Task "${task.name}" kept. Aging timer reset.` };

      case 'modify':
        if (!modifications) {
          return { success: false, message: 'Modifications required for modify decision' };
        }
        sqlDatabase.updateScheduledTask(taskId, {
          name: modifications.name || task.name,
          schedule: modifications.schedule || task.schedule,
          description: modifications.description || task.description,
          config: {
            ...task.config,
            reviewPending: false,
            modifiedAt: Date.now(),
          },
        });
        // Reset creation date for modified tasks
        sqlDatabase.run('UPDATE scheduled_tasks SET created_at = ? WHERE id = ?', [
          Date.now(),
          taskId,
        ]);
        return { success: true, message: `Task "${task.name}" modified and aging timer reset.` };

      case 'delete':
        if (task.permanent) {
          return { success: false, message: 'Cannot delete permanent task' };
        }
        sqlDatabase.deleteScheduledTask(taskId);
        return { success: true, message: `Task "${task.name}" deleted.` };

      case 'snooze':
        // Snooze for 30 days before asking again
        sqlDatabase.updateScheduledTask(taskId, {
          config: {
            ...task.config,
            reviewPending: false,
            snoozedAt: Date.now(),
            snoozeCount: (task.config?.snoozeCount || 0) + 1,
          },
        });
        sqlDatabase.run('UPDATE scheduled_tasks SET created_at = ? WHERE id = ?', [
          Date.now() - (this.TASK_AGING_THRESHOLD - 30 * 24 * 60 * 60 * 1000),
          taskId,
        ]);
        return { success: true, message: `Task "${task.name}" snoozed for 30 days.` };

      default:
        return { success: false, message: 'Invalid decision' };
    }
  }

  // Run automatic task aging check - returns tasks that need review
  runTaskAgingCheck(): { needsReview: number; pendingDecision: number; tasks: any[] } {
    const tasksNeedingReview = this.getTasksNeedingReview();
    const pendingTasks = this.getPendingReviewTasks();

    // Auto-mark tasks that need review
    for (const task of tasksNeedingReview) {
      this.markTaskForReview(task.id);
    }

    return {
      needsReview: tasksNeedingReview.length,
      pendingDecision: pendingTasks.length,
      tasks: tasksNeedingReview.map(t => ({
        id: t.id,
        name: t.name,
        type: t.taskType,
        age: Math.floor(t.age / (24 * 60 * 60 * 1000)),
        daysUntilExpiry: t.daysUntilExpiry,
        enabled: t.enabled,
      })),
    };
  }

  // Batch process multiple aging decisions
  processBatchAgingDecisions(
    decisions: Array<{
      taskId: string;
      decision: 'keep' | 'modify' | 'delete' | 'snooze';
      modifications?: any;
    }>
  ): { success: number; failed: number; results: any[] } {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const d of decisions) {
      const result = this.processAgingTaskDecision(d.taskId, d.decision, d.modifications);
      results.push({ taskId: d.taskId, ...result });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed, results };
  }
}

export const taskScheduler = TaskScheduler.getInstance();
