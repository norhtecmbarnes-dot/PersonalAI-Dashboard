/**
 * Agent Zero Integration Service
 * 
 * Agent Zero runs in a Docker container and communicates via REST API.
 * All dangerous operations (shell, code execution) happen in the isolated container.
 * 
 * Setup:
 * 1. Run Agent Zero container: docker run -d --name agent-zero -p 8080:8080 agent-zero:latest
 * 2. Set AGENT_ZERO_API_URL=http://localhost:8080 in .env
 * 3. Optionally set AGENT_ZERO_API_KEY for authentication
 */

export interface AgentZeroStatus {
  connected: boolean;
  version?: string;
  capabilities?: string[];
  lastHeartbeat?: number;
  error?: string;
}

export interface AgentZeroTask {
  id: string;
  type: 'shell' | 'python' | 'agent' | 'file';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: string;
  output?: string;
  error?: string;
  duration?: number;
  createdAt: number;
  completedAt?: number;
}

export interface AgentZeroSession {
  id: string;
  createdAt: number;
  tasks: AgentZeroTask[];
  context?: Record<string, any>;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface PythonResult {
  stdout: string;
  stderr: string;
  returnCode: number;
  duration: number;
  output?: any;
}

export interface AgentTaskResult {
  taskId: string;
  results: string[];
  steps: Array<{ action: string; result: string }>;
  duration: number;
  tokensUsed?: number;
}

export interface FileOperationResult {
  success: boolean;
  path: string;
  content?: string;
  size?: number;
  encoding?: string;
}

class AgentZeroService {
  private static instance: AgentZeroService;
  private baseUrl: string;
  private apiKey: string | undefined;
  private timeout: number = 60000; // 60 seconds default
  private sessions: Map<string, AgentZeroSession> = new Map();

  private constructor() {
    this.baseUrl = process.env.AGENT_ZERO_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.AGENT_ZERO_API_KEY;
  }

  static getInstance(): AgentZeroService {
    if (!AgentZeroService.instance) {
      AgentZeroService.instance = new AgentZeroService();
    }
    return AgentZeroService.instance;
  }

  private async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Agent Zero API error: ${response.status} ${error}`);
      }

      const text = await response.text();
      
      if (!text) {
        return { success: true };
      }

      return JSON.parse(text);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Agent Zero request timed out');
      }
      throw error;
    }
  }

  async checkStatus(): Promise<AgentZeroStatus> {
    try {
      const response = await this.request('/status');
      return {
        connected: true,
        version: response.version,
        capabilities: response.capabilities || [
          'shell',
          'python',
          'agent',
          'file',
          'web',
          'search',
        ],
        lastHeartbeat: Date.now(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createSession(context?: Record<string, any>): Promise<AgentZeroSession> {
    const response = await this.request('/sessions', 'POST', { context });
    
    const session: AgentZeroSession = {
      id: response.sessionId || `session_${Date.now()}`,
      createdAt: Date.now(),
      tasks: [],
      context,
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  async executeShell(
    command: string,
    options?: { timeout?: number; cwd?: string; env?: Record<string, string> }
  ): Promise<ShellResult> {
    const startTime = Date.now();
    
    const response = await this.request('/execute/shell', 'POST', {
      command,
      timeout: options?.timeout || 30000,
      cwd: options?.cwd,
      env: options?.env,
    });

    return {
      stdout: response.stdout || '',
      stderr: response.stderr || '',
      exitCode: response.exitCode ?? response.exit_code ?? 0,
      duration: Date.now() - startTime,
    };
  }

  async executePython(
    code: string,
    options?: { timeout?: number; packages?: string[] }
  ): Promise<PythonResult> {
    const startTime = Date.now();
    
    const response = await this.request('/execute/python', 'POST', {
      code,
      timeout: options?.timeout || 60000,
      packages: options?.packages,
    });

    return {
      stdout: response.stdout || '',
      stderr: response.stderr || '',
      returnCode: response.returnCode ?? response.return_code ?? 0,
      duration: Date.now() - startTime,
      output: response.output,
    };
  }

  async runAgentTask(
    task: string,
    options?: {
      maxSteps?: number;
      timeout?: number;
      sessionId?: string;
    }
  ): Promise<AgentTaskResult> {
    const startTime = Date.now();
    
    const response = await this.request('/agent/task', 'POST', {
      task,
      maxSteps: options?.maxSteps || 10,
      timeout: options?.timeout || 120000,
      sessionId: options?.sessionId,
    });

    return {
      taskId: response.taskId,
      results: response.results || [],
      steps: response.steps || [],
      duration: Date.now() - startTime,
      tokensUsed: response.tokensUsed,
    };
  }

  async readFile(
    path: string,
    options?: { encoding?: string; maxSize?: number }
  ): Promise<FileOperationResult> {
    const response = await this.request('/files/read', 'POST', {
      path,
      encoding: options?.encoding || 'utf-8',
      maxSize: options?.maxSize || 10 * 1024 * 1024, // 10MB default
    });

    return {
      success: true,
      path,
      content: response.content,
      size: response.size,
      encoding: response.encoding,
    };
  }

  async writeFile(
    path: string,
    content: string,
    options?: { encoding?: string; createDirs?: boolean }
  ): Promise<FileOperationResult> {
    const response = await this.request('/files/write', 'POST', {
      path,
      content,
      encoding: options?.encoding || 'utf-8',
      createDirs: options?.createDirs ?? true,
    });

    return {
      success: true,
      path,
      size: response.size,
    };
  }

  async listDirectory(path: string): Promise<string[]> {
    const response = await this.request('/files/list', 'POST', { path });
    return response.entries || [];
  }

  async deleteFile(path: string): Promise<boolean> {
    const response = await this.request('/files/delete', 'POST', { path });
    return response.success === true;
  }

  async listSessions(): Promise<AgentZeroSession[]> {
    return Array.from(this.sessions.values());
  }

  async getSession(sessionId: string): Promise<AgentZeroSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId: string): Promise<boolean> {
    try {
      await this.request(`/sessions/${sessionId}`, 'DELETE');
      this.sessions.delete(sessionId);
      return true;
    } catch {
      this.sessions.delete(sessionId);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  getApiUrl(): string {
    return this.baseUrl;
  }
}

export const agentZeroService = AgentZeroService.getInstance();