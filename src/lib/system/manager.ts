export interface SystemStatus {
  initialized: boolean;
  running: boolean;
  startTime: number;
  uptime: number;
  services: ServiceStatus[];
  lastError?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'warning';
  message?: string;
  lastCheck: number;
}

export interface SystemConfig {
  autoStart: boolean;
  gracefulShutdown: boolean;
  shutdownTimeout: number;
  healthCheckInterval: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  autoStart: true,
  gracefulShutdown: true,
  shutdownTimeout: 30000,
  healthCheckInterval: 30000,
};

export class SystemManager {
  private static instance: SystemManager;
  private config: SystemConfig;
  private status: SystemStatus;
  private services: Map<string, () => Promise<void>>;
  private shutdownHooks: Array<() => Promise<void>>;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.services = new Map();
    this.shutdownHooks = [];
    this.status = {
      initialized: false,
      running: false,
      startTime: 0,
      uptime: 0,
      services: [
        { name: 'Task Scheduler', status: 'stopped', lastCheck: Date.now() },
        { name: 'Database', status: 'stopped', lastCheck: Date.now() },
        { name: 'Security Scanner', status: 'stopped', lastCheck: Date.now() },
        { name: 'Intelligence Service', status: 'stopped', lastCheck: Date.now() },
        { name: 'Memory Service', status: 'stopped', lastCheck: Date.now() },
      ],
    };
  }

  static getInstance(): SystemManager {
    if (!SystemManager.instance) {
      SystemManager.instance = new SystemManager();
    }
    return SystemManager.instance;
  }

  registerService(name: string, initFn: () => Promise<void>): void {
    this.services.set(name, initFn);
  }

  registerShutdownHook(hook: () => Promise<void>): void {
    this.shutdownHooks.push(hook);
  }

  private updateServiceStatus(name: string, status: ServiceStatus['status'], message?: string): void {
    const service = this.status.services.find(s => s.name === name);
    if (service) {
      service.status = status;
      service.message = message;
      service.lastCheck = Date.now();
    }
  }

  async start(): Promise<SystemStatus> {
    if (this.status.running) {
      return this.status;
    }

    console.log('[System] Starting AI Assistant...');
    this.status.lastError = undefined;

    try {
      // 1. Initialize Database
      this.updateServiceStatus('Database', 'starting');
      try {
        const { sqlDatabase } = await import('@/lib/database/sqlite');
        await sqlDatabase.initialize();
        this.updateServiceStatus('Database', 'running', 'Connected');
        console.log('[System] Database initialized');
      } catch (error) {
        this.updateServiceStatus('Database', 'error', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }

      // 2. Initialize Memory Service
      this.updateServiceStatus('Memory Service', 'starting');
      try {
        const { memoryFileService } = await import('@/lib/services/memory-file');
        await memoryFileService.loadMemory();
        this.updateServiceStatus('Memory Service', 'running', 'Loaded');
        console.log('[System] Memory service initialized');
      } catch (error) {
        this.updateServiceStatus('Memory Service', 'warning', 'Using defaults');
        console.warn('[System] Memory service warning:', error);
      }

      // 3. Start Task Scheduler
      this.updateServiceStatus('Task Scheduler', 'starting');
      try {
        const { taskScheduler } = await import('@/lib/services/task-scheduler');
        await taskScheduler.initialize();
        taskScheduler.start();
        this.updateServiceStatus('Task Scheduler', 'running', 'Active');
        console.log('[System] Task scheduler started');
      } catch (error) {
        this.updateServiceStatus('Task Scheduler', 'error', error instanceof Error ? error.message : 'Unknown error');
        console.error('[System] Task scheduler failed:', error);
      }

      // 4. Initialize Security Scanner
      this.updateServiceStatus('Security Scanner', 'starting');
      try {
        // Security scanner is event-driven, just mark as running
        this.updateServiceStatus('Security Scanner', 'running', 'Ready');
        console.log('[System] Security scanner ready');
      } catch (error) {
        this.updateServiceStatus('Security Scanner', 'warning', 'Not active');
      }

      // 5. Initialize Intelligence Service
      this.updateServiceStatus('Intelligence Service', 'starting');
      try {
        // Intelligence service is triggered by task scheduler
        this.updateServiceStatus('Intelligence Service', 'running', 'Ready');
        console.log('[System] Intelligence service ready');
      } catch (error) {
        this.updateServiceStatus('Intelligence Service', 'warning', 'Not active');
      }

      // Run registered services
      for (const [name, initFn] of Array.from(this.services.entries())) {
        const serviceStatus: ServiceStatus = {
          name,
          status: 'starting',
          lastCheck: Date.now(),
        };
        this.status.services.push(serviceStatus);

        try {
          await initFn();
          serviceStatus.status = 'running';
          serviceStatus.message = 'Started successfully';
          console.log(`[System] Service ${name} started`);
        } catch (error) {
          serviceStatus.status = 'error';
          serviceStatus.message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[System] Service ${name} failed:`, error);
          this.status.lastError = serviceStatus.message;
        }
      }

      this.status.initialized = true;
      this.status.running = true;
      this.status.startTime = Date.now();

      this.startHealthCheck();
      
      console.log('[System] AI Assistant started successfully');
      return this.status;
    } catch (error) {
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[System] Startup failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<SystemStatus> {
    if (!this.status.running) {
      return this.status;
    }

    console.log('[System] Shutting down AI Assistant...');
    
    this.stopHealthCheck();

    // Stop Task Scheduler
    this.updateServiceStatus('Task Scheduler', 'stopping');
    try {
      const { taskScheduler } = await import('@/lib/services/task-scheduler');
      taskScheduler.stop();
      this.updateServiceStatus('Task Scheduler', 'stopped', 'Shutdown');
      console.log('[System] Task scheduler stopped');
    } catch (error) {
      this.updateServiceStatus('Task Scheduler', 'error', 'Failed to stop');
    }

    // Close Database
    this.updateServiceStatus('Database', 'stopping');
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      sqlDatabase.close();
      this.updateServiceStatus('Database', 'stopped', 'Closed');
      console.log('[System] Database closed');
    } catch (error) {
      this.updateServiceStatus('Database', 'stopped', 'Closed with warnings');
    }

    // Run shutdown hooks
    for (const hook of this.shutdownHooks) {
      try {
        await hook();
      } catch (error) {
        console.error('[System] Shutdown hook error:', error);
      }
    }

    // Mark all other services as stopped
    this.updateServiceStatus('Security Scanner', 'stopped');
    this.updateServiceStatus('Intelligence Service', 'stopped');
    this.updateServiceStatus('Memory Service', 'stopped');

    this.status.running = false;
    this.status.uptime = Date.now() - this.status.startTime;

    console.log('[System] AI Assistant shutdown complete');
    return this.status;
  }

  getStatus(): SystemStatus {
    if (this.status.running) {
      this.status.uptime = Date.now() - this.status.startTime;
    }
    return { ...this.status };
  }

  isRunning(): boolean {
    return this.status.running;
  }

  getServiceStatus(name: string): ServiceStatus | undefined {
    return this.status.services.find(s => s.name === name);
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(async () => {
      for (const service of this.status.services) {
        service.lastCheck = Date.now();
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  updateConfig(config: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SystemConfig {
    return { ...this.config };
  }

  async checkHealth(): Promise<{ healthy: boolean; services: ServiceStatus[] }> {
    const runningServices = this.status.services.filter(s => 
      s.status === 'running' || s.status === 'stopped' && s.name === 'Database'
    );
    const allRunning = this.status.services.every(s => 
      s.status === 'running' || s.status === 'warning' || s.status === 'stopped' && s.name !== 'Task Scheduler'
    );
    return {
      healthy: this.status.running && (allRunning || runningServices.length >= 2),
      services: [...this.status.services],
    };
  }
}

export const systemManager = SystemManager.getInstance();
