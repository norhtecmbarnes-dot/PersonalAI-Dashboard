import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface OpenCodeTask {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface OpenCodeResult {
  success: boolean;
  filesModified?: string[];
  output: string;
  error?: string;
}

export interface OpenCodeStatus {
  available: boolean;
  version?: string;
  error?: string;
}

export class OpenCodeAgent {
  private static instance: OpenCodeAgent;
  private activeProcess: ChildProcess | null = null;
  private taskOutput: string = '';
  private currentTask: OpenCodeTask | null = null;
  private _status: OpenCodeStatus | null = null;

  private constructor() {}

  static getInstance(): OpenCodeAgent {
    if (!OpenCodeAgent.instance) {
      OpenCodeAgent.instance = new OpenCodeAgent();
    }
    return OpenCodeAgent.instance;
  }

  checkAvailability(): OpenCodeStatus {
    if (this._status) return this._status;

    try {
      const version = execSync('npx opencode --version', {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      this._status = {
        available: true,
        version: version || 'unknown',
      };
      return this._status;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this._status = {
        available: false,
        error: errorMsg.includes('ENOENT') 
          ? 'OpenCode not found. Install with: npm install -g opencode or npx opencode'
          : errorMsg,
      };
      return this._status;
    }
  }

  async executeTask(description: string): Promise<OpenCodeResult> {
    return new Promise((resolve) => {
      this.taskOutput = '';
      
      const taskId = Date.now().toString(36);
      this.currentTask = {
        id: taskId,
        description,
        status: 'running',
        startedAt: Date.now(),
      };

      const promptFile = path.join(process.cwd(), 'data', `opencode-task-${taskId}.txt`);
      const dataDir = path.dirname(promptFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const prompt = this.buildPrompt(description);
      fs.writeFileSync(promptFile, prompt);

      console.log('Starting OpenCode agent for task:', taskId);

      this.activeProcess = spawn('npx', [
        'opencode',
        '--continue',
        promptFile
      ], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      this.activeProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        this.taskOutput += output;
        console.log('[OpenCode]', output);
      });

      this.activeProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        this.taskOutput += output;
        console.error('[OpenCode Error]', output);
      });

      this.activeProcess.on('close', (code) => {
        this.currentTask!.status = code === 0 ? 'completed' : 'failed';
        this.currentTask!.completedAt = Date.now();
        this.currentTask!.output = this.taskOutput;

        const filesModified = this.extractModifiedFiles(this.taskOutput);

        try {
          fs.unlinkSync(promptFile);
        } catch {}

        resolve({
          success: code === 0,
          filesModified,
          output: this.taskOutput,
          error: code !== 0 ? `Process exited with code ${code}` : undefined,
        });

        this.activeProcess = null;
      });

      this.activeProcess.on('error', (error) => {
        this.currentTask!.status = 'failed';
        this.currentTask!.completedAt = Date.now();
        this.currentTask!.output = error.message;

        resolve({
          success: false,
          output: '',
          error: error.message,
        });

        this.activeProcess = null;
      });

      setTimeout(() => {
        if (this.activeProcess && this.currentTask?.status === 'running') {
          console.log('Task timeout - terminating');
          this.activeProcess.kill();
        }
      }, 600000);
    });
  }

  private buildPrompt(description: string): string {
    return `You are an expert software developer helping to implement a new feature for an AI Research Assistant.

## Project Context
This is a Next.js 14 application with TypeScript and Tailwind CSS. The user wants to add a new feature.

## Feature Request
${description}

## Your Task
1. First, explore the codebase to understand the existing structure
2. Identify what files need to be created or modified
3. Implement the feature following existing patterns
4. Make minimal, targeted changes that work with the existing system

## Important Rules
- ONLY modify files within: src/lib/, src/components/, src/app/api/, src/app/
- NEVER modify: .env, node_modules, package.json, or any files containing secrets
- Keep changes focused and practical
- Follow existing code patterns and conventions

## Output
After completing the implementation, provide a summary of:
1. Files created
2. Files modified
3. Any dependencies added (just note them, don't modify package.json)

Start by exploring the codebase structure.`;
  }

  private extractModifiedFiles(output: string): string[] {
    const files: string[] = [];
    const patterns = [
      /Created:?\s+([^\s\n]+)/gi,
      /Modified:?\s+([^\s\n]+)/gi,
      /Writing to ([^\s\n]+)/gi,
      /Updated ([^\s\n]+)/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(output)) !== null) {
        const filePath = match[1].trim();
        if (filePath && filePath.startsWith('src/')) {
          files.push(filePath);
        }
      }
    }

    return Array.from(new Set(files));
  }

  getCurrentTask(): OpenCodeTask | null {
    return this.currentTask;
  }

  cancelTask(): boolean {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.currentTask!.status = 'failed';
      this.currentTask!.completedAt = Date.now();
      return true;
    }
    return false;
  }

  isRunning(): boolean {
    return this.activeProcess !== null;
  }
}

export const openCodeAgent = OpenCodeAgent.getInstance();
